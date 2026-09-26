/* Tamreen service worker — keeps a copy of the app on the phone so it opens with no signal.
   - The page: fetched fresh when online (up to 3 s), otherwise the saved copy.
   - Its files (CSS, JS, icons, manifest): the list comes from index.html itself. Files with ?v= never
     change, so a saved copy is used; files the page stops linking to are deleted. Nothing here needs
     editing when the ?v= numbers are bumped.
   - Google Fonts: saved on first use. */
const CACHE="tamreen", FONTS="tamreen-fonts";
const pageUrl=()=>new URL("index.html",self.registration.scope).href;
const asPage=html=>new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}});

/* save the page and every local file it links to; drop what it no longer links to */
async function save(html){
  const cache=await caches.open(CACHE), scope=self.registration.scope;
  await cache.put(pageUrl(),asPage(html));
  const files=[...new Set([...html.matchAll(/(?:href|src)="(?![a-z]+:|#|\/\/)([^"]+)"/gi)]
    .map(m=>new URL(m[1],scope).href))];
  await Promise.all(files.map(async url=>{
    if(url.includes("?v=")&&await cache.match(url)) return;
    try{ const r=await fetch(url,{cache:"no-cache"}); if(r.ok) await cache.put(url,r); }catch(e){}
  }));
  const keep=new Set([...files,pageUrl()]);
  for(const req of await cache.keys()) if(!keep.has(req.url)) await cache.delete(req);
}
async function cacheFirst(name,req){
  const cache=await caches.open(name), hit=await cache.match(req);
  if(hit) return hit;
  const r=await fetch(req);
  if(r.ok||r.type==="opaque") cache.put(req,r.clone());
  return r;
}
async function page(fresh){
  const saved=await (await caches.open(CACHE)).match(pageUrl());
  if(!saved) return fresh.then(asPage);                       // first visit: nothing saved yet
  const slow=new Promise(ok=>setTimeout(ok,3000)).then(()=>saved);
  return Promise.race([fresh.then(asPage),slow]).catch(()=>saved);
}

self.addEventListener("install",e=>{
  e.waitUntil(fetch(pageUrl(),{cache:"no-cache"}).then(r=>r.text()).then(save).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k!==CACHE&&k!==FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=="GET") return;
  if(req.mode==="navigate"&&req.url.startsWith(self.registration.scope)){
    const fresh=fetch(req.url,{cache:"no-cache"}).then(r=>r.ok?r.text():Promise.reject(r.status));
    e.waitUntil(fresh.then(save).catch(()=>{}));
    e.respondWith(page(fresh));
  }else if(/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(cacheFirst(FONTS,req));
  }else if(req.url.startsWith(self.registration.scope)){
    e.respondWith(cacheFirst(CACHE,req));
  }
});
