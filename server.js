// Xiaoli98 server: REST + Socket.IO realtime. Dữ liệu lưu trong data/db.json
const express=require('express'),http=require('http'),fs=require('fs'),path=require('path');
const {createStore}=require('./lib/store'),makePush=require('./lib/push');
const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),{Server}=require('socket.io');
const SECRET=process.env.SECRET||'doi-khoa-bi-mat-nay-xiaoli98';
(async()=>{
const store=await createStore({dir:process.env.DATA_DIR,mongoUri:process.env.MONGODB_URI});
const db=store.db,save=()=>store.save();
const push=makePush(db,save,{dryRun:!!process.env.PUSH_DRY_RUN});
console.log('Lưu trữ:',store.kind);
const app=express(),srv=http.createServer(app),io=new Server(srv);
app.use(express.json({limit:'6mb'}));app.use(express.static(path.join(__dirname,'public'),{dotfiles:'allow'}));
const err=(res,c,m)=>res.status(c).json({error:m});
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const isFriend=(a,b)=>(db.friends[a]||[]).includes(b);
const blockedEither=(a,b)=>(db.blocks[a]||[]).includes(b)||(db.blocks[b]||[]).includes(a);
const makeFriends=(a,b)=>{for(const [x,y] of [[a,b],[b,a]]){db.friends[x]=db.friends[x]||[];if(!db.friends[x].includes(y))db.friends[x].push(y)}};
const pub=u=>({username:u,name:db.users[u]?.name||u});
// --- Đăng ký / đăng nhập
app.post('/api/register',(q,res)=>{
  const {username,password,name}=q.body;const u=String(username||'').toLowerCase().trim();
  if(!/^[a-z0-9_]{3,20}$/.test(u))return err(res,400,'Tên đăng nhập 3-20 ký tự a-z, 0-9, _');
  if(!password||password.length<6)return err(res,400,'Mật khẩu tối thiểu 6 ký tự');
  if(db.users[u])return err(res,400,'Tên đăng nhập đã tồn tại');
  db.users[u]={name:(name||u).slice(0,30),hash:bcrypt.hashSync(password,8)};db.friends[u]=[];save();
  res.json({token:jwt.sign({u},SECRET,{expiresIn:'90d'}),me:pub(u)});
});
app.post('/api/login',(q,res)=>{
  const u=String(q.body.username||'').toLowerCase().trim(),x=db.users[u];
  if(!x||!bcrypt.compareSync(q.body.password||'',x.hash))return err(res,401,'Sai tên đăng nhập hoặc mật khẩu');
  res.json({token:jwt.sign({u},SECRET,{expiresIn:'90d'}),me:pub(u)});
});
app.get('/healthz',(q,res)=>res.send('ok'));
const auth=(q,res,next)=>{try{q.u=jwt.verify((q.headers.authorization||'').slice(7),SECRET).u;if(!db.users[q.u])throw 0;next()}catch(e){err(res,401,'Hết phiên đăng nhập')}};
app.use('/api',auth);
app.get('/api/me',(q,res)=>res.json(pub(q.u)));
// --- Bạn bè
app.get('/api/friends',(q,res)=>res.json((db.friends[q.u]||[]).map(pub)));
app.get('/api/users/search',(q,res)=>{
  const k=String(q.query.q||'').toLowerCase().trim();if(k.length<2)return res.json([]);
  res.json(Object.keys(db.users).filter(u=>u!==q.u&&!(db.blocks[u]||[]).includes(q.u)&&(u.includes(k)||db.users[u].name.toLowerCase().includes(k))).slice(0,20).map(u=>{
    const sent=db.requests.some(r=>r.from===q.u&&r.to===u&&r.status==='pending'),got=db.requests.some(r=>r.from===u&&r.to===q.u&&r.status==='pending');
    return {...pub(u),relation:(db.blocks[q.u]||[]).includes(u)?'blocked':isFriend(q.u,u)?'friend':sent?'sent':got?'received':'none'}}));
});
app.post('/api/requests',(q,res)=>{
  const f=String(q.body.username||'').toLowerCase().trim();
  if(!db.users[f])return err(res,404,'Không tìm thấy người dùng');
  if(f===q.u)return err(res,400,'Không thể tự kết bạn');
  if(blockedEither(q.u,f))return err(res,403,'Không thể gửi lời mời');
  if(isFriend(q.u,f))return err(res,400,'Đã là bạn bè');
  if(db.requests.some(r=>r.from===q.u&&r.to===f&&r.status==='pending'))return err(res,400,'Đã gửi lời mời trước đó');
  const rev=db.requests.find(r=>r.from===f&&r.to===q.u&&r.status==='pending');
  if(rev){rev.status='accepted';makeFriends(q.u,f)}else db.requests.push({id:uid(),from:q.u,to:f,status:'pending',t:Date.now()});
  save();io.to(f).emit('refresh');res.json({ok:1,friends:!!rev});
});
app.get('/api/requests',(q,res)=>res.json(db.requests.filter(r=>r.to===q.u&&r.status==='pending').map(r=>({id:r.id,from:r.from,name:pub(r.from).name,t:r.t}))));
const reqAct=st=>(q,res)=>{
  const r=db.requests.find(x=>x.id===q.params.id&&x.to===q.u&&x.status==='pending');
  if(!r)return err(res,404,'Không tìm thấy lời mời');
  if(st==='accepted'){if(blockedEither(r.from,q.u))return err(res,403,'Không thể chấp nhận');makeFriends(r.from,q.u)}
  r.status=st;save();io.to(r.from).emit('refresh');res.json({ok:1});
};
app.post('/api/requests/:id/accept',reqAct('accepted'));app.post('/api/requests/:id/decline',reqAct('declined'));
app.get('/api/blocks',(q,res)=>res.json((db.blocks[q.u]||[]).map(pub)));
app.post('/api/blocks',(q,res)=>{
  const f=String(q.body.username||'').toLowerCase().trim();
  if(!db.users[f]||f===q.u)return err(res,400,'Người dùng không hợp lệ');
  db.blocks[q.u]=db.blocks[q.u]||[];if(!db.blocks[q.u].includes(f))db.blocks[q.u].push(f);
  db.friends[q.u]=(db.friends[q.u]||[]).filter(x=>x!==f);db.friends[f]=(db.friends[f]||[]).filter(x=>x!==q.u);
  db.requests.forEach(r=>{if(r.status==='pending'&&((r.from===q.u&&r.to===f)||(r.from===f&&r.to===q.u)))r.status='declined'});
  save();io.to(f).emit('refresh');res.json({ok:1});
});
app.delete('/api/blocks/:u',(q,res)=>{db.blocks[q.u]=(db.blocks[q.u]||[]).filter(x=>x!==q.params.u);save();res.json({ok:1})});
// --- Cấu hình ICE cho WebRTC: STUN mặc định + TURN (biến môi trường TURN_URL, TURN_USER, TURN_CRED)
app.get('/api/ice',(q,res)=>{
  const ice=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}];
  if(process.env.TURN_URL)ice.push({urls:process.env.TURN_URL.split(',').map(x=>x.trim()),username:process.env.TURN_USER,credential:process.env.TURN_CRED});
  res.json({iceServers:ice});
});
// --- Thông báo đẩy (Web Push)
app.get('/api/push/key',(q,res)=>res.json({publicKey:push.publicKey}));
app.post('/api/push/subscribe',(q,res)=>{const b=q.body;
  if(!b||typeof b.endpoint!=='string'||!/^https:\/\//.test(b.endpoint)||!b.keys||typeof b.keys.p256dh!=='string'||typeof b.keys.auth!=='string')return err(res,400,'Đăng ký thông báo không hợp lệ');
  res.json({count:push.subscribe(q.u,b)})});
app.post('/api/push/unsubscribe',(q,res)=>res.json({count:push.unsubscribe(q.u,String(q.body.endpoint||''))}));
if(process.env.PUSH_DRY_RUN)app.get('/api/_push_log',(q,res)=>res.json(push.log));
// --- Báo cáo người dùng (bắt buộc với app có nội dung người dùng tạo)
app.post('/api/reports',(q,res)=>{const t=String(q.body.username||'').toLowerCase().trim(),r=String(q.body.reason||'').trim();
  if(!db.users[t])return err(res,404,'Không tìm thấy người dùng');if(t===q.u||!r||r.length>200)return err(res,400,'Báo cáo không hợp lệ');
  db.reports.push({id:uid(),from:q.u,target:t,reason:r,t:Date.now()});save();res.json({ok:1})});
// --- Xóa tài khoản (Google Play/App Store yêu cầu)
app.delete('/api/me',(q,res)=>{
  const u=q.u;if(!bcrypt.compareSync(String(q.body.password||''),db.users[u].hash))return err(res,403,'Sai mật khẩu');
  const peers=[...new Set([...(db.friends[u]||[]),...db.requests.filter(r=>r.from===u||r.to===u).flatMap(r=>[r.from,r.to])])].filter(x=>x!==u);
  endCall(u,true);delete db.users[u];delete db.friends[u];delete db.blocks[u];delete db.push[u];
  for(const k of Object.keys(db.friends))db.friends[k]=db.friends[k].filter(x=>x!==u);
  for(const k of Object.keys(db.blocks))db.blocks[k]=db.blocks[k].filter(x=>x!==u);
  db.requests=db.requests.filter(r=>r.from!==u&&r.to!==u);
  for(const [id,g] of Object.entries(db.groups)){g.members=g.members.filter(x=>x!==u);if(g.members.length<2){delete db.groups[id];db.messages=db.messages.filter(m=>m.conv!=='g:'+id);store.purgeConv('g:'+id)}}
  db.messages=db.messages.filter(m=>m.from!==u&&!(m.conv.startsWith('d:')&&m.conv.slice(2).split('|').includes(u)));
  db.moments=db.moments.filter(m=>m.from!==u);db.reports=db.reports.filter(r=>r.from!==u);
  store.purgeUser(u);save();io.in(u).disconnectSockets(true);peers.forEach(x=>io.to(x).emit('refresh'));res.json({ok:1});
});
// --- Nhóm
app.post('/api/groups',(q,res)=>{
  const m=[...new Set([q.u,...(q.body.members||[])])].filter(x=>db.users[x]);
  if(m.length<2)return err(res,400,'Nhóm cần ít nhất 2 người');
  const id=uid();db.groups[id]={name:String(q.body.name||'Nhóm mới').slice(0,40),members:m};save();
  m.forEach(x=>io.to(x).emit('refresh'));res.json({id});
});
// --- Tin nhắn. chat: "u:<username>" hoặc "g:<id>"
const conv=(me,chat)=>chat.startsWith('u:')?'d:'+[me,chat.slice(2)].sort().join('|'):chat;
const members=(me,chat)=>chat.startsWith('u:')?[me,chat.slice(2)]:(db.groups[chat.slice(2)]?.members||[]);
app.get('/api/chats',(q,res)=>{
  const out={},me=q.u;
  for(const m of db.messages){
    let key=null;
    if(m.conv.startsWith('d:')){const p=m.conv.slice(2).split('|');if(p.includes(me))key='u:'+p.find(x=>x!==me)}
    else if(db.groups[m.conv.slice(2)]?.members.includes(me))key=m.conv;
    if(key)out[key]=m;
  }
  for(const [id,g] of Object.entries(db.groups))if(g.members.includes(me)&&!out['g:'+id])out['g:'+id]={t:0,text:''};
  res.json(Object.entries(out).map(([id,m])=>({id,title:id[0]==='u'?pub(id.slice(2)).name:db.groups[id.slice(2)].name,group:id[0]==='g',
    last:m.image?'[Hình ảnh]':m.text,t:m.t})).sort((a,b)=>b.t-a.t));
});
app.get('/api/messages',async(q,res)=>{
  const chat=String(q.query.chat||'');if(!members(q.u,chat).includes(q.u))return err(res,403,'Không có quyền');
  const c=conv(q.u,chat);res.json((await store.history(c,200)).map(m=>({...m,name:pub(m.from).name})));
});
app.post('/api/messages',(q,res)=>{
  const {chat,text,image}=q.body;const ms=members(q.u,String(chat));
  if(!ms.includes(q.u)||!db.users[ms.find(x=>x!==q.u)||q.u])return err(res,403,'Không gửi được');
  if(!text&&!image)return err(res,400,'Tin nhắn trống');
  if(chat.startsWith('u:')&&blockedEither(q.u,chat.slice(2)))return err(res,403,'Không thể nhắn tin do bị chặn');
  const m={id:uid(),conv:conv(q.u,chat),from:q.u,text:String(text||'').slice(0,4000),image:image&&image.length<9e5?image:undefined,t:Date.now()};
  store.addMessage(m);
  for(const x of ms){const ck=chat.startsWith('u:')?'u:'+(x===q.u?chat.slice(2):q.u):chat;
    io.to(x).emit('msg',{chat:ck,m:{...m,name:pub(m.from).name}});if(x!==q.u)push.notify(x,{title:chat.startsWith('g:')?db.groups[chat.slice(2)].name:pub(q.u).name,body:(chat.startsWith('g:')?pub(q.u).name+': ':'')+(m.text||'[Hình ảnh]'),chat:ck})}
  res.json({ok:1});
});
// --- Khoảnh khắc (Moments)
app.get('/api/moments',(q,res)=>{
  const vis=new Set([q.u,...(db.friends[q.u]||[]).filter(f=>!blockedEither(q.u,f))]);
  res.json(db.moments.filter(m=>vis.has(m.from)).slice(-50).reverse().map(m=>({...m,name:pub(m.from).name})));
});
app.post('/api/moments',(q,res)=>{
  if(!q.body.text&&!q.body.image)return err(res,400,'Nội dung trống');
  if(q.body.image&&q.body.image.length>9e5)return err(res,400,'Ảnh quá lớn');store.addMoment({id:uid(),from:q.u,text:String(q.body.text||'').slice(0,1000),image:q.body.image,t:Date.now()});res.json({ok:1});
});
// --- Tín hiệu cuộc gọi (WebRTC signaling). inCall: user -> {peer, active, timer}
const inCall={},CALL_MS=+process.env.CALL_TIMEOUT_MS||30000;
const online=u=>(io.sockets.adapter.rooms.get(u)?.size||0)>0;
function pushMsg(from,to,text){push.notify(to,{title:pub(from).name,body:text,chat:'u:'+from});const m={id:uid(),conv:conv(from,'u:'+to),from,text,t:Date.now()};store.addMessage(m);
  for(const x of [from,to])io.to(x).emit('msg',{chat:'u:'+(x===from?to:from),m:{...m,name:pub(from).name}})}
function endCall(a,notify){const c=inCall[a];if(!c)return;clearTimeout(c.timer);delete inCall[a];delete inCall[c.peer];if(notify)io.to(c.peer).emit('call:ended',{from:a})}
io.use((s,next)=>{try{s.u=jwt.verify(s.handshake.auth.token,SECRET).u;next()}catch(e){next(new Error('auth'))}});
io.on('connection',s=>{
  const me=s.u;s.join(me);
  s.on('call:invite',({to,video})=>{
    const fail=r=>s.emit('call:failed',{reason:r});
    if(!db.users[to]||to===me||!isFriend(me,to))return fail('not_friend');
    if(blockedEither(me,to))return fail('blocked');
    if(inCall[me]||inCall[to])return fail('busy');
    if(!online(to))return fail('offline');
    const timer=setTimeout(()=>{if(inCall[me]&&!inCall[me].active){endCall(me,true);io.to(me).emit('call:failed',{reason:'no_answer'});pushMsg(me,to,'[Cuộc gọi nhỡ]')}},CALL_MS);
    inCall[me]={peer:to,active:false,timer};inCall[to]={peer:me,active:false,timer:null};
    io.to(to).emit('call:incoming',{from:me,name:pub(me).name,video:!!video});
  });
  s.on('call:accept',({to})=>{const c=inCall[me];if(c&&c.peer===to&&inCall[to]){clearTimeout(inCall[to].timer);c.active=inCall[to].active=true;io.to(to).emit('call:accepted',{from:me})}});
  s.on('call:reject',({to})=>{if(inCall[me]?.peer===to){endCall(me,false);io.to(to).emit('call:rejected',{from:me})}});
  for(const ev of ['offer','answer','ice'])s.on('call:'+ev,({to,data})=>{if(inCall[me]?.peer===to)io.to(to).emit('call:'+ev,{from:me,data})});
  s.on('call:end',({to})=>{if(inCall[me]?.peer===to)endCall(me,true)});
  s.on('disconnect',()=>{if(!online(me))endCall(me,true)});
});
srv.listen(process.env.PORT||3000,()=>console.log('Xiaoli98 chạy tại http://localhost:'+(process.env.PORT||3000)));
})().catch(e=>{console.error('Lỗi khởi động:',e.message);process.exit(1)});
