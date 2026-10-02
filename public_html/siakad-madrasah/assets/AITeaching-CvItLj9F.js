import{u as wa,z as Ba,r as f,a9 as $a,s as D,j as a,h as T,i as Y,k as sa,B as ka,K as R,P as La,a1 as ra,S as va,W as la,v as ma}from"./index-CCahgCu8.js";import{T as Da}from"./textarea-mBet1w8O.js";import{D as Ua,a as Ja,b as Oa,c as Ga}from"./dialog-BuuCiLXk.js";import{S as U,a as J,b as O,c as G,d as w}from"./select-D7ahweI-.js";import{S as Fa,C as Ha}from"./checkbox-DlaeT8yW.js";import{A as Wa}from"./AdminLayout-C3pm3JEp.js";import{B as Q}from"./badge-SWT9k8Sx.js";import{K as Va}from"./KopSurat-DHAa3G6R.js";import{P as za}from"./PenandatanganDokumen-khKoKHi6.js";import{A as Ya}from"./arrow-left-CEeBlXHE.js";import{P as Qa}from"./printer-DxGXxTqW.js";import{S as qa}from"./search-C3eTRADL.js";import{C as ua}from"./calendar-days-B6b73NEo.js";import{C as Xa}from"./calendar-range-V2aHlQCg.js";import{L as Za,C as a_}from"./list-checks-DjmbGLOg.js";import{F as __}from"./file-check-o-t7kRra.js";import{H as e_}from"./history-BSXET1XT.js";import{L as n_}from"./layers-CJe4BTBW.js";import{P as i_}from"./plus-BFTaXOOV.js";import{T as t_}from"./trash-2-CnFTzLi7.js";import{S as s_}from"./save-phZikyYe.js";import"./Combination-BLaXy8Oi.js";import"./check-DIB8RHiI.js";import"./chevron-up-BU179vMV.js";import"./dropdown-menu-DETV_kjy.js";import"./chevron-right-CfrJgNS4.js";import"./archive-CUduRbSg.js";import"./building-BdFguEX8.js";import"./book-marked-ygpEe_me.js";import"./heart-handshake-BRW4W9Cx.js";import"./user-round-check-C0hqgqCE.js";import"./file-spreadsheet-CKAYWxEN.js";import"./panels-top-left-BPqtZreb.js";import"./database-BWzWvqLs.js";import"./external-link-HcQKm7Ve.js";import"./shield-alert-DaB-gSp3.js";import"./formatGelar-DvtJTrhG.js";const B=[{value:"prota",label:"PROTA",fullLabel:"Program Tahunan (PROTA)",icon:ua,color:"bg-cyan-600"},{value:"promes",label:"PROMES",fullLabel:"Program Semester (PROMES)",icon:Xa,color:"bg-teal-600"},{value:"silabus",label:"ATP / Silabus",fullLabel:"Alur Tujuan Pembelajaran (ATP) / Silabus",icon:Za,color:"bg-purple-600"},{value:"rpp_rpm",label:"RPP / RPM",fullLabel:"Rencana Pelaksanaan Pembelajaran (RPP/RPM)",icon:__,color:"bg-amber-500"},{value:"modul_ajar",label:"Modul Ajar",fullLabel:"Modul Ajar Kurikulum Merdeka",icon:ka,color:"bg-emerald-600"},{value:"jurnal_mengajar",label:"Jurnal Mengajar",fullLabel:"Jurnal Harian Mengajar",icon:e_,color:"bg-rose-500"},{value:"cp_tp_atp",label:"Analisis CP-TP-ATP",fullLabel:"Analisis Capaian dan Tujuan Pembelajaran",icon:n_,color:"bg-indigo-600"},{value:"kktp",label:"KKTP",fullLabel:"Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)",icon:a_,color:"bg-orange-600"}],r_=[{value:"Fase A - Kelas 1",label:"Fase A - Kelas 1"},{value:"Fase A - Kelas 2",label:"Fase A - Kelas 2"},{value:"Fase B - Kelas 3",label:"Fase B - Kelas 3"},{value:"Fase B - Kelas 4",label:"Fase B - Kelas 4"},{value:"Fase C - Kelas 5",label:"Fase C - Kelas 5"},{value:"Fase C - Kelas 6",label:"Fase C - Kelas 6"}],l_=["Al-Quran Hadits","Akidah Akhlak","Fiqih","Sejarah Kebudayaan Islam","Bahasa Arab","Pendidikan Pancasila","Bahasa Indonesia","Matematika","IPAS","Seni Budaya","PJOK","Bahasa Inggris","Muatan Lokal"],V_=()=>{const{settings:S}=wa(),{activeMadrasah:oa}=Ba(),[$,F]=f.useState([]),[m_,pa]=f.useState(!0),[da,H]=f.useState(!1),[I,q]=f.useState(null),W=$a(oa,S.identitas_madrasah,S.general?.school_name||"Si@Kad"),[X,Z]=f.useState(!1),[aa,_a]=f.useState(!1),[L,ga]=f.useState(""),[v,ha]=f.useState("all"),[V,ca]=f.useState([]),ea=new Date,ba=ea.toLocaleDateString("id-ID",{year:"numeric",month:"long",day:"numeric"}),Aa=ea.toLocaleDateString("id-ID",{weekday:"long"}),[m,K]=f.useState({jenis_dokumen:"modul_ajar",mata_pelajaran:"Al-Quran Hadits",fase:"Fase A - Kelas 1",topik:"",materi_pokok:[],alokasi_waktu:"2 × 35 menit",pertemuan:"",hasil:"",tanggal_cetak:new Date().toISOString().split("T")[0]});f.useEffect(()=>{ja(),na()},[]);const na=async()=>{try{const{data:_}=await D.from("site_settings").select("value").eq("id","bedah_cp_data").maybeSingle();_?.value&&Array.isArray(_.value)&&ca(_.value)}catch(_){console.error("Error fetching bedah_cp_data in AITeaching:",_)}},ja=async()=>{try{const{data:_,error:n}=await D.from("site_settings").select("value").eq("id","ai_teaching_list").maybeSingle();if(_?.value&&Array.isArray(_.value)){const l=_.value.map(s=>({...s,created_at:s.created_at||s.tanggal_cetak?new Date(`${s.tanggal_cetak}T00:00:00`).toISOString():new Date(Date.now()-Math.random()*30*24*60*60*1e3).toISOString(),tahun_pelajaran:s.tahun_pelajaran||"2024/2025",semester:s.semester||"Ganjil"}));F(l)}}catch(_){console.error(_)}finally{pa(!1)}},Pa=f.useMemo(()=>$.filter(_=>{const n=_.topik.toLowerCase().includes(L.toLowerCase())||_.mata_pelajaran.toLowerCase().includes(L.toLowerCase()),l=v==="all"||_.jenis_dokumen===v;return n&&l}),[$,L,v]),z=_=>_?_.toLowerCase().replace(/['\-\s]/g,""):"",ia=_=>{if(!_)return"";const n=_.match(/Fase\s*([A-F])/i)||_.match(/\b([A-F])\b/i);return n?n[1].toUpperCase():_.trim().toUpperCase()},E=f.useMemo(()=>{const _=V.length>0?V:S.bedah_cp_data||[];if(!_||!Array.isArray(_))return[];const n=z(m.mata_pelajaran),l=ia(m.fase);let s=_.filter(i=>{if(!i||!i.materi_pokok||typeof i.materi_pokok!="string"||!i.materi_pokok.trim())return!1;const r=z(i.mata_pelajaran),e=ia(i.fase);return(r===n||r.includes(n)||n.includes(r))&&(!e||e===l)});s.length===0&&n&&(s=_.filter(i=>{if(!i||!i.materi_pokok||typeof i.materi_pokok!="string"||!i.materi_pokok.trim())return!1;const r=z(i.mata_pelajaran);return r===n||r.includes(n)||n.includes(r)}));const t=new Map;return s.forEach(i=>{const r=i.materi_pokok.trim().toLowerCase();t.has(r)||t.set(r,i)}),Array.from(t.values())},[V,S.bedah_cp_data,m.mata_pelajaran,m.fase]),Na=_=>{K(n=>({...n,materi_pokok:n.materi_pokok.includes(_)?n.materi_pokok.filter(l=>l!==_):[...n.materi_pokok,_]}))},ta=_=>{const n=S.penandatangan?.guru_kelas||[],l=_.match(/\d+/),s=l?l[0]:null;if(s){const t=n.find(i=>{const e=(i.kelas?.toLowerCase()||"").match(/\d+/);return e&&e[0]===s});if(t)return t}return{nama:"..........................................",nip:"..........................................",jabatan:"Guru Kelas",kelas:_}},Sa=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,tanggal_cetak:p,teacher:d,selectedMateriData:k}=_,u=k?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,c=k?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`,b=u.split(/\r?\n/).filter(Boolean),A=c.split(/\r?\n/).filter(Boolean).map(P=>P.replace(/^\d+\.\s*/,"")),N=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


ANALISIS CP-TP-ATP

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
TANGGAL: ${p}

Disusun Oleh:
${d.nama}
NIP. ${d.nip}`,M=`[PAGE_BREAK]
[IDENTITAS_TABLE]
`,y=`1. CAPAIAN PEMBELAJARAN (CP)
${b.map((P,o)=>`${o+1}. ${P}`).join(`
`)}

2. RASIONALITAS CP
Materi ${e[0]} penting untuk perkembangan siswa karena terkait kehidupan sehari-hari dan pembentukan karakter yang mengintegrasikan Moderasi Beragama, Profil Pelajar Pancasila, Deep Learning, dan KBC.

3. TUJUAN PEMBELAJARAN (TP)
| Elemen | TP | Level | Materi | Indikator |
|---|---|---|---|---|
${A.map((P,o)=>`| ${o+1} | ${P} | C${o+2} | ${e[0]} | Siswa dapat ${P.toLowerCase()} |`).join(`
`)}

4. ALUR TUJUAN PEMBELAJARAN (ATP)
| No | Urutan | Materi | Kegiatan | Asesmen |
|---|---|---|---|---|
${A.map((P,o)=>`| ${o+1} | ${o===0?"Awal":o===1?"Lanjutan":"Penguatan"} | ${e[0]} | ${o===0?"Pemahaman konsep":o===1?"Aplikasi praktis":"Evaluasi"} | ${o===0?"Observasi":o===1?"Rubrik":"Portofolio"} |`).join(`
`)}

5. INTEGRASI NILAI
- Moderasi Beragama: Toleransi perspektif berbeda
- Profil Pelajar Pancasila: Gotong royong, berpikir kritis
- Deep Learning: Pemahaman mendalam melalui analisis
- KBC: Berpikir kritis, kolaborasi, kreativitas

6. ASESMEN
Diagnostik: Observasi awal
Formatif: LKPD, tes lisan
Sumatif: Tes tertulis, portofolio`;return N+M+y},Ma=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,alokasi_waktu:p,pertemuan:d,tanggal_cetak:k,teacher:u,selectedMateriData:c}=_,b=c?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,A=c?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`;b.split(/\r?\n/).filter(Boolean);const N=A.split(/\r?\n/).filter(Boolean).map(g=>g.replace(/^\d+\.\s*/,"")),M=[{dimensi:"Beriman, Bertakwa Kepada Tuhan YME & Berakhlak Mulia",indikator:"Melaksanakan ibadah, berdoa dengan khusyuk, berakhlak mulia",integrasi:"Doa bersama, pembiasaan ibadah, pengamalan nilai agama dalam pembelajaran",kbc:"Cinta kepada Allah"},{dimensi:"Bergotong Royong",indikator:"Bekerja sama, saling membantu dalam kelompok",integrasi:"Diskusi kelompok, proyek bersama, tolong-menolong antar siswa",kbc:"Cinta kepada Sesama"},{dimensi:"Berkebinekaan Global",indikator:"Menghargai perbedaan, toleransi beragama",integrasi:"Dialog tentang keberagaman, moderasi beragama, menghargai keyakinan lain",kbc:"Cinta kepada Sesama"}],y=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


RENCANA PELAKSANAAN PEMBELAJARAN (RPP)

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
MATERI POKOK: ${e[0]}
ALOKASI WAKTU: ${p}
PERTEMUAN KE: ${d||"-"}
TANGGAL: ${k}

Disusun Oleh:
${u.nama}
NIP. ${u.nip}`,P=`[PAGE_BREAK]
`,o=`**A. IDENTITAS**

| Aspek | Keterangan |
|-------|------------|
| Nama Madrasah | ${n} |
| Mata Pelajaran | ${i} |
| Kelas/Semester | ${r} / ${t} |
| Materi Pokok | ${e.join(", ")} |
| Alokasi Waktu | ${p} |
| Pertemuan Ke | ${d||"-"} |
| Tahun Pelajaran | ${s} |

**B. TUJUAN PEMBELAJARAN**

Tujuan pembelajaran dirumuskan dari CP (Capaian Pembelajaran) Kurikulum Merdeka dengan mengintegrasikan aspek pengetahuan, sikap, dan keterampilan:

${N.map((g,j)=>`${j+1}. ${g}`).join(`
`)}

**C. PROFIL PELAJAR PANCASILA & INTEGRASI KBC**

| **Dimensi** | **Indikator** | **Integrasi dalam Pembelajaran** | **KBC Terintegrasi** |
|-------------|---------------|----------------------------------|---------------------|
${M.map(g=>`| **${g.dimensi}** | ${g.indikator} | ${g.integrasi} | ${g.kbc} |`).join(`
`)}

**Materi Integrasi KBC:**

Materi ${e[0]} diintegrasikan dengan nilai-nilai Cinta sebagai berikut:
1. **Cinta kepada Allah**: Melalui pengenalan konsep ${e[0]} sebagai bagian dari ajaran agama dan pelaksanaan ibadah
2. **Cinta kepada Rasul**: Meneladani akhlak dan sunnah Nabi Muhammad SAW yang terkait dengan materi ${e[0]}
3. **Cinta kepada Orang Tua**: Menghormati dan mentaati orang tua sebagai manifestasi dari nilai ${e[0]}
4. **Cinta kepada Sesama**: Menerapkan toleransi, saling membantu, dan menghargai perbedaan sesuai materi ${e[0]}
5. **Cinta kepada Lingkungan**: Menjaga kebersihan dan kelestarian alam sebagai wujud dari nilai ${e[0]}
6. **Cinta kepada Ilmu**: Bersemangat belajar dan mencari pengetahuan tentang materi ${e[0]} dengan cinta

**Integrasi Nilai Kurikulum Berbasis Cinta (KBC):**

| Aspek Cinta | Penjelasan Integrasi | Contoh Implementasi |
|-------------|-------------------|---------------------|
| **Cinta kepada Allah** | Melalui pembiasaan ibadah dan pengamalan ajaran agama | Doa bersama, dzikir, pengingat kewajiban agama |
| **Cinta kepada Rasul** | Dengan meneladani akhlak dan sunnah Nabi Muhammad SAW | Pembelajaran sirah, praktik sunnah, teladan akhlak |
| **Cinta kepada Orang Tua** | Melalui penghormatan, ketaatan, dan membantu pekerjaan | Pengingat kewajiban anak, berdoa untuk orang tua |
| **Cinta kepada Sesama** | Dengan sikap saling menghargai, tolong-menolong, toleransi | Kerja sama kelompok, berbagi, menghargai perbedaan |
| **Cinta kepada Lingkungan** | Melalui kepedulian kebersihan dan kelestarian alam | Kebersihan kelas, pelestarian lingkungan sekolah |
| **Cinta kepada Ilmu** | Dengan semangat belajar tinggi dan kecintaan pengetahuan | Motivasi belajar, eksplorasi, diskusi aktif |

**D. KOMPETENSI AWAL**

Kemampuan awal siswa yang menjadi prasyarat pembelajaran:
- Siswa memiliki pengetahuan dasar tentang ${e[0]}
- Siswa mampu mengidentifikasi nilai-nilai moral dalam kehidupan sehari-hari
- Siswa memiliki motivasi belajar dan kecintaan terhadap ilmu agama
- Siswa terbiasa dengan pembiasaan ibadah dan akhlak mulia

**E. SARANA DAN PRASARANA**

| Kategori | Sarana/Prasarana |
|----------|------------------|
| **Ruang** | Ruang kelas nyaman, mushola, lingkungan sekitar |
| **Media** | LCD proyektor, laptop, speaker, bahan ajar visual |
| **Bahan Ajar** | Buku siswa/guru Kurikulum Merdeka, alat tulis, kertas |
| **Praktikum** | Bahan praktikum sesuai materi, alat peraga edukatif |

**F. MODEL, METODE, DAN PENDEKATAN**

| Aspek | Keterangan |
|-------|------------|
| **Model Pembelajaran** | Project Based Learning (PjBL) dengan integrasi nilai cinta |
| **Metode** | Discovery Learning, Cooperative Learning, Contextual Teaching Learning |
| **Pendekatan** | Deep Learning melalui eksplorasi mendalam, analisis kritis, refleksi berkelanjutan |
| **Strategi Berbasis Cinta** | Setiap kegiatan diintegrasikan nilai cinta; pembelajaran aktif berbasis proyek; penguatan karakter melalui refleksi |

**G. LANGKAH-LANGKAH PEMBELAJARAN**

**1. PENDAHULUAN**

| Waktu | Kegiatan | Integrasi Nilai Cinta | Contoh Implementasi |
|-------|----------|----------------------|-------------------|
| 5 menit | Salam dan doa bersama | Cinta kepada Allah | "Mari kita mulai dengan doa sebagai wujud cinta kita kepada Allah SWT" |
| 5 menit | Apersepsi dan motivasi | Cinta kepada Ilmu | "Siapa yang bisa menceritakan pengalaman tentang ${e[0]}?" |
| 3 menit | Penanaman nilai cinta | Cinta kepada Sesama | "Hari ini kita akan belajar saling menghargai pendapat teman" |
| 2 menit | Penyampaian tujuan | Cinta kepada Ilmu | "Tujuan kita hari ini adalah memahami ${e[0]} dengan penuh cinta" |

**2. KEGIATAN INTI**

| Tahap | Waktu | Kegiatan | Integrasi KBC | Pendekatan Deep Learning |
|-------|-------|----------|---------------|------------------------|
| **Eksplorasi**(Mengamati/Menanya) | 15 menit | Siswa mengamati contoh penerapan materi, mengajukan pertanyaan, mengumpulkan informasi | Cinta kepada Ilmu (eksplorasi), Cinta kepada Allah (pembiasaan doa) | Mengaktifkan pengetahuan awal, merangsang rasa ingin tahu |
| **Elaborasi**(Diskusi/Kolaborasi) | 25 menit | Diskusi kelompok tentang implementasi nilai cinta, kerja sama menyelesaikan tugas, berbagi hasil | Cinta kepada Sesama (kolaborasi), Cinta kepada Lingkungan (tugas kontekstual) | Mengkonstruksi pengetahuan melalui interaksi sosial |
| **Konfirmasi**(Refleksi & Penguatan) | 15 menit | Pembahasan bersama hasil eksplorasi, penguatan nilai cinta, klarifikasi konsep | Cinta kepada Allah (penguatan nilai), Cinta kepada Orang Tua (tindak lanjut rumah) | Mentransfer pengetahuan ke konteks kehidupan |

**3. PENUTUP**

| Waktu | Kegiatan | Integrasi Nilai Cinta | Contoh Implementasi |
|-------|----------|----------------------|-------------------|
| 5 menit | Refleksi siswa | Cinta kepada Ilmu | "Apa yang kamu pelajari hari ini? Bagaimana mengamalkannya?" |
| 3 menit | Kesimpulan materi | Cinta kepada Allah | "Kesimpulannya, ${e[0]} mengajarkan kita untuk selalu mencintai Allah" |
| 3 menit | Penguatan nilai cinta | Cinta kepada Orang Tua | "Di rumah, tunjukkan cinta kepada orang tua dengan membantu pekerjaan" |
| 4 menit | Doa penutup | Cinta kepada Allah | "Mari kita akhiri dengan doa syukur atas ilmu yang diperoleh" |

**H. ASESMEN**

**1. ASESMEN DIAGNOSTIK**

| Instrumen | Tujuan | Contoh |
|-----------|--------|--------|
| Observasi awal | Mengidentifikasi kemampuan awal | Mengamati partisipasi siswa dalam apersepsi |
| Angket sederhana | Mengetahui pengetahuan dasar | "Sebutkan 3 nilai yang terkandung dalam ${e[0]}" |

**2. ASESMEN FORMATIF**

| Instrumen | Teknik Penilaian | Rubrik Sederhana |
|-----------|------------------|-----------------|
| LKPD | Checklist | ✓ Lengkap (4), ✓ Cukup (3), ✓ Kurang (2), ✓ Belum (1) |
| Observasi partisipasi | Skala penilaian | Aktif (4), Cukup aktif (3), Kurang aktif (2), Pasif (1) |
| Diskusi kelompok | Rubrik | Berkontribusi (4), Mendengarkan (3), Mengganggu (2), Tidak terlibat (1) |

**Rubrik Nilai Cinta:**

| Aspek | 4 (Sangat Baik) | 3 (Baik) | 2 (Cukup) | 1 (Kurang) |
|-------|------------------|----------|-----------|------------|
| Cinta Allah | Selalu berdoa | Sering berdoa | Kadang berdoa | Jarang berdoa |
| Cinta Rasul | Meneladani akhlak | Mengenal sunnah | Tahu sedikit | Tidak mengenal |
| Cinta Orang Tua | Selalu membantu | Sering membantu | Kadang membantu | Jarang membantu |
| Cinta Sesama | Selalu tolong-menolong | Sering membantu | Kadang membantu | Egois |
| Cinta Lingkungan | Selalu menjaga kebersihan | Sering menjaga | Kadang menjaga | Tidak peduli |
| Cinta Ilmu | Sangat antusias | Antusias | Cukup antusias | Malas belajar |

**3. ASESMEN SUMATIF**

| Instrumen | Bentuk | Contoh Soal |
|-----------|--------|-------------|
| Tes tertulis | Pilihan ganda, uraian singkat | "Mengapa kita harus mencintai orang tua? Jelaskan dengan contoh!" |
| Portofolio | Kumpulan hasil kerja siswa | Jurnal harian penerapan nilai cinta |
| Penilaian proyek | Presentasi hasil proyek | Presentasi "Nilai Cinta dalam Kehidupan Sehari-hari" |

**I. PENGAYAAN DAN REMEDIAL**

**PENGAYAAN (untuk siswa yang telah mencapai tujuan):**
- Membuat poster edukasi tentang nilai cinta
- Proyek mini: "Aku dan Nilai Cinta dalam Kehidupan Sehari-hari"
- Menjadi tutor bagi teman yang membutuhkan bantuan
- Membuat video pendek tentang penerapan nilai cinta
- Mengikuti lomba karya tulis tentang nilai cinta

**REMEDIAL (untuk siswa yang belum mencapai tujuan):**
- Pengulangan materi dengan metode berbeda (cerita, gambar, permainan)
- Bimbingan individual atau kelompok kecil
- Tugas remedial: Membuat jurnal harian tentang penerapan nilai cinta
- Penggunaan media pembelajaran alternatif (video, audio, gambar)
- Konsultasi dengan guru atau teman sebaya

**J. REFLEKSI GURU & PESERTA DIDIK**

**REFLEKSI GURU:**
- Apakah tujuan pembelajaran tercapai sesuai target?
- Bagaimana implementasi nilai cinta dalam setiap langkah pembelajaran?
- Metode mana yang paling efektif menumbuhkan cinta ilmu?
- Apakah Profil Pelajar Pancasila terintegrasi dengan baik?
- Perbaikan apa yang diperlukan untuk pembelajaran selanjutnya?
- Bagaimana pengembangan Moderasi Beragama melalui kegiatan ini?

**REFLEKSI PESERTA DIDIK:**
- Apa yang paling kamu sukai dari pembelajaran hari ini?
- Nilai cinta mana yang paling mudah kamu terapkan?
- Bagaimana kamu akan mengamalkan nilai cinta di rumah?
- Saran untuk membuat pembelajaran lebih menarik?
- Apa yang sudah kamu lakukan hari ini sebagai wujud cinta?

**CATATAN PENTING:**
- RPP ini dirancang sesuai prinsip efektif, efisien, dan berorientasi siswa
- Fokus utama adalah pengembangan karakter melalui nilai cinta
- Pembelajaran aktif dengan pendekatan deep learning
- Asesmen holistik meliputi kognitif, afektif, dan psikomotorik
- Siap digunakan sebagai acuan pembelajaran di madrasah ibtidaiyah

[PAGE_BREAK]

**LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)**

---

# LEMBAR KERJA PESERTA DIDIK

| Keterangan | Detail |
|------------|--------|
| **Mata Pelajaran** | ${i} |
| **Materi** | ${e[0]} |
| **Kelas/Fase** | ${r} |
| **Semester** | ${t} |
| **Tahun Pelajaran** | ${s} |

---

**Identitas Siswa:**

| Field | Keterangan |
|-------|------------|
| **Nama Siswa** | ___________________________ |
| **NIS** | ___________________________ |
| **Tanggal Pengerjaan** | ___________________________ |

---

## **PETUNJUK KERJA:**

1. Bacalah dengan teliti setiap soal yang diberikan
2. Kerjakan soal-soal berikut dengan penuh cinta ilmu dan keikhlasan
3. Gunakan bahasa yang baik dan benar
4. Jawablah dengan jujur dan sesuai kemampuanmu
5. Perlihatkan nilai cinta dalam setiap jawabanmu

---

## **A. PEMAHAMAN KONSEP**

### 1. Pengertian dan Konsep Dasar
Jelaskan pengertian ${e[0]} menurut ajaran Islam:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 2. Nilai-nilai Cinta yang Terkandung
Sebutkan nilai cinta yang dapat dipelajari dari materi ${e[0]}:

| No | Aspek Cinta | Contoh Penerapan |
|----|-------------|------------------|
| 1 | Cinta kepada Allah | |
| 2 | Cinta kepada Rasul | |
| 3 | Cinta kepada Orang Tua | |
| 4 | Cinta kepada Sesama | |
| 5 | Cinta kepada Lingkungan | |
| 6 | Cinta kepada Ilmu | |

---

## **B. PENERAPAN DALAM KEHIDUPAN**

### 3. Contoh Penerapan di Rumah
Bagaimana kamu akan menerapkan nilai ${e[0]} di rumah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 4. Contoh Penerapan di Sekolah
Bagaimana kamu akan menerapkan nilai ${e[0]} di sekolah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 5. Contoh Penerapan di Masyarakat
Bagaimana kamu akan menerapkan nilai ${e[0]} di masyarakat?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **C. REFLEKSI DAN NILAI CINTA**

### 6. Refleksi Pembelajaran
Apa yang kamu pelajari dari materi ${e[0]}?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 7. Nilai Cinta yang Paling Berkesan
Nilai cinta mana yang paling berkesan bagimu? Mengapa?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 8. Rencana Pengamalan
Bagaimana kamu akan mengamalkan nilai cinta tersebut dalam kehidupan sehari-hari?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **D. KREATIVITAS DAN EKSPRESI**

### 9. Ekspresi Kreatif
Buatlah gambar, poster, atau simbol yang menunjukkan penerapan nilai cinta dari materi ${e[0]}:

**[Ruang Gambar/Karya Seni - 15x20 cm]**

### 10. Pesan untuk Teman
Tuliskan pesan untuk teman-temanmu tentang pentingnya nilai cinta dalam kehidupan:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

**PENILAIAN LKPD**

| Aspek | Kriteria | Skor | Keterangan |
|-------|----------|------|------------|
| **Pemahaman Konsep** | Jawaban lengkap, benar, dan sesuai | _____/20 | |
| **Penerapan** | Contoh konkret dan relevan | _____/30 | |
| **Refleksi** | Jawaban mendalam dan jujur | _____/20 | |
| **Kreativitas** | Ekspresi orisinal dan menarik | _____/20 | |
| **Nilai Cinta** | Terlihat dalam setiap jawaban | _____/10 | |
| **TOTAL** | | _____/100 | |

**Skor Akhir:** _________  
**Nilai Huruf:** _________  
**Keterangan Guru:** __________________________________________

[PAGE_BREAK]

**LAMPIRAN 2: KUNCI JAWABAN (UNTUK GURU)**

## **A. PEMAHAMAN KONSEP**

### 1. Pengertian dan Konsep Dasar
Jawaban bervariasi sesuai pemahaman siswa tentang ${e[0]}

### 2. Nilai-nilai Cinta yang Terkandung
| No | Aspek Cinta | Contoh Penerapan |
|----|-------------|------------------|
| 1 | Cinta kepada Allah | Melaksanakan ibadah, berdoa, dzikir |
| 2 | Cinta kepada Rasul | Meneladani akhlak, mengikuti sunnah |
| 3 | Cinta kepada Orang Tua | Hormat, taat, membantu pekerjaan |
| 4 | Cinta kepada Sesama | Tolong-menolong, toleransi |
| 5 | Cinta kepada Lingkungan | Menjaga kebersihan, melestarikan alam |
| 6 | Cinta kepada Ilmu | Semangat belajar, mencari pengetahuan |

## **B. PENERAPAN DALAM KEHIDUPAN**

Jawaban bervariasi sesuai pengalaman dan pemahaman siswa

## **C. REFLEKSI DAN NILAI CINTA**

Jawaban dinilai berdasarkan kejujuran dan kedalaman refleksi

---

**RUBRIK PENILAIAN:**

| Skor | Kriteria |
|------|----------|
| 90-100 | Jawaban sangat lengkap, benar, kreatif, dan menunjukkan nilai cinta |
| 80-89 | Jawaban lengkap, benar, dan cukup kreatif |
| 70-79 | Jawaban cukup lengkap dan cukup benar |
| 60-69 | Jawaban kurang lengkap dan kurang benar |
| <60 | Jawaban tidak lengkap dan tidak benar |
`;return y+P+o},fa=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,alokasi_waktu:p,pertemuan:d,tanggal_cetak:k,teacher:u,selectedMateriData:c}=_,b=c?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,A=c?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`,N=b.split(/\r?\n/).filter(Boolean),M=A.split(/\r?\n/).filter(Boolean).map(j=>j.replace(/^\d+\.\s*/,"")),y=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


MODUL AJAR KURIKULUM MERDEKA

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
MATERI: ${e[0]}
ALOKASI WAKTU: ${p}
PERTEMUAN: ${d||"-"}
TANGGAL: ${k}

Disusun Oleh:
${u.nama}
NIP. ${u.nip}`,P=[{dimensi:"Beriman, Bertakwa Kepada Tuhan YME & Berakhlak Mulia",indikator:"Melaksanakan ibadah, berdoa dengan khusyuk, berakhlak mulia",integrasi:"Doa bersama, pembiasaan ibadah, pengamalan nilai agama dalam pembelajaran",kbc:"Cinta kepada Allah"},{dimensi:"Bergotong Royong",indikator:"Bekerja sama, saling membantu dalam kelompok",integrasi:"Diskusi kelompok, proyek bersama, tolong-menolong antar siswa",kbc:"Cinta kepada Sesama"},{dimensi:"Berkebinekaan Global",indikator:"Menghargai perbedaan, toleransi beragama",integrasi:"Dialog tentang keberagaman, moderasi beragama, menghargai keyakinan lain",kbc:"Cinta kepada Sesama"}],o=[{prinsip:"Toleransi",implementasi:"Diskusi tentang perbedaan pandangan dalam agama, menghargai keyakinan orang lain",tujuan:"Membentuk sikap saling menghormati dan hidup harmonis",kbc:"Cinta kepada Sesama"},{prinsip:"Akhlak Mulia",implementasi:"Pengamalan nilai-nilai universal (jujur, disiplin, tanggung jawab) dalam kehidupan sehari-hari",tujuan:"Membentuk karakter yang baik sesuai ajaran agama",kbc:"Cinta kepada Allah, Rasul, Orang Tua"},{prinsip:"Inklusivitas",implementasi:"Pembelajaran yang mencakup semua siswa tanpa membedakan latar belakang",tujuan:"Membentuk masyarakat yang inklusif dan peduli",kbc:"Cinta kepada Sesama"}],g=`**A. IDENTITAS MODUL AJAR**

| Kategori | Informasi | Keterangan |
|---|---|---|
| Satuan Pendidikan | ${n} | Madrasah |
| Nama Yayasan | ${l} | - |
| Mata Pelajaran | ${i} | PAI |
| Fase/Kelas | ${r} | Sesuai KM |
| Semester | ${t} | ${t==="Ganjil"?"Jan-Jun":"Jul-Des"} |
| Materi Pokok | ${e[0]} | Topik Utama |
| Alokasi Waktu | ${p} | Total JP |
| Pertemuan | ${d||"-"} | Ke-N |
| Tahun Pelajaran | ${s} | Periode |
| Tanggal Pembuatan | ${k} | Tgl Cetak |
| Penyusun | ${u.nama} | Guru |
| NIP | ${u.nip} | NUPTK/NIP |

**B. CAPAIAN PEMBELAJARAN (CP)**

${N.map((j,h)=>`${h+1}. ${j}`).join(`
`)}

**C. TUJUAN PEMBELAJARAN (TP)**

${M.map((j,h)=>`${h+1}. ${j}`).join(`
`)}

**D. KOMPETENSI AWAL PESERTA DIDIK**

Pengetahuan/Prasyarat Siswa:
- Siswa telah memahami konsep dasar ${e[0]} sebagai bagian dari ajaran agama Islam
- Siswa memiliki pengetahuan tentang nilai-nilai moral dan etika dalam kehidupan sehari-hari
- Siswa mampu mengidentifikasi contoh penerapan nilai cinta dalam kehidupan
- Siswa memiliki pengalaman kolaborasi dan diskusi kelompok

**E. PROFIL PELAJAR PANCASILA (Yang Relevan dengan Materi)**

| **Dimensi** | **Indikator** | **Integrasi dalam Pembelajaran** | **KBC Terintegrasi** |
|-------------|---------------|----------------------------------|---------------------|
${P.map(j=>`| **${j.dimensi}** | ${j.indikator} | ${j.integrasi} | ${j.kbc} |`).join(`
`)}

**F. MODERASI BERAGAMA (Yang Relevan dengan Materi)**

| **Prinsip** | **Implementasi dalam Pembelajaran** | **Tujuan** | **KBC Terintegrasi** |
|-------------|-------------------------------------|------------|---------------------|
${o.map(j=>`| **${j.prinsip}** | ${j.implementasi} | ${j.tujuan} | ${j.kbc} |`).join(`
`)}

**G. KETERAMPILAN ABAD KE-21**

| Keterampilan | Indikator | Strategi Pengembangan |
|-------------|-----------|----------------------|
| **Berpikir Kritis** | Menganalisis, mengevaluasi informasi | Diskusi kritis, analisis kasus, problem solving |
| **Kreativitas** | Berinovasi, menghasilkan ide baru | Proyek kreatif, brainstorming, pembuatan produk |
| **Komunikasi** | Menyampaikan ide dengan jelas & efektif | Presentasi, diskusi kelas, berbagi hasil kerja |
| **Kolaborasi** | Bekerja sama dalam tim | Proyek kelompok, diskusi, peer teaching |
| **Literasi Digital** | Menggunakan teknologi informasi | E-learning, digital tools, video edukasi |

**H. KURIKULUM BERBASIS CINTA (KBC) - INTEGRASI UTAMA**

| **Aspek Cinta** | **Nilai yang Dikembangkan** | **Implementasi Konkret** | **Indikator Pencapaian** |
|-----------------|----------------------------|--------------------------|-------------------------|
| **Cinta kepada Allah** | Iman dan ketakwaan, pengamalan ibadah | Pembiasaan ibadah 5 waktu, doa bersama, dzikir | Siswa aktif melaksanakan ibadah dengan ikhlas |
| **Cinta kepada Rasul** | Meneladani akhlak Nabi, sunnah | Pembelajaran sirah Nabi, praktik sunnah | Siswa meneladani perilaku Rasulullah SAW |
| **Cinta kepada Orang Tua** | Hormat dan taat, membantu pekerjaan rumah | Pengingat kewajiban anak, berdoa untuk orang tua | Siswa menunjukkan sikap hormat kepada orang tua |
| **Cinta kepada Sesama** | Toleransi, tolong-menolong, solidaritas | Kerja sama kelompok, menghargai perbedaan | Siswa aktif membantu teman dan menghargai orang lain |
| **Cinta kepada Lingkungan** | Kepedulian alam, kebersihan | Menjaga kebersihan kelas, pelestarian lingkungan | Siswa menjaga kebersihan dan kelestarian alam |
| **Cinta kepada Ilmu** | Semangat belajar, kecintaan pengetahuan | Motivasi tinggi, eksplorasi pengetahuan | Siswa aktif bertanya dan belajar dengan semangat |

**I. PEMAHAMAN BERMAKNA**

Melalui pembelajaran ini, siswa akan memahami bahwa ${e[0]} bukan hanya sebagai pengetahuan agama, tetapi juga sebagai panduan hidup yang penuh cinta. Siswa akan mampu mengimplementasikan nilai-nilai cinta dalam kehidupan sehari-hari, sehingga terbentuk karakter yang berakhlak mulia sesuai Profil Pelajar Pancasila.

**J. PERTANYAAN PEMANTIK**

1. Bagaimana kita menunjukkan cinta kepada Allah dalam kehidupan sehari-hari?
2. Apa contoh cinta kepada Rasul yang bisa kita teladani dari ${e[0]}?
3. Bagaimana cara kita mencintai orang tua melalui pengamalan nilai-nilai agama?
4. Mengapa penting mencintai sesama dan lingkungan dalam ajaran Islam?
5. Bagaimana cinta kepada ilmu dapat membawa kita lebih dekat kepada Allah?

**K. SARANA DAN PRASARANA**

| Jenis | Keterangan | Ketersediaan |
|-------|-----------|--------------|
| **Ruang Belajar** | Ruang kelas, mushola, ruang terbuka | Tersedia |
| **Media Pembelajaran** | LCD, laptop, speaker, whiteboard | Tersedia |
| **Bahan Ajar** | Buku siswa, buku guru, modul, LKPD | Lengkap |
| **Alat Peraga** | Alat peraga ${e[0]}, alat praktik | Tersedia |
| **Buku Referensi** | Kitab Suci, buku penunjang | Lengkap |

**L. LANGKAH-LANGKAH PEMBELAJARAN**

### Tabel Rancangan Kegiatan Pembelajaran Terintegrasi

| No | Tahap | Waktu | Kegiatan Pembelajaran | Integrasi Nilai Cinta | Alat & Media | Tujuan |
|----|-------|-------|----------------------|----------------------|-------------|--------|
| 1 | **Pendahuluan** | 10-15 menit | • Doa bersama • Apersepsi tentang value cinta • Motivasi tentang pentingnya cinta ilmu • Penyampaian tujuan pembelajaran | • Cinta kepada Allah (doa) • Cinta kepada Ilmu (motivasi) • Cinta kepada Sesama (penguatan) | Video/Gambar motivasi | Menciptakan suasana pembelajaran yang positif |
| 2 | **Inti - Eksplorasi** | 15 menit | • Siswa mengeksplorasi materi ${e[0]} secara mandiri • Pengamatan contoh-contoh penerapan • Mengajukan pertanyaan awal | Cinta kepada Ilmu | Buku, Sumber Daya Alam | Memunculkan rasa penasaran & kecintaan ilmu |
| 3 | **Inti - Kolaborasi** | 20 menit | • Diskusi kelompok tentang implementasi nilai cinta • Sharing pengalaman pribadi • Membuat brainstorm solusi | Cinta kepada Sesama & Lingkungan | Mind map, Flipchart | Mengembangkan kolaborasi & berpikir kritis |
| 4 | **Inti - Refleksi** | 15 menit | • Siswa merefleksikan penerapan di kehidupan • Menulis jurnal pembelajaran • Menyiapkan presentasi | Cinta kepada Allah, Orang Tua, Ilmu | Jurnal, Buku Tulis | Memperdalam pemahaman & koneksi emosional |
| 5 | **Penutup** | 10-15 menit | • Presentasi hasil kerja kelompok • Refleksi bersama (guru & siswa) • Penguatan nilai cinta • Doa penutup • Penugasan tindak lanjut | Cinta kepada Allah, Sesama, Orang Tua, Ilmu | Video/Musik islami | Memperkuat pemahaman & motivasi berkelanjutan |

**M. PENILAIAN**

### 1. Penilaian SIKAP (Afektif)

| Aspek | Teknik Penilaian | Instrumen | Rubrik Penilaian |
|-------|-----------------|-----------|-----------------|
| **Akhlak & Karakter (Nilai Cinta)** | Observasi Berkelanjutan | Jurnal Guru & Lembar Observasi | **SB (4):** Menunjukkan seluruh nilai cinta dengan konsisten • **B (3):** Menunjukkan sebagian besar nilai cinta • **C (2):** Menunjukkan beberapa nilai cinta • **K (1):** Belum menunjukkan nilai cinta |

### 2. Penilaian PENGETAHUAN (Kognitif)

| Aspek | Teknik Penilaian | Instrumen | Rubrik Penilaian |
|-------|-----------------|-----------|-----------------|
| **Pemahaman Konsep & TP** | Tes Tertulis | Soal Uraian & Pilihan Ganda | **SB (4):** Pemahaman sangat mendalam & sempurna • **B (3):** Pemahaman jelas & tepat • **C (2):** Pemahaman dasar & terbatas • **K (1):** Pemahaman sangat terbatas |

### 3. Penilaian KETERAMPILAN (Psikomotor)

| Aspek | Teknik Penilaian | Instrumen | Rubrik Penilaian |
|-------|-----------------|-----------|-----------------|
| **Praktik & Proyek** | Unjuk Kerja | Rubrik Proyek & Portofolio | **SB (4):** Hasil karya sangat baik, proses rapi & kreatif • **B (3):** Hasil karya baik, proses cukup baik • **C (2):** Hasil karya cukup, proses ada kekurangan • **K (1):** Hasil karya kurang, proses tidak optimal |

### Skala Penilaian 4 Level

| Level | Deskripsi | Nilai | Bobot |
|-------|-----------|-------|-------|
| **SB (Sangat Baik)** | Pencapaian sempurna, pemahaman mendalam, inisiatif tinggi, kreativitas luar biasa | 4 | 90-100 |
| **B (Baik)** | Pencapaian baik, pemahaman cukup, partisipasi aktif | 3 | 80-89 |
| **C (Cukup)** | Pencapaian dasar, pemahaman terbatas, partisipasi minimal | 2 | 70-79 |
| **K (Kurang)** | Belum mencapai target, pemahaman sangat terbatas, pasif | 1 | 0-69 |

**N. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)**

| No | TP | Indikator Pencapaian | Teknik Penilaian | Kriteria Ketercapaian |
|----|----|--------------------|---|---|
${M.map((j,h)=>`| ${h+1} | ${j} | Siswa mampu ${j.toLowerCase().replace(/^siswa mampu /,"")} dengan benar dan menerapkannya | Tes & Observasi | SB/B mencapai ≥75% sesuai rubrik |`).join(`
`)}

**O. PROGRAM TINDAK LANJUT**

### Remedial (Bagi Siswa dengan Skor < 70)

**Strategi:**
- Pembelajaran ulang dengan metode berbeda (cerita, gambar, permainan, demonstrasi)
- Bimbingan individual atau kelompok kecil (max 5 siswa)
- Tugas remedial yang lebih sederhana & kontekstual
- Kolaborasi dengan orang tua untuk pendampingan di rumah
- Penggunaan media pembelajaran yang lebih menarik (video, animasi)

**Waktu:** Setelah penilaian formatif/sumatif
**Kriteria Tuntas:** Skor ≥ 70 pada tes ulang

### Pengayaan (Bagi Siswa dengan Skor ≥ 80)

**Strategi:**
- Tugas yang lebih kompleks & menantang (analisis kasus, studi komparasi)
- Proyek penelitian atau investigasi yang lebih mendalam tentang penerapan nilai cinta
- Menjadi tutor bagi teman sebaya atau kelompok pendamping
- Pengembangan kreativitas melalui pembuatan produk inovatif (poster, video, komik)
- Partisipasi dalam kegiatan ekstrakurikuler atau kompetisi

**Waktu:** Setelah penilaian formatif/sumatif
**Kriteria:** Skor ≥ 80

**P. REFLEKSI GURU DAN PESERTA DIDIK**

### Refleksi untuk Guru:
- Apakah tujuan pembelajaran tercapai sesuai target? Apa hambatannya?
- Bagaimana efektivitas penerapan nilai cinta dalam pembelajaran?
- Metode/media mana yang paling efektif menumbuhkan cinta ilmu?
- Apakah semua siswa terlibat aktif? Siapa yang perlu perhatian khusus?
- Perbaikan apa yang diperlukan untuk pembelajaran selanjutnya?
- Bagaimana pengembangan Profil Pelajar Pancasila melalui kegiatan ini?
- Apakah integrasi keterampilan abad ke-21 sudah optimal?

### Refleksi untuk Peserta Didik:
- Apa yang paling aku sukai dari pembelajaran hari ini?
- Bagian mana yang masih membingungkan?
- Nilai cinta mana yang paling mudah aku terapkan?
- Bagaimana aku akan mengamalkan pembelajaran ini di rumah?
- Saran apa untuk membuat pembelajaran lebih menarik?

---

**CATATAN PENTING:**
- Modul Ajar ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah
- Fokus pada pengembangan karakter & nilai-nilai islami
- Integrasi Profil Pelajar Pancasila, Moderasi Beragama, dan Keterampilan Abad ke-21
- Pembelajaran aktif dengan pendekatan berbasis proyek dan nilai-nilai cinta
- Asesmen holistik meliputi sikap, pengetahuan, dan keterampilan
- Siap digunakan sebagai panduan pembelajaran yang komprehensif dan terukur

[PAGE_BREAK]

# LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)

**LEMBAR KERJA PESERTA DIDIK**  
**Mata Pelajaran: ${i}**  
**Materi: ${e[0]}**  
**Kelas/Fase: ${r}**  
**Semester: ${t}**  
**Tahun Pelajaran: ${s}**

**Nama Siswa:** ___________________________  
**NIS:** ___________________________  
**Tanggal Pengerjaan:** ___________________________

---

## **PETUNJUK KERJA:**

1. Bacalah dengan teliti setiap soal yang diberikan
2. Kerjakan soal-soal berikut dengan penuh cinta ilmu dan keikhlasan
3. Gunakan bahasa yang baik dan benar
4. Jawablah dengan jujur dan sesuai kemampuanmu
5. Perlihatkan nilai cinta dalam setiap jawabanmu

---

## **A. PEMAHAMAN KONSEP**

### 1. Pengertian dan Konsep Dasar
Jelaskan pengertian ${e[0]} menurut ajaran Islam:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 2. Nilai-nilai Cinta yang Terkandung
Sebutkan nilai cinta yang dapat dipelajari dari materi ${e[0]}:

| No | Aspek Cinta | Contoh Penerapan |
|----|-------------|------------------|
| 1 | Cinta kepada Allah | |
| 2 | Cinta kepada Rasul | |
| 3 | Cinta kepada Orang Tua | |
| 4 | Cinta kepada Sesama | |
| 5 | Cinta kepada Lingkungan | |
| 6 | Cinta kepada Ilmu | |

---

## **B. PENERAPAN DALAM KEHIDUPAN**

### 3. Contoh Penerapan di Rumah
Bagaimana kamu akan menerapkan nilai ${e[0]} di rumah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 4. Contoh Penerapan di Sekolah
Bagaimana kamu akan menerapkan nilai ${e[0]} di sekolah?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 5. Contoh Penerapan di Masyarakat
Bagaimana kamu akan menerapkan nilai ${e[0]} di masyarakat?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **C. REFLEKSI DAN NILAI CINTA**

### 6. Refleksi Pembelajaran
Apa yang kamu pelajari dari materi ${e[0]}?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 7. Nilai Cinta yang Paling Berkesan
Nilai cinta mana yang paling berkesan bagimu? Mengapa?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

### 8. Rencana Pengamalan
Bagaimana kamu akan mengamalkan nilai cinta tersebut dalam kehidupan sehari-hari?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

## **D. KREATIVITAS DAN EKSPRESI**

### 9. Ekspresi Kreatif
Buatlah gambar, poster, atau simbol yang menunjukkan penerapan nilai cinta dari materi ${e[0]}:

**[Ruang Gambar/Karya Seni - 15x20 cm]**

### 10. Pesan untuk Teman
Tuliskan pesan untuk teman-temanmu tentang pentingnya nilai cinta dalam kehidupan:

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________

---

**PENILAIAN LKPD**

| Aspek | Kriteria | Skor | Keterangan |
|-------|----------|------|------------|
| **Pemahaman Konsep** | Jawaban lengkap, benar, dan sesuai | _____/20 | |
| **Penerapan** | Contoh konkret dan relevan | _____/30 | |
| **Refleksi** | Jawaban mendalam dan jujur | _____/20 | |
| **Kreativitas** | Ekspresi orisinal dan menarik | _____/20 | |
| **Nilai Cinta** | Terlihat dalam setiap jawaban | _____/10 | |
| **TOTAL** | | _____/100 | |

**Skor: _________**  
**Nilai: _________**  
**Keterangan Guru:** __________________________________________

[PAGE_BREAK]

# LAMPIRAN 2: SOAL PENILAIAN FORMATIF & SUMATIF

**SOAL PENILAIAN**  
**Mata Pelajaran: ${i}**  
**Materi: ${e[0]}**  
**Kelas/Fase: ${r}**  
**Semester: ${t}**  
**Tahun Pelajaran: ${s}**

**Nama Siswa:** ___________________________  
**NIS:** ___________________________  
**Tanggal:** ___________________________

---

## **PETUNJUK PENGERJAAN:**

1. Bacalah soal dengan teliti sebelum menjawab
2. Kerjakan soal dengan penuh cinta ilmu dan keikhlasan
3. Gunakan bahasa yang baik dan benar
4. Perlihatkan nilai cinta dalam setiap jawaban
5. Waktu pengerjaan: 60 menit

---

## **A. SOAL PILIHAN GANDA (20 poin)**

Pilihlah jawaban yang paling benar dengan memberikan tanda silang (X) pada huruf jawaban yang dipilih!

### 1. Nilai cinta yang paling mendasar dalam ajaran Islam adalah...
a) Cinta kepada kekayaan dan kemewahan  
b) Cinta kepada Allah SWT sebagai pencipta  
c) Cinta kepada teman dan kesenangan dunia  
d) Cinta kepada diri sendiri saja

