const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const assert=require('assert/strict');
(async()=>{const ext=path.resolve('.');const c=await chromium.launchPersistentContext('./tools/extension-profile',{headless:false,executablePath:'./tools/browsers/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox',`--disable-extensions-except=${ext}`,`--load-extension=${ext}`],viewport:{width:1440,height:1000}});const p=await c.newPage();const report={};let last;
p.on('request',r=>{if(r.url().includes('/graphql'))try{const b=JSON.parse(r.postData()||'{}');if(b.operationName==='problemsetQuestionListV2')last=b.variables;}catch{}});
try{
 await p.goto('https://leetcode.com/problemset/',{waitUntil:'domcontentloaded'});await p.waitForSelector('.lcfl-row-tags');
 await p.locator('[data-e2e-locator="filter-button"] button').click();await p.locator('[data-e2e-key="status"] [data-e2e-locator="filter-multi-select"]').click();
 report.nativeStatusOptions=await p.locator('[role="menu"]').last().innerText();await p.locator('[role="menu"]').last().getByText('Attempted',{exact:true}).click();await p.waitForTimeout(600);report.nativeAttemptedFilter=last.filters.statusFilter;
 await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.locator('.lcfl-directory-title h2').click();
 await p.goto('https://leetcode.com/problemset/',{waitUntil:'domcontentloaded'});await p.waitForSelector('[data-e2e-slug="two-sum"] .lcfl-row-tags');
 const row=p.locator('[data-e2e-slug="two-sum"]');await row.hover();report.hover=await row.evaluate(r=>getComputedStyle(r).boxShadow);assert.ok(report.hover.includes('225, 10, 30'));await p.mouse.move(0,0);
 // Controlled status metadata fixtures; authenticated user states are unavailable.
 const attempted=report.nativeAttemptedFilter.questionStatuses[0];
 await p.evaluate(attempted=>dispatchEvent(new CustomEvent('lc-fastlap-problem-data',{detail:JSON.stringify([{slug:'two-sum',status:'SOLVED',tags:[{name:'Array'}]},{slug:'add-two-numbers',status:attempted,tags:[{name:'Linked List'}]}])})),attempted);await p.waitForTimeout(200);
 report.statusFixtures=await p.evaluate(()=>Object.fromEntries(['two-sum','add-two-numbers'].map(slug=>{const r=document.querySelector('[data-e2e-slug="'+slug+'"]');return [slug,{status:r.dataset.lcflStatus,rail:getComputedStyle(r).boxShadow}]})));
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.lcfl-row-tags');await p.setViewportSize({width:390,height:844});await p.locator('[data-lcfl-controls]').scrollIntoViewIfNeeded();await p.waitForTimeout(200);
 report.mobile=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,title:document.querySelector('[data-e2e-slug="two-sum"] [data-lcfl-title]')?.getBoundingClientRect().toJSON(),searchVisible:document.querySelector('input[placeholder="Search questions"]').getBoundingClientRect().width>0}));await p.screenshot({path:'validation/problemset-mobile-rows.png'});
}catch(e){report.failure=e.stack}finally{fs.writeFileSync('validation/status-mobile-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await c.close()}
})();
