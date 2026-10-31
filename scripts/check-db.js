// Kiểm tra kết nối MongoDB Atlas: MONGODB_URI="..." npm run check-db
const {MongoClient}=require('mongodb');const uri=process.env.MONGODB_URI;
if(!uri){console.log('Thiếu biến MONGODB_URI');process.exit(1)}
(async()=>{const c=new MongoClient(uri,{serverSelectionTimeoutMS:10000});await c.connect();const col=c.db(process.env.MONGODB_DB||'xiaoli98').collection('healthcheck');
 await col.replaceOne({_id:'t'},{_id:'t',at:new Date()},{upsert:true});const r=await col.findOne({_id:'t'});await col.deleteOne({_id:'t'});await c.close();
 console.log('KẾT NỐI OK, ghi/đọc được:',!!r)})().catch(e=>{console.error('LỖI:',e.message);process.exit(1)});
