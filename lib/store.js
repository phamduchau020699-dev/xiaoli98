// Lớp lưu trữ: JSON file (mặc định/dev) hoặc MongoDB Atlas (khi có MONGODB_URI) để dữ liệu không mất khi Render khởi động lại.
const fs=require('fs'),path=require('path');
const EMPTY=()=>({users:{},friends:{},groups:{},messages:[],moments:[],requests:[],blocks:{},push:{},vapid:null,reports:[]});
const KEEP_MSG=1500,KEEP_MOM=300;
function jsonStore(dir){
  fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'db.json');
  let db=EMPTY();try{db=Object.assign(db,JSON.parse(fs.readFileSync(file,'utf8')))}catch(e){}
  let tm;const write=()=>{clearTimeout(tm);fs.writeFileSync(file,JSON.stringify(db))};
  return {kind:'json',db,save(){clearTimeout(tm);tm=setTimeout(write,300)},async flush(){write()},
    async addMessage(m){db.messages.push(m);this.save()},async addMoment(m){db.moments.push(m);this.save()},
    async history(c,n){return db.messages.filter(m=>m.conv===c).slice(-n)},async purgeUser(){this.save()},async purgeConv(){this.save()}};
}
async function mongoStore(uri){
  const {MongoClient}=require('mongodb');const cli=new MongoClient(uri,{serverSelectionTimeoutMS:10000});await cli.connect();
  const d=cli.db(process.env.MONGODB_DB||'xiaoli98'),meta=d.collection('meta'),msgs=d.collection('messages'),moms=d.collection('moments');
  await msgs.createIndex({conv:1,t:1});await moms.createIndex({t:1});
  const st=(await meta.findOne({_id:'state'}))||{};delete st._id;const db=Object.assign(EMPTY(),st);
  db.messages=(await msgs.find({},{projection:{_id:0}}).sort({t:-1}).limit(KEEP_MSG).toArray()).reverse();
  db.moments=(await moms.find({},{projection:{_id:0}}).sort({t:-1}).limit(KEEP_MOM).toArray()).reverse();
  const log=e=>console.error('[mongo]',e.message);let tm;
  const write=async()=>{clearTimeout(tm);const {messages,moments,...rest}=db;await meta.replaceOne({_id:'state'},{_id:'state',...rest},{upsert:true}).catch(log)};
  return {kind:'mongodb',db,save(){clearTimeout(tm);tm=setTimeout(write,500)},flush:write,
    async addMessage(m){db.messages.push(m);if(db.messages.length>KEEP_MSG)db.messages.splice(0,db.messages.length-KEEP_MSG);await msgs.insertOne({...m}).catch(log)},
    async addMoment(m){db.moments.push(m);if(db.moments.length>KEEP_MOM)db.moments.splice(0,db.moments.length-KEEP_MOM);await moms.insertOne({...m}).catch(log)},
    async history(c,n){return (await msgs.find({conv:c},{projection:{_id:0}}).sort({t:-1}).limit(n).toArray().catch(e=>{log(e);return[]})).reverse()},
    async purgeUser(u){await msgs.deleteMany({$or:[{from:u},{conv:{$regex:`^d:(.*\\|)?${u}(\\|.*)?$`}}]}).catch(log);await moms.deleteMany({from:u}).catch(log);this.save()},
    async purgeConv(c){await msgs.deleteMany({conv:c}).catch(log);this.save()}};
}
async function createStore({dir,mongoUri}={}){return mongoUri?mongoStore(mongoUri):jsonStore(dir||path.join(__dirname,'..','data'))}
module.exports={createStore};