### 2. Salah satu bentuk cinta kepada Rasul adalah...
a) Mengikuti sunnah dan meneladani akhlak beliau  
b) Hanya membaca sirah Nabi tanpa mengamalkan  
c) Mengutamakan kesenangan dunia daripada ibadah  
d) Melupakan ajaran-ajaran Nabi dalam kehidupan

### 3. Cinta kepada orang tua dalam Islam ditunjukkan dengan...
a) Memberikan uang saja tanpa perhatian  
b) Menghormati, menaati, dan mendoakan orang tua  
c) Mengabaikan nasihat orang tua  
d) Hanya mencintai orang tua saat dibutuhkan

### 4. Nilai cinta kepada sesama yang sesuai ajaran Islam adalah...
a) Membantu orang lain dengan ikhlas  
b) Membantu hanya untuk mendapatkan imbalan  
c) Tidak peduli dengan kesulitan orang lain  
d) Membantu hanya keluarga dekat saja

### 5. Cinta kepada lingkungan ditunjukkan dengan...
a) Membuang sampah sembarangan  
b) Merawat kebersihan dan kelestarian alam  
c) Mengambil milik orang lain  
d) Tidak peduli dengan kerusakan lingkungan

---

## **B. SOAL ISIAN SINGKAT (20 poin)**

