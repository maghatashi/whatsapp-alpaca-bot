/**
 * WhatsApp KokuTrader Trading Bot Engine
 * Phase 2: Stock quote + call option prices (bid / ask / last)
 */

const GRAPH_API_VERSION = "v21.0";
const MAX_DAYS_OUT = 30;     // look for expirations within this many days
const STRIKE_BAND = 0.08;    // strikes within +/-8% of the stock price
const STRIKES_TO_SHOW = 5;   // strikes closest to the stock price

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. WHATSAPP WEBHOOK VALIDATION
    if (request.method === "GET" && url.pathname.includes("/webhook")) {
      const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
      const token = url.searchParams.get("hub.verify_token") || url.searchParams.get("verify_token");
      const challenge = url.searchParams.get("hub.challenge") || url.searchParams.get("challenge");

      if (token === verifyToken) {
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return new Response("Forbidden: Token Mismatch", { status: 403 });
    }

    // 2. INBOUND MESSAGE WEBHOOK PROCESSING
    if (request.method === "POST" && url.pathname.includes("/webhook")) {
      try {
        const payload = await request.json();
        const value = payload?.entry?.[0]?.changes?.[0]?.value;

        if (value?.statuses) return new Response("OK", { status: 200 });

        const messageObj = value?.messages?.[0];
        if (!messageObj) return new Response("OK", { status: 200 });

        const fromNumber = messageObj.from;
        let userText = "";
        if (messageObj.type === "text") {
          userText = messageObj.text?.body || "";
        } else if (messageObj.type === "button") {
          userText = messageObj.button?.text || "";
        }
        if (!userText) return new Response("OK", { status: 200 });

        ctx.waitUntil(
          handleStateEngine(fromNumber, userText, env).catch((err) => {
            console.error("handleStateEngine failed:", err?.stack || err);
          })
        );
        return new Response("OK", { status: 200 });

      } catch (err) {
        console.error("Webhook payload processing fault:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

/**
 * Dialogue Routing & Menu System
 */
async function handleStateEngine(phone, text, env) {
  let session = null;
  try {
    if (env.USER_SESSIONS) {
      session = await env.USER_SESSIONS.get(phone, { type: "json" });
    }
  } catch (err) {
    console.error("KV read failed:", err);
  }
  if (!session) session = { step: "IDLE", name: "", age: "" };

  const cleanText = text.toUpperCase().trim();

  switch (session.step) {
    case "IDLE":
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const ticker = cleanText.split(/\s+/)[1];
        await executeMarketLookup(phone, ticker, env);
      }
      else if (cleanText === "HI" || cleanText === "HELLO" || cleanText === "HOLA") {
        await sendWhatsApp(phone, "🙌 Welcome to your *KokuTrader Trading Command Hub*!\n\n👉 Text *check [TICKER]* (e.g., _check NVDA_) for the stock quote and nearby call option prices.", env);
      }
      else {
        await sendWhatsApp(phone, "🤖 Command unrecognized. Try texting *hello* or *check TSLA*.", env);
      }
      break;
  }
}

/**
 * Alpaca helper
 */
function alpacaHeaders(env) {
  return {
    "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
    "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
    "Accept": "application/json"
  };
}

function fmt(n) {
  return typeof n === "number" && n > 0 ? n.toFixed(2) : "-";
}

// OCC symbol, e.g. AAPL261016C00250000 -> { expiry: "2026-10-16", strike: 250 }
function parseOcc(symbol) {
  const m = /^(.+?)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(symbol);
  if (!m) return null;
  return {
    expiry: `20${m[2]}-${m[3]}-${m[4]}`,
    type: m[5],
    strike: parseInt(m[6], 10) / 1000
  };
}

/**
 * Stock quote + call option prices
 */
async function executeMarketLookup(phone, ticker, env) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, "❌ Asset code format invalid. Try: _check AAPL_", env);
    return;
  }

  try {
    // 1. Underlying stock quote (free IEX feed)
    const stockRes = await fetch(
      "https://data.alpaca.markets/v2/stocks/" + encodeURIComponent(ticker) + "/quotes/latest?feed=iex",
      { headers: alpacaHeaders(env) }
    );

    if (!stockRes.ok) {
      console.error("Alpaca stock error:", stockRes.status, await stockRes.text());
      await sendWhatsApp(phone, "⚠️ Market feed data error. Verify your API credentials.", env);
      return;
    }

    const stockData = await stockRes.json();
    const bid = stockData?.quote?.bp || 0;
    const ask = stockData?.quote?.ap || 0;
    const spot = bid && ask ? (bid + ask) / 2 : (ask || bid);

    if (!spot) {
      await sendWhatsApp(phone, `⚠️ Asset symbol *${ticker}* returned empty data. Confirm the ticker exists.`, env);
      return;
    }

    let msg = `📈 *${ticker}* ${fmt(bid)} / ${fmt(ask)}\n\n`;

    // 2. Call option snapshots (include bid, ask, last trade, IV)
    const today = new Date();
    const end = new Date(today.getTime() + MAX_DAYS_OUT * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      type: "call",
      feed: env.ALPACA_OPTIONS_FEED || "indicative", // "opra" needs the paid options data plan
      expiration_date_gte: iso(today),
      expiration_date_lte: iso(end),
      strike_price_gte: (spot * (1 - STRIKE_BAND)).toFixed(2),
      strike_price_lte: (spot * (1 + STRIKE_BAND)).toFixed(2),
      limit: "1000"
    });

    const optRes = await fetch(
      "https://data.alpaca.markets/v1beta1/options/snapshots/" + encodeURIComponent(ticker) + "?" + params,
      { headers: alpacaHeaders(env) }
    );

    if (!optRes.ok) {
      console.error("Alpaca options error:", optRes.status, await optRes.text());
      msg += "⚠️ Option prices unavailable right now.";
      await sendWhatsApp(phone, msg, env);
      return;
    }

    const optData = await optRes.json();
    const rows = Object.entries(optData?.snapshots || {})
      .map(([symbol, snap]) => {
        const occ = parseOcc(symbol);
        if (!occ) return null;
        return {
          ...occ,
          bid: snap?.latestQuote?.bp,
          ask: snap?.latestQuote?.ap,
          last: snap?.latestTrade?.p,
          iv: snap?.impliedVolatility
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      msg += "⚠️ No call options found near the current price in the next " + MAX_DAYS_OUT + " days.";
      await sendWhatsApp(phone, msg, env);
      return;
    }

    // Nearest expiration, then the strikes closest to the stock price
    const nearestExpiry = rows.map((r) => r.expiry).sort()[0];
    const picks = rows
      .filter((r) => r.expiry === nearestExpiry)
      .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
      .slice(0, STRIKES_TO_SHOW)
      .sort((a, b) => a.strike - b.strike);

    msg += `🔔 *Calls expiring ${nearestExpiry}*\n`;
    for (const p of picks) {
      const iv = typeof p.iv === "number" ? ` | IV ${(p.iv * 100).toFixed(0)}%` : "";
      msg += `\n• *$${p.strike}* Bid ${fmt(p.bid)} | Ask ${fmt(p.ask)} | Last ${fmt(p.last)}${iv}`;
    }

    msg += "\n\n_Indicative prices may differ from live exchange quotes._";
    await sendWhatsApp(phone, msg, env);

  } catch (err) {
    console.error("Market lookup exception:", err);
    await sendWhatsApp(phone, "⚠️ Connection error while fetching market data.", env);
  }
}

/**
 * Native Meta Graph API Messaging Bridge
 */
async function sendWhatsApp(to, message, env) {
  const metaUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(metaUrl, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.META_ACCESS_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: message }
    })
  });

  if (!res.ok) {
    console.error("WhatsApp send failed:", res.status, await res.text());
  }
}
