import{u as m,j as a,y as c,b2 as h,h as l}from"./index-CCahgCu8.js";import{K as o}from"./KopSurat-DHAa3G6R.js";import{P as x}from"./PenandatanganDokumen-khKoKHi6.js";import{A as p}from"./arrow-left-CEeBlXHE.js";import{P as g}from"./printer-DxGXxTqW.js";import"./formatGelar-DvtJTrhG.js";const u=({children:i,title:s="Dokumen Resmi",showSignature:e=!0,showGuruSignature:n=!0,signatureMode:r="default"})=>{const{settings:t}=m(),d=t.general||{};return a.jsxs("div",{className:"max-w-4xl mx-auto p-8 bg-white min-h-screen print:p-0 print:m-0 print:shadow-none print:w-full",children:[a.jsx(o,{}),a.jsxs("div",{className:"text-center mb-8",children:[a.jsx("h2",{className:"text-2xl font-bold text-gray-900 mb-2",children:s}),a.jsx("p",{className:"text-gray-600",children:d.school_name||"Si@Kad"})]}),a.jsx("div",{className:"mb-8",children:i}),e&&a.jsx(x,{mode:r,showGuru:n}),a.jsx("style",{dangerouslySetInnerHTML:{__html:`
        @media print {
          @page {
            margin: 2cm;
            size: A4;
          }
          html, body {
            background: white !important;
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          aside, header, nav, button, .fixed, .absolute.top-0 {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          div {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}})]})},k=()=>{const i=c(),{type:s}=h(),e={siswa:{nama:"Ahmad Fauzi",nisn:"1234567890",kelas:"Kelas 1 (Reguler)",tgl_lahir:"15 Januari 2019",nama_ayah:"Bapak Ahmad",nama_ibu:"Ibu Siti",sekolah:"Si@Kad Madrasah"}},n=()=>{switch(s){case"surat-pengantar":return"Surat Pengantar Penerimaan Siswa Baru";case"konfirmasi-pendaftaran":return"Konfirmasi Pendaftaran Siswa Baru";case"ijazah":return"Ijazah Madrasah Ibtidaiyah";default:return"Dokumen Resmi"}},r=()=>{window.print()},t=s==="surat-pengantar"||s==="konfirmasi-pendaftaran";return a.jsxs("div",{className:"min-h-screen bg-gray-100",children:[a.jsx("div",{className:"bg-white shadow-sm border-b print:hidden",children:a.jsxs("div",{className:"container mx-auto px-4 py-3 flex items-center justify-between",children:[a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsxs(l,{variant:"ghost",onClick:()=>i(-1),className:"flex items-center gap-2",children:[a.jsx(p,{className:"w-4 h-4"}),"Kembali"]}),a.jsxs("h1",{className:"text-lg font-semibold text-gray-900",children:["Preview: ",n()]})]}),a.jsxs(l,{onClick:r,className:"bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2",children:[a.jsx(g,{className:"w-4 h-4"}),"Cetak Dokumen"]})]})}),a.jsxs(u,{title:n(),showSignature:!0,signatureMode:t?"spmb":"default",showGuruSignature:!t,children:[s==="surat-pengantar"&&a.jsxs("div",{className:"space-y-6",children:[a.jsx("p",{className:"text-justify leading-relaxed text-gray-700",children:"Dengan hormat,"}),a.jsxs("p",{className:"text-justify leading-relaxed text-gray-700",children:["Yang bertanda tangan di bawah ini, Kepala ",e.siswa.sekolah,", dengan ini menerangkan bahwa:"]}),a.jsxs("div",{className:"ml-8 space-y-2",children:[a.jsxs("p",{children:[a.jsx("strong",{children:"Nama:"})," ",e.siswa.nama]}),a.jsxs("p",{children:[a.jsx("strong",{children:"NISN:"})," ",e.siswa.nisn]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Kelas:"})," ",e.siswa.kelas]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Tempat/Tgl Lahir:"})," ",e.siswa.tgl_lahir]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Nama Ayah:"})," ",e.siswa.nama_ayah]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Nama Ibu:"})," ",e.siswa.nama_ibu]})]}),a.jsxs("p",{className:"text-justify leading-relaxed text-gray-700 mt-6",children:["adalah siswa/siswi yang benar-benar telah terdaftar di ",e.siswa.sekolah,"untuk tahun ajaran 2025/2026. Demikian surat pengantar ini dibuat untuk dapat dipergunakan sebagaimana mestinya."]})]}),s==="konfirmasi-pendaftaran"&&a.jsxs("div",{className:"space-y-6",children:[a.jsx("p",{className:"text-center font-semibold mb-4",children:"BUKU PENDAFTARAN SISWA BARU"}),a.jsx("p",{className:"text-center text-gray-600 mb-6",children:"Tahun Ajaran 2025/2026"}),a.jsx("div",{className:"border-t pt-4",children:a.jsx("p",{className:"text-sm text-gray-500",children:"Data lengkap pendaftar tercantum dalam sistem."})})]}),s==="ijazah"&&a.jsxs("div",{className:"space-y-6 text-center",children:[a.jsx("h3",{className:"text-xl font-bold",children:"SURAT KETERANGAN LULUS"}),a.jsx("p",{className:"text-gray-600",children:"Nomor: 001/SK.II/2025"}),a.jsxs("div",{className:"text-left space-y-4 mt-8",children:[a.jsx("p",{children:"Yang bertanda tangan di bawah ini, Kepala Madrasah, dengan ini menerangkan bahwa:"}),a.jsxs("div",{className:"ml-8 space-y-2",children:[a.jsxs("p",{children:[a.jsx("strong",{children:"Nama:"})," ",e.siswa.nama]}),a.jsxs("p",{children:[a.jsx("strong",{children:"NISN:"})," ",e.siswa.nisn]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Tempat/Tgl Lahir:"})," ",e.siswa.tgl_lahir]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Nama Ayah:"})," ",e.siswa.nama_ayah]}),a.jsxs("p",{children:[a.jsx("strong",{children:"Nama Ibu:"})," ",e.siswa.nama_ibu]})]}),a.jsx("p",{className:"mt-6",children:"Telah menyelesaikan seluruh mata pelajaran dengan baik dan dinyatakan LULUS pada Tahun Ajaran 2024/2025."})]})]})]})]})};export{k as default};