Jawablah pertanyaan berikut dengan singkat dan jelas!

### 6. Sebutkan 3 cara menunjukkan cinta kepada Allah dalam kehidupan sehari-hari!
   1. ________________________________________________________________  
   2. ________________________________________________________________  
   3. ________________________________________________________________  

### 7. Apa saja nilai cinta yang terkandung dalam materi ${e[0]}?
   ________________________________________________________________________  
   ________________________________________________________________________  

### 8. Bagaimana cara kita menghormati orang tua sesuai ajaran Islam?
   ________________________________________________________________________  
   ________________________________________________________________________  

### 9. Mengapa penting mencintai sesama dalam kehidupan bermasyarakat?
   ________________________________________________________________________  
   ________________________________________________________________________  

### 10. Sebutkan 2 contoh penerapan cinta kepada lingkungan di sekolah!
    1. ________________________________________________________________  
    2. ________________________________________________________________  

---

## **C. SOAL URAIAN (40 poin)**

Jawablah pertanyaan berikut dengan lengkap dan jelas! Perlihatkan nilai cinta dalam jawabanmu.

### 11. Jelaskan pengertian ${e[0]} menurut ajaran Islam dan berikan contoh penerapannya dalam kehidupan sehari-hari!

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

### 12. Bagaimana nilai cinta kepada Rasul dapat membimbing kita menjadi manusia yang lebih baik? Berikan contoh konkret!

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

