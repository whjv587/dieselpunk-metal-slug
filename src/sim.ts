export const W = 960, H = 440, GROUND = 350, WORLD = 3300, HZ = 60;
export const ARENA = 2530, MECH = 1430;
const dirs = [[1,0],[0.70710678,0.70710678],[0,1],[-0.70710678,0.70710678],[-1,0],[-0.70710678,-0.70710678],[0,-1],[0.70710678,-0.70710678]];
export type Input = {mx?:number; aim?:number; jump?:boolean; fire?:boolean; parry?:boolean; toss?:boolean; mount?:boolean};
type Shot = {x:number;y:number;vx:number;vy:number;kind:'round'|'shell'|'reflect'|'core';life:number;damage:number};
type Enemy = {x:number;y:number;hp:number;max:number;delay:number;stun:number;boss:boolean;phase:number};
type Event = 'fire'|'parry'|'boom'|'hit'|'jump'|'metal'|'win'|'rail';
export const barriers = [{x:530,y:294,w:83,h:56},{x:929,y:282,w:90,h:68},{x:1690,y:280,w:80,h:70},{x:2150,y:288,w:94,h:62}];
export const drops = [430,1115,1880,2470] as const;
export type StageId = 'trench' | 'foundry';
const configs = {
  trench: { world:WORLD, arena:ARENA, mech:MECH, barriers, drops, enemies:[780,1200,1830,2340],
    boss:{x:3010,hp:36,delay:125,name:'IRON COLOSSUS'}, rail:null },
  foundry: { world:3530, arena:2750, mech:1580,
    barriers:[{x:482,y:296,w:78,h:54},{x:1440,y:295,w:70,h:55},{x:2010,y:285,w:84,h:65},{x:2480,y:292,w:90,h:58}],
    drops:[400,1260,1805,2700], enemies:[667,1320,1990,2320,2640],
    boss:{x:3260,hp:40,delay:103,name:'FURNACE WARDEN'},
    rail:{left:900,right:1170,period:216,clear:96,warning:60,width:42} },
} as const;
export const stageConfig = (id:StageId='trench')=>configs[id];
export function railAt(tick:number){
  const rail=configs.foundry.rail;
  const offset=tick%rail.period, discharge=rail.clear+rail.warning;
  if(offset<rail.clear)return {mode:'clear' as const,x:null};
  if(offset<discharge)return {mode:'warning' as const,x:null};
  const elapsed=(offset-discharge)/(rail.period-discharge-1);
  return {mode:'active' as const,x:rail.right+rail.width/2-elapsed*(rail.right-rail.left+rail.width)};
}
export function create(seed=7259, stage:StageId='trench') {
  const config=stageConfig(stage);
  // Keep the existing Stage 1 replay state byte-for-byte stable.
  return { seed:seed>>>0 || 1,tick:0,mode:'play' as 'play'|'won'|'lost',
    p:{x:82,y:GROUND,vx:0,vy:0,ground:true,aim:0,hp:8,ammo:18,fireCd:0,parry:0,parryCd:0,inv:0,mech:false,mechHP:4},
    shots:[] as Shot[], enemies:config.enemies.map((x,i)=>({x,y:GROUND-28,hp:5+i%2,max:5+i%2,delay:53+i*13,stun:0,boss:false,phase:1})) as Enemy[],
    bossSpawn:false,mechUsed:false,usedDrops:config.drops.map(()=>false), events:[] as Event[],prev:{} as Input,
    notice:'',noticeUntil:0, ...(stage==='foundry'?{stage}:{} as {stage?:StageId}) };
}
export type State = ReturnType<typeof create>;
export function random(s:State) {let x=s.seed; x^=x<<13; x^=x>>>17; x^=x<<5; s.seed=x>>>0;return s.seed/4294967296;}
const inside=(x:number,y:number,r:{x:number;y:number;w:number;h:number})=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
export function intersects(x:number,y:number,nx:number,ny:number,r:{x:number;y:number;w:number;h:number}) {
  let low=0, high=1;
  for(const [p,q,a,b] of [[x,nx,r.x,r.x+r.w],[y,ny,r.y,r.y+r.h]]) {
    const d=q-p;
    if(d===0){if(p<a||p>b)return false;continue;}
    low=Math.max(low,Math.min((a-p)/d,(b-p)/d)); high=Math.min(high,Math.max((a-p)/d,(b-p)/d));
    if(low>high)return false;
  }
  return true;
}
function message(s:State,n:string){s.notice=n;s.noticeUntil=s.tick+135;}
function explode(s:State,x:number,y:number) {s.events.push('boom');s.enemies.forEach(e=>{if(e.hp>0&&Math.hypot(x-e.x,y-e.y)<110){e.hp-=7;e.stun=32;}});}
function damagePlayer(s:State) {
  const p=s.p;
  if(p.inv!==0)return false;
  p.inv=58;s.events.push('hit');
  if(p.mech){if(--p.mechHP<=0){p.mech=false;p.vy=-8;}}else p.hp--;
  return true;
}
export function advance(s:State,i:Input={}){
  s.events=[];
  if(s.mode!=='play')return s;
  s.tick++;
  const p=s.p, {world, arena, mech, barriers, drops, boss, rail}=stageConfig(s.stage);
  const prevX=p.x;
  const pressed=(k:keyof Input)=>Boolean(i[k]&&!s.prev[k]);
  for(const k of ['fireCd','parryCd','parry','inv'] as const) p[k]=Math.max(0,p[k]-1);
  if(Number.isInteger(i.aim)&&i.aim!>=0&&i.aim!<=7)p.aim=i.aim!;
  const nextX=p.x+Math.max(-1,Math.min(1,i.mx??0))*(p.mech?3.1:4.25);
  const min=s.bossSpawn?arena+15:22;
  const nx=Math.max(min,Math.min(world-22,nextX));
  if(!barriers.some(o=>p.y>o.y+1&&p.y-45<o.y+o.h&&nx+13>o.x&&nx-13<o.x+o.w))p.x=nx;
  if(pressed('jump')&&p.ground){p.vy=p.mech?-9.8:-11.5;p.ground=false;s.events.push('jump');}
  const py=p.y;
  p.vy+=.5;p.y+=p.vy;p.ground=false;
  for(const o of barriers){if(p.x+12>o.x&&p.x-12<o.x+o.w&&py<=o.y&&p.y>=o.y&&p.vy>=0){p.y=o.y;p.vy=0;p.ground=true;}}
  if(p.y>=GROUND){p.y=GROUND;p.vy=0;p.ground=true;}
  if(pressed('mount')){
    if(p.mech){p.mech=false;p.vy=-8;p.inv=48;s.events.push('metal');message(s,'EJECTED · 48 SAFE TICKS');}
    else if(!s.mechUsed&&Math.abs(p.x-mech)<68){s.mechUsed=true;p.mech=true;p.mechHP=4;s.events.push('metal');message(s,'IRON PIG ONLINE');}
  }
  if(pressed('parry')&&p.parryCd===0){
    p.parry=13;p.parryCd=35;s.events.push('parry');
    for(const e of s.enemies){if(e.hp>0&&Math.hypot(e.x-p.x,e.y-(p.y-23))<=54){e.stun=48;e.hp--;}}
  }
  if(pressed('toss')&&!p.mech&&p.ammo===0){const sign=dirs[p.aim][0]<0?-1:1;s.shots.push({x:p.x+sign*13,y:p.y-25,vx:sign*7,vy:-6,kind:'core',life:57,damage:7});p.ammo=18;s.events.push('metal');}
  if(i.fire&&p.fireCd===0&&(p.mech||p.ammo>0)){
    const [ax,ay]=dirs[p.aim];s.shots.push({x:p.x+ax*17,y:p.y-25+ay*12,vx:ax*14,vy:ay*14,kind:'round',life:54,damage:p.mech?2:1});
    p.fireCd=p.mech?7:10;if(!p.mech)p.ammo--;s.events.push('fire');
  }
  drops.forEach((dx,n)=>{if(!s.usedDrops[n]&&Math.abs(p.x-dx)<25&&p.y>GROUND-45){s.usedDrops[n]=true;p.ammo=18;p.hp=Math.min(8,p.hp+2);s.events.push('metal');}});
  if(rail){
    const now=railAt(s.tick), prev=railAt(s.tick-1);
    const near=p.x>rail.left-125 && p.x<rail.right+125;
    if(near && now.mode==='warning' && prev.mode!=='warning')s.events.push('rail');
    if(now.x!==null && p.y>GROUND-23 && p.x>=rail.left && p.x<=rail.right){
      const prevCart=prev.x??now.x;
      if(Math.min(prevX,p.x)-13<=Math.max(prevCart,now.x)+rail.width/2 &&
         Math.max(prevX,p.x)+13>=Math.min(prevCart,now.x)-rail.width/2 && damagePlayer(s)){
        p.vy=-5;message(s,'RAIL HIT · JUMP ABOVE THE CART');
      }
    }
  }
  if(!s.bossSpawn&&p.x>=arena+15){s.bossSpawn=true;s.enemies.push({x:boss.x,y:GROUND-50,hp:boss.hp,max:boss.hp,delay:boss.delay,stun:0,boss:true,phase:1});p.hp=Math.max(5,p.hp);p.ammo=18;message(s,boss.name+' · ARMOR ACTIVE');}
  for(const e of s.enemies){
    if(e.hp<=0)continue;
    if(e.stun>0){e.stun--;continue;}
    if(e.boss&&e.hp<=e.max/2&&e.phase===1){e.phase=2;e.delay=42;message(s,boss.name+' · CORE EXPOSED');s.events.push('metal');}
    if(Math.abs(e.x-p.x)>700)continue;
    if(--e.delay<=0){
      const sign=p.x<e.x?-1:1;
      const fire=(vy:number,speed:number)=>s.shots.push({x:e.x+sign*(e.boss?48:21),y:e.y+5,vx:speed*sign,vy,kind:'shell',life:220,damage:1});
      fire(.1,e.boss?5.6:4.5);
      if(e.phase===2){fire(-1.25,5);fire(.6,4.4);if(s.stage==='foundry')fire(-2.05,4.1);}
      e.delay=(e.phase===2?71:e.boss?105:121)+Math.floor(random(s)*15);
    }
  }
  s.shots=s.shots.filter(b=>{
    if(b.life--<=0){if(b.kind==='core')explode(s,b.x,b.y);return false;}
    if(b.kind==='core')b.vy+=.36;
    const bx=b.x,by=b.y; b.x+=b.vx;b.y+=b.vy;
    if(b.kind==='core'){
      if(b.y>=GROUND||barriers.some(o=>inside(b.x,b.y,o))||s.enemies.some(e=>e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<26)){explode(s,b.x,b.y);return false;}
      return true;
    }
    if(b.kind==='shell'&&p.parry>0&&Math.hypot(b.x-p.x,b.y-(p.y-24))<47){
      b.kind='reflect';b.vx=-b.vx*1.65;b.vy=0;b.damage=6;b.life=150;
      if(s.events.at(-1)!=='parry')s.events.push('parry');return true;
    }
    if(barriers.some(o=>intersects(bx,by,b.x,b.y,o)))return false;
    if(b.kind==='shell'){
      if(intersects(bx,by,b.x,b.y,{x:p.x-13,y:p.y-(p.mech?54:41),w:26,h:p.mech?54:41})){
        damagePlayer(s);
        return false;
      }
    }else{
      const e=s.enemies.find(e=>e.hp>0&&intersects(bx,by,b.x,b.y,{x:e.x-(e.boss?49:17),y:e.y-(e.boss?40:22),w:e.boss?98:34,h:e.boss?90:50}));
      if(e){e.hp-=b.damage;if(b.kind==='reflect')e.stun=32;s.events.push('hit');return false;}
    }
    return b.x>0&&b.x<world&&b.y>3&&b.y<GROUND+4;
  });
  if(p.hp<=0)s.mode='lost';
  else if(s.enemies.some(e=>e.boss&&e.hp<=0)){s.mode='won';s.events.push('win');}
  s.prev={...i};
  return s;
}
export function checksum(s:State){let hash=2166136261;const text=JSON.stringify(s);for(let n=0;n<text.length;n++)hash=Math.imul(hash^text.charCodeAt(n),16777619);return (hash>>>0).toString(16).padStart(8,'0');}
