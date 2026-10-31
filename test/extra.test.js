// Test v3: push, xóa tài khoản, lớp lưu trữ
const {test,before,after}=require('node:test');const assert=require('node:assert');
const {spawn}=require('node:child_process');const fs=require('fs'),os=require('os'),path=require('path');
let proc,base;const port=6100+Math.floor(Math.random()*1500);
before(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'x98e-'));
  proc=spawn('node',['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:port,DATA_DIR:dir,PUSH_DRY_RUN:'1'}});
  base='http://localhost:'+port;
  for(let i=0;i<60;i++){try{await fetch(base+'/');return}catch(e){await new Promise(r=>setTimeout(r,100))}}
  throw new Error('server không khởi động');
});
after(()=>proc&&proc.kill());
const api=async(tok,m,p,b)=>{const r=await fetch(base+'/api/'+p,{method:m,headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:b?JSON.stringify(b):undefined});return{s:r.status,d:await r.json().catch(()=>({}))}};
const reg=async(u,name)=>(await api('x','POST','register',{username:u,password:'123456',name:name||u})).d.token;
const befriend=async(ta,tb,ua)=>{await api(ta,'POST','requests',{username:'__'});const l=await api(tb,'GET','requests');await api(tb,'POST',`requests/${l.d.find(x=>x.from===ua).id}/accept`)};
const sub=n=>({endpoint:'https://push.example.com/'+n,keys:{p256dh:'p'+n,auth:'a'+n}});

test('push: có khóa công khai VAPID tự sinh, đăng ký không trùng, hủy đăng ký',async()=>{
  const a=await reg('pa1');const k=await api(a,'GET','push/key');
  assert.equal(k.s,200);assert.ok(k.d.publicKey&&k.d.publicKey.length>40);
  assert.equal((await api(a,'POST','push/subscribe',sub('1'))).d.count,1);
  assert.equal((await api(a,'POST','push/subscribe',sub('1'))).d.count,1,'trùng endpoint không tăng');
  assert.equal((await api(a,'POST','push/subscribe',sub('2'))).d.count,2);
  assert.equal((await api(a,'POST','push/unsubscribe',{endpoint:sub('1').endpoint})).d.count,1);
  assert.equal((await api(a,'POST','push/subscribe',{endpoint:'x'})).s,400,'đăng ký sai định dạng bị từ chối');
});
test('push: tin nhắn mới kích hoạt thông báo cho người nhận (dry-run), không gửi cho người gửi',async()=>{
  const a=await reg('pb1','An'),b=await reg('pb2','Binh');await api(a,'POST','requests',{username:'pb2'});await befriend(a,b,'pb1');
  await api(b,'POST','push/subscribe',sub('b'));await api(a,'POST','push/subscribe',sub('a'));
  await api(a,'POST','messages',{chat:'u:pb2',text:'xin chào'});
  const log=(await api(b,'GET','_push_log')).d;
  const hit=log.filter(x=>x.endpoint===sub('b').endpoint);
  assert.equal(hit.length,1);assert.equal(hit[0].payload.title,'An');assert.equal(hit[0].payload.body,'xin chào');
  assert.equal(log.filter(x=>x.endpoint===sub('a').endpoint).length,0);
});
test('xóa tài khoản: cần đúng mật khẩu, dọn sạch dữ liệu liên quan',async()=>{
  const a=await reg('xa9','X'),b=await reg('xb9','Y');await api(a,'POST','requests',{username:'xb9'});await befriend(a,b,'xa9');
  await api(a,'POST','messages',{chat:'u:xb9',text:'bye'});await api(a,'POST','moments',{text:'moment cua a'});
  assert.equal((await api(a,'DELETE','me',{password:'sai'})).s,403);
  assert.equal((await api(a,'DELETE','me',{password:'123456'})).s,200);
  assert.equal((await api(a,'GET','me')).s,401,'token cũ vô hiệu');
  const lg=await api('x','POST','login',{username:'xa9',password:'123456'});assert.equal(lg.s,401);
  assert.equal((await api(b,'GET','friends')).d.length,0);
  assert.equal((await api(b,'GET','chats')).d.length,0);
  assert.equal((await api(b,'GET','users/search?q=xa9')).d.length,0);
  assert.equal((await api(b,'GET','moments')).d.filter(m=>m.from==='xa9').length,0);
  // tên đăng nhập có thể đăng ký lại sau khi xóa
  assert.ok(await reg('xa9'));
});
test('lớp lưu trữ JSON: lưu rồi nạp lại giữ nguyên dữ liệu, kể cả tin nhắn',async()=>{
  const {createStore}=require('../lib/store');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'x98s-'));
  const s1=await createStore({dir});assert.equal(s1.kind,'json');
  s1.db.users.u1={name:'U1',hash:'h'};await s1.addMessage({id:'m1',conv:'d:a|b',from:'a',text:'hi',t:1});await s1.addMoment({id:'o1',from:'a',text:'x',t:2});await s1.flush();
  const s2=await createStore({dir});
  assert.equal(s2.db.users.u1.name,'U1');assert.equal(s2.db.messages[0].text,'hi');assert.equal(s2.db.moments[0].id,'o1');
});
test('báo cáo người dùng: lưu lại, không tự báo cáo mình, giới hạn độ dài lý do',async()=>{
  const a=await reg('ra1'),b=await reg('rb1');
  assert.equal((await api(a,'POST','reports',{username:'rb1',reason:'spam'})).s,200);
  assert.equal((await api(a,'POST','reports',{username:'ra1',reason:'x'})).s,400);
  assert.equal((await api(a,'POST','reports',{username:'khongco',reason:'x'})).s,404);
  assert.equal((await api(a,'POST','reports',{username:'rb1',reason:'x'.repeat(300)})).s,400);
});