### 13. Analisislah bagaimana materi ${e[0]} mengajarkan kita untuk mencintai sesama dan lingkungan! Berikan contoh penerapan di 3 tempat berbeda (rumah, sekolah, masyarakat)!

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

### 14. Buatlah refleksi pribadi tentang pentingnya nilai cinta dalam kehidupanmu! Bagaimana kamu akan mengamalkannya setelah mempelajari materi ini?

________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  
________________________________________________________________________  

---

## **D. SOAL PRAKTIK/KREATIVITAS (20 poin)**

### 15. Buatlah sebuah karya kreatif (gambar, puisi, atau cerita pendek) yang menunjukkan penerapan nilai cinta dari materi ${e[0]}!

**[Ruang Karya - Gunakan kertas terpisah jika diperlukan]**

**Deskripsi Karya:** ______________________________________________  
________________________________________________________________________  
________________________________________________________________________  

---

## **E. PENILAIAN SOAL**

| Komponen | Aspek | Bobot | Skor | Keterangan |
|----------|-------|-------|------|------------|
| **Pilihan Ganda** | Ketepatan jawaban | 20 | _____/20 | |
| **Isian Singkat** | Kelengkapan & ketepatan | 20 | _____/20 | |
| **Uraian** | Kedalaman analisis & nilai cinta | 40 | _____/40 | |
| **Praktik/Kreativitas** | Orisinalitas & nilai cinta | 20 | _____/20 | |
| **TOTAL** | | **100** | _____/100 | |

**Skor Akhir: _________**  
**Nilai Huruf: _________**  
**Predikat: _________**

**Keterangan Guru:**  
________________________________________________________________________  
________________________________________________________________________  

---

## **F. KUNCI JAWABAN (UNTUK GURU)**

### Pilihan Ganda:
1. b) Cinta kepada Allah SWT sebagai pencipta  
2. a) Mengikuti sunnah dan meneladani akhlak beliau  
3. b) Menghormati, menaati, dan mendoakan orang tua  
4. a) Membantu orang lain dengan ikhlas  
5. b) Merawat kebersihan dan kelestarian alam  

### Isian Singkat:
6. Jawaban bervariasi: sholat tepat waktu, dzikir, membaca Al-Quran, dll.  
7. Cinta kepada Allah, Rasul, Orang Tua, Sesama, Lingkungan, Ilmu  
8. Menghormati, menaati perintah, mendoakan, membantu pekerjaan rumah  
9. Menciptakan harmoni sosial, membangun solidaritas, mengurangi konflik  
10. Menjaga kebersihan kelas, merawat tanaman, mengurangi sampah plastik

### Uraian:
Jawaban dinilai berdasarkan:  
- Pemahaman konsep yang benar  
- Contoh penerapan yang konkret  
- Terlihat nilai cinta dalam jawaban  
- Analisis yang mendalam dan logis  
- Bahasa yang baik dan benar

[PAGE_BREAK]

# LAMPIRAN 3: RUBRIK PENILAIAN LENGKAP

**RUBRIK PENILAIAN HOLISTIK**  
**Mata Pelajaran: ${i}**  
**Materi: ${e[0]}**

---

## **A. RUBRIK PENILAIAN SIKAP (Afektif)**

| Aspek Penilaian | **SB (4)** | **B (3)** | **C (2)** | **K (1)** |
|-----------------|------------|-----------|-----------|-----------|
| **Akhlak Mulia** | Selalu menunjukkan akhlak mulia, menjadi teladan | Sering menunjukkan akhlak mulia | Kadang menunjukkan akhlak mulia | Jarang menunjukkan akhlak mulia |
| **Cinta kepada Allah** | Aktif dalam ibadah, doa khusyuk | Cukup aktif dalam ibadah | Kurang aktif dalam ibadah | Pasif dalam ibadah |
| **Cinta kepada Rasul** | Meneladani akhlak Nabi | Mencoba meneladani | Kurang meneladani | Tidak meneladani |
| **Cinta kepada Orang Tua** | Sangat hormat & taat | Cukup hormat | Kurang hormat | Tidak hormat |
| **Cinta kepada Sesama** | Saling membantu, toleran | Cukup membantu | Kurang membantu | Egois |
| **Cinta kepada Lingkungan** | Sangat peduli kebersihan | Cukup peduli | Kurang peduli | Tidak peduli |
| **Cinta kepada Ilmu** | Sangat antusias belajar | Cukup antusias | Kurang antusias | Malas belajar |

