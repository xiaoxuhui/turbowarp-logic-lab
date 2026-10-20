import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import JSZip from 'jszip';
const zip=await JSZip.loadAsync(await fs.readFile(new URL('../dist/logic-lab.sb3',import.meta.url)),{checkCRC32:true});
const p=JSON.parse(await zip.file('project.json').async('string'));
test('SB3 asset hashes and complete block references',async()=>{
  const globals=new Set(Object.keys(p.targets[0].variables));
  for(const t of p.targets){
    const variables=new Set([...globals,...Object.keys(t.variables)]);
    for(const c of t.costumes){assert(zip.file(c.md5ext));assert.equal(crypto.createHash('md5').update(await zip.file(c.md5ext).async('nodebuffer')).digest('hex'),c.assetId);}
    for(const [id,b] of Object.entries(t.blocks)){
      assert(b.opcode);for(const ref of [b.next,b.parent])if(ref)assert(t.blocks[ref],`${id} ${ref}`);
      for(const input of Object.values(b.inputs))for(const ref of input.slice(1))if(typeof ref==='string')assert(t.blocks[ref],ref);
      if(b.fields.VARIABLE)assert(variables.has(b.fields.VARIABLE[1]));
    }
  }
});
test('native only, 24-cell model, visible editable controller',()=>{
  assert.deepEqual(p.extensions,['pen']);assert.equal(p.targets.filter(t=>t.isStage).length,1);
  for(const n of ['T','A','B','Q'])assert.equal(p.targets[0].lists['l_'+n][1].length,24);
  assert.equal(p.targets.find(t=>t.name==='网格元件').costumes.length,13);
  const blocks=Object.values(p.targets.find(t=>t.name==='电路控制器').blocks);
  assert(blocks.some(b=>b.opcode==='procedures_definition'));assert.equal(p.targets.length,15);
  assert(!JSON.stringify(p).includes('http'));
});
test('version consistent between package, art and changelog',async()=>{
  const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
  const art=await fs.readFile(new URL('../src/art.mjs',import.meta.url),'utf8');
  const log=await fs.readFile(new URL('../CHANGELOG.md',import.meta.url),'utf8');assert(art.includes(pkg.version));assert(log.includes(pkg.version));
});
