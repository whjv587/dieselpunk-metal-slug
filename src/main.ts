import './style.css';
import {advance,create,W,H,GROUND,WORLD,ARENA,MECH,barriers,drops,type State,type Input} from './sim';
const canvas=document.querySelector<HTMLCanvasElement>('#game')!, g=canvas.getContext('2d')!;
const cover=document.querySelector<HTMLElement>('#cover')!, start=document.querySelector<HTMLButtonElement>('#start')!, sound=document.querySelector<HTMLButtonElement>('#sound')!;
const key=new Set<string>(), pointers=new Map<number,string>();
const has=(...codes:string[])=>codes.some(c=>key.has(c)||Array.from(pointers.values()).includes(c));
const supported=['KeyA','ArrowLeft','KeyD','ArrowRight','KeyW','ArrowUp','KeyS','ArrowDown','Space','KeyJ','KeyK','KeyL','KeyE'];
let s=create(), running=false, last=0, acc=0, camera=0, audio:AudioContext|undefined, muted=true, voices=0;
const volumes={fire:[112,49,.070],parry:[740,1030,.14],boom:[155,35,.32],hit:[74,42,.08],jump:[180,330,.10],metal:[550,260,.14],win:[420,830,.4]};
const c=(x:number,y:number,w:number,h:number,color:string)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h);};
function label(value:string,x:number,y:number,color='#f9e9cc',size=15) {g.font='700 '+size+'px ui-monospace,monospace';g.fillStyle=color;g.fillText(value,x,y);}
const sky=document.createElement('canvas');sky.width=W;sky.height=H;
const bg=sky.getContext('2d')!;
const grad=bg.createLinearGradient(0,0,0,380);grad.addColorStop(0,'#273d40');grad.addColorStop(.59,'#65776b');grad.addColorStop(1,'#b29064');bg.fillStyle=grad;bg.fillRect(0,0,W,H);
bg.fillStyle='#d8a55d';bg.fillRect(700,78,99,99);bg.fillStyle='#b98f5e';for(let j=0;j<7;j++)bg.fillRect(700,86+j*12,99,2);
for(let j=0;j<32;j++){const x=(113*j)%W,y=214+(31*j)%78;bg.fillStyle=j%2?'#56665b':'#62746a';bg.fillRect(x,y,38+(j*19)%66,H-y);}
function effect(name:keyof typeof volumes){
 if(muted||!audio||audio.state!=='running'||voices>=6)return;
 const now=audio.currentTime,[f,end,d]=volumes[name];voices++;
 const o=audio.createOscillator(), amp=audio.createGain();o.type=name==='parry'||name==='win'?'triangle':'sawtooth';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(end,now+d);
 amp.gain.setValueAtTime(name==='fire'?.027:.047,now);amp.gain.exponentialRampToValueAtTime(.001,now+d);
 o.connect(amp).connect(audio.destination);o.onended=()=>{voices--;o.disconnect();amp.disconnect();};o.start(now);o.stop(now+d);
}
let sounds=new Map<string,number>();
function input():Input {
 const mx=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft')), dy=Number(has('KeyS','ArrowDown'))-Number(has('KeyW','ArrowUp'));
 const aim=mx||dy?(Math.round(Math.atan2(dy,mx)*4/Math.PI)+8)%8:s.p.aim;
 return {mx,aim,jump:has('Space'),fire:has('KeyJ'),parry:has('KeyK'),toss:has('KeyL'),mount:has('KeyE')};
}
function draw(){
 camera=Math.max(0,Math.min(WORLD-W,s.p.x-330));
 g.drawImage(sky,0,0);
 for(let n=0;n<23;n++){const x=((n*103-camera*.26)%1150+1150)%1150-120;const height=20+(n*37)%99;c(x,306-height,72,height+44,n%3===0?'#394944':'#46574d');if(n%4===0){c(x+28,266-height,14,43,'#394641');c(x+22,266-height,26,7,'#394641');}}
 c(0,GROUND,W,H-GROUND,'#302a23');c(0,GROUND,W,7,'#77523b');c(0,GROUND+7,W,4,'#9f6f44');
 for(let x=Math.floor(camera/29)*29;x<camera+W;x+=29){const sx=x-camera,n=x/29;c(sx+3,GROUND+15+n%5*9,21,4,n%3?'#4c3c2c':'#66503b');if(n%7===0)c(sx,GROUND+45,71,4,'#392f25');}
 for(let x=Math.floor(camera/165)*165;x<camera+W;x+=165){const sx=x-camera;c(sx,336,72,14,'#564837');c(sx+4,337,66,3,'#80654b');c(sx+9,330,14,9,'#615443');}
 for(const o of barriers){const x=o.x-camera;if(x<-o.w||x>W)continue;c(x,o.y,o.w,o.h,'#4e594c');c(x,o.y,o.w,5,'#a2a879');c(x+7,o.y+10,o.w-14,o.h-17,'#363f35');for(let n=12;n<o.w-12;n+=18)c(x+n,o.y+19,6,6,'#7b795c');}
 drops.forEach((x,n)=>{if(s.usedDrops[n])return;const px=x-camera;if(px<0||px>W)return;c(px-12,330,24,20,'#748357');c(px-9,333,18,12,'#d4a55f');c(px-3,334,6,10,'#4c543a');});
 function mech(x:number,y:number,active:boolean){
   c(x-32,y-13,65,12,'#252923');c(x-24,y-24,50,15,'#857358');c(x-29,y-52,58,29,'#7d7756');c(x-24,y-55,55,5,'#beaa71');c(x-17,y-47,24,13,active?'#8addc2':'#657d73');c(x+24,y-41,25,8,'#464c3e');for(let a=-23;a<=23;a+=15)c(x+a,y-10,9,6,'#b08052');
 }
 if(!s.mechUsed&&MECH-camera>-100&&MECH-camera<W+70){mech(MECH-camera,GROUND,false);label('IRON PIG',MECH-camera-34,281,'#f5bd71',13);}
 if(s.bossSpawn){const x=ARENA-camera;c(x,213,12,137,'#343f37');for(let y=218;y<350;y+=19)c(x+2,y,8,6,'#e6a65f');}
 for(const e of s.enemies){
   const x=e.x-camera,y=e.y;if(e.hp<=0||x<-100||x>W+100)continue;
   if(e.boss){
     c(x-51,y+35,103,15,'#1c211e');c(x-64,y+21,127,16,'#56493d');c(x-43,y-21,86,46,'#666c5b');c(x-51,y-15,32,25,'#434b42');c(x+26,y-12,27,24,'#434b42');c(x-47,y-42,94,24,'#4a564a');c(x-35,y-45,69,6,'#b0a77d');
     c(x-20,y-19,40,32,e.phase===2?'#ff9451':'#af814f');c(x-9,y-13,18,18,e.stun?'#98ebc6':e.phase===2?'#ffda8f':'#d6a258');c(x-82,y+5,36,11,'#303931');c(x+46,y+5,36,11,'#303931');
   }else{
     c(x-17,y-13,34,38,'#5f614e');c(x-13,y-21,26,11,'#8a8364');c(x-10,y-14,8,4,e.stun?'#98ebc6':'#f0ae6c');c(x-24,y+6,17,6,'#2e4037');c(x-11,y+24,8,4,'#282e27');c(x+5,y+24,8,4,'#282e27');
   }
 }
 const {p}=s,x=p.x-camera,y=p.y;if(p.mech)mech(x,y,true);else if(!p.inv||s.tick%6<3){
   c(x-9,y-37,18,23,'#aa774d');c(x-11,y-43,22,8,'#c7a571');c(x-8,y-36,16,7,'#42544b');c(x-12,y-22,5,15,'#bb925d');c(x-8,y-14,6,14,'#40554b');c(x+3,y-14,6,14,'#40554b');
   const angle=p.aim*Math.PI/4;g.save();g.translate(x,y-25);g.rotate(angle);c(3,-3,24,6,'#283c34');c(22,-3,5,3,'#db9959');g.restore();
 }
 if(p.parry){g.strokeStyle='#a4ebc2';g.lineWidth=3;g.beginPath();g.arc(x,y-24,43,s.tick*.24,s.tick*.24+4.7);g.stroke();}
 for(const b of s.shots){const x=b.x-camera;if(x<-20||x>W+20)continue;const color={round:'#ffe1a0',shell:'#fb9661',reflect:'#abefd0',core:'#f8bc58'}[b.kind];c(x-3,b.y-2,b.kind==='shell'?11:8,b.kind==='core'?7:4,color);}
 c(0,0,W,54,'#17231ce6');label(p.mech?'IRON PIG':'RUNNER',20,22,'#edbb78',13);for(let i=0;i<8;i++)c(20+i*13,30,10,10,i<p.hp?'#99c19b':'#48554b');
 label(p.mech?'MECH  '+p.mechHP+'/4':'AMMO  '+p.ammo+'/18',156,36,p.ammo===0&&!p.mech?'#f8ab63':'#f9e9cc',18);
 if(p.ammo===0&&!p.mech)label('L: TOSS CORE',281,36,'#e3b56d',13);
 const boss=s.enemies.find(e=>e.boss&&e.hp>0);
 if(boss){label('IRON COLOSSUS  /  PHASE '+boss.phase,640,20,'#fac699',14);c(640,31,287,9,'#623e34');c(640,31,Math.max(0,boss.hp/boss.max*287),9,'#ef9c66');}
 else {label('TRENCH 01  /  '+Math.min(100,Math.round(p.x/ARENA*100))+'%',708,34,'#d4ccb1',15);}
 if(!s.mechUsed&&Math.abs(p.x-MECH)<68)label('E: MOUNT IRON PIG',x-67,260,'#f4d78d',14);
 if(s.noticeUntil>s.tick){c(0,H-28,W,28,'#17231ce8');label(s.notice,20,H-9,'#ffcf90',14);}
}
function reset(){s=create();sounds=new Map();running=true;cover.hidden=true;acc=0;key.clear();pointers.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));canvas.focus();}
function finish(){running=false;cover.hidden=false;document.querySelector('#kicker')!.textContent=s.mode==='won'?'OPERATION COMPLETE / 01':'OPERATION FAILED / 01';document.querySelector('#headline')!.textContent=s.mode==='won'?'Line broken.':'Back to the trench.';document.querySelector('#brief')!.textContent=s.mode==='won'?'The Iron Colossus has fallen.':'Jump over barricades and time your parry as a shell approaches.';start.firstChild!.textContent='Run again ';start.focus();}
function frame(t:number){acc=Math.min(100,acc+Math.min(50,t-last));last=t;while(running&&acc>=1000/60){acc-=1000/60;advance(s,input());for(const e of new Set(s.events)){if(s.tick-(sounds.get(e)??-99)>=((e==='fire')?7:5)){effect(e);sounds.set(e,s.tick);}}if(s.mode!=='play')finish();}draw();requestAnimationFrame(frame);}
start.addEventListener('click',reset);
sound.addEventListener('click',()=>{muted=!muted;if(!muted){try{audio??=new AudioContext();void audio.resume().catch(()=>{});}catch{muted=true;}}sound.textContent='♪ Sound '+(muted?'off':'on');sound.setAttribute('aria-pressed',String(!muted));});
addEventListener('keydown',e=>{if(running&&supported.includes(e.code)){e.preventDefault();key.add(e.code);}});
addEventListener('keyup',e=>key.delete(e.code));
const clear=()=>{key.clear();pointers.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));acc=0;};
addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-key]')){
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(!running)return;b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.key!);b.classList.add('held');});
 const done=(e:PointerEvent)=>{pointers.delete(e.pointerId);if(!Array.from(pointers.values()).includes(b.dataset.key!))b.classList.remove('held');};
 b.addEventListener('pointerup',done);b.addEventListener('pointercancel',done);b.addEventListener('lostpointercapture',done);
}
canvas.tabIndex=-1;requestAnimationFrame(frame);
