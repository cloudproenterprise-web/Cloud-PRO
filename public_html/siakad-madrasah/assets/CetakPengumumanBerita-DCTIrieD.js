import{c as N,u as k,a4 as A,r as s,t as _,j as t,h as b,F as D,a7 as S}from"./index-CCahgCu8.js";import{K as I}from"./KopSurat-DHAa3G6R.js";import{P as T}from"./PenandatanganDokumen-khKoKHi6.js";import{A as E}from"./arrow-left-CEeBlXHE.js";import{P as L}from"./printer-DxGXxTqW.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=N("Video",[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]]),H=({item:e,type:m,onClose:h})=>{const{settings:x}=k(),{requirePrintAuth:g}=A(),[u,P]=s.useState(!0),[f,$]=s.useState(!0),[v,M]=s.useState(!0),[l,R]=s.useState("portrait");s.useEffect(()=>(document.body.classList.add("portal-print-active"),()=>{document.body.classList.remove("portal-print-active")}),[]);const o=x.pengaturan_cetak||{margin_top:1,margin_right:1,margin_bottom:1,margin_left:1};let r=[];if(e.images&&Array.isArray(e.images)&&e.images.length>0?r=e.images.filter(a=>typeof a=="string"&&a.trim().length>0):e.image_url?r=[e.image_url]:e.thumbnail_url&&(r=[e.thumbnail_url]),r.length===0&&e.video_url){const a=_(e.video_url);a&&(r=[a])}const p=e.content||e.description||"",c=a=>{if(!a)return"";try{return new Date(a).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}catch{return a}},w=c(e.created_at||new Date().toISOString()),j=e.event_date?c(e.event_date):"",n=m==="pengumuman",i=m==="galeri";`${(e.id||"101").substring(0,8).toUpperCase()}`,`${new Date().getFullYear()}`;const y=t.jsxs("div",{id:"printable-portal-root",className:"fixed inset-0 z-[9999] bg-slate-900/90 overflow-y-auto font-serif print:static print:bg-white print:overflow-visible",children:[t.jsxs("div",{className:"sticky top-0 z-[10000] bg-white/95 backdrop-blur-md border-b border-slate-200 p-3 sm:p-4 flex justify-between items-center print:hidden shadow-md gap-3",children:[t.jsxs(b,{variant:"outline",size:"sm",onClick:h,className:"font-bold text-slate-700 hover:bg-slate-100 rounded-xl h-9",children:[t.jsx(E,{className:"w-4 h-4 mr-1.5"})," Kembali"]}),t.jsx("div",{className:"flex items-center gap-2",children:t.jsxs(b,{size:"sm",onClick:()=>{g(()=>{window.print()},`${n?"Pengumuman Resmi":i?"Dokumentasi Galeri":"Berita / Artikel"}: ${e.title||"Dokumen"}`)},className:"bg-emerald-600 hover:bg-emerald-700 text-white px-5 font-bold h-9 rounded-xl shadow-md flex items-center gap-2 cursor-pointer text-xs sm:text-sm",children:[t.jsx(L,{className:"w-4 h-4"})," ",t.jsx("span",{children:"Cetak Dokumen"})]})})]}),t.jsx("div",{className:"p-4 md:p-8 flex justify-center print:p-0 print:m-0 print:block",children:t.jsxs("div",{id:"printable-paper",className:"bg-white shadow-2xl print:shadow-none print:w-full flex flex-col justify-between my-2 print:my-0 text-slate-900 border border-slate-200 print:border-none",style:{width:l==="landscape"?"297mm":"210mm",minHeight:l==="landscape"?"210mm":"297mm",padding:`${o.margin_top||1}cm ${o.margin_right||1}cm ${o.margin_bottom||1}cm ${o.margin_left||1}cm`,boxSizing:"border-box"},children:[t.jsxs("div",{children:[u&&t.jsx(I,{}),t.jsxs("div",{className:"text-center my-4 font-serif border-b-2 border-slate-900 pb-3",children:[t.jsx("span",{className:"inline-block bg-slate-100 text-slate-800 text-[9.5pt] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 border border-slate-300 print:border-slate-400",children:n?"PENGUMUMAN RESMI MADRASAH":i?"DOKUMENTASI & GALERI KEGIATAN MADRASAH":"BERITA & ARTIKEL RESMI MADRASAH"}),t.jsx("h1",{className:"text-xl md:text-2xl font-black text-slate-900 mb-1.5 uppercase tracking-tight font-serif leading-snug",children:e.title}),t.jsxs("p",{className:"text-[9pt] text-slate-600 italic font-sans",children:["Kategori: ",e.category||(e.video_url||e.media_type==="video"?"Video Dokumentasi":"Foto Galeri Kegiatan"),e.created_at?` • Tanggal Publikasi: ${w}`:"",e.author?` • Oleh: ${e.author}`:""]})]}),n&&(e.event_date||e.event_location||e.event_time)&&t.jsxs("div",{className:"mb-6 border-2 border-slate-800 p-4 font-serif text-[10pt] bg-slate-50/50 print:bg-transparent",children:[t.jsx("p",{className:"font-bold text-slate-900 mb-2 border-b border-slate-400 pb-1 uppercase tracking-wide text-xs",children:"📌 RINCIAN PELAKSANAAN / KEGIATAN:"}),t.jsx("table",{className:"w-full text-left font-serif border-collapse",children:t.jsxs("tbody",{children:[e.event_date&&t.jsxs("tr",{children:[t.jsx("td",{className:"py-1 w-36 font-bold text-slate-900",children:"Hari, Tanggal"}),t.jsx("td",{className:"py-1 w-4 text-center",children:":"}),t.jsx("td",{className:"py-1 text-slate-900",children:j})]}),e.event_time&&t.jsxs("tr",{children:[t.jsx("td",{className:"py-1 w-36 font-bold text-slate-900",children:"Waktu / Jam"}),t.jsx("td",{className:"py-1 w-4 text-center",children:":"}),t.jsxs("td",{className:"py-1 text-slate-900",children:[e.event_time," WIB"]})]}),e.event_location&&t.jsxs("tr",{children:[t.jsx("td",{className:"py-1 w-36 font-bold text-slate-900",children:"Tempat / Lokasi"}),t.jsx("td",{className:"py-1 w-4 text-center",children:":"}),t.jsx("td",{className:"py-1 text-slate-900",children:e.event_location})]})]})})]}),i&&e.video_url&&t.jsxs("div",{className:"mb-6 p-3 bg-slate-50 border border-slate-300 rounded font-sans text-xs",children:[t.jsxs("p",{className:"font-bold text-slate-800 flex items-center gap-1.5",children:[t.jsx(K,{className:"w-3.5 h-3.5 text-rose-600"})," Link Video Dokumentasi:"]}),t.jsx("p",{className:"text-emerald-700 font-mono underline break-all mt-0.5",children:e.video_url})]}),p&&t.jsx("div",{className:"text-[11pt] leading-relaxed text-slate-900 whitespace-pre-wrap text-justify mb-6 font-serif",children:p}),v&&r.length>0&&t.jsxs("div",{className:"mb-6",children:[i&&t.jsxs("div",{className:"flex items-center gap-2 mb-3 pb-1 border-b border-slate-300 font-sans text-xs font-bold text-slate-800",children:[t.jsx(D,{className:"w-4 h-4 text-emerald-700"}),t.jsxs("span",{children:["DOKUMENTASI FOTO KEGIATAN (",r.length," Foto)"]})]}),r.length===1?t.jsxs("div",{className:"relative aspect-[16/9] max-h-[350px] w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-100 print:bg-white my-2 shadow-sm print:shadow-none break-inside-avoid print:break-inside-avoid",children:[t.jsx("img",{src:r[0],alt:e.title,className:"w-full h-full object-cover gallery-img"}),t.jsx("span",{className:"absolute bottom-2 left-2 bg-slate-900/80 text-white text-[8pt] px-2 py-0.5 rounded font-sans font-medium print:border print:border-slate-400 print:bg-slate-800",children:"Foto Dokumentasi"})]}):t.jsx("div",{className:"grid grid-cols-2 gap-3.5 my-2",children:r.map((a,d)=>t.jsxs("div",{className:"relative aspect-[4/3] w-full rounded-lg border border-slate-300 overflow-hidden bg-slate-100 print:bg-white shadow-sm print:shadow-none break-inside-avoid print:break-inside-avoid",children:[t.jsx("img",{src:a,alt:`${e.title} ${d+1}`,className:"w-full h-full object-cover gallery-img"}),t.jsxs("span",{className:"absolute bottom-1.5 left-1.5 bg-slate-900/75 text-white text-[7.5pt] px-1.5 py-0.5 rounded font-sans font-medium print:bg-slate-800 print:border print:border-slate-500",children:["Foto ",d+1]})]},d))})]})]}),t.jsxs("div",{children:[f&&t.jsx("div",{className:"mt-8 break-inside-avoid",children:t.jsx(T,{showGuru:!1})}),t.jsxs("div",{className:"mt-8 pt-2 border-t border-slate-400 text-[8pt] text-slate-600 flex justify-between items-center font-sans",children:[t.jsxs("p",{children:["Dokumen Resmi Madrasah (",i?"Dokumentasi Galeri":n?"Pengumuman":"Artikel",") | Dicetak pada: ",new Date().toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})]}),t.jsx("p",{className:"font-semibold",children:"Si@Kad Madrasah"})]})]})]})}),t.jsx("style",{dangerouslySetInnerHTML:{__html:`
        @media print { 
          /* Completely hide main app container #root and all non-printable elements */
          #root,
          body > *:not(#printable-portal-root),
          .print\\:hidden,
          [class*="print:hidden"] { 
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
            opacity: 0 !important;
            position: absolute !important;
            top: -99999px !important;
            left: -99999px !important;
          }

          @page { 
            size: A4 ${l}; 
            margin: 8mm 10mm; 
          } 

          html, body { 
            background: #ffffff !important; 
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          } 

          #printable-portal-root,
          div#printable-portal-root,
          body > #printable-portal-root { 
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            visibility: visible !important;
            float: none !important;
          } 

          #printable-portal-root * {
            visibility: visible !important;
          }

          #printable-paper { 
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
          } 

          #printable-portal-root img.gallery-img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #printable-portal-root img:not(.gallery-img) {
            max-width: 100% !important;
            max-height: 10cm !important;
            object-fit: contain !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .break-inside-avoid,
          [class*="break-inside-avoid"] {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}})]});return S.createPortal(y,document.body)};export{H as C,K as V};
