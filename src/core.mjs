export const SIZE=24;
export const xy=id=>({x:-120+((id-1)%6)*60,y:90-Math.floor((id-1)/6)*60});
export const ports=t=>t===1||t===0?0:[3,6].includes(t)?1:2;
export function evaluate(T,A,B,Q){
  const out=Array(SIZE).fill(0),active=new Set(),done=new Set();
  const get=id=>{
    if(!id)return 0;const i=id-1;if(done.has(i))return out[i];
    if(active.has(i))throw Error('组合反馈');active.add(i);
    const t=T[i],a=ports(t)>0?get(A[i]):0,b=ports(t)>1?get(B[i]):0;
    out[i]=[0,Number(Boolean(Q[i])),Number(!(a&&b)),1-a,Number(Boolean(a&&b)),Number(Boolean(a||b)),a][t];
    active.delete(i);done.add(i);return out[i];
  };
  for(let i=1;i<=SIZE;i++)get(i);return out;
}
export class Circuit {
  constructor(){this.T=Array(SIZE).fill(0);this.A=Array(SIZE).fill(0);this.B=Array(SIZE).fill(0);this.Q=Array(SIZE).fill(0);}
  data(){return Object.fromEntries(['T','A','B','Q'].map(k=>[k,[...this[k]]]));}
  snapshot(){this.previous=this.data();}
  solve(){this.Q=evaluate(this.T,this.A,this.B,this.Q);}
  place(id,t){if(id<1||id>SIZE||t<1||t>6||this.T[id-1])return false;this.snapshot();this.T[id-1]=t;this.solve();return true;}
  toggle(id){if(this.T[id-1]!==1)return false;this.snapshot();this.Q[id-1]^=1;this.solve();return true;}
  connect(src,dst,pin='A'){
    if(src<1||src>SIZE||dst<1||dst>SIZE||src===dst||!this.T[src-1]||this.T[src-1]===6||!ports(this.T[dst-1]))return false;
    if(ports(this.T[dst-1])===1)pin='A';if(!['A','B'].includes(pin))return false;
    const depends=(id,seen=new Set())=>{if(id===dst)return true;if(!id||seen.has(id))return false;seen.add(id);return depends(this.A[id-1],seen)||depends(this.B[id-1],seen);};
    if(depends(src))return false;this.snapshot();this[pin][dst-1]=src;this.solve();return true;
  }
  move(src,dst){if(!this.T[src-1]||this.T[dst-1])return false;this.snapshot();for(const k of ['T','A','B','Q']){this[k][dst-1]=this[k][src-1];this[k][src-1]=0;}for(const k of ['A','B'])this[k]=this[k].map(id=>id===src?dst:id);this.solve();return true;}
  remove(id){if(!this.T[id-1])return false;this.snapshot();for(const k of ['T','A','B','Q'])this[k][id-1]=0;for(const k of ['A','B'])this[k]=this[k].map(n=>n===id?0:n);this.solve();return true;}
  undo(){if(!this.previous)return false;Object.assign(this,this.previous);this.previous=null;this.solve();return true;}
}
export const demo=()=>{const c=new Circuit();for(const [id,t] of [[7,1],[19,1],[10,2],[12,6]])c.place(id,t);c.connect(7,10,'A');c.connect(19,10,'B');c.connect(10,12);c.previous=null;return c;};