---

## **B. RUBRIK PENILAIAN PENGETAHUAN (Kognitif)**

| Aspek Penilaian | **SB (4)** | **B (3)** | **C (2)** | **K (1)** |
|-----------------|------------|-----------|-----------|-----------|
| **Pemahaman Konsep** | Sangat mendalam & akurat | Cukup mendalam | Dasar saja | Salah/kurang |
| **Aplikasi Konsep** | Dapat menerapkan dengan benar | Dapat menerapkan sebagian | Sulit menerapkan | Tidak dapat menerapkan |
| **Analisis** | Analisis sangat baik | Analisis cukup baik | Analisis dasar | Tidak dapat menganalisis |
| **Evaluasi** | Dapat mengevaluasi dengan baik | Cukup dapat mengevaluasi | Sulit mengevaluasi | Tidak dapat mengevaluasi |

---

## **C. RUBRIK PENILAIAN KETERAMPILAN (Psikomotor)**

| Aspek Penilaian | **SB (4)** | **B (3)** | **C (2)** | **K (1)** |
|-----------------|------------|-----------|-----------|-----------|
| **Praktik Ibadah** | Sangat lancar & khusyuk | Cukup lancar | Kurang lancar | Tidak lancar |
| **Keterampilan Sosial** | Sangat baik dalam berkomunikasi | Cukup baik | Kurang baik | Buruk |
| **Keterampilan Motorik** | Sangat terampil | Cukup terampil | Kurang terampil | Tidak terampil |
| **Kreativitas** | Sangat kreatif & orisinal | Cukup kreatif | Kurang kreatif | Tidak kreatif |

---

## **D. KONVERSI NILAI**

| Rentang Skor | Nilai Huruf | Predikat | Keterangan |
|--------------|-------------|----------|------------|
| 90-100 | A | SB (Sangat Baik) | Luar biasa, melebihi harapan |
| 80-89 | B | B (Baik) | Baik, sesuai harapan |
| 70-79 | C | C (Cukup) | Cukup, perlu perbaikan |
| 60-69 | D | K (Kurang) | Kurang, perlu bantuan |
| 0-59 | E | K (Kurang) | Sangat kurang, remedial intensif |

---

## **E. KRITERIA KETUNTASAN MINIMAL (KKM)**

**KKM Mata Pelajaran ${i}: 75**

| Aspek | KKM | Indikator Ketuntasan |
|-------|-----|---------------------|
| **Sikap** | 75 | Menunjukkan nilai cinta dalam kehidupan sehari-hari |
| **Pengetahuan** | 75 | Memahami konsep ${e[0]} dengan benar |
| **Keterampilan** | 75 | Dapat menerapkan nilai cinta dalam praktik |

**Keterangan:**  
- Siswa dinyatakan **TUNTAS** jika mencapai KKM pada semua aspek  
- Siswa yang belum tuntas mendapatkan **REMEDIAL**  
- Siswa yang sudah tuntas dapat mengikuti **PENGAJAAN**`;return y+`
[PAGE_BREAK]
`+g},Ka=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,tanggal_cetak:p,teacher:d,selectedMateriData:k}=_,u=k?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,c=k?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`;u.split(/\r?\n/).filter(Boolean),c.split(/\r?\n/).filter(Boolean).map(M=>M.replace(/^\d+\.\s*/,""));const b=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


JURNAL MENGAJAR HARIAN

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
TANGGAL: ${p}

Disusun Oleh:
${d.nama}
NIP. ${d.nip}`,A=`[PAGE_BREAK]
[JURNAL_TABLE]
`,N=`**JURNAL MENGAJAR HARIAN - ${i.toUpperCase()}**
**Kelas/Fase: ${r} | Semester: ${t} | Tahun: ${s}**
**Guru: ${d.nama}**

**PETUNJUK PENGISIAN:**
- Diisi setiap hari setelah selesai mengajar
- Gunakan bahasa singkat dan jelas
- Fokus pada kegiatan nyata dan refleksi
- Integrasi KBC, Profil Pancasila, dan Moderasi Beragama wajib dicatat

**TABEL JURNAL MENGAJAR HARIAN**

| Hari/Tanggal | Materi | Kegiatan Pembelajaran | Integrasi KBC | Profil Pelajar Pancasila | Kehadiran | Asesmen | Refleksi Guru | Tindak Lanjut |
|-------------|--------|----------------------|---------------|--------------------------|-----------|---------|--------------|--------------|
| ${p} | ${e.join(", ")} | **Pendahuluan:** Doa bersama, apersepsi tentang ${e[0]}, motivasi belajar**Inti:** Eksplorasi konsep ${e[0]}, diskusi kelompok, praktik penerapan**Penutup:** Refleksi siswa, penguatan nilai cinta, doa penutup | **Cinta Allah:** Doa bersama sebagai wujud cinta**Cinta Rasul:** Meneladani akhlak Nabi dalam perilaku**Cinta Orang Tua:** Pengingat kewajiban anak**Cinta Sesama:** Kerja sama dalam kelompok**Cinta Lingkungan:** Kebersihan kelas**Cinta Ilmu:** Semangat eksplorasi siswa | Beriman (doa bersama), Bergotong royong (kerja kelompok), Berkebinekaan (toleransi), Mandiri (eksplorasi), Bernalar kritis (diskusi), Kreatif (praktik) | **Hadir:** 25 siswa**Tidak Hadir:** 2 siswa (sakit: 1, izin: 1) | **Formatif:**- Observasi partisipasi: 80% aktif- LKPD: 75% tuntas**Hasil:** Mayoritas siswa memahami konsep dasar | **Keberhasilan:** Siswa antusias, diskusi berjalan baik**Kendala:** Beberapa siswa kurang fokus, waktu terbatas | **Remedial:** Pengulangan materi untuk 5 siswa yang belum tuntas**Pengayaan:** Proyek mini untuk siswa maju |

**CATATAN TAMBAHAN:**
- **Moderasi Beragama:** Ditekankan toleransi antar siswa, anti-kekerasan dalam diskusi, akhlak mulia dalam perilaku
- **Deep Learning:** Fokus pada eksplorasi mendalam, analisis kritis, dan transfer pengetahuan ke kehidupan sehari-hari
- **Format ini siap digunakan di aplikasi SI-KURMA atau dicetak untuk dokumentasi**
- **Evaluasi berkala:** Tinjau efektivitas pembelajaran setiap minggu untuk perbaikan`;return b+A+N},ya=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,alokasi_waktu:p,tanggal_cetak:d,teacher:k,selectedMateriData:u}=_,c=u?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,b=u?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`,A=c.split(/\r?\n/).filter(Boolean),N=b.split(/\r?\n/).filter(Boolean).map(o=>o.replace(/^\d+\.\s*/,"")),M=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


PROGRAM SEMESTER (PROMES)

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
TANGGAL CETAK: ${d}

Disusun Oleh:
${k.nama}
NIP. ${k.nip}`,y=`[PAGE_BREAK]
`,P=`**A. IDENTITAS PROMES**

| Aspek | Keterangan |
|-------|------------|
| Satuan Pendidikan | ${n} |
| Mata Pelajaran | ${i} |
| Kelas/Fase | ${r} |
| Semester | ${t} |
| Tahun Pelajaran | ${s} |
| Alokasi Waktu | ${p} |
| Tanggal Cetak | ${d} |

**B. RASIONAL**

**1. Landasan Filosofis**

Program Semester (PROMES) mata pelajaran ${i} disusun berdasarkan prinsip-prinsip Kurikulum Merdeka yang menekankan pada pengembangan kompetensi siswa secara holistik. Pembelajaran ${i} di Madrasah Ibtidaiyah bertujuan untuk membentuk karakter siswa yang beriman, bertakwa, berakhlak mulia, dan siap menghadapi tantangan masa depan melalui integrasi nilai-nilai Pancasila, Moderasi Beragama, dan Kurikulum Berbasis Cinta (KBC).

**2. Fokus Pembelajaran Semester Ini**

Semester ${t} ini fokus pada pengembangan pemahaman mendalam tentang ${e.join(", ")} dengan pendekatan Deep Learning yang mendorong eksplorasi mendalam, analisis kritis, dan transfer pengetahuan ke kehidupan sehari-hari. Program ini memperhatikan perkembangan usia anak usia dini dengan metode pembelajaran yang menyenangkan dan kontekstual.

**3. Berbasis Capaian Pembelajaran (CP)**

PROMES ini disusun berdasarkan Capaian Pembelajaran (CP) Kurikulum Merdeka yang meliputi:
${A.map((o,g)=>`${g+1}. ${o}`).join(`
`)}

**4. Integrasi Nilai Utama**

| Aspek | Penjelasan |
|-------|------------|
| **Profil Pelajar Pancasila** | Pengembangan 6 dimensi karakter: Beriman, Gotong Royong, Berkebinekaan, Mandiri, Bernalar Kritis, Kreatif |
| **Moderasi Beragama** | Toleransi, Anti Radikalisme, Inklusivitas, Persatuan, Akhlak Mulia |
| **KBC (Kurikulum Berbasis Cinta)** | 7 aspek cinta: Allah, Rasul, Orang Tua, Sesama, Lingkungan, Ilmu, Diri Sendiri |
| **Deep Learning** | Eksplorasi mendalam, analisis kritis, refleksi berkelanjutan, transfer pengetahuan |

**C. TUJUAN PEMBELAJARAN**

Tujuan pembelajaran mata pelajaran ${i} pada semester ${t} adalah:

${N.map((o,g)=>`${g+1}. ${o}`).join(`
`)}

**D. DISTRIBUSI MATERI PEMBELAJARAN**

| No | TP/Materi Pokok | Minggu Ke | Alokasi JP | Kegiatan Utama | Asesmen |
|----|----------------|-----------|------------|----------------|---------|
${N.map((o,g)=>`| ${g+1} | ${e[0]}${o} | ${Math.floor(g/2)+1}-${Math.floor(g/2)+2} | 2 JP | Eksplorasi, praktik, proyek | Formatif |`).join(`
`)}

**Total Alokasi JP: ${N.length*2} JP**

**E. KALENDER AKADEMIK**

| Bulan | Minggu Efektif | Tema Pembelajaran | Kegiatan Utama |
|-------|----------------|-------------------|----------------|
| Juli | 1-4 | Pengenalan Konsep Dasar | Apersepsi, eksplorasi awal |
| Agustus | 5-8 | Pengembangan Pemahaman | Diskusi kelompok, praktik |
| September | 9-12 | Aplikasi Kontekstual | Proyek berbasis masalah |
| Oktober | 13-16 | Penguatan Konsep | Review, remedial, pengayaan |
| November | 17-20 | Integrasi Nilai | Refleksi, transfer pengetahuan |
| Desember | 21-24 | Evaluasi Akhir | Penilaian sumatif, refleksi |

**Total Minggu Efektif: 24 minggu**

**F. PENILAIAN**

**1. Penilaian Diagnostik (Awal Semester)**

| Aspek | Teknik | Instrumen | Waktu | Tujuan |
|-------|--------|-----------|-------|--------|
| Pengetahuan Awal | Observasi, wawancara, angket | Checklist, rubrik observasi | Minggu 1 | Mengidentifikasi kemampuan awal siswa |
| Sikap dan Perilaku | Observasi berkelanjutan | Jurnal guru, catatan harian | Selama semester | Memantau perkembangan karakter |
| Keterampilan Dasar | Tes praktik sederhana | Rubrik keterampilan | Minggu 1-2 | Mengukur kemampuan motorik/psikomotorik |

**2. Penilaian Formatif (Berkala)**

| Aspek | Teknik | Instrumen | Frekuensi | Bobot |
|-------|--------|-----------|-----------|-------|
| **Pengetahuan** | Kuis harian, diskusi kelas | Soal pilihan ganda, uraian singkat | Setiap akhir materi | 30% |
| **Keterampilan** | Praktik, demonstrasi | Rubrik praktik, checklist | Setiap kegiatan praktik | 30% |
| **Sikap** | Observasi partisipasi | Rubrik sikap, jurnal | Setiap pertemuan | 40% |

**3. Penilaian Sumatif Tengah Semester (PTS)**

| Komponen | Bentuk | Bobot | Waktu |
|----------|--------|-------|-------|
| Tes Tertulis | Pilihan ganda, uraian | 40% | Minggu 12 |
| Praktik/Keterampilan | Demonstrasi, proyek kecil | 30% | Minggu 11-12 |
| Portofolio | Kumpulan karya siswa | 20% | Akumulasi selama semester |
| Sikap | Observasi berkelanjutan | 10% | Selama semester |

**4. Penilaian Sumatif Akhir Semester (PAS)**

| Komponen | Bentuk | Bobot | Waktu |
|----------|--------|-------|-------|
| Tes Komprehensif | Pilihan ganda, uraian, essai | 40% | Minggu 24 |
| Proyek Akhir | Produk akhir semester | 30% | Minggu 22-23 |
| Presentasi | Presentasi proyek/tugas akhir | 15% | Minggu 24 |
| Sikap | Rubrik pengamatan akhir | 15% | Selama semester |

**G. KEGIATAN PEMBELAJARAN**

**1. Model Pembelajaran**

| Model | Deskripsi | Implementasi |
|-------|------------|--------------|
| **Project Based Learning (PjBL)** | Pembelajaran berbasis proyek | Siswa mengerjakan proyek nyata terkait materi |
| **Discovery Learning** | Pembelajaran penemuan | Siswa menemukan konsep melalui eksplorasi |
| **Cooperative Learning** | Pembelajaran kooperatif | Kerja kelompok untuk mencapai tujuan bersama |
| **Problem Based Learning** | Pembelajaran berbasis masalah | Mengatasi masalah dunia nyata |

**2. Pendekatan Deep Learning**

