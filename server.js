const express=require('express');
const cors=require('cors');
const path=require('path');
const fs=require('fs');

const app=express();
const PORT=process.env.PORT||3000;
const DB=path.join(__dirname,'data.json');

app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

if(!fs.existsSync(DB)){
 fs.writeFileSync(DB,JSON.stringify({
   users:[{role:'admin',name:'الإدارة',password:'NCM@2026'},
          {role:'hr',name:'HR',password:'HR@2026'},
          {role:'trainer',name:'Trainer',password:'Trainer@2026'}],
   courses:[],requests:[],exams:[],submissions:[]
 },null,2),'utf8');
}

const read=()=>JSON.parse(fs.readFileSync(DB,'utf8'));
const save=(d)=>fs.writeFileSync(DB,JSON.stringify(d,null,2),'utf8');

app.get('/api/health',(req,res)=>res.json({ok:true,message:'NCM LMS V8 Render Edition Running'}));
app.post('/api/login',(req,res)=>{
 const {role,password}=req.body||{};
 const db=read();
 const u=db.users.find(x=>x.role===role && x.password===password);
 if(!u) return res.status(401).json({ok:false});
 res.json({ok:true,user:{role:u.role,name:u.name}});
});

app.get('/api/courses',(req,res)=>res.json(read().courses));
app.post('/api/courses',(req,res)=>{
 const db=read();
 db.courses.push({...req.body,id:Date.now()});
 save(db);
 res.json({ok:true});
});

app.get('*',(req,res)=>{
 const f=path.join(__dirname,'public','index.html');
 if(fs.existsSync(f)) return res.sendFile(f);
 res.send('<h2>NCM LMS V8 Render Fix Running</h2>');
});

app.listen(PORT,()=>console.log('Server running on port',PORT));
