import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

// === CONFIG ===
const MODAL_URL = process.env.MODAL_URL;
const KEYWORD = 'Sold out';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MS = 30000;

// === FUNCTION TO SEND TELEGRAM MESSAGE ===
async function sendTelegramAlert(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram Error:', data);
  }
}

// === SLEEP FUNCTION ===
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// === LOOP FUNCTION ===
async function startMonitoring() {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();

  while (true) {
    try {
      await page.goto(MODAL_URL, { waitUntil: 'networkidle2' });
      await page.waitForSelector('body', { timeout: 10000 });

      const pageContent = await page.content();

      if (pageContent.includes(KEYWORD)) {
        console.log(`[✅ FOUND] "${KEYWORD}" is present.`);
      } else {
        console.log(`[❌ MISSING] "${KEYWORD}" is NOT present.`);
        await sendTelegramAlert(`⚠️ "${KEYWORD}" is NOT present on the Eventbrite modal page, go ahead!`);
      }
    } catch (err) {
      console.error('Error during check:', err);
      await sendTelegramAlert(`🚨 Script Error: ${err.message}`);
    }

    console.log(`⏱️ Waiting ${CHECK_INTERVAL_MS / 1000} seconds...`);
    await sleep(CHECK_INTERVAL_MS);
  }

  // This never gets called unless you break the loop manually
  // await browser.close();
}

startMonitoring();