| Tahap | Aktivitas | Tujuan |
|-------|----------|--------|
| **Mengaktifkan Pengetahuan Awal** | Apersepsi, brainstorming | Menyiapkan skema kognitif |
| **Mengkonstruksi Pengetahuan** | Eksplorasi, investigasi | Membangun pemahaman baru |
| **Mengembangkan Keterampilan** | Praktik, aplikasi | Transfer pengetahuan |
| **Mentransfer Pengetahuan** | Refleksi, proyek | Penerapan dalam kehidupan |

**3. Metode Pembelajaran**

| Metode | Teknik | Contoh |
|--------|--------|--------|
| **Ceramah Interaktif** | Tanya jawab, diskusi | Penjelasan konsep dengan interaksi |
| **Diskusi Kelas** | Brainstorming, debat | Pertukaran pendapat siswa |
| **Praktik Langsung** | Demonstrasi, eksperimen | Pembelajaran hands-on |
| **Studi Kasus** | Analisis masalah | Penerapan konsep |
| **Pembelajaran Berbasis Proyek** | Proyek kelompok | Produk akhir bermakna |

**H. SUMBER BELAJAR**

| Kategori | Sumber Belajar | Ketersediaan |
|----------|----------------|--------------|
| **Utama** | Kitab Suci Al-Quran, Hadits, Buku Siswa/Guru Kurikulum Merdeka | Lengkap |
| **Pendukung** | Media audio-visual, alat peraga edukatif, bahan praktikum | Tersedia |
| **Digital** | Aplikasi pembelajaran interaktif, video edukasi, bahan ajar online | Terbatas |
| **Lingkungan** | Masjid, mushola, rumah ibadah, lingkungan sekitar sekolah | Mudah diakses |

**1. Profil Pelajar Pancasila**

| Dimensi | Implementasi | Indikator |
|---------|--------------|-----------|
| **Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia** | Pembiasaan ibadah, pengamalan nilai agama | Siswa melaksanakan ibadah dengan baik |
| **Mandiri** | Tugas mandiri, eksplorasi individu | Siswa mampu belajar sendiri |
| **Gotong Royong** | Kerja sama kelompok, proyek bersama | Siswa aktif dalam kelompok |
| **Bernalar Kritis** | Analisis kasus, diskusi kritis | Siswa mampu berpikir logis |
| **Kreatif** | Proyek kreatif, presentasi inovatif | Siswa menghasilkan karya baru |
| **Demokratis** | Diskusi kelas, voting keputusan | Siswa menghargai pendapat lain |

**2. Moderasi Beragama**

| Aspek | Implementasi | Tujuan |
|-------|--------------|--------|
| **Toleransi** | Diskusi perbedaan mazhab, menghargai keyakinan lain | Membentuk sikap saling menghormati |
| **Anti Radikalisme** | Pendidikan tentang persatuan umat | Menjaga keharmonisan beragama |
| **Inklusivitas** | Pembelajaran untuk semua siswa | Membentuk masyarakat inklusif |
| **Persatuan** | Kegiatan bersama antar siswa | Memperkuat persatuan bangsa |

**3. KBC (Kurikulum Berbasis Cinta)**

| Nilai Cinta | Strategi Implementasi | Contoh Kegiatan |
|------------|---------------------|-----------------|
| **Cinta kepada Allah** | Pembiasaan ibadah, doa bersama | Sholat dhuha, dzikir pagi |
| **Cinta kepada Rasul** | Pembelajaran sirah, sunnah | Meneladani akhlak Nabi |
| **Cinta kepada Orang Tua** | Pengingat kewajiban anak | Membantu pekerjaan rumah |
| **Cinta kepada Sesama** | Kerja sama, tolong-menolong | Berbagi dengan teman |
| **Cinta kepada Lingkungan** | Kebersihan, pelestarian | Membersihkan kelas, sekolah |
| **Cinta kepada Ilmu** | Motivasi belajar tinggi | Eksplorasi pengetahuan |
| **Cinta kepada Diri Sendiri** | Pengembangan potensi | Menjaga kesehatan diri |

**G. TINDAK LANJUT**

**1. Remedial**

- Siswa yang belum mencapai KKM mendapat bimbingan khusus
- Pengulangan materi dengan metode berbeda
- Bimbingan individual atau kelompok kecil
- Penggunaan media alternatif (video, gambar, permainan)
- Konsultasi dengan guru atau teman sebaya

**2. Pengayaan**

- Siswa yang telah mencapai KKM mendapat tantangan tambahan
- Proyek lanjutan dengan tema lebih kompleks
- Menjadi tutor bagi teman yang membutuhkan
- Mengikuti lomba atau kompetisi terkait materi
- Pengembangan bakat dan minat siswa

**3. Refleksi Pembelajaran**

**Refleksi Guru:**
- Apakah tujuan pembelajaran tercapai?
- Bagaimana implementasi nilai cinta?
- Metode mana yang paling efektif?
- Perbaikan apa yang diperlukan?
- Bagaimana pengembangan karakter siswa?

**Refleksi Siswa:**
- Apa yang paling kamu sukai?
- Nilai cinta mana yang sudah kamu terapkan?
- Bagaimana mengamalkan di rumah?
- Saran untuk pembelajaran lebih baik?
- Apa yang sudah kamu lakukan hari ini?

**CATATAN PENTING:**
- PROMES ini sesuai Kurikulum Merdeka MI
- Fokus pada pengembangan karakter dan nilai cinta
- Pembelajaran aktif berbasis proyek
- Asesmen holistik meliputi kognitif, afektif, psikomotorik
- Siap digunakan sebagai acuan pembelajaran semester`;return M+y+P},Ta=()=>{if(m.materi_pokok.length===0){la("Pilih materi pokok!");return}Z(!0),setTimeout(()=>{const{mata_pelajaran:_,fase:n,jenis_dokumen:l,alokasi_waktu:s,materi_pokok:t}=m,i=W,r=S.identitas_madrasah?.nama_yayasan||"",e=S.tahun_pelajaran?.active_year||"2024/2025",p=S.tahun_pelajaran?.semester||"Ganjil",d=B.find(A=>A.value===l),k=ta(n),u=E.find(A=>A.materi_pokok===t[0]),c=new Date(m.tanggal_cetak||new Date).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}).toUpperCase();let b="";l==="cp_tp_atp"?b=Sa({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,tanggal_cetak:c,teacher:k,selectedMateriData:u}):l==="modul_ajar"?b=fa({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,alokasi_waktu:s,pertemuan:m.pertemuan,tanggal_cetak:c,teacher:k,selectedMateriData:u}):l==="rpp_rpm"?b=Ma({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,alokasi_waktu:s,pertemuan:m.pertemuan,tanggal_cetak:c,teacher:k,selectedMateriData:u}):l==="jurnal_mengajar"?b=Ka({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,tanggal_cetak:c,teacher:k,selectedMateriData:u}):l==="promes"?b=ya({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,alokasi_waktu:s,tanggal_cetak:c,teacher:k,selectedMateriData:u}):l==="prota"?b=Ea({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,alokasi_waktu:s,tanggal_cetak:c,teacher:k,selectedMateriData:u}):l==="kktp"&&(b=Ia({schoolName:i,yayasan:r,year:e,semester:p,mata_pelajaran:_,fase:n,materi_pokok:t,tanggal_cetak:c,teacher:k,selectedMateriData:u})),K(A=>({...A,hasil:b})),Z(!1),ma(`Dokumen ${d?.label} berhasil disusun!`)},1500)},Ia=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,tanggal_cetak:p,teacher:d,selectedMateriData:k}=_,u=k?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,c=k?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`,b=u.split(/\r?\n/).filter(Boolean),A=c.split(/\r?\n/).filter(Boolean).map(h=>h.replace(/^\d+\.\s*/,"")),N=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
TANGGAL: ${p}

Disusun Oleh:
${d.nama}
NIP. ${d.nip}`,M=A.map((h,x)=>`${x+1}. ${h}`).join(`
`),y=`Mata pelajaran ${i} untuk ${r} semester ${t} fokus pada pengembangan kompetensi siswa dalam:
- Memahami konsep-konsep dasar ${e[0]}
- Menerapkan nilai-nilai agama dalam kehidupan sehari-hari
- Mengembangkan sikap toleran, jujur, dan disiplin
- Memperkuat karakter islami dan nilai Pancasila
- Mengintegrasikan pembelajaran dengan nilai-nilai cinta (Allah, Rasul, Orang Tua, Sesama, Lingkungan, Ilmu)`,P=`1. **Cinta kepada Allah (Tuhan Yang Maha Esa)**
   - Implementasi: Melalui pembiasaan ibadah, doa, dan dzikir
   - Indikator: Siswa aktif melakukan ibadah, doa dengan khusyuk
   
2. **Cinta kepada Rasul (Nabi Muhammad SAW)**
   - Implementasi: Melalui pembelajaran akhlak dan sunnah
   - Indikator: Siswa meneladani akhlak Rasul dalam kehidupan
   
3. **Cinta kepada Orang Tua**
   - Implementasi: Melalui pengajaran berbakti dan menghormati
   - Indikator: Siswa menunjukkan sikap hormat dan taat kepada orang tua
   
4. **Cinta kepada Sesama**
   - Implementasi: Melalui diskusi kelompok, kerja sama, dan tolong-menolong
   - Indikator: Siswa mampu bekerja sama dan saling membantu
   
5. **Cinta kepada Lingkungan**
   - Implementasi: Melalui kepedulian terhadap kebersihan dan alam
   - Indikator: Siswa menjaga kebersihan dan kelestarian lingkungan
   
6. **Cinta kepada Ilmu (Pengetahuan)**
   - Implementasi: Melalui motivasi belajar tinggi dan semangat eksplorasi
   - Indikator: Siswa aktif bertanya, mencari pengetahuan, dan berbagi ilmu`,g=b.map((h,x)=>({no:x+1,cp:h,tp:A[x]||`TP ${x+1}`,indikator:`Siswa mampu menunjukkan pemahaman ${h.toLowerCase()} dengan benar dan dapat menerapkannya dalam kehidupan`,teknikPenilaian:"Tes tertulis, Performa, Observasi",instrumen:"Soal uraian, Rubrik penilaian, Checklist",sangaatBaik:"Pemahaman sangat mendalam, penerapan sempurna, menunjukkan inisiatif dalam pembelajaran",baik:"Pemahaman jelas, penerapan tepat, partisipasi aktif dalam pembelajaran",cukup:"Pemahaman dasar, penerapan mulai terlihat, partisipasi minimal",kurang:"Pemahaman terbatas, penerapan belum terlihat jelas, sangat pasif",remedial:"Pembelajaran ulang dengan metode berbeda, bimbingan individual, tugas tambahan",pengayaan:"Proyek penelitian lebih mendalam, tugas lebih kompleks, menjadi tutor sebaya"})).map(h=>`| ${h.no} | ${h.cp} | ${h.tp} | ${h.indikator} | ${h.teknikPenilaian} | ${h.instrumen} | **SB:** ${h.sangaatBaik}<br>**B:** ${h.baik}<br>**C:** ${h.cukup}<br>**K:** ${h.kurang} | **Remedial:** ${h.remedial}<br>**Pengayaan:** ${h.pengayaan} |`).join(`
`),j=`**A. IDENTITAS KKTP**

| Aspek | Keterangan |
|-------|------------|
| Satuan Pendidikan | ${n} |
| Mata Pelajaran | ${i} |
| Kelas/Fase | ${r} |
| Semester | ${t} |
| Tahun Pelajaran | ${s} |
| Nama Penyusun | ${d.nama} |
| NIP | ${d.nip} |
| Tanggal Pembuatan | ${p} |

**B. TUJUAN PEMBELAJARAN**

${M}

**C. FOKUS KOMPETENSI**

${y}

**D. INTEGRASI NILAI KURIKULUM BERBASIS CINTA (KBC)**

${P}

**E. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN**

| No | CP | TP | Indikator Pencapaian | Teknik Penilaian | Instrumen | Rubrik Penilaian | Tindak Lanjut |
|----|----|----|----------------------|------------------|-----------|---------------------|---------------|
${g}

**F. PENJELASAN RUBRIK PENILAIAN**

Skala Penilaian 4 Level (SBCK):

| Level | Deskripsi | Nilai | Bobot |
|-------|-----------|-------|-------|
| **SB (Sangat Baik)** | Siswa mencapai seluruh indikator dengan sangat baik, pemahaman mendalam, penerapan sempurna | 4 | 90-100 |
| **B (Baik)** | Siswa mencapai sebagian besar indikator dengan baik, pemahaman cukup mendalam, penerapan tepat | 3 | 80-89 |
| **C (Cukup)** | Siswa mencapai sebagian indikator dengan cukup, pemahaman dasar, penerapan mulai terlihat | 2 | 70-79 |
| **K (Kurang)** | Siswa belum mencapai indikator optimal, pemahaman terbatas, penerapan belum terlihat | 1 | 0-69 |

**G. TEKNIK PENILAIAN**

1. **Tes Tertulis:** Pilihan ganda, uraian, isian singkat (Berkala sesuai pencapaian materi)
2. **Performa/Praktik:** Demonstrasi, praktik langsung, eksperimen (Selama proses pembelajaran)
3. **Portofolio:** Kumpulan hasil kerja siswa, karya tulis, sketsa (Sepanjang semester)
4. **Sikap/Observasi:** Observasi berkelanjutan, jurnal guru, checklist (Setiap saat pembelajaran)
5. **Produk:** Hasil karya siswa (proyek, makalah, presentasi) (Akhir unit pembelajaran)

**H. INSTRUMEN PENILAIAN**

| Instrumen | Keterangan | Waktu Penggunaan |
|-----------|-----------|------------------|
| **Tes Tertulis** | Soal pilihan ganda, uraian, isian singkat | Setelah pembelajaran materi |
| **Rubrik Penilaian** | Panduan penilaian dengan kriteria jelas | Saat menilai hasil kerja |
| **Checklist** | Daftar periksa ciri/indikator pencapaian | Observasi berkelanjutan |
| **Lembar Observasi** | Format pengamatan sikap dan perilaku | Setiap saat pembelajaran |
| **Jurnal Guru** | Catatan reflektif tentang perkembangan siswa | Setelah setiap pembelajaran |

**I. PROGRAM TINDAK LANJUT**

**1. Remedial (Bagi yang belum tuntas)**
- Pembelajaran ulang dengan metode berbeda (cerita, gambar, permainan)
- Bimbingan individual atau kelompok kecil
- Tugas remedial yang lebih sederhana dan kontekstual
- Waktu: Setelah penilaian formatif/sumatif
- Kriteria Tuntas: Skor ≥ 70

