import {defineConfig,devices} from '@playwright/test';
const env=(globalThis as unknown as {process?:{env:Record<string,string|undefined>}}).process?.env ?? {};
export default defineConfig({
 testMatch:'*.spec.ts', testDir:'./tests', reporter:'list',
 use:{baseURL:'http://127.0.0.1:4173',launchOptions:env.CHROMIUM_PATH?{executablePath:env.CHROMIUM_PATH}:{}},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}],
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false}
});
