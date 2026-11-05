const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const assert=require('assert/strict');
(async()=>{const {buildJourney}=await import('../src/drive-geometry.mjs');const raw=JSON.parse(fs.readFileSync('validation/real-history.json'));const rows=raw.data.userContestRankingHistory.filter(r=>r.attended).map(r=>({rating:r.rating,title:r.contest.title,startTime:r.contest.startTime})).sort((a,b)=>a.startTime-b.startTime);const journey=buildJourney(rows);const peak=rows.reduce((best,r,i)=>r.rating>rows[best].rating?i:best,0);const progress=(journey.checkpoints[peak].distance-journey.start)/(journey.end-journey.start)+.0002;
const ext=path.resolve('.');const c=await chromium.launchPersistentContext('./tools/final-test-profile',{headless:false,executablePath:'./tools/browsers/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox','--enable-unsafe-swiftshader',`--disable-extensions-except=${ext}`,`--load-extension=${ext}`],viewport:{width:1440,height:1000}});const report={};const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('https://leetcode.com/u/lee215/',{waitUntil:'domcontentloaded'});await p.waitForSelector('#lcfl-drive[data-car="model"]',{timeout:20000});
 await p.evaluate(progress=>{const r=document.querySelector('#lcfl-drive'),s=r.querySelector('.lcfl-stage'),w=r.querySelector('.lcfl-runway');scrollTo(0,r.getBoundingClientRect().top+scrollY+progress*(w.offsetHeight-s.offsetHeight));},progress);await p.waitForTimeout(300);
 report.peak={expectedContest:rows[peak].title,expectedRating:Math.round(rows[peak].rating),board:await p.locator('.lcfl-board').innerText()};assert.ok(report.peak.board.includes('CAREER PEAK'));assert.ok(report.peak.board.includes(rows[peak].title.toUpperCase()));await p.screenshot({path:'validation/profile-peak.png'});
 const before=await p.locator('#lcfl-drive').getAttribute('data-distance');await p.waitForTimeout(600);assert.equal(await p.locator('#lcfl-drive').getAttribute('data-distance'),before);report.idle={distanceUnchanged:true};
 // Native page navigation and editor controls, with no submission made.
 await p.goto('https://leetcode.com/problems/two-sum/',{waitUntil:'domcontentloaded'});await p.waitForSelector('.monaco-editor',{timeout:30000});await p.waitForTimeout(2000);
 report.problem={editor:await p.locator('.monaco-editor').count(),run:await p.getByRole('button',{name:'Run',exact:true}).count(),submit:await p.getByRole('button',{name:'Submit',exact:true}).count(),splitters:await p.locator('.flexlayout__splitter').count(),drive:await p.locator('#lcfl-drive').count(),directory:await p.locator('.lcfl-directory-head').count(),theme:await p.locator('html').getAttribute('data-lc-fastlap-page')};
 const splitter=p.locator('.flexlayout__splitter').first();const bounds=await splitter.boundingBox();if(bounds){await p.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await p.mouse.down();await p.mouse.move(bounds.x+bounds.width/2+55,bounds.y+bounds.height/2,{steps:8});await p.mouse.up();report.problem.resize={before:bounds,after:await splitter.boundingBox()};}
 await p.screenshot({path:'validation/problem-preserved.png'});
 // Controlled edge cases use the real extension on a real profile, with only
 // its history response mocked. These are not claims about live contest data.
 for(const scenario of ['empty','failure']){
 const q=await c.newPage();await q.route('**/graphql/**',async route=>{let body;try{body=JSON.parse(route.request().postData()||'{}')}catch{}if(body?.operationName==='FastlapContestHistory'){if(scenario==='empty')await route.fulfill({json:{data:{userContestRankingHistory:[]}}});else await route.fulfill({status:503,body:'Unavailable'});}else await route.continue()});
 await q.goto('https://leetcode.com/u/lee215/',{waitUntil:'domcontentloaded'});await q.waitForTimeout(3500);
 report[scenario+'Fixture']={mode:await q.locator('#lcfl-drive').getAttribute('data-mode'),message:await q.locator('.lcfl-message').textContent()};await q.close();
 }
}catch(e){report.failure=e.stack}finally{report.errors=errors;fs.writeFileSync('validation/final-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await c.close();}
})();