**2. Pengayaan (Bagi yang sudah tuntas)**
- Tugas yang lebih kompleks dan menantang
- Proyek penelitian atau investigasi yang lebih mendalam
- Menjadi tutor bagi teman yang membutuhkan
- Pengembangan kreativitas melalui pembuatan produk inovatif
- Waktu: Setelah penilaian formatif/sumatif
- Kriteria: Skor ≥ 80

**CATATAN PENTING:**
- KKTP ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah
- Fokus pada pencapaian terukur dan integrasi nilai-nilai karakter
- Integrasikan Profil Pelajar Pancasila, Moderasi Beragama, dan KBC
- Penilaian holistik meliputi kognitif, afektif, dan psikomotorik
- Rubrik 4 level memudahkan guru melihat progres siswa secara jelas
- Siap digunakan sebagai panduan penilaian dan tindak lanjut pembelajaran`;return N+`
[PAGE_BREAK]
`+j},Ea=_=>{const{schoolName:n,yayasan:l,year:s,semester:t,mata_pelajaran:i,fase:r,materi_pokok:e,alokasi_waktu:p,tanggal_cetak:d,teacher:k,selectedMateriData:u}=_,c=u?.cp||`1. Menghayati nilai pendidikan agama.
2. Mengamalkan sikap toleran, jujur, dan disiplin.`,b=u?.tp||`1. Menjelaskan konsep materi.
2. Mengidentifikasi contoh penerapan.
3. Menerapkan nilai karakter.`,A=c.split(/\r?\n/).filter(Boolean),N=b.split(/\r?\n/).filter(Boolean).map(o=>o.replace(/^\d+\.\s*/,"")),M=`[HALAMAN COVER]

${l.toUpperCase()}
${n.toUpperCase()}
TAHUN PELAJARAN ${s}


PROGRAM TAHUNAN (PROTA)

MATA PELAJARAN: ${i.toUpperCase()}
KELAS/FASE: ${r.toUpperCase()}
SEMESTER: ${t}
TANGGAL CETAK: ${d}

Disusun Oleh:
${k.nama}
NIP. ${k.nip}`,y=`[PAGE_BREAK]
`,P=`**A. IDENTITAS PROTA**

| Aspek | Keterangan |
|-------|------------|
| Satuan Pendidikan | ${n} |
| Nama Yayasan | ${l} |
| Mata Pelajaran | ${i} |
| Kelas/Fase | ${r} |
| Semester | ${t} |
| Tahun Pelajaran | ${s} |
| Alokasi Waktu | ${p} |
| Tanggal Cetak | ${d} |
| Penyusun | ${k.nama} |
| NIP | ${k.nip} |

**B. CAPAIAN PEMBELAJARAN (CP)**

Capaian Pembelajaran (CP) mata pelajaran ${i} untuk ${r} adalah:

${A.map((o,g)=>`${g+1}. ${o}`).join(`
`)}

**C. ALUR TUJUAN PEMBELAJARAN (ATP)**

| No | Tujuan Pembelajaran (TP) | Capaian Pembelajaran (CP) | Indikator Pencapaian |
|----|--------------------------|---------------------------|----------------------|
${N.map((o,g)=>`| ${g+1} | ${o} | ${A[g]||"CP "+(g+1)} | Siswa mampu menunjukkan pemahaman dan penerapan konsep |`).join(`
`)}

**D. PEMETAAN MATERI POKOK**

| Semester | Materi Pokok | Alokasi Waktu | TP yang Dicapai |
|----------|--------------|---------------|-----------------|
| ${t} | ${e.join("")} | ${p} | ${N.map((o,g)=>`TP ${g+1}`).join(", ")} |

**E. DISTRIBUSI WAKTU PEMBELAJARAN**

| Komponen | Waktu | Persentase |
|----------|-------|------------|
| **Pendahuluan** | 10-15 menit | 15-20% |
| **Kegiatan Inti** | 50-60 menit | 70-75% |
| **Penutup** | 10-15 menit | 10-15% |
| **Total per Pertemuan** | 70-90 menit | 100% |

**F. INTEGRASI NILAI PROFIL PELAJAR PANCASILA**

| Dimensi | Indikator | Strategi Implementasi | Contoh Kegiatan |
|---------|-----------|----------------------|-----------------|
| **Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia** | Melaksanakan ibadah, berdoa, berakhlak baik | Pembiasaan ibadah, pengamalan nilai agama | Doa bersama, sholat dhuha, dzikir |
| **Mandiri** | Belajar sendiri, mengembangkan potensi | Tugas mandiri, eksplorasi individu | Jurnal harian, proyek pribadi |
| **Gotong Royong** | Bekerja sama, saling membantu | Diskusi kelompok, proyek bersama | Kerja kelompok, gotong royong |
| **Bernalar Kritis** | Berpikir logis, analisis masalah | Diskusi kritis, pemecahan masalah | Analisis kasus, debat |
| **Kreatif** | Berkreasi, berinovasi | Proyek kreatif, presentasi | Karya seni, inovasi pembelajaran |
| **Berkebinekaan Global** | Menghargai perbedaan, toleransi | Diskusi keberagaman, moderasi beragama | Studi komparasi budaya |

**G. INTEGRASI MODERASI BERAGAMA**

| Prinsip | Implementasi | Tujuan |
|---------|--------------|--------|
| **Toleransi** | Diskusi perbedaan mazhab, menghargai keyakinan lain | Membentuk sikap saling menghormati |
| **Anti Radikalisme** | Pendidikan persatuan, anti-kekerasan | Menjaga keharmonisan beragama |
| **Inklusivitas** | Pembelajaran untuk semua siswa | Membentuk masyarakat inklusif |
| **Akhlak Mulia** | Pengamalan nilai universal | Membentuk karakter yang baik |
| **Nasionalisme** | Cinta NKRI, kebhinekaan | Membentuk warga negara yang baik |

**H. INTEGRASI KETERAMPILAN ABAD KE-21**

| Keterampilan | Indikator | Strategi Pengembangan | Contoh Aktivitas |
|-------------|-----------|----------------------|------------------|
| **Berpikir Kritis** | Menganalisis, mengevaluasi informasi | Diskusi kritis, analisis kasus | Debat kelas, problem solving |
| **Kreativitas** | Berinovasi, menghasilkan ide baru | Proyek kreatif, brainstorming | Karya seni, presentasi inovatif |
| **Komunikasi** | Menyampaikan ide dengan jelas | Presentasi, diskusi kelas | Public speaking, kerja kelompok |
| **Kolaborasi** | Bekerja sama dalam tim | Proyek kelompok, diskusi | Team work, peer teaching |
| **Literasi Digital** | Menggunakan teknologi informasi | E-learning, digital tools | Aplikasi pembelajaran, video edukasi |
| **Adaptabilitas** | Menyesuaikan diri dengan perubahan | Pembelajaran kontekstual | Project based learning |

**I. KEGIATAN PEMBELAJARAN**

| Tahap | Waktu | Kegiatan | Tujuan |
|-------|-------|----------|--------|
| **Pendahuluan** | 10-15 menit | Doa bersama, apersepsi, motivasi | Mengaktifkan pengetahuan awal |
| **Kegiatan Inti** | 50-60 menit | Eksplorasi, diskusi, praktik, proyek | Mengkonstruksi pengetahuan |
| **Penutup** | 10-15 menit | Refleksi, penguatan nilai, doa | Mentransfer pengetahuan |

**J. PENILAIAN**

| Jenis Penilaian | Teknik | Instrumen | Waktu |
|---------------|--------|-----------|-------|
| **Diagnostik** | Observasi, angket | Checklist, rubrik | Awal tahun |
| **Formatif** | Tes, praktik, proyek | Soal, rubrik penilaian | Berkala |
| **Sumatif** | Ujian, portofolio | Tes komprehensif | Akhir semester |
| **Sikap** | Observasi berkelanjutan | Jurnal guru | Selama proses |

**K. SUMBER BELAJAR**

| Kategori | Sumber | Ketersediaan |
|----------|--------|--------------|
| **Utama** | Kitab Suci, Buku Kurikulum Merdeka | Lengkap |
| **Pendukung** | Media audio-visual, alat peraga | Tersedia |
| **Digital** | Aplikasi interaktif, video edukasi | Terbatas |
| **Lingkungan** | Masjid, mushola, lingkungan sekitar | Mudah diakses |

**L. SARANA DAN PRASARANA**

| Kategori | Sarana/Prasarana | Kondisi |
|----------|------------------|---------|
| **Ruang** | Ruang kelas, mushola | Baik |
| **Media** | LCD, laptop, speaker | Baik |
| **Bahan Ajar** | Buku, modul, alat tulis | Lengkap |
| **Praktikum** | Alat peraga agama | Perlu ditambah |

**M. PENGEMBANGAN PROFESIONAL GURU**

| Aspek | Kegiatan | Frekuensi |
|-------|----------|-----------|
| **Kompetensi** | Workshop, seminar, pelatihan | Berkala |
| **Pengembangan Diri** | Membaca buku, komunitas guru | Berkelanjutan |
| **Kolaborasi** | MGMP, KKG, sharing session | Rutin |
| **Refleksi** | Jurnal mengajar, supervisi | Berkala |

**CATATAN PENTING:**
- PROTA ini disusun sesuai Kurikulum Merdeka Madrasah Ibtidaiyah
- Fokus pada pengembangan karakter dan nilai-nilai islami
- Integrasi Profil Pelajar Pancasila, Moderasi Beragama, dan KBC
- Pengembangan keterampilan abad ke-21
- Pembelajaran aktif dengan pendekatan berbasis proyek
- Asesmen holistik meliputi kognitif, afektif, dan psikomotorik
- Siap digunakan sebagai acuan pembelajaran tahunan`;return M+y+P},Ca=async()=>{if(m.hasil){_a(!0);try{const _=m.tanggal_cetak?new Date(`${m.tanggal_cetak}T00:00:00`).toISOString():new Date().toISOString(),l=[{id:Date.now().toString(),...m,created_at:_,tanggal_cetak:m.tanggal_cetak||new Date().toISOString().split("T")[0],tahun_pelajaran:S.tahun_pelajaran?.active_year||"2024/2025",semester:S.tahun_pelajaran?.semester||"Ganjil"},...$];await D.from("site_settings").upsert({id:"ai_teaching_list",value:l,updated_at:new Date().toISOString()}),F(l),H(!1),ma("Dokumen tersimpan!")}catch{la("Gagal menyimpan")}finally{_a(!1)}}},C=_=>_.replace(/[#*]/g,"").trim(),xa=_=>{const n=_.split(`
`).filter(t=>t.includes("|"));if(n.length===0)return null;const l=n[0].trim().replace(/^\||\|$/g,"").split("|").map(t=>C(t)),s=n.slice(1).filter(t=>!t.includes("---")).map(t=>t.trim().replace(/^\||\|$/g,"").split("|").map(r=>C(r)).filter((r,e)=>e<l.length));return a.jsx("div",{className:"my-4 border border-black overflow-hidden",children:a.jsxs("table",{className:"w-full text-[9pt] border-collapse",children:[a.jsx("thead",{children:a.jsx("tr",{className:"bg-gray-100 border-b border-black",children:l.map((t,i)=>a.jsx("th",{className:"border-r border-black p-2 font-bold text-center last:border-0",children:t},i))})}),a.jsx("tbody",{children:s.map((t,i)=>a.jsx("tr",{className:"border-b border-black last:border-0",children:t.map((r,e)=>a.jsx("td",{className:"border-r border-black p-2 last:border-0 align-top",children:r},e))},i))})]})})},Ra=_=>{const n=W,l=_.tahun_pelajaran||S.tahun_pelajaran?.active_year||"2024/2025",s=_.semester||S.tahun_pelajaran?.semester||"Ganjil",t=ta(_.fase),i=Array.isArray(_.materi_pokok)?_.materi_pokok.join(", "):"-",r=_.tanggal_cetak?new Date(_.tanggal_cetak).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"-";return a.jsxs("div",{className:"mb-4",children:[a.jsx("table",{className:"w-full text-[10pt] border-collapse leading-tight",children:a.jsxs("tbody",{children:[a.jsxs("tr",{children:[a.jsx("td",{className:"w-[180px] py-0.5",children:"Satuan Pendidikan"}),a.jsx("td",{className:"w-[10px] py-0.5",children:":"}),a.jsx("td",{className:"py-0.5 font-bold",children:n})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Mata Pelajaran"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5",children:_.mata_pelajaran})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Kelas / Semester"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsxs("td",{className:"py-0.5",children:[t.kelas," / ",s]})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Materi Pokok"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5 font-medium",children:i})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Alokasi Waktu"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5",children:_.alokasi_waktu})]}),(_.jenis_dokumen==="modul_ajar"||_.jenis_dokumen==="rpp_rpm")&&_.pertemuan&&a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Pertemuan"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5",children:_.pertemuan})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Tahun Pelajaran"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5",children:l})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Tanggal Cetak"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5 font-bold",children:r})]}),a.jsxs("tr",{children:[a.jsx("td",{className:"py-0.5",children:"Nama Guru"}),a.jsx("td",{className:"py-0.5",children:":"}),a.jsx("td",{className:"py-0.5 font-bold",children:t.nama})]})]})}),a.jsx("div",{className:"border-b border-black mt-2"})]})};return I?a.jsxs("div",{className:"min-h-screen bg-slate-100 flex flex-col print:bg-white",children:[a.jsxs("div",{className:"sticky top-0 z-[100] bg-white border-b p-4 flex justify-between items-center print:hidden shadow-md",children:[a.jsxs(T,{variant:"ghost",onClick:()=>q(null),className:"font-bold text-gray-600",children:[a.jsx(Ya,{className:"w-4 h-4 mr-2"})," Kembali ke Dashboard"]}),a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsx("p",{className:"text-xs text-gray-400 italic hidden sm:block",children:"Margin: 2cm (Atas, Bawah, Kiri, Kanan)"}),a.jsxs(T,{onClick:()=>window.print(),className:"bg-emerald-600 text-white px-8 font-bold shadow-lg",children:[a.jsx(Qa,{className:"w-4 h-4 mr-2"})," Cetak Sekarang"]})]})]}),a.jsx("div",{className:"flex-1 p-4 sm:p-12 overflow-y-auto print:p-0 print:overflow-visible",children:a.jsx("div",{id:"print-area-root",className:"mx-auto print:w-full",children:I.hasil.split("[PAGE_BREAK]").filter(_=>_.trim()!=="").map((_,n,l)=>{const s=_.includes("[HALAMAN COVER]"),t=_.includes("[IDENTITAS_TABLE]"),i=n===l.length-1,r=_.replace("[HALAMAN COVER]","").replace("[IDENTITAS_TABLE]",""),e=r.split("Disusun Oleh:"),p=e[0],d=e[1];return a.jsxs("div",{className:`bg-white mx-auto shadow-2xl print:shadow-none print:m-0 print:p-0 print:w-full print:border-none ${i?"":"break-after-page mb-10"} flex flex-col`,style:{width:"210mm",minHeight:"297mm",padding:"2cm",boxSizing:"border-box",position:"relative"},children:[!s&&a.jsx(Va,{}),s?a.jsxs("div",{className:"flex flex-col h-full justify-between",children:[a.jsxs("div",{className:"flex-1 flex flex-col items-center justify-center text-center whitespace-pre-wrap font-serif text-[11pt] leading-relaxed text-gray-900",children:[S.identitas_madrasah?.logo_url&&a.jsx("img",{src:S.identitas_madrasah.logo_url,alt:"Logo",className:"w-32 h-32 mb-12 mx-auto object-contain"}),p.split(`

