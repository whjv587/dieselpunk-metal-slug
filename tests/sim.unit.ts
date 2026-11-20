import {describe,expect,it} from 'vitest';
import {advance,ARENA,barriers,checksum,create,GROUND,intersects,MECH,type Input} from '../src/sim';
describe('trench simulation',()=>{
 it('lands on a barricade and returns to the floor with exact fixed ticks',()=>{
   const s=create(), o=barriers[0]; s.p.x=o.x+o.w/2;s.p.y=o.y-2;s.p.vy=3;
   advance(s);expect(s.p.y).toBe(o.y);expect(s.p.ground).toBe(true);
   for(let t=0;t<45;t++)advance(s,{jump:t===0});
   expect([s.p.y,s.p.ground]).toEqual([o.y,true]);
   s.p.x=o.x+o.w+24;for(let t=0;t<30;t++)advance(s);
   expect(s.p.y).toBe(GROUND);
 });
 it('sweeps a fast shot across a thin target, but ignores a parallel miss',()=>{
   const r={x:20,y:10,w:2,h:3}; expect(intersects(1,11,50,11,r)).toBe(true);
   expect(intersects(1,8,50,8,r)).toBe(false);
 });
 it('fires in all eight directions',()=>{
   expect(Array.from({length:8},(_,aim)=>{const s=create();advance(s,{aim,fire:true});const b=s.shots[0];return [Math.sign(b.vx),Math.sign(b.vy)];})).toEqual([[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]);
 });
 it('reflects during the parry window and takes damage after it expires',()=>{
   const s=create();s.enemies=[];
   s.shots.push({x:s.p.x+20,y:s.p.y-24,vx:-9,vy:0,kind:'shell',life:10,damage:1});
   advance(s,{parry:true});expect(s.shots[0].kind).toBe('reflect');expect(s.p.hp).toBe(8);
   for(let t=0;t<13;t++)advance(s,{parry:true});expect(s.p.parry).toBe(0);
   s.shots.push({x:s.p.x+20,y:s.p.y-24,vx:-9,vy:0,kind:'shell',life:10,damage:1});
   advance(s,{parry:true});expect(s.p.hp).toBe(7);
 });
 it('only tosses an empty core, rearms, and ejects for a fixed safety window',()=>{
   const s=create();advance(s,{toss:true});expect(s.shots).toHaveLength(0);
   advance(s);s.p.ammo=0;advance(s,{toss:true});expect(s.p.ammo).toBe(18);expect(s.shots[0].kind).toBe('core');
   s.p.x=MECH;advance(s,{mount:true});expect(s.p.mech).toBe(true);
   advance(s);advance(s,{mount:true});expect(s.p.mech).toBe(false);expect(s.p.inv).toBe(48);
   for(let t=0;t<48;t++)advance(s);
   expect(s.p.inv).toBe(0);
 });
 it('opens the phase-two core below half HP and wins when it is defeated',()=>{
   const s=create();s.p.x=ARENA+16;advance(s);
   const b=s.enemies.find(e=>e.boss)!;expect(b.phase).toBe(1);
   b.hp=18;advance(s);expect(b.phase).toBe(2);expect(s.notice).toContain('EXPOSED');
   b.hp=1;s.p.x=b.x-70;advance(s,{fire:true});
   for(let t=0;t<6;t++)advance(s);
   expect(s.mode).toBe('won');
 });
 it('can clear the full stage from a clean deploy using player inputs only',()=>{
   const s=create();
   for(let tick=0;tick<1900&&s.mode==='play';tick++){
     const p=s.p;const boss=s.enemies.find(e=>e.boss);
     const shell=s.shots.find(b=>b.kind==='shell'&&Math.abs(p.x-b.x)<43&&Math.abs(p.y-24-b.y)<24);
     const mx=boss?(p.x<boss.x-102?1:0):1;
     const jump=p.ground&&barriers.some(o=>o.x-p.x>12&&o.x-p.x<33);
     advance(s,{mx,aim:0,fire:true,jump,parry:!!shell,toss:p.ammo===0,mount:!s.mechUsed&&Math.abs(p.x-MECH)<30});
   }
   expect(s.mode).toBe('won');
 });
 it('matches the golden replay across reruns',()=>{
   const tape:Input[]=Array.from({length:540},(_,t)=>({mx:t<280?1:0,aim:t%67<16?7:0,jump:t%67===33,fire:t%137<118,parry:t%53===7,toss:t%43===17,mount:t%37===1}));
   const replay=()=>{const s=create(764);s.p.ammo=0;s.shots.push({x:s.p.x+20,y:s.p.y-24,vx:-9,vy:0,kind:'shell',life:10,damage:1});const result=[];for(const i of tape){advance(s,i);if(s.tick&&s.tick%135===0)result.push(checksum(s));}return result;};
   expect(replay()).toEqual(replay());
   expect(replay()).toMatchInlineSnapshot(`
     [
       "8dee704a",
       "b3e1700b",
       "6e461a47",
       "4acd1755",
     ]
   `);
 });
});
