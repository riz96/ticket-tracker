import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const EVENT_URL = "https://tickets.organizedplay.events/Event/Index/175";
const TARGET_TICKET_NAME = "One Piece Regionals Ticket";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CHECK_INTERVAL_MS = 15000; // 15 secondi (senza browser puoi farlo più frequentemente)

async function sendTelegramAlert(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      }),
    });
  } catch (err) {
    console.error('Errore invio Telegram:', err.message);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkTickets() {
  console.log(`[${new Date().toLocaleTimeString()}] Monitoraggio avviato su: ${EVENT_URL}`);

  while (true) {
    try {
      const res = await fetch(EVENT_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) {
        console.warn(`[!] HTTP Status ${res.status}. Ritento al prossimo giro...`);
        await sleep(CHECK_INTERVAL_MS);
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      // Cerca la sezione contenente il biglietto del torneo
      const pageText = $('body').text();

      // Trova la riga o il blocco che contiene il nome del biglietto
      let isSoldOut = true;

      $('tr, div').each((_, el) => {
        const text = $(el).text();
        if (text.includes(TARGET_TICKET_NAME)) {
          // Controlla se in quello specifico elemento o riga compare "Sold out"
          if (!text.toLowerCase().includes("sold out")) {
            isSoldOut = false;
          }
        }
      });

      const now = new Date().toLocaleTimeString();

      if (isSoldOut) {
        console.log(`[${now}] ❌ "${TARGET_TICKET_NAME}" è ancora SOLD OUT.`);
      } else {
        console.log(`[${now}] 🚨 BIGLIETTO DISPONIBILE!`);
        await sendTelegramAlert(
          `🔥 <b>BIGLIETTO DISPONIBILE!</b>\n\nIl biglietto <i>${TARGET_TICKET_NAME}</i> non risulta più Sold Out!\n\nCorri ad acquistarlo: <a href="${EVENT_URL}">Clicca qui</a>`
        );
        break; // Ferma il loop per evitare spam continuo
      }

    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] Errore richiesta:`, err.message);
    }

    await sleep(CHECK_INTERVAL_MS);
  }
}

checkTickets();