`).map((k,u)=>a.jsx("p",{className:"mb-4",children:C(k)},u))]}),a.jsxs("div",{className:"flex flex-col items-center",children:[d&&a.jsxs("div",{className:"text-center font-serif text-[11pt] mb-20",children:[a.jsx("p",{className:"font-bold mb-2",children:"Disusun Oleh:"}),d.split(`
`).map((k,u)=>a.jsx("p",{children:C(k)},u))]}),a.jsxs("div",{className:"w-full text-center font-serif border-t-2 border-black pt-4",children:[a.jsx("p",{className:"text-[14pt] font-bold uppercase leading-tight",children:W}),a.jsxs("p",{className:"text-[12pt] font-bold leading-tight",children:["TAHUN PELAJARAN ",I.tahun_pelajaran||S.tahun_pelajaran?.active_year||"2024/2025"]})]})]})]}):a.jsxs("div",{className:"flex flex-col h-full",children:[a.jsxs("div",{className:"whitespace-pre-wrap font-serif text-[11pt] leading-relaxed text-gray-900 text-justify flex-1",children:[t&&Ra(I),r.split(`

`).map((k,u)=>k.includes("|")?a.jsx("div",{children:xa(k)},u):a.jsx("p",{className:"mb-4",children:C(k)},u))]}),i&&a.jsx("div",{className:"mt-8",children:a.jsx(za,{targetKelas:I.fase,tanggalCetak:I.tanggal_cetak})})]})]},n)})})}),a.jsx("style",{dangerouslySetInnerHTML:{__html:`
          @media print {
            @page { 
              size: A4; 
              margin: 2cm !important; 
            }
            html, body { 
              height: auto; 
              background: white !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            .print\\:hidden { display: none !important; }
            .break-after-page { 
              page-break-after: always; 
              break-after: page;
              display: block;
            }
            #print-area-root { 
              width: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
            #print-area-root > div { 
              box-shadow: none !important; 
              border: none !important; 
              width: 100% !important; 
              min-height: 0 !important;
              height: auto !important;
              padding: 0 !important; 
              margin: 0 !important;
              page-break-inside: auto;
            }
            .mb-4, .mb-6, .mt-8 { margin-bottom: 1rem !important; margin-top: 1rem !important; }
          }
        `}})]}):a.jsxs(Wa,{title:"AI Teaching Assistant",children:[a.jsx(Y,{className:"mb-6 border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50 overflow-hidden",children:a.jsx(sa,{className:"p-6",children:a.jsxs("div",{className:"flex flex-col md:flex-row items-center justify-between gap-4",children:[a.jsxs("div",{className:"flex items-center gap-4",children:[a.jsx("div",{className:"w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg",children:a.jsx(ka,{className:"w-6 h-6 text-white"})}),a.jsxs("div",{children:[a.jsx("p",{className:"text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1",children:"Materi Hari Ini"}),a.jsx("h3",{className:"text-xl font-black text-gray-900",children:"Shalat Jumat"})]})]}),a.jsxs("div",{className:"flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm",children:[a.jsxs("div",{className:"text-center",children:[a.jsx("p",{className:"text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5",children:"Hari"}),a.jsx("p",{className:"text-lg font-black text-emerald-600",children:Aa})]}),a.jsx("div",{className:"h-8 w-px bg-gray-200"}),a.jsxs("div",{className:"text-center",children:[a.jsx("p",{className:"text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5",children:"Tanggal"}),a.jsx("p",{className:"text-lg font-bold text-gray-900",children:ba})]})]})]})})}),a.jsxs("div",{className:"flex flex-col gap-6",children:[a.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4",children:[a.jsxs("div",{className:"flex flex-1 items-center gap-3",children:[a.jsxs("div",{className:"relative flex-1 max-w-md",children:[a.jsx(qa,{className:"absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"}),a.jsx(R,{placeholder:"Cari topik...",value:L,onChange:_=>ga(_.target.value),className:"pl-10 rounded-xl bg-white border-0 shadow-sm"})]}),a.jsxs(U,{value:v,onValueChange:ha,children:[a.jsx(J,{className:"w-48 rounded-xl bg-white border-0 shadow-sm",children:a.jsx(O,{placeholder:"Semua Jenis"})}),a.jsxs(G,{children:[a.jsx(w,{value:"all",children:"Semua Jenis"}),B.map(_=>a.jsx(w,{value:_.value,children:_.label},_.value))]})]})]}),a.jsxs(T,{onClick:()=>{K({jenis_dokumen:"modul_ajar",mata_pelajaran:"Al-Quran Hadits",fase:"Fase A - Kelas 1",topik:"",materi_pokok:[],alokasi_waktu:"2 × 35 menit",pertemuan:"",hasil:"",tanggal_cetak:new Date().toISOString().split("T")[0]}),na(),H(!0)},className:"bg-emerald-600 text-white rounded-xl font-bold shadow-lg",children:[a.jsx(i_,{className:"w-4 h-4 mr-2"})," Buat Baru"]})]}),a.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",children:Pa.map(_=>{const n=B.find(s=>s.value===_.jenis_dokumen)||B[0],l=s=>s?new Date(s).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"";return a.jsx(Y,{className:"border-0 shadow-sm rounded-2xl hover:shadow-md transition-all group",children:a.jsxs(sa,{className:"p-4 sm:p-5",children:[a.jsxs("div",{className:"flex items-start justify-between mb-3 sm:mb-4",children:[a.jsx("div",{className:`w-10 h-10 sm:w-12 sm:h-12 ${n.color} rounded-2xl flex items-center justify-center text-white shadow-lg`,children:a.jsx(n.icon,{className:"w-5 h-5 sm:w-6 sm:h-6"})}),a.jsx(T,{variant:"ghost",size:"sm",onClick:()=>{if(confirm("Hapus?")){const s=$.filter(t=>t.id!==_.id);D.from("site_settings").upsert({id:"ai_teaching_list",value:s}).then(()=>F(s))}},className:"text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity",children:a.jsx(t_,{className:"w-4 h-4"})})]}),a.jsxs("div",{className:"flex flex-wrap gap-2 mb-2",children:[a.jsx(Q,{className:"bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px]",children:n.label}),a.jsx(Q,{variant:"outline",className:"text-[10px]",children:_.fase}),_.tahun_pelajaran&&a.jsx(Q,{className:"bg-blue-50 text-blue-700 border-blue-100 text-[10px]",children:_.tahun_pelajaran})]}),a.jsx("h3",{className:"font-bold text-gray-900 mb-1 line-clamp-1",children:_.mata_pelajaran}),_.materi_pokok&&_.materi_pokok.length>0&&a.jsxs("p",{className:"text-sm text-gray-600 line-clamp-2 mb-1",children:[a.jsx("span",{className:"font-medium text-gray-700",children:"Materi: "}),_.materi_pokok.join(", ")]}),(_.tanggal_cetak||_.created_at)&&a.jsxs("p",{className:"text-xs text-gray-500 flex items-center gap-1",children:[a.jsx(ua,{className:"w-3 h-3"}),l(_.tanggal_cetak||_.created_at)]}),a.jsxs(T,{variant:"outline",className:"w-full rounded-xl font-bold mt-3",onClick:()=>q(_),children:[a.jsx(La,{className:"w-4 h-4 mr-2"})," Lihat & Cetak"]})]})},_.id)})})]}),a.jsx(Ua,{open:da,onOpenChange:H,children:a.jsxs(Ja,{className:"sm:max-w-3xl rounded-3xl max-h-[calc(100dvh-40px)] overflow-y-auto",children:[a.jsx(Oa,{children:a.jsxs(Ga,{className:"flex items-center gap-2",children:["Konfigurasi Dokumen",a.jsxs(T,{variant:"outline",size:"sm",onClick:Ta,disabled:X,className:"ml-auto text-purple-600 border-purple-100 rounded-lg",children:[X?a.jsx(ra,{className:"w-3 h-3 animate-spin mr-1"}):a.jsx(va,{className:"w-3 h-3 mr-1"})," Generate"]})]})}),a.jsxs("div",{className:"space-y-6 pt-4",children:[a.jsxs("div",{className:"grid md:grid-cols-2 gap-4",children:[a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Jenis Dokumen"}),a.jsxs(U,{value:m.jenis_dokumen,onValueChange:_=>K({...m,jenis_dokumen:_}),children:[a.jsx(J,{className:"rounded-xl h-12",children:a.jsx(O,{})}),a.jsx(G,{children:B.map(_=>a.jsx(w,{value:_.value,children:_.fullLabel},_.value))})]})]}),a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Mata Pelajaran"}),a.jsxs(U,{value:m.mata_pelajaran,onValueChange:_=>K({...m,mata_pelajaran:_,materi_pokok:[]}),children:[a.jsx(J,{className:"rounded-xl h-12",children:a.jsx(O,{})}),a.jsx(G,{className:"max-h-[300px]",children:l_.map(_=>a.jsx(w,{value:_,children:_},_))})]})]})]}),a.jsxs("div",{className:"grid md:grid-cols-2 gap-4",children:[a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Fase dan Kelas"}),a.jsxs(U,{value:m.fase,onValueChange:_=>K({...m,fase:_,materi_pokok:[]}),children:[a.jsx(J,{className:"rounded-xl h-12",children:a.jsx(O,{})}),a.jsx(G,{children:r_.map(_=>a.jsx(w,{value:_.value,children:_.label},_.value))})]})]}),a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Alokasi Waktu"}),a.jsx(R,{value:m.alokasi_waktu,onChange:_=>K({...m,alokasi_waktu:_.target.value}),className:"rounded-xl h-12"})]})]}),(m.jenis_dokumen==="modul_ajar"||m.jenis_dokumen==="rpp_rpm")&&a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Pertemuan Ke-"}),a.jsx(R,{value:m.pertemuan,onChange:_=>K({...m,pertemuan:_.target.value}),className:"rounded-xl h-12",placeholder:"Contoh: 1, 2, 3, dst."})]}),a.jsxs("div",{className:"grid md:grid-cols-2 gap-4",children:[a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Tanggal Cetak"}),a.jsx(R,{type:"date",value:m.tanggal_cetak,onChange:_=>K({...m,tanggal_cetak:_.target.value}),className:"rounded-xl h-12"})]}),a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Topik"}),a.jsx(R,{value:m.topik,onChange:_=>K({...m,topik:_.target.value}),className:"rounded-xl h-12",placeholder:"Masukkan topik pembelajaran..."})]})]}),a.jsxs("div",{className:"space-y-3",children:[a.jsxs("label",{className:"text-xs font-bold text-emerald-600 uppercase flex items-center justify-between",children:[a.jsx("span",{children:"Pilih Materi Pokok (Dari Bedah CP)"}),E.length>0&&a.jsxs("span",{className:"text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold",children:[E.length," Materi Ditemukan"]})]}),a.jsx(Y,{className:"border-dashed border-2 bg-gray-50/50",children:a.jsx(Fa,{className:"h-[160px] p-4",children:E.length>0?a.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:E.map((_,n)=>a.jsxs("div",{className:"flex items-start space-x-2 bg-white p-2.5 rounded-xl border shadow-sm hover:border-emerald-300 transition-colors",children:[a.jsx(Ha,{id:`materi-${n}`,checked:m.materi_pokok.includes(_.materi_pokok),onCheckedChange:()=>Na(_.materi_pokok),className:"mt-0.5"}),a.jsxs("label",{htmlFor:`materi-${n}`,className:"text-xs font-medium cursor-pointer flex-1",children:[_.materi_pokok,_.elemen&&a.jsxs("span",{className:"block text-[10px] text-emerald-600 font-semibold mt-0.5",children:["Elemen: ",_.elemen]})]})]},n))}):a.jsxs("div",{className:"text-center py-6 space-y-1",children:[a.jsxs("p",{className:"text-xs text-gray-500 font-medium",children:["Data Bedah CP belum tersedia untuk ",a.jsx("span",{className:"font-bold text-emerald-700",children:m.mata_pelajaran})," (",m.fase,")."]}),a.jsxs("p",{className:"text-[11px] text-gray-400",children:["Silakan tambahkan data di menu ",a.jsx("span",{className:"font-semibold text-gray-600",children:"Kurikulum > Bedah CP"}),"."]})]})})})]}),m.hasil&&a.jsxs("div",{className:"space-y-2",children:[a.jsx("label",{className:"text-xs font-bold text-gray-500 uppercase",children:"Hasil Preview"}),a.jsx(Da,{value:m.hasil,onChange:_=>K({...m,hasil:_.target.value}),className:"min-h-[250px] rounded-xl text-[10pt] font-mono bg-gray-50 p-4"})]}),a.jsxs(T,{onClick:Ca,disabled:aa||!m.hasil,className:"w-full bg-emerald-600 text-white rounded-xl h-14 font-bold shadow-xl",children:[aa?a.jsx(ra,{className:"w-5 h-5 animate-spin mr-2"}):a.jsx(s_,{className:"w-5 h-5 mr-2"})," Simpan Dokumen"]})]})]})})]})};export{V_ as default};
