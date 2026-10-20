import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {demo} from './core.mjs';
import {backdrop,cellArt,buttonArt,names,svg} from './art.mjs';
import {ScratchBuilder,expr,cmd,V,L,length,arg,set,change,clear,push,replace,add,sub,mul,div,mod,eq,gt,and,not,math,join,repeat,iff,wait,broadcast,variableId,listId} from './scratch-builder.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const c=new ScratchBuilder('logic');
const or=(a,b)=>expr('operator_or',{OPERAND1:a,OPERAND2:b});
const x=id=>add(-120,mul(mod(sub(id,1),6),60));
const y=id=>sub(90,mul(math('floor',div(sub(id,1),6)),60));
const pos=(a,b)=>cmd('motion_gotoxy',{X:a,Y:b});
const item=(l)=>L(l,V('i'));
const zero=()=>['T','A','B','Q'].flatMap(n=>[clear(n),repeat(24,[push(n,0)])]);
const binary=t=>or(eq(t,2),or(eq(t,4),eq(t,5)));
const listNames=['T','A','B','Q','U_T','U_A','U_B','U_Q','reach'];
const vars={状态:'搭建：选左侧元件，点空格；点输入开关切换 0/1',模式:'搭建',工具:2,来源:0,点击:0,点击Y:0,动作:0,忙碌:0,可撤销:0,清空时刻:-10,i:0,k:0,s:0,a:0,b:0,t:0,拒绝:0,引脚:'A',sx:0,sy:0,tx:0,ty:0};
c.define('备份编辑',[],[
  ...['T','A','B','Q'].flatMap(n=>[clear('U_'+n),set('i',1),repeat(24,[push('U_'+n,item(n)),change('i',1)])]),set('可撤销',1)
],[20,20]);
c.define('清空电路',[],zero(),[400,20]);
c.define('示例电路',[],[
  c.call('清空电路'),replace('T',7,1),replace('T',19,1),replace('T',10,2),replace('T',12,6),replace('A',10,7),replace('B',10,19),replace('A',12,10)
],[750,20]);
c.define('求值电路',[],[
  repeat(24,[set('i',1),repeat(24,[
    set('t',item('T')),set('a',0),set('b',0),
    iff(gt(item('A'),0),[set('a',L('Q',item('A')))]),iff(gt(item('B'),0),[set('b',L('Q',item('B')))]),
    iff(eq(V('t'),0),[replace('Q',V('i'),0)]),
    iff(eq(V('t'),2),[set('s',1),iff(and(eq(V('a'),1),eq(V('b'),1)),[set('s',0)]),replace('Q',V('i'),V('s'))]),
    iff(eq(V('t'),3),[replace('Q',V('i'),sub(1,V('a')))]),
    iff(eq(V('t'),4),[replace('Q',V('i'),mul(V('a'),V('b')))]),
    iff(eq(V('t'),5),[set('s',0),iff(or(eq(V('a'),1),eq(V('b'),1)),[set('s',1)]),replace('Q',V('i'),V('s'))]),
    iff(eq(V('t'),6),[replace('Q',V('i'),V('a'))]),change('i',1)
  ])])
],[1100,20]);
c.define('检查反馈',[],[
  clear('reach'),repeat(24,[push('reach',0)]),replace('reach',V('来源'),1),
  repeat(24,[set('i',1),repeat(24,[iff(eq(item('reach'),1),[
    iff(gt(item('A'),0),[replace('reach',item('A'),1)]),iff(gt(item('B'),0),[replace('reach',item('B'),1)])
  ]),change('i',1)])]),set('拒绝',L('reach',V('点击')))
],[1550,20]);
c.define('画一条线',['src','dst','pin'],[
  set('sx',add(x(arg('src')),26)),set('sy',y(arg('src'))),set('tx',sub(x(arg('dst')),26)),set('ty',add(y(arg('dst')),arg('pin'))),
  iff(eq(L('Q',arg('src')),1),[cmd('pen_setPenColorToColor',{COLOR:{primitive:[9,'#56d9b0']}})],[cmd('pen_setPenColorToColor',{COLOR:{primitive:[9,'#4c6683']}})]),
  cmd('pen_penUp'),pos(V('sx'),V('sy')),cmd('pen_penDown'),
  iff(gt(V('tx'),V('sx')),[pos(div(add(V('sx'),V('tx')),2),V('sy')),pos(div(add(V('sx'),V('tx')),2),V('ty'))],[
    pos(add(V('sx'),3),V('sy')),pos(add(V('sx'),3),add(V('sy'),28)),pos(sub(V('tx'),3),add(V('sy'),28)),pos(sub(V('tx'),3),V('ty'))
  ]),pos(V('tx'),V('ty')),cmd('pen_penUp')
],[2000,20]);
c.define('画全部线',[],[
  cmd('pen_clear'),cmd('pen_penUp'),cmd('pen_setPenSizeTo',{SIZE:2}),set('k',1),repeat(24,[
    iff(gt(L('A',V('k')),0),[c.call('画一条线',L('A',V('k')),V('k'),8)]),
    iff(gt(L('B',V('k')),0),[c.call('画一条线',L('B',V('k')),V('k'),-8)]),change('k',1)
  ])
],[2400,20]);
// A click is one transaction. No procedure yields while a circuit mutation is in progress.
c.define('处理格子',[],[
  set('清空时刻',-10),
  iff(eq(V('模式'),'搭建'),[
    iff(eq(L('T',V('点击')),0),[c.call('备份编辑'),replace('T',V('点击'),V('工具')),set('状态','已放置；选连线工具连接电路')],[
      iff(eq(L('T',V('点击')),1),[c.call('备份编辑'),replace('Q',V('点击'),sub(1,L('Q',V('点击')))),set('状态','输入已切换；亮线为 1，暗线为 0')],[set('状态','格子已占用；可用移动或删除工具')])
    ])
  ]),
  iff(eq(V('模式'),'连线'),[
    iff(eq(V('来源'),0),[
      iff(and(gt(L('T',V('点击')),0),not(eq(L('T',V('点击')),6))),[set('来源',V('点击')),set('状态','已选来源；点目标上半格 A / 下半格 B')],[set('状态','请选择输入或逻辑门作为来源')])
    ],[
      iff(eq(V('来源'),V('点击')),[set('来源',0),set('状态','已取消连线；重新选择来源')],[
        iff(or(eq(L('T',V('点击')),0),eq(L('T',V('点击')),1)),[set('状态','目标必须是逻辑门或输出灯')],[
          c.call('检查反馈'),iff(eq(V('拒绝'),1),[set('状态','拒绝组合反馈；请连接到下游元件')],[
            set('引脚','A'),iff(and(binary(L('T',V('点击'))),gt(y(V('点击')),V('点击Y'))),[set('引脚','B')]),
            c.call('备份编辑'),iff(eq(V('引脚'),'A'),[replace('A',V('点击'),V('来源'))],[replace('B',V('点击'),V('来源'))]),
            set('来源',0),set('状态','接线完成；可继续选择下一个来源')
          ])
        ])
      ])
    ])
  ]),
  iff(eq(V('模式'),'移动'),[
    iff(eq(V('来源'),0),[iff(gt(L('T',V('点击')),0),[set('来源',V('点击')),set('状态','已选元件；点空格移动，接线一起迁移')],[set('状态','先选择要移动的元件')])],[
      iff(eq(V('来源'),V('点击')),[set('来源',0),set('状态','已取消移动')],[
        iff(eq(L('T',V('点击')),0),[
          c.call('备份编辑'),...['T','A','B','Q'].flatMap(n=>[replace(n,V('点击'),L(n,V('来源'))),replace(n,V('来源'),0)]),
          set('i',1),repeat(24,[...['A','B'].map(n=>iff(eq(item(n),V('来源')),[replace(n,V('i'),V('点击'))])),change('i',1)]),
          set('来源',0),set('状态','已移动，所有接线保持')
        ],[set('状态','目标被占用；请选择空格')])
      ])
    ])
  ]),
  iff(eq(V('模式'),'删除'),[
    iff(gt(L('T',V('点击')),0),[
      c.call('备份编辑'),...['T','A','B','Q'].map(n=>replace(n,V('点击'),0)),
      set('i',1),repeat(24,[...['A','B'].map(n=>iff(eq(item(n),V('点击')),[replace(n,V('i'),0)])),change('i',1)]),set('状态','元件和相关连线已删除；可撤销')
    ],[set('状态','此处为空，无需删除')])
  ])
],[20,800]);
c.define('处理工具',[],[
  set('来源',0),
  iff(gt(7,V('动作')),[set('工具',V('动作')),set('模式','搭建'),set('状态','搭建：点空格放置；点输入开关切换 0/1')]),
  ...[[7,'连线','连线：先点来源，再点目标（上 A / 下 B）'],[8,'移动','移动：先点元件，再点空格'],[9,'删除','删除：点元件移除，支持单步撤销']].map(([id,mode,message])=>iff(eq(V('动作'),id),[set('模式',mode),set('状态',message)])),
  iff(eq(V('动作'),10),[iff(eq(V('可撤销'),1),[
    ...['T','A','B','Q'].flatMap(n=>[clear(n),set('i',1),repeat(24,[push(n,L('U_'+n,V('i'))),change('i',1)])]),set('可撤销',0),set('状态','已撤销最近一次编辑')
  ],[set('状态','还没有可以撤销的编辑')])]),
  iff(eq(V('动作'),11),[c.call('备份编辑'),c.call('示例电路'),set('模式','搭建'),set('工具',2),set('状态','NAND 示例：只有两个输入都为 1 时，输出为 0')]),
  iff(eq(V('动作'),12),[
    iff(gt(3,sub(expr('sensing_timer'),V('清空时刻'))),[c.call('备份编辑'),c.call('清空电路'),set('清空时刻',-10),set('状态','已清空；选左侧元件开始搭建，可撤销')],[set('清空时刻',expr('sensing_timer')),set('状态','3 秒内再点一次清空确认；点其他工具可取消')])
  ],[set('清空时刻',-10)])
],[650,800]);
const refresh=()=>[c.call('求值电路'),c.call('画全部线'),broadcast('重绘'),set('忙碌',0)];
c.hat('event_whenflagclicked',{},[
  set('忙碌',1),cmd('looks_hide'),set('来源',0),set('清空时刻',-10),set('模式','搭建'),set('工具',2),set('状态',vars.状态),
  iff(not(eq(length('T'),24)),[c.call('示例电路')]),broadcast('初始化格子'),...refresh()
],[20,2300]);
c.hat('event_whenbroadcastreceived',{BROADCAST_OPTION:['格子点击','msg_格子点击']},[c.call('处理格子'),...refresh()],[450,2300]);
c.hat('event_whenbroadcastreceived',{BROADCAST_OPTION:['工具点击','msg_工具点击']},[c.call('处理工具'),...refresh()],[900,2300]);

