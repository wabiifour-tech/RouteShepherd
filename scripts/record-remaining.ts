/**
 * RouteShepherd - Remaining Parts Recording (3: Passenger, 4: Mobile, 5: Tablet)
 */
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://127.0.0.1:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'download', 'recordings');
const COORD_EMAIL = 'coordinator@routeshepherd.ng';
const COORD_PASSWORD = 'Shepherd@2026!';
const DRIVER_EMAIL = 'testdriver@routeshepherd.ng';
const DRIVER_PIN = '222222';
const PASSENGER_EMAIL = 'passenger@test.com';
const PASSENGER_PASSWORD = 'password123';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function safeClick(page: Page, selector: string, delayAfter = 1000) {
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 })) { await sleep(300); await el.click(); await sleep(delayAfter); return true; }
  } catch {}
  return false;
}

async function slowType(page: Page, selector: string, text: string, delay = 50) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector); await sleep(200); await page.fill(selector, '');
  for (const char of text) { await page.type(selector, char, { delay }); }
}

(async () => {
  console.log('🎬 Recording remaining parts (3-5)...\n');
  const browser = await chromium.launch({ headless: true, slowMo: 80 });

  // ===== PART 3: PASSENGER =====
  console.log('📹 PART 3: Passenger Workflow...');
  const passCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: OUTPUT_DIR, size: { width: 1440, height: 900 } } });
  const pp = await passCtx.newPage();
  await pp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000);

  // Scroll landing
  for (let i = 0; i < 4; i++) { await pp.evaluate(() => window.scrollBy(0, 500)); await sleep(1000); }
  await pp.evaluate(() => window.scrollTo(0, 0)); await sleep(1000);

  // Click Pre-Register
  await safeClick(pp, 'button:has-text("Pre-Register Your Trip")', 3000);
  await safeClick(pp, 'button:has-text("Sign In with Email")', 2000);

  // Sign in
  if (await pp.locator('#signin-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(pp, '#signin-email', PASSENGER_EMAIL, 40);
    await slowType(pp, '#signin-password', PASSENGER_PASSWORD, 40);
    await safeClick(pp, 'button:has-text("Sign In")', 6000);
  }

  await pp.waitForSelector('text=Passenger Portal', { timeout: 15000 }).catch(() => {});
  await sleep(2000);

  // Tabs
  await safeClick(pp, 'button:has-text("Live Map")', 4000);
  await safeClick(pp, 'button:has-text("Routes")', 3000);
  await pp.evaluate(() => window.scrollBy(0, 400)); await sleep(1500);
  await pp.evaluate(() => window.scrollTo(0, 0));

  // Pre-register
  await safeClick(pp, 'button:has-text("Register")', 2000);
  await slowType(pp, '#name', 'John Okonkwo', 35).catch(() => {});
  await slowType(pp, '#phone', '+234-802-345-6789', 35).catch(() => {});
  const ppSel = pp.locator('button:has-text("Select pickup point")').first();
  if (await ppSel.isVisible({ timeout: 3000 }).catch(() => false)) { await ppSel.click(); await sleep(500); await pp.locator('[role="option"]').nth(2).click().catch(() => {}); }
  const tSel = pp.locator('button:has-text("Select time slot")').first();
  if (await tSel.isVisible({ timeout: 3000 }).catch(() => false)) { await tSel.click(); await sleep(500); await pp.locator('[role="option"]').nth(1).click().catch(() => {}); }
  await safeClick(pp, 'button:has-text("+")', 400);
  await safeClick(pp, 'button:has-text("+")', 400);
  await safeClick(pp, 'button:has-text("Pre-Register")', 4000);

  // Tracking & trips
  await safeClick(pp, 'button:has-text("Tracking")', 3000);
  await safeClick(pp, 'button:has-text("My Trips")', 2000);
  await safeClick(pp, 'button:has-text("Alerts")', 3000);
  await safeClick(pp, 'button:has-text("Live Map")', 3000);

  await pp.close(); await passCtx.close();
  console.log('  ✅ Passenger workflow recorded!\n');

  // ===== PART 4: MOBILE =====
  console.log('📹 PART 4: Mobile (375x812)...');
  const mVP = { width: 375, height: 812 };
  const mCtx = await browser.newContext({ viewport: mVP, recordVideo: { dir: OUTPUT_DIR, size: mVP }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)' });
  const mp = await mCtx.newPage();

  // Landing
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000);
  for (let i = 0; i < 5; i++) { await mp.evaluate(() => window.scrollBy(0, 300)); await sleep(700); }
  await mp.evaluate(() => window.scrollTo(0, 0));

  // Login pages
  await safeClick(mp, 'button:has-text("Coordinator Login")', 3000); await sleep(2000);
  await safeClick(mp, 'button:has-text("Back to Home")', 2000);
  if (!await mp.locator('text=RouteShepherd').isVisible({ timeout: 2000 }).catch(() => false)) { await mp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000); }

  await safeClick(mp, 'button:has-text("Driver Login")', 3000); await sleep(2000);
  await safeClick(mp, 'button:has-text("Back to Home")', 2000);
  if (!await mp.locator('text=RouteShepherd').isVisible({ timeout: 2000 }).catch(() => false)) { await mp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000); }

  // Passenger login & dashboard
  await safeClick(mp, 'button:has-text("Pre-Register")', 3000);
  await safeClick(mp, 'button:has-text("Sign In with Email")', 2000);
  if (await mp.locator('#signin-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(mp, '#signin-email', PASSENGER_EMAIL, 35);
    await slowType(mp, '#signin-password', PASSENGER_PASSWORD, 35);
    await safeClick(mp, 'button:has-text("Sign In")', 6000);
  }
  await mp.waitForSelector('text=Passenger Portal', { timeout: 15000 }).catch(() => {}); await sleep(2000);

  await safeClick(mp, 'button:has-text("Routes")', 2000);
  await mp.evaluate(() => window.scrollBy(0, 300)); await sleep(1500);
  await mp.evaluate(() => window.scrollTo(0, 0));
  await safeClick(mp, 'button:has-text("Map")', 3000);

  // Coordinator dashboard mobile
  await mp.evaluate(() => localStorage.clear());
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000);
  await safeClick(mp, 'button:has-text("Coordinator Login")', 3000);
  if (await mp.locator('#coord-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(mp, '#coord-email', COORD_EMAIL, 35);
    await slowType(mp, '#coord-password', COORD_PASSWORD, 35);
    await safeClick(mp, 'button:has-text("Login")', 6000);
  }
  await mp.waitForSelector('text=Coordinator Dashboard', { timeout: 15000 }).catch(() => {}); await sleep(2000);
  await safeClick(mp, 'button:has-text("Demand")', 2000);
  await safeClick(mp, 'button:has-text("Fleet")', 2000);
  await safeClick(mp, 'button:has-text("Map")', 3000);

  // Driver dashboard mobile
  await mp.evaluate(() => localStorage.clear());
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000);
  await safeClick(mp, 'button:has-text("Driver Login")', 3000);
  if (await mp.locator('#driver-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(mp, '#driver-email', DRIVER_EMAIL, 35);
    await slowType(mp, '#driver-pin', DRIVER_PIN, 60);
    await safeClick(mp, 'button:has-text("Sign In")', 6000);
  }
  await mp.waitForSelector('text=Driver Interface', { timeout: 10000 }).catch(() => {}); await sleep(2000);
  const mBSel = mp.locator('select').first();
  if (await mBSel.isVisible({ timeout: 2000 }).catch(() => false)) { const c = await mBSel.locator('option').count(); if (c > 1) { await mBSel.selectOption({ index: 1 }); await sleep(2000); } }
  await mp.evaluate(() => window.scrollBy(0, 500)); await sleep(2000);

  await mp.close(); await mCtx.close();
  console.log('  ✅ Mobile recorded!\n');

  // ===== PART 5: TABLET =====
  console.log('📹 PART 5: Tablet (768x1024)...');
  const tVP = { width: 768, height: 1024 };
  const tCtx = await browser.newContext({ viewport: tVP, recordVideo: { dir: OUTPUT_DIR, size: tVP } });
  const tp = await tCtx.newPage();

  await tp.goto(BASE_URL, { waitUntil: 'networkidle' }); await sleep(5000);
  await tp.evaluate(() => window.scrollBy(0, 600)); await sleep(1500);
  await tp.evaluate(() => window.scrollTo(0, 0)); await sleep(1000);

  // Coordinator dashboard
  await safeClick(tp, 'button:has-text("Coordinator Login")', 3000);
  if (await tp.locator('#coord-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(tp, '#coord-email', COORD_EMAIL, 35);
    await slowType(tp, '#coord-password', COORD_PASSWORD, 35);
    await safeClick(tp, 'button:has-text("Login")', 6000);
  }
  await tp.waitForSelector('text=Coordinator Dashboard', { timeout: 15000 }).catch(() => {}); await sleep(2000);
  await safeClick(tp, 'button:has-text("Demand")', 2000);
  await safeClick(tp, 'button:has-text("Fleet")', 2000);
  await safeClick(tp, 'button:has-text("Map")', 3000);
  await safeClick(tp, 'button:has-text("Dispatch")', 2000);
  await safeClick(tp, 'button:has-text("Drivers")', 2000);
  await safeClick(tp, 'button:has-text("Routes")', 2000);
  await safeClick(tp, 'button:has-text("Alerts")', 2000);

  await tp.close(); await tCtx.close();
  console.log('  ✅ Tablet recorded!\n');

  await browser.close();

  // Rename videos
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('page@') && f.endsWith('.webm'));
  const names = ['part3-passenger-workflow-desktop', 'part4-mobile-responsiveness', 'part5-tablet-responsiveness'];
  for (let i = 0; i < files.length; i++) {
    const newName = names[i] || `part${i + 3}-recording`;
    fs.renameSync(path.join(OUTPUT_DIR, files[i]), path.join(OUTPUT_DIR, `${newName}.webm`));
  }

  console.log('🎬 ALL REMAINING RECORDINGS COMPLETE!\n');
  const allVideos = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.webm'));
  allVideos.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f));
    console.log(`   📹 ${f} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  });
})();
