import {expect,test} from '@playwright/test';
test('deploys, renders, toggles audio and accepts play input without overflowing',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Break the line.'})).toBeVisible();
 const canvas=page.locator('#game'); const frame=()=>canvas.evaluate(e=>(e as HTMLCanvasElement).toDataURL());
 const initial=await frame();
 await page.getByRole('button',{name:'Deploy'}).click();
 await expect(page.locator('#cover')).toBeHidden();
 await page.getByRole('button',{name:'Sound off'}).click();
 await expect(page.getByRole('button',{name:'Sound on'})).toHaveAttribute('aria-pressed','true');
 if(info.project.name==='mobile'){
   const go=page.getByRole('button',{name:'Move right'});
   await expect(go).toBeVisible();
   const point=(await go.boundingBox())!;
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x+point.width/2,y:point.y+point.height/2}]});
   await expect(go).toHaveClass('held');
   await expect.poll(frame).not.toBe(initial);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await expect(go).not.toHaveClass('held');
 }else{
   await page.keyboard.down('d');
   await expect.poll(frame).not.toBe(initial);
   await page.keyboard.up('d');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
 expect(errors).toEqual([]);
});

test('switches from the trench briefing to the playable foundry',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'02 Foundry'}).click();
 await expect(page.getByRole('button',{name:'02 Foundry'})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('heading',{name:'Into the foundry.'})).toBeVisible();
 await expect(page.getByText('Amber warns', {exact:false})).toBeVisible();
 const canvas=page.locator('#game'), frame=()=>canvas.evaluate(e=>(e as HTMLCanvasElement).toDataURL());
 const foundry=await frame();
 await page.getByRole('button',{name:'Deploy'}).click();
 await expect(page.locator('#cover')).toBeHidden();
 if(info.project.name==='mobile'){
   const go=page.getByRole('button',{name:'Move right'});
   const point=(await go.boundingBox())!;
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x+point.width/2,y:point.y+point.height/2}]});
   await expect(go).toHaveClass('held');
   await expect.poll(frame).not.toBe(foundry);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await expect(go).not.toHaveClass('held');
 }else{
   await page.keyboard.down('d');
   await expect.poll(frame).not.toBe(foundry);
   await page.keyboard.up('d');
 }
 expect(errors).toEqual([]);
});
