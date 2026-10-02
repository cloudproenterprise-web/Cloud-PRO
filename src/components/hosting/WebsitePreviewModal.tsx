import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe,
  X,
  RefreshCw,
  Smartphone,
  Monitor,
  Lock,
  ExternalLink,
  Code,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  FolderOpen,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Home,
} from 'lucide-react';
import { HostingAccount, VirtualFile } from '../../types';
import { db } from '../../services/storage';

interface WebsitePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: HostingAccount;
  initialDomain?: string;
  initialDocRoot?: string;
  onOpenFileManager?: (path: string) => void;
  onOpenDnsEditor?: () => void;
}

export const WebsitePreviewModal: React.FC<WebsitePreviewModalProps> = ({
  isOpen,
  onClose,
  account,
  initialDomain,
  initialDocRoot,
  onOpenFileManager,
  onOpenDnsEditor,
}) => {
  if (!isOpen) return null;

  const resolveCleanPath = (p?: string) => {
    if (!p) return '/public_html';
    let cleaned = p.trim().replace(/^\/home\/[^/]+/, '');
    if (!cleaned.startsWith('/')) cleaned = `/${cleaned}`;
    if (cleaned.length > 1) cleaned = cleaned.replace(/\/+$/, '');
    return cleaned || '/public_html';
  };

  const accountDomains = db.getDomains(account.id);
  const allSelectableDomains = useMemo(() => {
    const list = [
      {
        domain: account.primaryDomain || 'denbaguse.my.id',
        documentRoot: `/home/${account.username}/public_html`,
        type: 'primary',
      },
      ...accountDomains
        .filter(d => d.type !== 'primary' && d.domain.toLowerCase() !== (account.primaryDomain || '').toLowerCase())
        .map(d => ({
          domain: d.domain,
          documentRoot: d.documentRoot || `/home/${account.username}/public_html/${d.subdomainPrefix || d.domain.split('.')[0]}`,
          type: d.type,
        })),
    ];
    if (initialDocRoot) {
      const cleanInitRoot = resolveCleanPath(initialDocRoot);
      if (cleanInitRoot !== '/public_html' && !list.some(item => resolveCleanPath(item.documentRoot).toLowerCase() === cleanInitRoot.toLowerCase())) {
        const subPrefix = cleanInitRoot.replace(/^\/public_html\//i, '').split('/')[0];
        if (subPrefix) {
          list.push({
            domain: initialDomain && initialDomain !== account.primaryDomain ? initialDomain : `${subPrefix}.${account.primaryDomain}`,
            documentRoot: `/home/${account.username}${cleanInitRoot}`,
            type: 'subdomain',
          });
        }
      }
    }
    // Deduplicate by domain name
    const seen = new Set<string>();
    return list.filter(item => {
      const key = item.domain.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [account, accountDomains, initialDomain, initialDocRoot]);

  const resolveInitialSelectedDomain = () => {
    if (initialDocRoot) {
      const cleanInitRoot = resolveCleanPath(initialDocRoot);
      if (cleanInitRoot !== '/public_html') {
        const byRoot = allSelectableDomains.find(
          d => resolveCleanPath(d.documentRoot).toLowerCase() === cleanInitRoot.toLowerCase()
        );
        if (byRoot) return byRoot.domain;
      }
    }
    return initialDomain || account.primaryDomain || 'denbaguse.my.id';
  };

  const [selectedDomain, setSelectedDomain] = useState<string>(resolveInitialSelectedDomain);

  useEffect(() => {
    setSelectedDomain(resolveInitialSelectedDomain());
  }, [initialDomain, initialDocRoot, isOpen]);
  const [renderMode, setRenderMode] = useState<'server' | 'sandbox'>('server');
  const [showBlankHelp, setShowBlankHelp] = useState<boolean>(false);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'source' | 'dns_help'>('preview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [historyStack, setHistoryStack] = useState<Array<{ domain: string; fileName: string; tab: 'preview' | 'source' | 'dns_help' }>>([]);
  const [forwardStack, setForwardStack] = useState<Array<{ domain: string; fileName: string; tab: 'preview' | 'source' | 'dns_help' }>>([]);

  const handleNavigatePreview = (nextDomain: string, nextFileName: string = '', nextTab: 'preview' | 'source' | 'dns_help' = activeTab) => {
    setHistoryStack(prev => [...prev, { domain: selectedDomain, fileName: selectedFileName, tab: activeTab }]);
    setForwardStack([]);
    setSelectedDomain(nextDomain);
    setSelectedFileName(nextFileName);
    setActiveTab(nextTab);
  };

  const handleBrowserBack = () => {
    if (activeTab !== 'preview') {
      setActiveTab('preview');
      return;
    }
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack(s => s.slice(0, -1));
      setForwardStack(f => [...f, { domain: selectedDomain, fileName: selectedFileName, tab: activeTab }]);
      setSelectedDomain(prev.domain);
      setSelectedFileName(prev.fileName);
      setActiveTab(prev.tab);
    } else {
      onClose();
    }
  };

  const handleBrowserForward = () => {
    if (forwardStack.length === 0) return;
    const next = forwardStack[forwardStack.length - 1];
    setForwardStack(f => f.slice(0, -1));
    setHistoryStack(s => [...s, { domain: selectedDomain, fileName: selectedFileName, tab: activeTab }]);
    setSelectedDomain(next.domain);
    setSelectedFileName(next.fileName);
    setActiveTab(next.tab);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'CLOUDPRO_PREVIEW_BACK') {
        handleBrowserBack();
      } else if (e.data.type === 'CLOUDPRO_PREVIEW_NAV' && typeof e.data.href === 'string') {
        const cleanHref = e.data.href.replace(/^\.?\//, '').split('?')[0].split('#')[0];
        if (cleanHref) {
          handleNavigatePreview(selectedDomain, cleanHref, 'preview');
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [selectedDomain, selectedFileName, activeTab, historyStack]);

  const currentDomainObj =
    allSelectableDomains.find(d => d.domain.toLowerCase() === selectedDomain.toLowerCase()) || {
      domain: selectedDomain,
      documentRoot: initialDocRoot || `/home/${account.username}/public_html`,
      type: 'primary',
    };

  const targetDir = resolveCleanPath(currentDomainObj.documentRoot);

  // Gather files strictly in target directory (and targetDir/assets)
  const allFiles = db.getVirtualFiles(account.id);
  const dirFiles = allFiles.filter(f => {
    const fPath = resolveCleanPath(f.path);
    const parent = fPath.substring(0, fPath.lastIndexOf('/')) || '/public_html';
    return (parent.toLowerCase() === targetDir.toLowerCase() || parent.toLowerCase() === `${targetDir}/assets`.toLowerCase()) && f.type === 'file';
  });

  const requestedFile = selectedFileName
    ? dirFiles.find(f => f.name.toLowerCase() === selectedFileName.toLowerCase())
    : undefined;

  const indexHtmlFile =
    (requestedFile && (requestedFile.name.endsWith('.html') || requestedFile.name.endsWith('.htm'))
      ? requestedFile
      : undefined) ||
    dirFiles.find(f => f.name.toLowerCase() === 'index.html' || f.name.toLowerCase() === 'index.htm');
  const indexPhpFile =
    (requestedFile && requestedFile.name.endsWith('.php') ? requestedFile : undefined) ||
    dirFiles.find(f => f.name.toLowerCase() === 'index.php');
  const styleCssFile =
    dirFiles.find(f => f.name.toLowerCase() === 'style-2.css' && (f.content || '').length > 10000) ||
    dirFiles.find(f => f.name.toLowerCase() === 'style.css');
  const scriptJsFile = dirFiles.find(f => f.name.toLowerCase() === 'script.js');

  const activeEntryFile: VirtualFile | undefined = requestedFile || indexHtmlFile || indexPhpFile || dirFiles[0];

  const [serverPreviewHtml, setServerPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    setServerPreviewHtml(null);
    const isSpecificNonEntry =
      selectedFileName &&
      selectedFileName.toLowerCase() !== 'index.html' &&
      selectedFileName.toLowerCase() !== 'index.htm' &&
      selectedFileName.toLowerCase() !== 'index.php';
    if (!isSpecificNonEntry) {
      fetch(
        `/api/vhost/preview-render?accountId=${encodeURIComponent(account.id)}&domain=${encodeURIComponent(
          selectedDomain
        )}&dir=${encodeURIComponent(targetDir)}`
      )
        .then(r => (r.ok ? r.text() : ''))
        .then(healed => {
          if (healed && (healed.includes('<html') || healed.includes('<!DOCTYPE') || healed.includes('<!doctype'))) {
            setServerPreviewHtml(healed);
            if (indexHtmlFile && indexHtmlFile.content && Math.abs(indexHtmlFile.content.length - healed.length) > 10) {
              db.saveVirtualFile({
                ...indexHtmlFile,
                sizeBytes: healed.length,
                content: healed,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [account.id, selectedDomain, targetDir, selectedFileName, indexHtmlFile?.id, refreshKey]);

  // Build rendered HTML document for the sandbox iframe
  const renderedHtml = useMemo(() => {
    const navBridgeScript = `<script>
      (function() {
        var origBack = window.history.back;
        window.history.back = function() {
          window.parent.postMessage({ type: 'CLOUDPRO_PREVIEW_BACK' }, '*');
        };
        window.history.go = function(delta) {
          if (delta < 0) window.parent.postMessage({ type: 'CLOUDPRO_PREVIEW_BACK' }, '*');
        };
        document.addEventListener('click', function(e) {
          var el = e.target && e.target.closest ? e.target.closest('a, button') : null;
          if (!el) return;
          var href = el.getAttribute('href') || '';
          var onclickAttr = el.getAttribute('onclick') || '';
          if (href === 'javascript:history.back()' || href === '#back' || onclickAttr.indexOf('history.back') !== -1) {
            e.preventDefault();
            window.parent.postMessage({ type: 'CLOUDPRO_PREVIEW_BACK' }, '*');
            return;
          }
          if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
            e.preventDefault();
            window.parent.postMessage({ type: 'CLOUDPRO_PREVIEW_NAV', href: href }, '*');
          }
        }, true);
      })();
    </script>`;

    const cssInjection = styleCssFile?.content
      ? `<style>\n${styleCssFile.content}\n</style>`
      : '';
    const jsInjection = scriptJsFile?.content
      ? `${navBridgeScript}\n<script>\n${scriptJsFile.content}\n</script>`
      : navBridgeScript;

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseHrefTag = `<base href="${currentOrigin}/">`;

    // Dynamic importmap based on actual files present in target directory
    const jsFilesInDir = dirFiles.filter(f => f.name.endsWith('.js'));
    let importMapTag = '';
    if (jsFilesInDir.length > 0) {
      const dynamicMap: Record<string, string> = {};
      jsFilesInDir.forEach(f => {
        dynamicMap[`./${f.name}`] = `/assets/${f.name}`;
        dynamicMap[f.name] = `/assets/${f.name}`;
      });
      importMapTag = `<script type="importmap">\n${JSON.stringify({ imports: dynamicMap }, null, 2)}\n</script>`;
    }

    if (serverPreviewHtml) {
      let finalHtml = serverPreviewHtml;
      if (!finalHtml.includes('<base ')) {
        finalHtml = /<head[^>]*>/i.test(finalHtml)
          ? finalHtml.replace(/<head[^>]*>/i, m => `${m}\n${baseHrefTag}`)
          : `${baseHrefTag}\n${finalHtml}`;
      }
      if (importMapTag && !finalHtml.includes('type="importmap"')) {
        finalHtml = /<head[^>]*>/i.test(finalHtml)
          ? finalHtml.replace(/<head[^>]*>/i, m => `${m}\n${importMapTag}`)
          : `${importMapTag}\n${finalHtml}`;
      }
      return finalHtml;
    }

    if (indexHtmlFile && indexHtmlFile.content) {
      let html = indexHtmlFile.content;

      // Auto-heal cloned SPA HTML that has a <base href="https://..."> or data-cloned-origin
      const baseMatch =
        html.match(/<base\s+href=["'](https?:\/\/[^/"']+)[^"']*["']/i) ||
        html.match(/data-cloned-origin=["'](https?:\/\/[^/"']+)["']/i) ||
        html.match(/var\s+ORIGIN\s*=\s*["'](https?:\/\/[^/"']+)["']/i);
      if (baseMatch && baseMatch[1]) {
        const originBase = baseMatch[1].replace(/\/$/, '');
        html = html
          .replace(/<base\s+href=["'][^"']*["']\s*\/?>/gi, '');

        const bestJs = dirFiles.find(
          f => f.type === 'file' && f.name.endsWith('.js') && (f.content || '').length > 10000
        );

        // If the HTML does not already have the module script tag, inject it properly as an ES module
        if (bestJs && !html.includes(bestJs.name)) {
          const moduleScript = `<script type="module" crossorigin src="/assets/${bestJs.name}"></script>`;
          html = html.includes('</body>')
            ? html.replace('</body>', () => `${moduleScript}\n</body>`)
            : `${html}\n${moduleScript}`;
        }

        const spaShim = `<script id="cloudpro-spa-clone-shim" data-cloned-origin="${originBase}">
(function(){
  var ORIGIN = ${JSON.stringify(originBase)};
  try {
    var ls = window.localStorage;
    ls.getItem('__cp_test');
  } catch (e) {
    var mem = {};
    var safeStore = {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function(k, v) { mem[k] = String(v); },
      removeItem: function(k) { delete mem[k]; },
      clear: function() { mem = {}; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: safeStore, configurable: true }); } catch (e2) {}
    try { Object.defineProperty(window, 'sessionStorage', { value: safeStore, configurable: true }); } catch (e2) {}
  }
  try {
    var origPush = history.pushState;
    var origReplace = history.replaceState;
    history.pushState = function() { try { return origPush.apply(this, arguments); } catch (e) {} };
    history.replaceState = function() { try { return origReplace.apply(this, arguments); } catch (e) {} };
  } catch (e) {}
  try {
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function(input, init) {
        var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (urlStr.indexOf('/api/site-data') !== -1 && window.__INITIAL_SITE_DATA__) {
          var payload = JSON.stringify({
            success: true,
            data: window.__INITIAL_SITE_DATA__,
            lastUpdated: window.__INITIAL_SITE_DATA__.lastUpdated || Date.now()
          });
          return Promise.resolve(new Response(payload, { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        if (typeof input === 'string' && (input.indexOf('/api/') === 0 || input.indexOf('/uploads/') === 0)) {
          input = ORIGIN + input;
        }
        return origFetch.call(this, input, init);
      };
    }
  } catch (e) {}
})();
</script>`;
        html = html.replace(/<script id="cloudpro-spa-clone-shim"[^>]*>[\s\S]*?<\/script>/gi, '');
        html = /<head[^>]*>/i.test(html)
          ? html.replace(/<head[^>]*>/i, m => `${m}\n${baseHrefTag}\n${importMapTag}\n${spaShim}`)
          : `${baseHrefTag}\n${importMapTag}\n${spaShim}\n${html}`;
      }

      if (cssInjection && !html.includes('<style')) {
        html = html.includes('</head>')
          ? html.replace('</head>', () => `${cssInjection}\n</head>`)
          : `${cssInjection}\n${html}`;
      }
      if (jsInjection && !html.includes(scriptJsFile?.content || '__none__')) {
        html = html.includes('</body>')
          ? html.replace('</body>', () => `${jsInjection}\n</body>`)
          : `${html}\n${jsInjection}`;
      }
      return html;
    }

    if (indexPhpFile && indexPhpFile.content) {
      const rawPhp = indexPhpFile.content;
      const isWp = rawPhp.toLowerCase().includes('wp-blog-header') || rawPhp.toLowerCase().includes('wordpress');

      if (isWp) {
        return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>WordPress - ${selectedDomain}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f1f5f9; color: #0f172a; margin: 0; padding: 32px 20px; }
    .wrap { max-width: 720px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }
    h1 { color: #0284c7; margin-top: 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>WordPress 6.6 Siap di ${selectedDomain}</h1>
    <p>Instalasi WordPress berhasil diekstrak ke <code>${targetDir}</code>.</p>
  </div>
</body>
</html>`;
      }

      // Extract echoed strings if simple PHP file (ignoring build guard error strings)
      const echoMatches = Array.from(rawPhp.matchAll(/echo\s+["']([^"']+)["']/g))
        .map(m => m[1])
        .filter(msg => !msg.toLowerCase().includes('belum di-build') && !msg.toLowerCase().includes('tidak ditemukan'));
      return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${selectedDomain}</title>
  ${cssInjection}
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #0f172a; }
    .box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; max-width: 680px; margin: 0 auto; }
  </style>
</head>
<body>
  <div class="box">
    ${echoMatches.length > 0 ? echoMatches.join('\n') : `<h2>${selectedDomain} — PHP ${account.phpVersion} Virtual Host Aktif</h2><pre>${rawPhp.replace(/</g, '&lt;')}</pre>`}
  </div>
</body>
</html>`;
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Index of ${targetDir} - ${selectedDomain}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; color: #334155; }
    .card { max-width: 600px; margin: 2rem auto; background: white; padding: 2rem; border-radius: 1rem; border: 1px solid #e2e8f0; text-align: center; }
    h2 { color: #0f172a; margin-bottom: 0.5rem; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Virtual Host ${selectedDomain} Aktif</h2>
    <p>Folder <code>${targetDir}</code> belum memiliki file <code>index.html</code> atau <code>index.php</code>.</p>
    <p style="font-size: 13px; color: #64748b; margin-top: 12px;">Gunakan tombol <strong>Sync / Clone Website</strong> atau <strong>Upload File Website</strong> di File Manager untuk mengisi halaman website ini.</p>
  </div>
</body>
</html>`;
  }, [serverPreviewHtml, allFiles, indexHtmlFile, indexPhpFile, styleCssFile, scriptJsFile, selectedDomain, targetDir, account.phpVersion, refreshKey]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const currentAppHost = window.location.hostname;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="my-auto flex flex-col w-full max-w-5xl h-[92vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Top Browser Bar */}
        <div className="flex flex-col gap-2 bg-slate-900 border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-2.5 shrink-0">
          {/* Top Row: Back button, Tabs, Close */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Back Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleBrowserBack}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white cursor-pointer transition-colors shadow-2xs active:scale-95"
                title="Kembali ke halaman sebelumnya / Tutup Preview"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-sky-400" />
                <span className="text-xs">Kembali</span>
              </button>
              <span className="hidden lg:inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Cloud PRO Virtual Host Sandbox</span>
              </span>
            </div>

            {/* Mode Switcher Tabs - Clear, readable and compact on mobile */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-0.5 sm:p-1 rounded-xl text-xs overflow-x-auto max-w-[calc(100vw-110px)] sm:max-w-none">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'preview'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Live Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dns_help')}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'dns_help'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                    : 'text-amber-300 hover:text-amber-200 hover:bg-slate-800'
                }`}
                title="Panduan solusi jika domain belum diarahkan di DNS / NXDOMAIN"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Solusi DNS</span>
                <span className="hidden sm:inline">Solusi NXDOMAIN</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('source')}
                className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'source'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span className="sm:hidden">Kode</span>
                <span className="hidden sm:inline">Kode Sumber</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer shrink-0 transition-colors"
              title="Tutup Preview"
            >
              <X className="h-4 sm:h-5 w-4 sm:w-5" />
            </button>
          </div>

          {/* URL Address Bar & Navigation Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
            {/* History and Home buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleBrowserBack}
                className="flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
                title={historyStack.length > 0 ? 'Halaman Sebelumnya (Back)' : 'Kembali'}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleBrowserForward}
                disabled={forwardStack.length === 0}
                className="flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-30 cursor-pointer transition-colors"
                title="Halaman Berikutnya (Forward)"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFileName('');
                  setActiveTab('preview');
                  setRefreshKey(k => k + 1);
                }}
                className="flex h-7 sm:h-8 w-7 sm:w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer transition-colors"
                title="Ke Halaman Utama (index)"
              >
                <Home className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Address Pill */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 rounded-xl bg-slate-950 border border-slate-700/80 px-2.5 py-1.5 text-xs text-slate-200 shadow-inner">
              <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-mono text-[11px] hidden sm:inline">https://</span>
              <select
                value={selectedDomain}
                onChange={e => handleNavigatePreview(e.target.value, '', activeTab)}
                className="bg-transparent font-mono text-xs font-bold text-white focus:outline-hidden cursor-pointer truncate flex-1 min-w-0"
              >
                {allSelectableDomains.map(d => (
                  <option key={d.domain} value={d.domain} className="bg-slate-900 text-white">
                    {d.domain} ({resolveCleanPath(d.documentRoot)})
                  </option>
                ))}
              </select>
              {selectedFileName && (
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/90 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[80px]">
                  /{selectedFileName}
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded hidden md:inline shrink-0">
                {targetDir}
              </span>
            </div>

            {/* Actions: Reload & Viewport */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setRefreshKey(k => k + 1)}
                className="flex h-7 sm:h-8 items-center gap-1 rounded-xl bg-slate-800 px-2 sm:px-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
                title="Muat Ulang Preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Reload</span>
              </button>

              <div className="hidden sm:flex items-center rounded-xl bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewport('desktop')}
                  className={`rounded-lg p-1.5 cursor-pointer ${
                    viewport === 'desktop' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                  title="Tampilan Desktop"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewport('mobile')}
                  className={`rounded-lg p-1.5 cursor-pointer ${
                    viewport === 'mobile' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                  title="Tampilan HP / Mobile"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>

              {onOpenFileManager && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFileManager(targetDir);
                  }}
                  className="flex h-7 sm:h-8 items-center gap-1 rounded-xl bg-sky-600/20 border border-sky-500/40 px-2 sm:px-2.5 text-xs font-semibold text-sky-300 hover:bg-sky-600/30 cursor-pointer transition-colors"
                  title={`Buka File Manager (${targetDir})`}
                >
                  <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden lg:inline">Folder</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 bg-slate-950 overflow-y-auto flex flex-col items-center justify-center relative">
          {activeTab === 'preview' && (
            <div className="w-full h-full flex flex-col items-center justify-between p-0 sm:p-2 bg-slate-950 relative">
              <div
                className={`bg-white h-full w-full transition-all duration-200 overflow-hidden shadow-2xl relative ${
                  viewport === 'mobile'
                    ? 'max-w-[375px] rounded-3xl border-4 border-slate-700 my-1'
                    : 'rounded-none sm:rounded-xl border border-slate-800'
                }`}
              >
                <iframe
                  key={`${selectedDomain}-${renderMode}-${refreshKey}`}
                  title={`Preview ${selectedDomain}`}
                  src={
                    renderMode === 'server'
                      ? `/api/vhost/preview-render?accountId=${encodeURIComponent(account.id)}&domain=${encodeURIComponent(
                          selectedDomain
                        )}&dir=${encodeURIComponent(targetDir)}${
                          selectedFileName ? `&file=${encodeURIComponent(selectedFileName)}` : ''
                        }&v=${refreshKey}`
                      : undefined
                  }
                  srcDoc={renderMode === 'sandbox' ? renderedHtml : undefined}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                />
              </div>

              {/* Bottom Quick Bar: Blank screen recovery & mode toggle */}
              <div className="w-full bg-slate-900/95 border-t border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] hidden sm:inline">Engine:</span>
                  <button
                    type="button"
                    onClick={() => setRenderMode(m => (m === 'server' ? 'sandbox' : 'server'))}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      renderMode === 'server'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {renderMode === 'server' ? 'Server Edge Nginx' : 'Sandbox Virtual DOM'} (Klik Ganti)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBlankHelp(b => !b)}
                    className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>Layar Putih / Blank?</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('source')}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer hidden md:inline"
                  >
                    Lihat Kode HTML
                  </button>
                </div>
              </div>

              {/* Blank Screen Diagnosis Dropdown */}
              {showBlankHelp && (
                <div className="absolute bottom-10 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 bg-slate-900 border border-amber-500/50 rounded-2xl p-4 shadow-2xl z-30 text-xs text-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Solusi Layar Putih / Blank
                    </span>
                    <button type="button" onClick={() => setShowBlankHelp(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Jika website sumber menggunakan framework JavaScript (React/Vue/SPA) atau WordPress/Plesk, browser sering kali memerlukan pemuatan modul JS atau mode Sandbox:
                  </p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span>1. Ganti ke Mode Sandbox Virtual DOM:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRenderMode('sandbox');
                          setShowBlankHelp(false);
                        }}
                        className="px-2 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-500 cursor-pointer"
                      >
                        Aktifkan
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span>2. Cek file index di folder {targetDir}:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBlankHelp(false);
                          if (onOpenFileManager) onOpenFileManager(targetDir);
                        }}
                        className="px-2 py-1 bg-sky-600 text-white rounded font-bold hover:bg-sky-500 cursor-pointer"
                      >
                        Buka Folder
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'source' && (
            <div className="w-full h-full p-4 overflow-y-auto font-mono text-xs text-slate-200 bg-slate-950 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sky-400 font-bold">
                  File Aktif: {activeEntryFile ? `${targetDir}/${activeEntryFile.name}` : 'Template Default'}
                </span>
                <span className="text-slate-400">
                  Total file di {targetDir}: {dirFiles.length} file
                </span>
              </div>
              <pre className="rounded-xl bg-slate-900 p-4 border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed text-[11px] text-emerald-300">
                {renderedHtml}
              </pre>
            </div>
          )}

          {activeTab === 'dns_help' && (
            <div className="w-full h-full p-4 sm:p-6 overflow-y-auto bg-slate-900 text-slate-100 space-y-5 text-xs">
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-amber-300">
                      Kenapa muncul &ldquo;Situs ini tidak dapat dijangkau (DNS_PROBE_FINISHED_NXDOMAIN)&rdquo; saat membuka {selectedDomain} di Chrome?
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      Error <code>DNS_PROBE_FINISHED_NXDOMAIN</code> berarti browser HP Anda bertanya ke internet publik (Google DNS / Cloudflare) mengenai alamat IP dari <strong>{selectedDomain}</strong>, namun domain tersebut <strong>belum diarahkan (pointing) di panel Registrar tempat Anda membeli domain</strong>, atau file hasil kloning masih berada di dalam <strong>Virtual File System (Sandbox Lokal) Cloud PRO</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white font-bold text-xs">
                      1
                    </span>
                    <h4 className="font-bold text-sm text-white">
                      Cara Melihat Hasil Kloning Sekarang (Tanpa Menunggu DNS)
                    </h4>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    File yang Anda tarik melalui fitur <strong>Sync / Clone Website</strong> sudah tersimpan di <code>{targetDir}</code>. Anda bisa langsung melihat dan menguji tampilannya melalui tab <strong>Live Preview</strong> di atas tanpa perlu keluar dari aplikasi!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="w-full rounded-xl bg-sky-600 py-2 font-bold text-white hover:bg-sky-500 cursor-pointer"
                  >
                    Buka Live Preview {selectedDomain} Sekarang
                  </button>
                </div>

                {/* Step 2 */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                      2
                    </span>
                    <h4 className="font-bold text-sm text-white">
                      Cara Agar Domain {selectedDomain} Bisa Diakses Publik di Chrome
                    </h4>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Buka tempat Anda mendaftarkan domain <strong>denbaguse.my.id</strong> (misalnya <strong>Cloudflare, Rumahweb, Niagahoster, DomaiNesia, atau IDCloudHost</strong>), lalu tambahkan DNS Record berikut di menu <strong>DNS Management</strong>:
                  </p>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-emerald-400 font-bold">Opsi A: Arahkan ke VPS / IP Server Fisik</div>
                        <div className="text-slate-300 mt-0.5">
                          Tipe: <strong>A</strong> &bull; Host: <strong>@</strong> &bull; Value: <strong>{account.ipAddress}</strong>
                        </div>
                        <div className="text-slate-400">
                          Tipe: <strong>A</strong> &bull; Host: <strong>rdm</strong> &bull; Value: <strong>{account.ipAddress}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(account.ipAddress, 'ip')}
                        className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer shrink-0"
                      >
                        {copiedText === 'ip' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <div className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sky-400 font-bold">Opsi B: Custom Domain Cloud Run / Cloudflare</div>
                        <div className="text-slate-300 mt-0.5 truncate">
                          Tipe: <strong>CNAME</strong> &bull; Host: <strong>@ / www</strong> &bull; Target: <strong>{currentAppHost}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentAppHost, 'host')}
                        className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer shrink-0"
                      >
                        {copiedText === 'host' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                  <span>Checklist Penting di Registrar / Cloudflare (denbaguse.my.id):</span>
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-300 leading-relaxed">
                  <li>
                    <strong>Jangan gunakan Nameserver <code>ns1.denbaguse.my.id</code> di Registrar</strong> kecuali Anda sudah mendaftarkan <em>Child Nameserver / Glue Record</em> ke IP VPS publik yang menjalankan layanan BIND9 (Port 53).
                  </li>
                  <li>
                    Cara paling mudah &amp; gratis: Gunakan <strong>Nameserver bawaan Registrar</strong> atau <strong>Cloudflare DNS</strong>, lalu cukup tambahkan <strong>Record A (<code>@</code>, <code>www</code>, <code>rdm</code>, <code>portal</code>)</strong> ke IP server Anda atau <strong>CNAME</strong> ke URL aplikasi hosting Anda.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
