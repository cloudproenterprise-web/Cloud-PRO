/**
 * Native ZIP Archive Extractor & Unpacker for CloudPRO File Manager
 * Pure Web Standards (ArrayBuffer, DataView, DecompressionStream 'deflate-raw', TextDecoder)
 * Zero external package requirements - will never throw missing module errors!
 */

export interface ExtractedZipEntry {
  path: string;
  name: string;
  isDir: boolean;
  uncompressedSize: number;
  content: string; // Plain text for scripts or base64 data URI for binary assets
}

const TEXT_EXTENSIONS = new Set([
  'php', 'html', 'htm', 'phtml', 'css', 'js', 'jsx', 'ts', 'tsx', 'json',
  'sql', 'txt', 'htaccess', 'env', 'md', 'xml', 'svg', 'yaml', 'yml',
  'ini', 'sh', 'conf', 'config', 'log', 'csv'
]);

function isTextFile(filename: string): boolean {
  const parts = filename.split('.');
  if (parts.length <= 1) {
    const base = filename.toLowerCase();
    return base.startsWith('.htaccess') || base.startsWith('.env') || base === 'readme';
  }
  const ext = parts.pop()?.toLowerCase() || '';
  return TEXT_EXTENSIONS.has(ext);
}

function uint8ArrayToBase64(u8: Uint8Array): string {
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return window.btoa(binary);
}

async function decompressDeflateRaw(compressedData: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Browser runtime does not support DecompressionStream.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(compressedData as any);
  writer.close();
  const ab = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(ab);
}

/**
 * Extracts all files and folders from a ZIP ArrayBuffer without requiring external libraries.
 */
