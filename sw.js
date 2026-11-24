/* Buku Kas Saku: service worker. Menyimpan berkas aplikasi di perangkat supaya bisa dibuka tanpa internet.
   Catatan keuangan TIDAK lewat sini: tersimpan di localStorage perangkat, bukan di cache. */
const V='kas-v1';
const SHELL=['index.html','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
// Respons hasil pengalihan tidak boleh disajikan untuk navigasi; salin jadi respons biasa.
const plain=async r=>r.redirected?new Response(await r.blob(),{status:r.status,statusText:r.statusText,headers:r.headers}):r;
self.addEventListener('install',e=>{e.waitUntil((async()=>{
  const c=await caches.open(V);
  for(const u of SHELL){const r=await fetch(u,{cache:'reload'});if(!r.ok)throw new Error(u+' '+r.status);await c.put(u,await plain(r))}
  await self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==V&&k.startsWith('kas-'))await caches.delete(k);
  await self.clients.claim()})())});
const netFirst=(r,ms)=>new Promise((ok,no)=>{const t=setTimeout(()=>no(new Error('lambat')),ms);fetch(r).then(x=>{clearTimeout(t);ok(x)},e=>{clearTimeout(t);no(e)})});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(r.mode==='navigate'){   // halaman: jaringan dulu supaya versi baru cepat sampai; offline/lambat pakai salinan
    e.respondWith(netFirst(r,4000).then(async res=>{if(res.ok){const cp=await plain(res.clone());caches.open(V).then(c=>c.put('index.html',cp))}return res})
      .catch(()=>caches.match('index.html').then(m=>m||Response.error())));return}
  if(u.origin===location.origin||u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){   // berkas lain dan font: cache dulu, perbarui diam-diam
    e.respondWith(caches.match(r).then(m=>{
      const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>m);
      return m||net}))}});
