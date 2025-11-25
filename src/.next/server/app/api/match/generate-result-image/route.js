(()=>{var e={};e.id=877,e.ids=[877],e.modules={3041:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>m,routeModule:()=>c,serverHooks:()=>u,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>p});var s={};r.r(s),r.d(s,{POST:()=>l});var a=r(30781),i=r(60554),o=r(31625),n=r(96396);async function l(e){try{let{gridItems:t,listMetadata:r,style:s="modern"}=await e.json();if(!t||!Array.isArray(t)||0===t.length)return n.NextResponse.json({error:"Invalid grid items provided"},{status:400});if(!r||!r.title)return n.NextResponse.json({error:"Invalid list metadata provided"},{status:400});let a=process.env.GEMINI_API_KEY;if(!a)return console.error("GEMINI_API_KEY not configured"),n.NextResponse.json({error:"Image generation service not configured"},{status:500});let i=t.filter(e=>e.matched&&e.title).sort((e,t)=>e.position-t.position);if(0===i.length)return n.NextResponse.json({error:"No matched items to generate image from"},{status:400});let o=function(e,t,r){let s="decade"===t.timePeriod&&t.selectedDecade?`${t.selectedDecade}s`:"year"===t.timePeriod&&t.selectedYear?`${t.selectedYear}`:"All Time",a=e.slice(0,50).map((e,t)=>`${t+1}. ${e.title}`).join("\n"),i={minimalist:"Clean, simple design with lots of white space, modern sans-serif typography, subtle colors, and minimal decorative elements.",detailed:"Rich visual design with ornate borders, detailed typography, vibrant colors, and decorative elements that reflect the category theme.",abstract:"Abstract geometric shapes, bold color gradients, modern artistic interpretation with dynamic compositions.",retro:"Vintage-inspired design with retro color palettes, classic typography, nostalgic aesthetic elements from the era.",modern:"Contemporary design with bold typography, vibrant gradients, modern UI elements, and sleek visual hierarchy."},o=i[r]||i.modern;return`Create a visually striking social media shareable image design concept for:

Title: "${t.title}"
Category: ${t.category}${t.subcategory?` - ${t.subcategory}`:""}
Time Period: ${s}
Total Items: ${e.length}

Top Rankings:
${a}

Design Style: ${r.toUpperCase()}
${o}

Design Requirements:
1. Create a layout that clearly shows the ranking hierarchy (top items more prominent)
2. Include the list title prominently at the top
3. Use the ${r} style aesthetic throughout
4. Make it optimized for social media sharing (1200x630px or similar)
5. Include subtle branding element that says "Created with GOAT"
6. Use color scheme that reflects the ${t.category} category
7. Ensure text is readable at thumbnail size
8. Create visual hierarchy with top 10 items being more prominent
9. Add subtle decorative elements that enhance without overwhelming
10. Include the time period context (${s})

Output a detailed description of the image design that includes:
- Layout structure and composition
- Color palette (specific hex codes)
- Typography choices (fonts and sizes)
- Visual hierarchy details
- Decorative elements and their placement
- How to represent each ranking tier visually
- Background treatment
- Call-to-action or sharing message placement

Make this design description detailed enough that it could be implemented directly in code using HTML/CSS/Canvas.`}(i,r,s),l=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${a}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:o}]}],generationConfig:{temperature:.7,topK:40,topP:.95,maxOutputTokens:8192}})});if(!l.ok){let e=await l.text();return console.error("Gemini API error:",e),n.NextResponse.json({error:"Failed to generate image",details:e},{status:l.status})}let c=await l.json(),d=c.candidates?.[0]?.content?.parts?.[0]?.text;if(!d)return n.NextResponse.json({error:"No content generated"},{status:500});return n.NextResponse.json({success:!0,data:{prompt:o,content:d,style:s,metadata:r,itemCount:i.length,items:i.map(e=>({position:e.position+1,title:e.title,description:e.description,image_url:e.image_url}))}})}catch(e){return console.error("Error generating result image:",e),n.NextResponse.json({error:"Internal server error",details:e instanceof Error?e.message:"Unknown error"},{status:500})}}let c=new a.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/match/generate-result-image/route",pathname:"/api/match/generate-result-image",filename:"route",bundlePath:"app/api/match/generate-result-image/route"},resolvedPagePath:"C:\\Users\\kazda\\kiro\\goat\\src\\app\\api\\match\\generate-result-image\\route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:d,workUnitAsyncStorage:p,serverHooks:u}=c;function m(){return(0,o.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:p})}},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},24429:()=>{},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},30781:(e,t,r)=>{"use strict";e.exports=r(44870)},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},64749:()=>{}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[706],()=>r(3041));module.exports=s})();