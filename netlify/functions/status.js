// Read-only Airtable status endpoint. Secrets must be set in Netlify environment variables.
const BASES=[
 {name:"Kiwi Driver Tours & Transfers",base:"appct7pi5YLSblQdn",table:"tblJK4ZnNWydM3cOH",hold:false},
 {name:"Main Character Adventures",base:"appPw6rLz4bqVtxTe",table:"tbl8qL6BwZZMHUnvo",hold:false},
 {name:"Pilar's Facepainting",base:"appVcwJu3RV8BnhgZ",table:"tblWGf5QOpbsbwvY1",hold:false},
 {name:"Tiptoe the World",base:"appbXc5Rc402cK1Bq",table:"tblPOMwy77S960WGM",hold:true}
];
const safe=v=>typeof v==="string"?v:(v==null?"":Array.isArray(v)?v.map(safe).join(", "):String(v));
const field=(f,...names)=>{for(const n of names)if(f[n]!==undefined)return safe(f[n]);return ""};
exports.handler=async event=>{
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 const respond=(code,data)=>({statusCode:code,headers,body:JSON.stringify(data)});
 if(event.httpMethod!=="GET")return respond(405,{error:"Method not allowed"});
 const secret=process.env.DASHBOARD_ACCESS_KEY;
 if(!secret)return respond(503,{error:"Dashboard access key not configured. No data exposed."});
 if(event.headers["x-dashboard-key"]!==secret)return respond(401,{error:"Access key required"});
 const token=process.env.AIRTABLE_TOKEN;
 if(!token)return respond(503,{error:"AIRTABLE_TOKEN not configured",connections:{airtable:"not configured",heygen:"not configured",metricool:"not configured"}});
 const videos=[],errors=[];
 for(const brand of BASES){
  if(brand.hold){continue;} // TTW is deliberately excluded from all API calls
  try{
   const url="https://api.airtable.com/v0/"+brand.base+"/"+brand.table+"?pageSize=50";
   const res=await fetch(url,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(9000)});
   if(!res.ok)throw new Error("Airtable returned HTTP "+res.status);
   const data=await res.json();
   for(const r of data.records||[]){
    const f=r.fields||{};
    videos.push({id:r.id,brand:brand.name,title:field(f,"Content Title","Title","Video Title","Name")||r.id,
      queue:field(f,"Queue Status","Status","Production Status"),
      heygen:field(f,"HeyGen Status","Video Status"),
      metricool:field(f,"Metricool Status","Publishing Status"),
      keyword:field(f,"Keyword Lookup Status","Keywords / Tags"),
      qa:field(f,"Creative and QC Audit","QA Status","Review Status"),
      duplicate:field(f,"Duplicate Check"),
      error:field(f,"Notes / Error","Error Details"),
      postId:field(f,"Metricool Post ID"),publishedDate:field(f,"Published Date"),
      held:brand.hold});
   }
   if(data.offset)errors.push(brand.name+": showing first 50 records; pagination pending");
  }catch(e){errors.push(brand.name+": "+e.message);}
 }
 return respond(200,{asOf:new Date().toISOString(),mode:"read-only",connections:{airtable:errors.length?"partial":"connected",heygen:"not connected",metricool:"not connected"},brands:BASES.map(b=>({name:b.name,hold:b.hold})),videos,errors,publicationVerified:false});
};