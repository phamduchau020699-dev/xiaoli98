// Web Push (VAPID) miễn phí, không cần Firebase. Khóa tự sinh lần đầu và lưu cùng dữ liệu (hoặc đặt VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY).
const webpush=require('web-push');
module.exports=function makePush(db,save,{dryRun=false}={}){
  if(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY)db.vapid={publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY};
  if(!db.vapid){db.vapid=webpush.generateVAPIDKeys();save()}
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:admin@xiaoli98.app',db.vapid.publicKey,db.vapid.privateKey);
  const log=[],list=u=>db.push[u]||(db.push[u]=[]);
  return {publicKey:db.vapid.publicKey,log,
    subscribe(u,s){const L=list(u).filter(x=>x.endpoint!==s.endpoint);L.push({endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}});db.push[u]=L.slice(-5);save();return db.push[u].length},
    unsubscribe(u,ep){db.push[u]=list(u).filter(x=>x.endpoint!==ep);save();return db.push[u].length},
    async notify(u,payload){for(const s of [...list(u)]){
      if(dryRun){log.push({endpoint:s.endpoint,payload});continue}
      try{await webpush.sendNotification(s,JSON.stringify(payload),{TTL:3600})}
      catch(e){if([404,410].includes(e.statusCode)){db.push[u]=list(u).filter(x=>x.endpoint!==s.endpoint);save()}}}}};
};
