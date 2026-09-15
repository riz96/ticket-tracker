import * as cheerio from 'cheerio';

// === CONFIGURAZIONE TARGET ===
// Puoi aggiungere quanti eventi e biglietti vuoi in questo array!
const TARGETS = [
  {
    name: "One Piece Regionals Ticket",
    url: "https://tickets.organizedplay.events/Event/Index/175"
  },
  {
    name: "One Piece Extra Grand Battle Ticket",
    url: "https://tickets.organizedplay.events/Event/Index/176"
  }
  // Se in futuro hai un altro evento con un altro ID, basta aggiungerlo qui:
  // {
  //   name: "Nome Altro Biglietto",
  //   url: "https://tickets.organizedplay.events/Event/Index/999"
  // }
];

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Token o Chat ID non impostati.");
    return;
  }
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

async function checkSingleTarget(target, cachedPages) {
  try {
    let html = cachedPages[target.url];

    // Se l'URL non è ancora stato scaricato in questa esecuzione, facciamo la fetch
    if (!html) {
      console.log(`[${new Date().toISOString()}] Scaricamento: ${target.url}`);
      const res = await fetch(target.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) {
        console.warn(`[!] Errore HTTP ${res.status} per ${target.url}`);
        return;
      }

      html = await res.text();
      cachedPages[target.url] = html; // Salviamo la pagina per non riscaricarla se un altro biglietto è sullo stesso link
    }

    const $ = cheerio.load(html);
    const fullText = $('body').text().replace(/\s+/g, ' ');

    const ticketPos = fullText.indexOf(target.name);

    if (ticketPos === -1) {
      console.warn(`⚠️ Biglietto "${target.name}" non rintracciato nella pagina.`);
      return;
    }

    // Estraiamo la porzione di testo subito successiva al titolo del biglietto
    const ticketSnippet = fullText.slice(ticketPos, ticketPos + 250);
    console.log(`[DEBUG] Rilevato per "${target.name}": "${ticketSnippet}"`);

    const isSoldOut = ticketSnippet.toLowerCase().includes("sold out");

    if (isSoldOut) {
      console.log(`❌ "${target.name}" è ancora SOLD OUT.`);
    } else {
      console.log(`🚨 BIGLIETTO DISPONIBILE: "${target.name}"!`);
      await sendTelegramAlert(
        `🔥 <b>BIGLIETTO DISPONIBILE!</b>\n\n` +
        `Ticket: <b>${target.name}</b>\n\n` +
        `Acquista subito qui: <a href="${target.url}">Clicca per acquistare</a>`
      );
    }
  } catch (err) {
    console.error(`Errore durante il controllo di "${target.name}":`, err.message);
  }
}

async function runCheck() {
  // Oggetto cache temporaneo: se più biglietti sono sullo stesso URL (es. evento 175),
  // la pagina viene scaricata 1 volta sola per evitare sprechi e richieste doppie al server.
  const cachedPages = {};

  for (const target of TARGETS) {
    await checkSingleTarget(target, cachedPages);
  }
}

await runCheck();
