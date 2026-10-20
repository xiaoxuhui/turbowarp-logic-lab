import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {evaluate,xy} from '../src/core.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const bridgeRequire=createRequire(new URL('../../turbowarp-codex-bridge/package.json',import.meta.url));
const {chromium}=createRequire(bridgeRequire.resolve('@playwright/mcp/package.json'))('playwright');
const config=JSON.parse(await fs.readFile(new URL('../../turbowarp-codex-bridge/config/playwright.json',import.meta.url),'utf8'));
const report={startedAt:new Date().toISOString(),checks:[],states:[],errors:[],console:[]};
const browser=await chromium.launch({...config.browser.launchOptions,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'});
page.on('pageerror',e=>report.errors.push(String(e)));
page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push({level:m.type(),text:m.text()});});
const check=(name,detail)=>{report.checks.push({name,status:'PASS',detail});console.log('PASS '+name);};
async function state(label){
  const s=await page.evaluate(()=>{const t=vm.runtime.getTargetForStage(),v=t.variables;return {T:[...v.l_T.value],A:[...v.l_A.value],B:[...v.l_B.value],Q:[...v.l_Q.value],vars:Object.fromEntries(Object.values(v).filter(x=>x.type!=='list').map(x=>[x.name,x.value])),clones:vm.runtime.targets.filter(t=>!t.isOriginal).length,compileErrors:window.__logicErrors};});
  assert.deepEqual(s.Q.map(Number),evaluate(s.T.map(Number),s.A.map(Number),s.B.map(Number),s.Q.map(Number)),'VM must match independent recursive evaluator at every sampled state');
  if(label)report.states.push({label,...s});return s;
}
const data=s=>Object.fromEntries(['T','A','B','Q'].map(k=>[k,s[k]]));
async function point(x,y){const r=await page.locator('canvas').first().boundingBox();assert(r);await page.mouse.click(r.x+(x+240)/480*r.width,r.y+(180-y)/360*r.height);await page.waitForTimeout(100);await page.waitForFunction(()=>vm.runtime.getTargetForStage().variables.v_忙碌.value===0,{},{timeout:10000});}
async function tool(label){const p=await page.evaluate(n=>{const t=vm.runtime.targets.find(t=>t.getName()===n+'工具');return {x:t.x,y:t.y};},label);await point(p.x,p.y);}
async function cell(id,pin='A'){const p=xy(id);await point(p.x,p.y+(pin==='B'?-10:10));}
async function wire(src,dst,pin='A'){await tool('连线');await cell(src);await cell(dst,pin);}
async function clearBoard(){await tool('清空');await tool('清空');assert((await state()).T.every(t=>t===0));}
async function place(id,label){await tool(label);await cell(id);}
async function initialize(){await page.locator('img[class*="green-flag_green-flag"]').click();await page.waitForFunction(()=>vm.runtime.targets.filter(t=>!t.isOriginal).length===24);await page.waitForFunction(()=>vm.runtime.getTargetForStage().variables.v_忙碌.value===0);}
try{
  await page.goto('https://turbowarp.org/editor',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.vm?.runtime?.targets.some(t=>!t.isStage&&t.getCostumes().length>0));
  await page.locator('img[class*="sprite-selector-item_sprite-image"]').first().waitFor({state:'visible'});
  const base64=(await fs.readFile(path.join(root,'dist/logic-lab.sb3'))).toString('base64');
  await page.evaluate(async bytes=>{await vm.loadProject(Uint8Array.from(atob(bytes),c=>c.charCodeAt(0)).buffer);vm.setEditingTarget(vm.runtime.targets.find(t=>t.getName()==='电路控制器').id);window.__logicErrors=[];vm.on('COMPILE_ERROR',(_t,e)=>window.__logicErrors.push(String(e)));},base64);
  await initialize();assert.equal((await state('initial')).clones,24);check('U01 原生 SB3 加载及 24 格初始化');
  // Test all NAND truth rows through real visible input switches.
  for(const [a,b] of [[0,0],[1,0],[1,1],[0,1]]){
    const s=await state();if(Number(s.Q[6])!==a)await cell(7);if(Number(s.Q[18])!==b)await cell(19);assert.equal((await state(`NAND ${a}${b}`)).Q[11],1-(a&b));
  }check('U02 NAND 四行真值（真实鼠标输入）');
  const demo=data(await state());await initialize();assert.deepEqual(data(await state()),demo);check('U10 绿旗重新启动保留电路与输入值');
  await tool('清空');assert.deepEqual(data(await state()),demo);await tool('移动');await tool('清空');assert.deepEqual(data(await state()),demo);await tool('清空');assert((await state()).T.every(t=>t===0));check('U09 清空需二次确认且其他工具取消确认');
  await tool('撤销');assert.deepEqual(data(await state()),demo);check('U08/U09 撤销清空恢复电路');
  await clearBoard();await tool('移动');await cell(1);assert.equal((await state()).vars.来源,0);check('U07 空格不能作为移动来源');
  for(const [id,label] of [[1,'输入'],[13,'输入'],[4,'NAND'],[6,'输出']])await place(id,label);
  await wire(1,4);await wire(13,4,'B');await wire(4,6);let s=await state('built by mouse');assert.equal(s.A[3],1);assert.equal(s.B[3],13);assert.equal(s.A[5],4);assert.equal(s.Q[5],1);check('U04 从空板放置、A/B 接线、输出灯');
  await tool('输入');await cell(1);await cell(13);assert.equal((await state()).Q[5],0);
  await place(18,'输出');await wire(1,18);assert.equal((await state()).Q[17],1);await wire(4,18);assert.equal((await state()).Q[17],0);check('U05 扇出和替换已有端口来源');
  await place(10,'NOT');await wire(4,10);const beforeReject=data(await state());await wire(10,4);assert((await state()).vars.状态.includes('拒绝'));assert.deepEqual(data(await state()),beforeReject);await cell(10);check('U06 组合反馈拒绝且电路不变');
  await tool('连线');await cell(6);assert.equal((await state()).vars.来源,0);await cell(24);assert.equal((await state()).vars.来源,0);await cell(1);await cell(13);assert((await state()).vars.状态.includes('目标'));await cell(1);assert.equal((await state()).vars.来源,0);check('U06 无效来源、目标及取消连线');
  await tool('移动');await cell(4);await cell(1);assert.equal((await state()).vars.来源,4);await cell(16);s=await state('moved');assert.equal(s.T[3],0);assert.equal(s.T[15],2);assert.equal(s.A[15],1);assert.equal(s.B[15],13);assert.equal(s.A[5],16);assert.equal(s.A[9],16);check('U07 移动元件保留入线及全部出线，占用拒绝');
  const moved=data(s);await tool('删除');await cell(16);s=await state('deleted');assert.equal(s.T[15],0);assert.equal(s.A[5],0);assert.equal(s.A[9],0);assert.equal(s.A[17],0);await tool('撤销');assert.deepEqual(data(await state()),moved);await tool('撤销');assert.deepEqual(data(await state()),moved);check('U08 删除清理扇出，单步撤销完整恢复');
  // Build an independent two-input board for all other gate truth tables.
  for(const [type,label] of [[3,'NOT'],[4,'AND'],[5,'OR']]){
    await clearBoard();await place(1,'输入');await place(13,'输入');await place(4,label);await place(6,'输出');await wire(1,4);if(type!==3)await wire(13,4,'B');await wire(4,6);
    await tool('输入');for(const [a,b] of [[0,0],[1,0],[1,1],[0,1]]){s=await state();if(Number(s.Q[0])!==a)await cell(1);if(Number(s.Q[12])!==b)await cell(13);s=await state(`${label} ${a}${b}`);assert.equal(s.Q[5],type===3?1-a:type===4?a&b:a|b);}
  }check('U03 NOT/AND/OR 全真值（手动搭建、实际点击）');
  // Explicit boundary fixture: fill all 24 cells with a backwards-numbered chain.
  await page.evaluate(()=>{const v=vm.runtime.getTargetForStage().variables;v.l_T.value=Array.from({length:24},(_,i)=>i===23?1:3);v.l_A.value=Array.from({length:24},(_,i)=>i===23?0:i+2);v.l_B.value=Array(24).fill(0);v.l_Q.value=Array(24).fill(0);});
  await tool('输入');await cell(24);s=await state('24-node reverse chain fixture');for(let i=1;i<=24;i++)assert.equal(Number(s.Q[i-1]),(24-i)%2?0:1);await cell(1);assert.equal((await state()).T.filter(Boolean).length,24);check('U11 24 格满板及最长反向链（明确注入边界 fixture）');
  await tool('示例');await tool('输入');await cell(7);s=await state('saved example');const expected=data(s);
  const saved=await page.evaluate(async()=>{const a=new Uint8Array(await(await vm.saveProjectSb3()).arrayBuffer());let s='';for(const b of a)s+=String.fromCharCode(b);return btoa(s);});
  await fs.writeFile(path.join(root,'dist/logic-lab-saved.sb3'),Buffer.from(saved,'base64'));
  await page.evaluate(async b64=>{await vm.loadProject(Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer);vm.setEditingTarget(vm.runtime.targets.find(t=>t.getName()==='电路控制器').id);},saved);
  await initialize();assert.deepEqual(data(await state()),expected);await cell(19);assert.equal((await state()).Q[11],0);check('U10 保存 SB3、重载及启动后继续操作');
  await page.locator('img[title="全屏模式"]').click();await page.screenshot({path:path.join(root,'evidence/desktop-stage.png')});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await cell(7);assert.equal((await state()).Q[11],1);await page.screenshot({path:path.join(root,'evidence/mobile-stage.png')});check('U12 窄屏全舞台与实际触点坐标操作');
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
  await page.screenshot({path:path.join(root,'evidence/final-stage.png')});s=await state('final');assert.equal(s.compileErrors.length,0);assert.equal(report.errors.length,0);check('无页面和 VM 编译异常');
  report.status='PASS';
}catch(e){report.status='FAIL';report.error={message:e.message,stack:e.stack};console.error(e);process.exitCode=1;await page.screenshot({path:path.join(root,'evidence/failure.png')}).catch(()=>{});}
finally{report.finishedAt=new Date().toISOString();const json=JSON.stringify(report,null,2);await fs.writeFile(path.join(root,'evidence/editor-test.json'),json);await fs.writeFile(path.join(root,'evidence',`editor-test-${report.startedAt.replace(/[:.]/g,'-')}.json`),json);await browser.close();console.log(JSON.stringify({status:report.status,checks:report.checks.length,error:report.error?.message}));}
