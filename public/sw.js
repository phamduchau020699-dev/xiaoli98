// Service worker: cho phép cài app (PWA) và nhận thông báo đẩy khi app đang đóng/ở nền.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('fetch',()=>{});
self.addEventListener('push',e=>{
  const d=e.data?e.data.json():{};
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    if(cs.some(c=>c.visibilityState==='visible'))return; // đang mở app thì không cần thông báo
    return self.registration.showNotification(d.title||'Xiaoli98',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.chat||'x98',data:d});
  }));
});
self.addEventListener('notificationclick',e=>{e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>cs.length?cs[0].focus():clients.openWindow('/')))});
