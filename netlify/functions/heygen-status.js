// Read-only HeyGen lookup. Uses a server-side API key; never returns credentials.
exports.handler=async event=>{
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 const out=(statusCode,data)=>({statusCode,headers,body:JSON.stringify(data)});
 if(event.httpMethod!=="GET")return out(405,{error:"Method not allowed"});
 if(!process.env.DASHBOARD_ACCESS_KEY||event.headers["x-dashboard-key"]!==process.env.DASHBOARD_ACCESS_KEY)return out(401,{error:"Access denied"});
 if(!process.env.HEYGEN_API_KEY)return out(503,{error:"HEYGEN_API_KEY not configured"});
 const id=new URLSearchParams(event.rawQuery||"").get("video_id");
 if(!id||!/^[a-zA-Z0-9_-]{8,128}$/.test(id))return out(400,{error:"Valid video_id required"});
 try{
  const res=await fetch("https://api.heygen.com/v1/video_status.get?video_id="+encodeURIComponent(id),{headers:{"X-Api-Key":process.env.HEYGEN_API_KEY},signal:AbortSignal.timeout(8000)});
  if(!res.ok)return out(502,{error:"HeyGen returned HTTP "+res.status});
  const json=await res.json();const d=json.data||{};
  return out(200,{videoId:id,status:d.status||"unknown",duration:d.duration??null,videoUrl:d.video_url||null,error:d.error||null,verifiedAt:new Date().toISOString(),source:"HeyGen API",readOnly:true});
 }catch(e){return out(502,{error:"HeyGen lookup failed: "+e.message});}
};