const zip=new JSZip(),date=new Date('2026-01-01T00:00:00Z');
function costume(name,source,cx,cy){const assetId=crypto.createHash('md5').update(source).digest('hex'),md5ext=assetId+'.svg';zip.file(md5ext,source,{date});return {assetId,name,dataFormat:'svg',md5ext,bitmapResolution:1,rotationCenterX:cx,rotationCenterY:cy};}
const base={variables:{},lists:{},broadcasts:{},blocks:{},comments:{},currentCostume:0,costumes:[],sounds:[],volume:100};
const sprite=(name,blocks,costumes,x,y,layerOrder,visible=true,variables={})=>({...base,isStage:false,name,blocks,costumes,x,y,layerOrder,visible,variables,size:100,direction:90,draggable:false,rotationStyle:"don't rotate"});
const d=demo();
const stage={...base,isStage:true,name:'舞台',variables:Object.fromEntries(Object.entries(vars).map(([n,v])=>[variableId(n),[n,v]])),lists:Object.fromEntries(listNames.map(n=>[listId(n),[n,d[n]||[]]])),broadcasts:Object.fromEntries(['格子点击','工具点击','初始化格子','重绘'].map(n=>['msg_'+n,n])),costumes:[costume('实验室',backdrop,240,180)],layerOrder:0,tempo:60,videoTransparency:50,videoState:'off',textToSpeechLanguage:null};
const controller=sprite('电路控制器',c.blocks,[costume('隐藏',svg('<circle cx="1" cy="1" r="1" fill="white"/>',2,2),1,1)],0,0,1,false);
const cell=new ScratchBuilder('cell');
cell.hat('event_whenbroadcastreceived',{BROADCAST_OPTION:['初始化格子','msg_初始化格子']},[
  cmd('looks_hide'),set('格号',1),repeat(24,[pos(x(V('格号')),y(V('格号'))),cmd('control_create_clone_of',{CLONE_OPTION:{primitive:[10,'_myself_']}}),change('格号',1)]),set('格号',0)
],[20,20]);
cell.hat('control_start_as_clone',{},[cmd('looks_show')],[400,20]);
cell.hat('event_whenbroadcastreceived',{BROADCAST_OPTION:['重绘','msg_重绘']},[
  iff(gt(V('格号'),0),[
    cmd('looks_switchcostumeto',{COSTUME:add(mul(L('T',V('格号')),2),L('Q',V('格号')))}),
    iff(eq(L('T',V('格号')),0),[cmd('looks_switchcostumeto',{COSTUME:1})]),
    iff(eq(V('来源'),V('格号')),[cmd('looks_seteffectto',{VALUE:25},{EFFECT:['BRIGHTNESS',null]})],[cmd('looks_cleargraphiceffects')])
  ])
],[20,400]);
cell.hat('event_whenthisspriteclicked',{},[
  iff(and(gt(V('格号'),0),eq(V('忙碌'),0)),[set('忙碌',1),set('点击',V('格号')),set('点击Y',expr('sensing_mousey')),broadcast('格子点击')])
],[400,400]);
// Empty is costume 1, then kind*2 + bit for kinds 1..6.
const cells=sprite('网格元件',cell.blocks,[costume('空格',cellArt(0,0),27,26),...Array.from({length:6},(_,i)=>[0,1].map(q=>costume(names[i+1]+q,cellArt(i+1,q),27,26))).flat()],0,0,3,false,{[variableId('格号')]:['格号',0]});
export const buttonDefs=[...names.slice(1).map((label,i)=>({label,action:i+1,x:-202,y:90-i*38,w:66,h:32})),...['连线','移动','删除','撤销','示例','清空'].map((label,i)=>({label,action:i+7,x:-130+i*62,y:124,w:58,h:27}))];
const buttons=buttonDefs.map(({label,action,x,y,w,h},i)=>{
  const b=new ScratchBuilder('button'+i);
  b.hat('event_whenthisspriteclicked',{},[iff(eq(V('忙碌'),0),[set('忙碌',1),set('动作',action),broadcast('工具点击')])],[20,20]);
  const selected=action<7?and(eq(V('模式'),'搭建'),eq(V('工具'),action)):action<10?eq(V('模式'),label):action===10?eq(V('可撤销'),1):eq(0,1);
  b.hat('event_whenbroadcastreceived',{BROADCAST_OPTION:['重绘','msg_重绘']},[iff(selected,[cmd('looks_switchcostumeto',{COSTUME:2})],[cmd('looks_switchcostumeto',{COSTUME:1})])],[20,300]);
  return sprite(label+'工具',b.blocks,[costume(label,buttonArt(label,false,w,h),w/2,h/2),costume(label+'选中',buttonArt(label,true,w,h),w/2,h/2)],x,y,i+4);
});
const project={targets:[stage,controller,cells,...buttons],monitors:[{id:variableId('状态'),mode:'default',opcode:'data_variable',params:{VARIABLE:'状态'},spriteName:null,value:vars.状态,width:0,height:0,x:11,y:314,visible:true,sliderMin:0,sliderMax:100,isDiscrete:true}],extensions:['pen'],meta:{semver:'3.0.0',vm:'0.2.0',agent:'TurboWarp Logic Lab 0.1.0'}};
// Keep a small explanation attached to the real controller's blocks.
controller.comments.guide={blockId:null,x:20,y:-180,width:440,height:140,minimized:false,text:'逻辑小实验室 v0.1.0\nT 类型 / A B 来源格号 / Q 输出。24 遍扫描求值 DAG。检查反馈在写入前执行。U_ 列表保存最近一次编辑。全部运算均为原生积木。'};
export async function build(){
  zip.file('project.json',JSON.stringify(project),{date});const bytes=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
  await fs.writeFile(path.join(root,'dist/logic-lab.sb3'),bytes);await fs.writeFile(path.join(root,'dist/project.json'),JSON.stringify(project,null,2));
  const manifest={version:'0.1.0',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),targets:project.targets.length,blocks:project.targets.reduce((n,t)=>n+Object.keys(t.blocks).length,0)};
  await fs.writeFile(path.join(root,'dist/manifest.json'),JSON.stringify(manifest,null,2));console.log(manifest);return bytes;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
