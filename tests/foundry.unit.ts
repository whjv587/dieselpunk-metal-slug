import {describe,expect,it} from 'vitest';
import {advance,checksum,create,GROUND,railAt,stageConfig,type Input} from '../src/sim';
const stage=stageConfig('foundry'), rail=stage.rail!;
const firstActive=rail.clear+rail.warning;
describe('Underground Foundry',()=>{
 it('gives a full deterministic warning before the cart enters and recycles to clear',()=>{
   expect(railAt(rail.clear-1)).toEqual({mode:'clear',x:null});
   expect(railAt(rail.clear)).toEqual({mode:'warning',x:null});
   expect(railAt(firstActive-1)).toEqual({mode:'warning',x:null});
   expect(railAt(firstActive)).toEqual({mode:'active',x:rail.right+rail.width/2});
   expect(railAt(rail.period-1)).toEqual({mode:'active',x:rail.left-rail.width/2});
   expect(railAt(rail.period)).toEqual({mode:'clear',x:null});
 });
 it('signifies approach, hurts on swept overlap, and can be jumped over',()=>{
   const fresh=()=>{const s=create(undefined,'foundry');s.enemies=[];s.p.x=rail.right-10;return s;};
   const warning=fresh();warning.tick=rail.clear-1;advance(warning);
   expect(warning.events).toContain('rail');expect(warning.p.hp).toBe(8);
   const low=fresh();low.tick=firstActive;advance(low,{parry:true});advance(low);
   expect(low.p.hp).toBe(7);expect(low.notice).toContain('RAIL HIT');
   const high=fresh();high.tick=firstActive-5;advance(high,{jump:true});
   for(let n=0;n<6;n++)advance(high);
   expect(high.p.y).toBeLessThan(GROUND-23);expect(high.p.hp).toBe(8);
 });
 it('deploys its own two-phase end boss',()=>{
   const s=create(undefined,'foundry');s.p.x=stage.arena+16;advance(s);
   const boss=s.enemies.find(e=>e.boss)!;
   expect(boss).toMatchObject({x:stage.boss.x,hp:40,phase:1});
   boss.hp=20;advance(s);
   expect(boss.phase).toBe(2);expect(s.notice).toContain('FURNACE WARDEN');
 });
 it('wins a complete recorded route with consistent checkpoint checksums',()=>{
   const s=create(7259,'foundry'), tape:Input[]=[], expected:string[]=[];
   for(let tick=0;tick<2550&&s.mode==='play';tick++){
     const p=s.p, boss=s.enemies.find(e=>e.boss);
     const shell=s.shots.find(b=>b.kind==='shell'&&Math.abs(p.x-b.x)<43&&Math.abs(p.y-24-b.y)<24);
     const withheld=p.x>=rail.left-31&&p.x<rail.left&&railAt(s.tick).mode!=='clear';
     const mx=withheld?0:boss?(p.x<boss.x-102?1:0):1;
     const jump=p.ground&&stage.barriers.some(o=>o.x-p.x>12&&o.x-p.x<33);
     const input={mx,aim:0,fire:true,jump,parry:!!shell,toss:p.ammo===0,mount:!s.mechUsed&&Math.abs(p.x-stage.mech)<30};
     tape.push(input);advance(s,input);
     if(s.tick%216===0||s.mode!=='play')expected.push(checksum(s));
   }
   expect(s.mode).toBe('won');
   const replay=create(7259,'foundry'), actual:string[]=[];
   for(const step of tape){advance(replay,step);if(replay.tick%216===0||replay.mode!=='play')actual.push(checksum(replay));}
   expect(actual).toEqual(expected);
   expect(actual).toMatchInlineSnapshot(`
     [
       "761b2ef4",
       "3ade22da",
       "4733265d",
       "08a864cd",
       "f906b37e",
     ]
   `);
 });
});
