import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import JSZip from 'jszip';
const codec=createRequire(import.meta.url)('../web/state.cjs');
const config=JSON.parse(await fs.readFile(new URL('../web/config.json',import.meta.url),'utf8'));
const zip=await JSZip.loadAsync(await fs.readFile(new URL('../'+config.project,import.meta.url)));
const stage=JSON.parse(await zip.file('project.json').async('string')).targets.find(t=>t.isStage);
const template=Object.fromEntries([...Object.entries(stage.variables),...Object.entries(stage.lists)].map(([id,v])=>[id,v[1]]));
const valid=()=>({schemaVersion:1,id:config.id,contract:config.id+'-dynamic-v1',variables:codec.clone(template)});
test('native circuit and complete variables survive storage round trip',()=>{
 const d=valid();assert.deepEqual(codec.parse(JSON.stringify(d),config,template),d);
});
test('partial connection and busy operation are not valid saved circuits',()=>{
 for(const change of [v=>v.v_来源=7,v=>v.v_忙碌=1,v=>v.l_T.pop(),v=>v.l_A[0]=25,v=>v.l_Q[0]=2]){const d=valid();change(d.variables);assert.throws(()=>codec.validate(d,config,template));}
});
test('cyclic circuit is rejected before state is applied',()=>{
 const d=valid();d.variables.l_T[0]=3;d.variables.l_T[1]=3;d.variables.l_A[0]=2;d.variables.l_A[1]=1;
 assert.throws(()=>codec.validate(d,config,template),/反馈/);
});
test('corrupt, foreign and oversized saves are rejected without mutation',()=>{
 for(const raw of ['{broken','null',' '.repeat(100001),JSON.stringify({...valid(),id:'foreign'})])assert.throws(()=>codec.parse(raw,config,template));
 const d=valid(),before=JSON.stringify(d);codec.validate(d,config,template);assert.equal(JSON.stringify(d),before);
});