export async function extractZipArchive(buffer: ArrayBuffer): Promise<ExtractedZipEntry[]> {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  const entries: ExtractedZipEntry[] = [];
  const textDecoder = new TextDecoder('utf-8');

  // Step 1: Scan for End of Central Directory (EOCD) signature 0x06054b50 from the back
  let eocdOffset = -1;
  const maxScan = Math.min(buffer.byteLength, 65536 + 22);
  const startScan = buffer.byteLength - 22;

  for (let i = startScan; i >= buffer.byteLength - maxScan && i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    // Read Central Directory structure
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    let offset = cdOffset;

    for (let i = 0; i < totalEntries && offset < eocdOffset; i++) {
      if (view.getUint32(offset, true) !== 0x02014b50) break;

      const compression = view.getUint16(offset + 10, true);
      const compSize = view.getUint32(offset + 20, true);
      const uncompSize = view.getUint32(offset + 24, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);

      const nameBytes = u8.subarray(offset + 46, offset + 46 + nameLen);
      const rawPath = textDecoder.decode(nameBytes).replace(/\\/g, '/').replace(/^\/+/, '');

      if (rawPath) {
        const isDir = rawPath.endsWith('/') || uncompSize === 0 && rawPath.endsWith('/');
        const cleanPath = rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
        const entryName = cleanPath.split('/').filter(Boolean).pop() || cleanPath;

        if (isDir) {
          entries.push({
            path: cleanPath,
            name: entryName,
            isDir: true,
            uncompressedSize: 0,
            content: '',
          });
        } else {
          // Resolve data start from local header
          const localNameLen = view.getUint16(localHeaderOffset + 26, true);
          const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
          const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
          const compressedBytes = u8.subarray(dataStart, dataStart + compSize);

          let uncompressedBytes: Uint8Array;
          if (compression === 0) {
            uncompressedBytes = compressedBytes;
          } else if (compression === 8) {
            try {
              uncompressedBytes = await decompressDeflateRaw(compressedBytes);
            } catch (err) {
              console.warn(`Failed to decompress ${cleanPath}:`, err);
              uncompressedBytes = compressedBytes;
            }
          } else {
            uncompressedBytes = compressedBytes;
          }

          let content = '';
          if (isTextFile(entryName)) {
            content = textDecoder.decode(uncompressedBytes);
          } else {
            content = `data:application/octet-stream;base64,${uint8ArrayToBase64(uncompressedBytes)}`;
          }

          entries.push({
            path: cleanPath,
            name: entryName,
            isDir: false,
            uncompressedSize: uncompSize || uncompressedBytes.byteLength,
            content,
          });
        }
      }

      offset += 46 + nameLen + extraLen + commentLen;
    }
  } else {
    // Fallback: parse Local File Headers directly (signature 0x04034b50)
    let offset = 0;
    while (offset < buffer.byteLength - 30) {
      if (view.getUint32(offset, true) !== 0x04034b50) break;

      const compression = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const uncompSize = view.getUint32(offset + 22, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const nameBytes = u8.subarray(offset + 30, offset + 30 + nameLen);
      const rawPath = textDecoder.decode(nameBytes).replace(/\\/g, '/').replace(/^\/+/, '');

      const dataStart = offset + 30 + nameLen + extraLen;
      const compressedBytes = u8.subarray(dataStart, dataStart + compSize);

      if (rawPath) {
        const isDir = rawPath.endsWith('/');
        const cleanPath = isDir ? rawPath.slice(0, -1) : rawPath;
        const entryName = cleanPath.split('/').filter(Boolean).pop() || cleanPath;

        if (isDir) {
          entries.push({
            path: cleanPath,
            name: entryName,
            isDir: true,
            uncompressedSize: 0,
            content: '',
          });
        } else {
          let uncompressedBytes: Uint8Array;
          if (compression === 0) {
            uncompressedBytes = compressedBytes;
          } else if (compression === 8) {
            try {
              uncompressedBytes = await decompressDeflateRaw(compressedBytes);
            } catch {
              uncompressedBytes = compressedBytes;
            }
          } else {
            uncompressedBytes = compressedBytes;
          }

          let content = '';
          if (isTextFile(entryName)) {
            content = textDecoder.decode(uncompressedBytes);
          } else {
            content = `data:application/octet-stream;base64,${uint8ArrayToBase64(uncompressedBytes)}`;
          }

          entries.push({
            path: cleanPath,
            name: entryName,
            isDir: false,
            uncompressedSize: uncompSize || uncompressedBytes.byteLength,
            content,
          });
        }
      }

      offset = dataStart + compSize;
    }
  }

  return entries;
}

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const crcTable = makeCrcTable();

export function crc32(data: Uint8Array): number {
  let crc = 0 ^ (-1);
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

export interface ZipFileInput {
  name: string;
  content: string | Uint8Array;
}

/**
 * Creates a standard ZIP archive Blob without external libraries.
 * Method 0 (Store) - 100% compatible with Windows, Mac, Linux unzip, and Android.
 */
export function createZipArchive(files: ZipFileInput[]): Blob {
  const textEncoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  const localParts: Uint8Array[] = [];
  let currentOffset = 0;

  for (const f of files) {
    const nameBytes = textEncoder.encode(f.name.replace(/\\/g, '/').replace(/^\/+/, ''));
    let dataBytes: Uint8Array;
    if (typeof f.content === 'string') {
      if (f.content.startsWith('data:') && f.content.includes(';base64,')) {
        const b64 = f.content.split(';base64,')[1];
        const binStr = window.atob(b64);
        dataBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) dataBytes[i] = binStr.charCodeAt(i);
      } else {
        dataBytes = textEncoder.encode(f.content);
      }
    } else {
      dataBytes = f.content;
    }

    const fileCrc = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);

    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8
    lv.setUint16(8, 0, true);      // Method: 0 (Store)
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, fileCrc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc: fileCrc,
      offset: currentOffset,
    });

    localParts.push(localHeader);
    localParts.push(dataBytes);
    currentOffset += localHeader.length + dataBytes.length;
  }

  const centralDirParts: Uint8Array[] = [];
  const centralDirOffset = currentOffset;
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    const cdHeader = new Uint8Array(46 + rec.nameBytes.length);
    const cv = new DataView(cdHeader.buffer);

    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, rec.crc, true);
    cv.setUint32(20, rec.dataBytes.length, true);
    cv.setUint32(24, rec.dataBytes.length, true);
    cv.setUint16(28, rec.nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, rec.offset, true);
    cdHeader.set(rec.nameBytes, 46);

    centralDirParts.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, fileRecords.length, true);
  ev.setUint16(10, fileRecords.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, centralDirOffset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralDirParts, eocd] as any[], {
    type: 'application/zip',
  });
}
