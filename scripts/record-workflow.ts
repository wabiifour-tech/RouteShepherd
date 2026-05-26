/**
 * RouteShepherd - Complete Workflow Video Recording
 * Starts the server internally and records the entire user journey
 * 
 * Usage: npx tsx scripts/record-workflow.ts
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';

const BASE_URL = 'http://127.0.0.1:3000';
const OUTPUT_DIR = path.join(__dirname, '..', 'download', 'recordings');

// Credentials
const COORD_EMAIL = 'coordinator@routeshepherd.ng';
const COORD_PASSWORD = 'Shepherd@2026!';
const DRIVER_EMAIL = 'testdriver@routeshepherd.ng';
const DRIVER_PIN = '111111';
const DRIVER_NEW_PIN = '222222';
const PASSENGER_EMAIL = 'passenger@test.com';
const PASSENGER_PASSWORD = 'password123';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function slowType(page: Page, selector: string, text: string, delay = 50) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector);
  await sleep(200);
  await page.fill(selector, '');
  for (const char of text) {
    await page.type(selector, char, { delay });
  }
}

async function safeClick(page: Page, selector: string, delayAfter = 1000) {
  try {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 })) {
      await sleep(300);
      await el.click();
      await sleep(delayAfter);
      return true;
    }
  } catch {}
  console.log(`    [skip] ${selector.slice(0, 60)}`);
  return false;
}

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {}
    await sleep(2000);
  }
  return false;
}

async function recordFullWorkflow() {
  console.log('🎬 Starting RouteShepherd Complete Workflow Recording...\n');

  // Start the server
  console.log('🔧 Starting Next.js production server...');
  
  // Kill any existing process on port 3000
  try { execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true'); } catch {}
  await sleep(2000);

  const server = spawn('npx', ['next', 'start', '-p', '3000'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    detached: false,
  });

  server.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg.includes('Ready') || msg.includes('Error') || msg.includes('EADDRINUSE')) {
      console.log('  Server:', msg);
    }
  });

  server.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log('  Server err:', msg);
  });

  // Wait for server to be ready
  const serverReady = await waitForServer(BASE_URL);
  if (!serverReady) {
    console.error('❌ Server failed to start');
    process.exit(1);
  }
  console.log('  ✅ Server ready!\n');

  const browser: Browser = await chromium.launch({
    headless: true,
    slowMo: 80,
  });

  // =============================================
  // PART 1: COORDINATOR WORKFLOW (Desktop)
  // =============================================
  console.log('📹 PART 1: Coordinator Workflow (Desktop 1440x900)...');
  
  const coordCtx: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1440, height: 900 } },
  });
  const cp: Page = await coordCtx.newPage();

  // 1.1 Landing Page
  console.log('  → Loading landing page...');
  await cp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000); // Wait for full React hydration
  
  // Scroll through landing
  for (let i = 0; i < 4; i++) {
    await cp.evaluate(() => window.scrollBy(0, 500));
    await sleep(1200);
  }
  await cp.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  // 1.2 Navigate to Coordinator Login
  console.log('  → Clicking Coordinator Login...');
  await safeClick(cp, 'button:has-text("Coordinator Login")', 3000);

  // 1.3 Coordinator Login
  console.log('  → Coordinator logging in...');
  const coordEmailVisible = await cp.locator('#coord-email').isVisible({ timeout: 5000 }).catch(() => false);
  if (coordEmailVisible) {
    await slowType(cp, '#coord-email', COORD_EMAIL, 40);
    await sleep(500);
    await slowType(cp, '#coord-password', COORD_PASSWORD, 40);
    await sleep(800);
    await safeClick(cp, 'button:has-text("Login")', 6000);
  } else {
    console.log('  ⚠️ Login form not visible, trying direct API login...');
    // Login via API and set session cookie
    await cp.evaluate(async () => {
      const res = await fetch('/api/auth/coordinator-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'coordinator@routeshepherd.ng', password: 'Shepherd@2026!' }),
      });
      const data = await res.json();
      if (data.role === 'coordinator') {
        localStorage.setItem('rs_user', JSON.stringify({ ...data, role: 'coordinator', provider: 'credentials' }));
      }
    });
    await sleep(2000);
    // Reload and navigate
    await cp.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(5000);
  }

  // Wait for dashboard
  await cp.waitForSelector('text=Coordinator Dashboard', { timeout: 15000 }).catch(() => {});
  await sleep(2000);
  console.log('  → Dashboard loaded!');

  // 1.4 Explore Dashboard Tabs
  console.log('  → Exploring Dashboard tabs...');
  await safeClick(cp, 'button:has-text("Demand")', 3000);
  await safeClick(cp, 'button:has-text("Fleet")', 3000);
  await safeClick(cp, 'button:has-text("Map")', 4000);
  await safeClick(cp, 'button:has-text("Dispatch")', 2000);

  // 1.5 Create a New Driver
  console.log('  → Creating new driver...');
  await safeClick(cp, 'button:has-text("Drivers")', 2000);
  await safeClick(cp, 'button:has-text("Add Driver")', 1500);

  const ts = Date.now().toString().slice(-4);
  await slowType(cp, 'input[placeholder="Full name"]', `Demo Driver ${ts}`, 35).catch(() => {});
  await sleep(300);
  await slowType(cp, 'input[placeholder="driver@example.com"]', `demo${ts}@routeshepherd.ng`, 35).catch(() => {});
  await sleep(300);
  await slowType(cp, 'input[placeholder="+234-XXX-XXX-XXXX"]', '+234-801-234-5678', 35).catch(() => {});
  await sleep(500);

  // Assign bus
  const busTrigger = cp.locator('button:has-text("Select a bus")').first();
  if (await busTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
    await busTrigger.click();
    await sleep(500);
    const busOpt = cp.locator('[role="option"]').first();
    if (await busOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await busOpt.click();
      await sleep(500);
    }
  }

  // Submit
  const addDriverDialogBtn = cp.locator('.fixed button:has-text("Add Driver")').first();
  if (await addDriverDialogBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addDriverDialogBtn.click();
    await sleep(4000);
  } else {
    await safeClick(cp, 'button:has-text("Add Driver")', 4000);
  }

  // 1.6 Dispatch a Bus
  console.log('  → Dispatching bus...');
  await safeClick(cp, 'button:has-text("Dispatch")', 2000);

  const dispBus = cp.locator('button:has-text("buses available")').first();
  if (await dispBus.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dispBus.click();
    await sleep(500);
    const dBusOpt = cp.locator('[role="option"]').first();
    if (await dBusOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dBusOpt.click();
    }
  }
  await sleep(500);

  const dispRoute = cp.locator('button:has-text("Select route")').first();
  if (await dispRoute.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dispRoute.click();
    await sleep(500);
    const dRouteOpt = cp.locator('[role="option"]').first();
    if (await dRouteOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dRouteOpt.click();
    }
  }
  await sleep(500);

  await safeClick(cp, 'button:has-text("Dispatch Bus")', 4000);

  // 1.7 Send Announcement
  console.log('  → Sending coordinator announcement...');
  await safeClick(cp, 'button:has-text("Alerts")', 2000);

  const alertInput = cp.locator('input[placeholder="e.g., High Demand Alert"]').first();
  if (await alertInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await alertInput.click();
    await sleep(200);
    await alertInput.type('RCCG Convention 2026 - Bus Deployment Update', { delay: 20 });
  }
  await sleep(300);

  const alertTA = cp.locator('textarea').first();
  if (await alertTA.isVisible({ timeout: 2000 }).catch(() => false)) {
    await alertTA.click();
    await sleep(200);
    await alertTA.type('All drivers: Please proceed to your assigned pickup points. Buses are loading now. Passengers should check their assigned bus on the tracking page.', { delay: 15 });
  }
  await sleep(500);

  await safeClick(cp, 'button:has-text("Send Alert")', 3000);

  // 1.8 Routes tab
  await safeClick(cp, 'button:has-text("Routes")', 3000);

  // 1.9 Fleet overview
  await safeClick(cp, 'button:has-text("Fleet")', 2000);
  await sleep(1500);

  // Close coordinator
  await cp.close();
  await coordCtx.close();
  console.log('  ✅ Coordinator workflow recorded!\n');

  // =============================================
  // PART 2: DRIVER WORKFLOW (Desktop)
  // =============================================
  console.log('📹 PART 2: Driver Workflow (Desktop 1440x900)...');

  const driverCtx: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1440, height: 900 } },
  });
  const dp: Page = await driverCtx.newPage();

  // 2.1 Landing Page
  console.log('  → Loading landing page...');
  await dp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);

  // 2.2 Click Driver Login
  console.log('  → Clicking Driver Login...');
  await safeClick(dp, 'button:has-text("Driver Login")', 3000);

  // 2.3 Driver Login
  console.log('  → Driver logging in...');
  const driverEmailVisible = await dp.locator('#driver-email').isVisible({ timeout: 5000 }).catch(() => false);
  if (driverEmailVisible) {
    await slowType(dp, '#driver-email', DRIVER_EMAIL, 40);
    await sleep(500);
    await slowType(dp, '#driver-pin', DRIVER_PIN, 60);
    await sleep(800);
    await safeClick(dp, 'button:has-text("Sign In")', 6000);
  } else {
    console.log('  ⚠️ Driver login form not visible');
  }

  // Check for PIN change modal
  const pinChangeVisible = await dp.locator('text=PIN Change Required').isVisible({ timeout: 8000 }).catch(() => false);
  
  if (pinChangeVisible) {
    console.log('  → Forced PIN change modal - changing PIN...');
    await slowType(dp, '#current-pin', DRIVER_PIN, 60).catch(() => {});
    await sleep(300);
    await slowType(dp, '#new-pin', DRIVER_NEW_PIN, 60).catch(() => {});
    await sleep(300);
    await slowType(dp, '#confirm-pin', DRIVER_NEW_PIN, 60).catch(() => {});
    await sleep(500);
    await safeClick(dp, 'button:has-text("Change PIN")', 6000);
  }

  // Wait for driver dashboard
  await dp.waitForSelector('text=Driver Interface', { timeout: 10000 }).catch(() => {});
  await sleep(2000);

  // 2.4 Select bus and go through status flow
  console.log('  → Exploring Driver Interface...');
  const busSel = dp.locator('select').first();
  if (await busSel.isVisible({ timeout: 3000 }).catch(() => false)) {
    const optCount = await busSel.locator('option').count();
    if (optCount > 1) {
      await busSel.selectOption({ index: 1 });
      await sleep(2000);
    }
  }

  // Status flow
  await safeClick(dp, 'button:has-text("Start Loading")', 3000);
  await safeClick(dp, 'button:has-text("Depart")', 3000);

  // Passenger counter
  console.log('  → Using passenger counter...');
  for (let i = 0; i < 5; i++) {
    await safeClick(dp, 'button:has-text("+")', 400);
  }

  // GPS Tracking
  console.log('  → Starting GPS tracking...');
  await safeClick(dp, 'button:has-text("Auto-Track")', 3000);
  await sleep(3000);
  await safeClick(dp, 'button:has-text("Update Once")', 3000);

  // Scroll to notifications
  await dp.evaluate(() => window.scrollBy(0, 600));
  await sleep(2000);

  // Arrived
  await safeClick(dp, 'button:has-text("Arrived")', 3000);

  await dp.close();
  await driverCtx.close();
  console.log('  ✅ Driver workflow recorded!\n');

  // =============================================
  // PART 3: PASSENGER WORKFLOW (Desktop)
  // =============================================
  console.log('📹 PART 3: Passenger Workflow (Desktop 1440x900)...');

  const passCtx: BrowserContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1440, height: 900 } },
  });
  const pp: Page = await passCtx.newPage();

  // 3.1 Landing Page
  console.log('  → Loading landing page...');
  await pp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);
  await pp.evaluate(() => window.scrollBy(0, 800));
  await sleep(1500);
  await pp.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  // 3.2 Navigate to Passenger Login
  console.log('  → Clicking Pre-Register...');
  await safeClick(pp, 'button:has-text("Pre-Register Your Trip")', 3000);

  // 3.3 Click Sign In with Email
  await safeClick(pp, 'button:has-text("Sign In with Email")', 2000);

  // 3.4 Fill sign in form
  console.log('  → Passenger logging in...');
  const signinEmailVisible = await pp.locator('#signin-email').isVisible({ timeout: 5000 }).catch(() => false);
  if (signinEmailVisible) {
    await slowType(pp, '#signin-email', PASSENGER_EMAIL, 40);
    await slowType(pp, '#signin-password', PASSENGER_PASSWORD, 40);
    await sleep(800);
    await safeClick(pp, 'button:has-text("Sign In")', 6000);
  }

  // Wait for passenger portal
  await pp.waitForSelector('text=Passenger Portal', { timeout: 15000 }).catch(() => {});
  await sleep(2000);

  // 3.5 Explore tabs
  console.log('  → Exploring Passenger Portal...');
  await safeClick(pp, 'button:has-text("Live Map")', 4000);
  await safeClick(pp, 'button:has-text("Routes")', 3000);
  await pp.evaluate(() => window.scrollBy(0, 400));
  await sleep(1500);
  await pp.evaluate(() => window.scrollTo(0, 0));

  // 3.6 Pre-Register a Trip
  console.log('  → Pre-registering a trip...');
  await safeClick(pp, 'button:has-text("Register")', 2000);
  
  await slowType(pp, '#name', 'John Okonkwo', 35).catch(() => {});
  await slowType(pp, '#phone', '+234-802-345-6789', 35).catch(() => {});
  await sleep(300);

  // Pickup point
  const ppSelect = pp.locator('button:has-text("Select pickup point")').first();
  if (await ppSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ppSelect.click();
    await sleep(500);
    const ppOpt = pp.locator('[role="option"]').nth(2);
    if (await ppOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ppOpt.click();
    }
  }

  // Time slot
  const timeSelect = pp.locator('button:has-text("Select time slot")').first();
  if (await timeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await timeSelect.click();
    await sleep(500);
    const timeOpt = pp.locator('[role="option"]').nth(1);
    if (await timeOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
      await timeOpt.click();
    }
  }

  // Add passengers
  await safeClick(pp, 'button:has-text("+")', 400);
  await safeClick(pp, 'button:has-text("+")', 400);

  // Submit
  await safeClick(pp, 'button:has-text("Pre-Register")', 4000);

  // 3.7 Tracking
  console.log('  → Tracking assigned bus...');
  await safeClick(pp, 'button:has-text("Tracking")', 3000);

  // 3.8 My Trips
  await safeClick(pp, 'button:has-text("My Trips")', 2000);

  // 3.9 Notifications
  await safeClick(pp, 'button:has-text("Alerts")', 3000);

  // 3.10 Back to Live Map
  await safeClick(pp, 'button:has-text("Live Map")', 3000);

  await pp.close();
  await passCtx.close();
  console.log('  ✅ Passenger workflow recorded!\n');

  // =============================================
  // PART 4: MOBILE RESPONSIVENESS (Phone)
  // =============================================
  console.log('📹 PART 4: Mobile Responsiveness - Phone (375x812)...');

  const mobileVP = { width: 375, height: 812 };
  const mobileCtx: BrowserContext = await browser.newContext({
    viewport: mobileVP,
    recordVideo: { dir: OUTPUT_DIR, size: mobileVP },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
  });
  const mp: Page = await mobileCtx.newPage();

  // 4.1 Landing
  console.log('  → Landing page (mobile)...');
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);
  for (let i = 0; i < 6; i++) {
    await mp.evaluate(() => window.scrollBy(0, 300));
    await sleep(700);
  }
  await mp.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  // 4.2 Coordinator Login (mobile)
  console.log('  → Coordinator Login (mobile)...');
  await safeClick(mp, 'button:has-text("Coordinator Login")', 3000);
  await sleep(2000);
  await mp.evaluate(() => window.scrollBy(0, 200));
  await sleep(1000);
  await mp.evaluate(() => window.scrollTo(0, 0));
  await safeClick(mp, 'button:has-text("Back to Home")', 2000);
  if (!await mp.locator('text=RouteShepherd').isVisible({ timeout: 2000 }).catch(() => false)) {
    await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(5000);
  }

  // 4.3 Driver Login (mobile)
  console.log('  → Driver Login (mobile)...');
  await safeClick(mp, 'button:has-text("Driver Login")', 3000);
  await sleep(2000);
  await safeClick(mp, 'button:has-text("Back to Home")', 2000);
  if (!await mp.locator('text=RouteShepherd').isVisible({ timeout: 2000 }).catch(() => false)) {
    await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(5000);
  }

  // 4.4 Passenger Login (mobile)
  console.log('  → Passenger Login (mobile)...');
  await safeClick(mp, 'button:has-text("Pre-Register")', 3000);
  await safeClick(mp, 'button:has-text("Sign In with Email")', 2000);
  if (await mp.locator('#signin-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(mp, '#signin-email', PASSENGER_EMAIL, 35);
    await slowType(mp, '#signin-password', PASSENGER_PASSWORD, 35);
    await safeClick(mp, 'button:has-text("Sign In")', 5000);
  }

  await mp.waitForSelector('text=Passenger Portal', { timeout: 15000 }).catch(() => {});
  await sleep(2000);

  // 4.5 Passenger Dashboard tabs (mobile)
  console.log('  → Passenger Dashboard (mobile)...');
  await safeClick(mp, 'button:has-text("Routes")', 2000);
  await mp.evaluate(() => window.scrollBy(0, 300));
  await sleep(1500);
  await mp.evaluate(() => window.scrollTo(0, 0));
  await safeClick(mp, 'button:has-text("Map")', 3000);
  await safeClick(mp, 'button:has-text("Tracking")', 3000);

  // 4.6 Coordinator Dashboard (mobile)
  console.log('  → Coordinator Dashboard (mobile)...');
  await mp.evaluate(() => localStorage.clear());
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);
  await safeClick(mp, 'button:has-text("Coordinator Login")', 3000);
  if (await mp.locator('#coord-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(mp, '#coord-email', COORD_EMAIL, 35);
    await slowType(mp, '#coord-password', COORD_PASSWORD, 35);
    await safeClick(mp, 'button:has-text("Login")', 6000);
  }

  await mp.waitForSelector('text=Coordinator Dashboard', { timeout: 15000 }).catch(() => {});
  await sleep(2000);
  await safeClick(mp, 'button:has-text("Demand")', 2000);
  await safeClick(mp, 'button:has-text("Fleet")', 2000);
  await safeClick(mp, 'button:has-text("Map")', 3000);
  await safeClick(mp, 'button:has-text("Drivers")', 2000);
  await mp.evaluate(() => window.scrollBy(0, 300));
  await sleep(1500);

  // 4.7 Driver Dashboard (mobile)
  console.log('  → Driver Dashboard (mobile)...');
  await mp.evaluate(() => localStorage.clear());
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);
  await safeClick(mp, 'button:has-text("Driver Login")', 3000);
  if (await mp.locator('#driver-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(mp, '#driver-email', DRIVER_EMAIL, 35);
    await slowType(mp, '#driver-pin', DRIVER_NEW_PIN, 60);
    await safeClick(mp, 'button:has-text("Sign In")', 6000);
  }

  await mp.waitForSelector('text=Driver Interface', { timeout: 10000 }).catch(() => {});
  await sleep(2000);
  const mBusSel = mp.locator('select').first();
  if (await mBusSel.isVisible({ timeout: 2000 }).catch(() => false)) {
    const mOpts = await mBusSel.locator('option').count();
    if (mOpts > 1) {
      await mBusSel.selectOption({ index: 1 });
      await sleep(2000);
    }
  }
  await mp.evaluate(() => window.scrollBy(0, 400));
  await sleep(1500);
  await mp.evaluate(() => window.scrollBy(0, 400));
  await sleep(1500);

  // 4.8 Map view (mobile)
  console.log('  → Map view (mobile)...');
  await mp.evaluate(() => localStorage.clear());
  await mp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);
  await safeClick(mp, 'button:has-text("Pre-Register")', 3000);
  await safeClick(mp, 'button:has-text("Sign In with Email")', 2000);
  if (await mp.locator('#signin-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await mp.fill('#signin-email', PASSENGER_EMAIL);
    await mp.fill('#signin-password', PASSENGER_PASSWORD);
    await mp.locator('button:has-text("Sign In")').first().click().catch(() => {});
    await sleep(5000);
  }
  await mp.waitForSelector('text=Passenger Portal', { timeout: 15000 }).catch(() => {});
  await safeClick(mp, 'button:has-text("Map")', 3000);

  await mp.close();
  await mobileCtx.close();
  console.log('  ✅ Mobile responsiveness recorded!\n');

  // =============================================
  // PART 5: TABLET RESPONSIVENESS
  // =============================================
  console.log('📹 PART 5: Tablet Responsiveness (768x1024)...');

  const tabVP = { width: 768, height: 1024 };
  const tabCtx: BrowserContext = await browser.newContext({
    viewport: tabVP,
    recordVideo: { dir: OUTPUT_DIR, size: tabVP },
  });
  const tp: Page = await tabCtx.newPage();

  // 5.1 Landing
  console.log('  → Landing page (tablet)...');
  await tp.goto(BASE_URL, { waitUntil: 'networkidle' });
  await sleep(5000);
  await tp.evaluate(() => window.scrollBy(0, 600));
  await sleep(1500);
  await tp.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  // 5.2 Coordinator dashboard (tablet)
  console.log('  → Coordinator Dashboard (tablet)...');
  await safeClick(tp, 'button:has-text("Coordinator Login")', 3000);
  if (await tp.locator('#coord-email').isVisible({ timeout: 5000 }).catch(() => false)) {
    await slowType(tp, '#coord-email', COORD_EMAIL, 35);
    await slowType(tp, '#coord-password', COORD_PASSWORD, 35);
    await safeClick(tp, 'button:has-text("Login")', 6000);
  }

  await tp.waitForSelector('text=Coordinator Dashboard', { timeout: 15000 }).catch(() => {});
  await sleep(2000);

  await safeClick(tp, 'button:has-text("Demand")', 2000);
  await safeClick(tp, 'button:has-text("Fleet")', 2000);
  await safeClick(tp, 'button:has-text("Map")', 3000);
  await safeClick(tp, 'button:has-text("Dispatch")', 2000);
  await safeClick(tp, 'button:has-text("Drivers")', 2000);
  await safeClick(tp, 'button:has-text("Routes")', 2000);
  await safeClick(tp, 'button:has-text("Alerts")', 2000);

  await tp.close();
  await tabCtx.close();
  console.log('  ✅ Tablet responsiveness recorded!\n');

  // =============================================
  // CLEANUP
  // =============================================
  await browser.close();
  
  // Kill the server
  try { server.kill(); } catch {}
  try { execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true'); } catch {}

  // List recorded videos
  console.log('🎬 ALL RECORDINGS COMPLETE!\n');
  console.log(`📁 Videos saved to: ${OUTPUT_DIR}\n`);

  const findVideos = (dir: string): string[] => {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findVideos(fullPath));
      } else if (entry.name.endsWith('.webm')) {
        const stats = fs.statSync(fullPath);
        results.push(`${entry.name} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      }
    }
    return results;
  };

  const videos = findVideos(OUTPUT_DIR);
  if (videos.length > 0) {
    console.log('📹 Video files:');
    videos.forEach(v => console.log(`   ${v}`));
  } else {
    console.log('⚠️  No video files found in output directory');
  }
}

recordFullWorkflow().catch(err => {
  console.error('❌ Recording failed:', err);
  process.exit(1);
});
