// Test tự động Xiaoli98 v2: bạn bè, chặn, ICE/TURN, tín hiệu cuộc gọi
const {test,before,after}=require('node:test');const assert=require('node:assert');
const {spawn}=require('node:child_process');const fs=require('fs'),os=require('os'),path=require('path');
const {io}=require('socket.io-client');
let proc,base;const port=4000+Math.floor(Math.random()*2000);
before(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'x98-'));
  proc=spawn('node',['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:port,DATA_DIR:dir,CALL_TIMEOUT_MS:'700',
    TURN_URL:'turn:t.example.com:3478',TURN_USER:'u',TURN_CRED:'c'}});
  base='http://localhost:'+port;
  for(let i=0;i<60;i++){try{await fetch(base+'/');return}catch(e){await new Promise(r=>setTimeout(r,100))}}
  throw new Error('server không khởi động');
});
after(()=>proc&&proc.kill());
const api=async(tok,m,p,b)=>{const r=await fetch(base+'/api/'+p,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:b?JSON.stringify(b):undefined});return{s:r.status,d:await r.json().catch(()=>({}))}};
const reg=async(u,name)=>(await api('x','POST','register',{username:u,password:'123456',name:name||u})).d.token;
const befriend=async(ta,tb,ua)=>{const l=await api(tb,'GET','requests');const r=l.d.find(x=>x.from===ua);await api(tb,'POST',`requests/${r.id}/accept`)};
const conn=tok=>new Promise(res=>{const s=io(base,{auth:{token:tok},transports:['websocket']});s.on('connect',()=>res(s))});
const once=(s,ev,ms=2500)=>new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout '+ev)),ms);s.once(ev,d=>{clearTimeout(t);res(d)})});

