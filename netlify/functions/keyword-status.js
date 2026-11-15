// Read-only lookup of the canonical Airtable keyword register.
// Never treats a candidate URL as a verified booking destination.
exports.handler=async event=>{
 const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
 const reply=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});
 if(event.httpMethod!=="GET")return reply(405,{error:"Method not allowed"});
 if(!process.env.DASHBOARD_ACCESS_KEY||event.headers["x-dashboard-key"]!==process.env.DASHBOARD_ACCESS_KEY)return reply(401,{error:"Access denied"});
 const keyword=String(event.queryStringParameters?.keyword||"").trim().toUpperCase();
 if(!/^[A-Z0-9_-]{2,64}$/.test(keyword))return reply(400,{error:"Invalid keyword"});
 if(!process.env.AIRTABLE_TOKEN)return reply(503,{error:"Airtable token unavailable"});
 const base="appct7pi5YLSblQdn",table="tbliwtCkZTy8Vqdg3";
 const formula="{Activity Keyword}='"+keyword.replace(/'/g,"\\'")+"'";
 const url="https://api.airtable.com/v0/"+base+"/"+table+"?maxRecords=2&filterByFormula="+encodeURIComponent(formula);
 try{
  const res=await fetch(url,{headers:{Authorization:"Bearer "+process.env.AIRTABLE_TOKEN},signal:AbortSignal.timeout(9000)});
  if(!res.ok)return reply(502,{error:"Airtable register request failed: "+res.status});
  const records=(await res.json()).records||[];
  if(records.length!==1)return reply(200,{keyword,found:false,productionAllowed:false,publicationAllowed:false,reason:records.length?"Duplicate keyword mapping":"No mapping"});
  const f=records[0].fields||{},verified=f["Verification Status"]==="Verified";
  return reply(200,{keyword,found:true,productPage:f["Product Page URL"]||null,verificationStatus:f["Verification Status"]||"Candidate",productionAllowed:f["Production Allowed"]===true,publicationAllowed:verified&&f["Publication Allowed"]===true&&!!f["Checkout URL"],checkoutUrl:verified&&f["Publication Allowed"]===true?f["Checkout URL"]:null,reason:verified?"Register entry verified":"Product page candidate only; checkout and keyword resolution not verified"});
 }catch(e){return reply(502,{error:"Lookup failed: "+e.message});}
};