// Metricool read-only brand verification. Token stays server-side.
exports.handler=async event=>{
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 const out=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
 if(event.httpMethod!=="GET")return out(405,{error:"Method not allowed"});
 if(!process.env.DASHBOARD_ACCESS_KEY||event.headers["x-dashboard-key"]!==process.env.DASHBOARD_ACCESS_KEY)return out(401,{error:"Access denied"});
 const token=process.env.METRICOOL_API_TOKEN;
 if(!token)return out(503,{error:"METRICOOL_API_TOKEN not configured"});
 const userId=process.env.METRICOOL_USER_ID;
 if(!userId||!/^\d+$/.test(userId))return out(503,{error:"METRICOOL_USER_ID not configured. Find userId in your Metricool brand URL and add it as a Netlify environment variable."});
 try{
  const res=await fetch("https://app.metricool.com/api/v2/settings/brands?userId="+encodeURIComponent(userId),{headers:{"X-Mc-Auth":token,"Content-Type":"application/json"},signal:AbortSignal.timeout(10000)});
  if(!res.ok)return out(502,{error:"Metricool API returned HTTP "+res.status});
  const raw=await res.json();
  const data=Array.isArray(raw)?raw:Array.isArray(raw.data)?raw.data:Array.isArray(raw.data?.items)?raw.data.items:[];
  const expected=[{id:"2581549",name:"Kiwi Driver Tours & Transfers"},{id:"7097834",name:"Main Character Adventures"},{id:"7179123",name:"Pilar's Facepainting"},{id:"7730350",name:"Tiptoe the World"}];
  const brands=expected.map(b=>{const match=data.find(x=>String(x.blogId??x.id??x.brandId)===b.id);return {...b,found:!!match,connectedNetworks:match?.networksData??null};});
  return out(200,{source:"Metricool API",verifiedAt:new Date().toISOString(),readOnly:true,brands,tiptoe:"Tracking enabled; generation and publishing not enabled",publicationVerified:false});
 }catch(e){return out(502,{error:"Metricool check failed: "+e.message});}
};