test('tìm kiếm người dùng theo tên/ID, không trả về chính mình',async()=>{
  const a=await reg('sa1','Lan Anh');await reg('sa2','Lan Chi');
  const r=await api(a,'GET','users/search?q=lan');
  assert.equal(r.s,200);assert.deepEqual(r.d.map(x=>x.username).sort(),['sa2']);
  assert.equal(r.d[0].relation,'none');
});
test('lời mời: gửi -> chấp nhận -> thành bạn bè hai chiều',async()=>{
  const a=await reg('fa1'),b=await reg('fb1');
  assert.equal((await api(a,'POST','requests',{username:'fb1'})).s,200);
  assert.equal((await api(a,'POST','requests',{username:'fb1'})).s,400,'gửi trùng phải bị từ chối');
  assert.equal((await api(a,'POST','requests',{username:'fa1'})).s,400,'tự kết bạn phải bị từ chối');
  await befriend(a,b,'fa1');
  assert.deepEqual((await api(a,'GET','friends')).d.map(x=>x.username),['fb1']);
  assert.deepEqual((await api(b,'GET','friends')).d.map(x=>x.username),['fa1']);
});
test('từ chối lời mời: không thành bạn',async()=>{
  const a=await reg('da1'),b=await reg('db1');await api(a,'POST','requests',{username:'db1'});
  const r=(await api(b,'GET','requests')).d[0];
  assert.equal((await api(b,'POST',`requests/${r.id}/decline`)).s,200);
  assert.equal((await api(b,'GET','requests')).d.length,0);
  assert.equal((await api(a,'GET','friends')).d.length,0);
});
test('hai người cùng gửi lời mời cho nhau thì tự thành bạn',async()=>{
  const a=await reg('ma1'),b=await reg('mb1');
  await api(a,'POST','requests',{username:'mb1'});await api(b,'POST','requests',{username:'ma1'});
  assert.equal((await api(a,'GET','friends')).d.length,1);
});
test('chặn: hủy bạn, chặn nhắn tin, ẩn khỏi tìm kiếm, không gửi được lời mời; bỏ chặn khôi phục',async()=>{
  const a=await reg('ba1'),b=await reg('bb1');await api(a,'POST','requests',{username:'bb1'});await befriend(a,b,'ba1');
  assert.equal((await api(b,'POST','blocks',{username:'ba1'})).s,200);
  assert.equal((await api(a,'GET','friends')).d.length,0);
  assert.equal((await api(a,'POST','messages',{chat:'u:bb1',text:'hi'})).s,403);
  assert.equal((await api(b,'POST','messages',{chat:'u:ba1',text:'hi'})).s,403);
  assert.equal((await api(a,'GET','users/search?q=bb1')).d.length,0);
  assert.equal((await api(a,'POST','requests',{username:'bb1'})).s,403);
  assert.deepEqual((await api(b,'GET','blocks')).d.map(x=>x.username),['ba1']);
  await api(b,'DELETE','blocks/ba1');
  assert.equal((await api(a,'GET','users/search?q=bb1')).d.length,1);
});
test('/api/ice trả STUN mặc định và TURN từ biến môi trường',async()=>{
  const a=await reg('ia1');const r=await api(a,'GET','ice');const urls=r.d.iceServers.flatMap(s=>[].concat(s.urls));
  assert.ok(urls.some(u=>u.startsWith('stun:')));
  const t=r.d.iceServers.find(s=>[].concat(s.urls).includes('turn:t.example.com:3478'));
  assert.equal(t.username,'u');assert.equal(t.credential,'c');
});
test('cuộc gọi: mời -> nhận -> chuyển offer/answer/ice -> kết thúc',async()=>{
  const a=await reg('ca1'),b=await reg('cb1');await api(a,'POST','requests',{username:'cb1'});await befriend(a,b,'ca1');
  const sa=await conn(a),sb=await conn(b);
  let p=once(sb,'call:incoming');sa.emit('call:invite',{to:'cb1',video:true});
  const inc=await p;assert.equal(inc.from,'ca1');assert.equal(inc.video,true);
  p=once(sa,'call:accepted');sb.emit('call:accept',{to:'ca1'});await p;
  p=once(sb,'call:offer');sa.emit('call:offer',{to:'cb1',data:{sdp:'x'}});assert.deepEqual((await p).data,{sdp:'x'});
  p=once(sa,'call:answer');sb.emit('call:answer',{to:'ca1',data:{sdp:'y'}});assert.deepEqual((await p).data,{sdp:'y'});
  p=once(sb,'call:ice');sa.emit('call:ice',{to:'cb1',data:{c:1}});assert.deepEqual((await p).data,{c:1});
  p=once(sb,'call:ended');sa.emit('call:end',{to:'cb1'});await p;
  sa.close();sb.close();
});
test('cuộc gọi: người lạ/bị chặn/máy bận/từ chối/không nghe máy',async()=>{
  const a=await reg('xa1'),b=await reg('xb1'),c=await reg('xc1'),d=await reg('xd1');
  await api(a,'POST','requests',{username:'xb1'});await befriend(a,b,'xa1');
  await api(d,'POST','requests',{username:'xb1'});await befriend(d,b,'xd1');
  const [sa,sb,sc,sd]=await Promise.all([conn(a),conn(b),conn(c),conn(d)]);
  let p=once(sc,'call:failed');sc.emit('call:invite',{to:'xb1'});assert.equal((await p).reason,'not_friend');
  // từ chối
  p=once(sb,'call:incoming');sa.emit('call:invite',{to:'xb1'});await p;
  p=once(sa,'call:rejected');sb.emit('call:reject',{to:'xa1'});await p;
  // máy bận
  p=once(sb,'call:incoming');sa.emit('call:invite',{to:'xb1'});await p;
  p=once(sd,'call:failed');sd.emit('call:invite',{to:'xb1'});assert.equal((await p).reason,'busy');
  // không nghe máy -> nhỡ
  p=once(sa,'call:failed');assert.equal((await p).reason,'no_answer');
  const h=await api(a,'GET','messages?chat=u:xb1');assert.ok(h.d.some(m=>m.text.includes('[Cuộc gọi nhỡ]')));
  // bị chặn
  await api(b,'POST','blocks',{username:'xa1'});
  p=once(sa,'call:failed');sa.emit('call:invite',{to:'xb1'});assert.ok(['blocked','not_friend'].includes((await p).reason));
  [sa,sb,sc,sd].forEach(s=>s.close());
});
