import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { execSync } from 'child_process';

let browserContext = null;
let launchPromise = null;

const PROFILE_DIR = process.env.BROWSER_PROFILE_DIR || path.join(os.homedir(), '.stock-analyzer', 'browser-profile');

const CHROME_ARGS = [
  '--disable-blink-features=AutomationControlled',
];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function ensureProfileDir() {
  await fs.mkdir(PROFILE_DIR, { recursive: true });
}

// Kill any Chrome processes holding the profile, then clean lock files
async function releaseProfile() {
  try {
    // Kill Chrome processes using our profile
    execSync(`pkill -f "stock-analyzer/browser-profile" 2>/dev/null || true`, { encoding: 'utf-8' });
    await new Promise(r => setTimeout(r, 800));
  } catch { /* ignore */ }
  try { await fs.unlink(path.join(PROFILE_DIR, 'SingletonLock')); } catch { /* ignore */ }
  try { await fs.unlink(path.join(PROFILE_DIR, 'SingletonCookie')); } catch { /* ignore */ }
  try { await fs.unlink(path.join(PROFILE_DIR, 'SingletonSocket')); } catch { /* ignore */ }
}

// Clean stale lock on module load (server restart)
try { await fs.unlink(path.join(PROFILE_DIR, 'SingletonLock')); } catch { /* ignore */ }

async function launchBrowser() {
  await ensureProfileDir();

  const hasSession = await fs.access(path.join(PROFILE_DIR, 'Default')).then(() => true).catch(() => false);

  try {
    browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: hasSession,
      channel: 'chrome',
      args: CHROME_ARGS,
      viewport: { width: 1280, height: 800 },
      ignoreDefaultArgs: ['--enable-automation'],
      userAgent: USER_AGENT,
    });
  } catch (e) {
    if (e.message?.includes('ProcessSingleton') || e.message?.includes('database is locked')) {
      console.log('[Browser] Profile locked, releasing and retrying...');
      await releaseProfile();
      browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: hasSession,
        channel: 'chrome',
        args: CHROME_ARGS,
        viewport: { width: 1280, height: 800 },
        ignoreDefaultArgs: ['--enable-automation'],
      });
    } else {
      throw e;
    }
  }

  if (!hasSession) {
    console.log('[Browser] First launch — browser opened visibly for login.');
  } else {
    console.log('[Browser] Using saved browser session (headless).');
  }

  // Mask headless fingerprints so sites like X don't block rendering
  await browserContext.addInitScript(() => {
    // Fix outer dimensions (0 in headless)
    Object.defineProperty(window, 'outerWidth',  { get: () => 1280 });
    Object.defineProperty(window, 'outerHeight', { get: () => 800 });
    // Fake plugins so navigator.plugins.length > 0
    Object.defineProperty(navigator, 'plugins', {
      get: () => [{ name: 'Chrome PDF Plugin' }, { name: 'Chrome PDF Viewer' }, { name: 'Native Client' }],
    });
    Object.defineProperty(navigator, 'mimeTypes', { get: () => [{ type: 'application/pdf' }] });
    // Ensure window.chrome exists (real Chrome sets this)
    if (!window.chrome) {
      window.chrome = { runtime: {} };
    }
  });

  // Auto-reset when browser exits unexpectedly
  browserContext.on('close', () => {
    console.log('[Browser] Context closed, will relaunch on next request.');
    browserContext = null;
  });

  return browserContext;
}

export async function getBrowser() {
  if (browserContext) return browserContext;
  if (!launchPromise) {
    launchPromise = launchBrowser().finally(() => { launchPromise = null; });
  }
  return launchPromise;
}

export async function closeBrowser() {
  if (browserContext) {
    try { await browserContext.close(); } catch { /* ignore */ }
    browserContext = null;
  }
}

// One-time login helper: closes running browser, opens visibly for user to log in
export async function openLoginBrowser() {
  await ensureProfileDir();
  // Release any existing Chrome holding the profile
  await releaseProfile();
  await new Promise(r => setTimeout(r, 500));

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: 'chrome',
    args: CHROME_ARGS,
    viewport: { width: 1280, height: 800 },
    ignoreDefaultArgs: ['--enable-automation'],
    userAgent: USER_AGENT,
  });

  const page1 = await ctx.newPage();
  await page1.goto('https://x.com/login');

  console.log('[Browser] Login browser opened. Log into X, then close the browser.');
  console.log('[Browser] Your session will be saved for future headless use.');

  return ctx;
}
