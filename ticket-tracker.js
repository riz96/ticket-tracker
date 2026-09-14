import * as cheerio from 'cheerio';

const EVENT_URL = "https://tickets.organizedplay.events/Event/Index/175";
const TARGET_TICKET_NAME = "One Piece Regionals Ticket";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

async function runCheck() {
  console.log(`[${new Date().toISOString()}] Controllo disponibilità su: ${EVENT_URL}`);

  try {
    const res = await fetch(EVENT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    let isSoldOut = true;
    let ticketFound = false;

    $('tr, div').each((_, el) => {
      const text = $(el).text();
      if (text.includes(TARGET_TICKET_NAME)) {
        ticketFound = true;
        if (!text.toLowerCase().includes("Sold out")) {
          isSoldOut = false;
        }
      }
    });

    if (!ticketFound) {
      console.warn(`⚠️ Biglietto "${TARGET_TICKET_NAME}" non rintracciato nella pagina.`);
      return;
    }

    if (isSoldOut) {
      console.log(`❌ "${TARGET_TICKET_NAME}" è ancora SOLD OUT.`);
    } else {
      console.log(`🚨 BIGLIETTO DISPONIBILE!`);
      await sendTelegramAlert(
        `🔥 <b>BIGLIETTO DISPONIBILE!</b>\n\nIl biglietto <i>${TARGET_TICKET_NAME}</i> è tornato disponibile!\n\nAcquista subito: <a href="${EVENT_URL}">Clicca qui</a>`
      );
    }
  } catch (err) {
    console.error('Errore durante l\'esecuzione:', err.message);
  }
}

// Esegui il controllo singolo ed esci
await runCheck();
