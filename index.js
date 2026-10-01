/**
 * WhatsApp KokuTrader Trading Bot Engine
 * Phase 2: Live Stock & Options Chain Retrieval Hub
 */

const GRAPH_API_VERSION = "v21.0";

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

        const entry = payload?.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;

        // STATUS RECEIPTS HANDLING
        if (value?.statuses) {
          return new Response("OK", { status: 200 });
        }

        const messageObj = value?.messages?.[0];
        if (!messageObj) {
          return new Response("OK", { status: 200 });
        }

        const fromNumber = messageObj.from;
        let userText = "";

        if (messageObj.type === "text") {
          userText = messageObj.text?.body || "";
        } else if (messageObj.type === "button") {
          userText = messageObj.button?.text || "";
        }

        if (!userText) {
          return new Response("OK", { status: 200 });
        }

        // Safe background worker wrapper mapping execution handling safely
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
    } else {
      console.error("USER_SESSIONS KV binding is missing.");
    }
  } catch (err) {
    console.error("KV read failed:", err);
  }
  if (!session) {
    session = { step: "IDLE", name: "", age: "" };
  }

  const cleanText = text.toUpperCase().trim();

  switch (session.step) {
    case "IDLE":
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const parts = cleanText.split(/\s+/);
        const ticker = parts[1];
        await executeMarketLookupChain(phone, ticker, env);
      }
      else if (cleanText === "HI" || cleanText === "HELLO" || cleanText === "HOLA") {
        await sendWhatsApp(phone, "🙌 Welcome to your *KokuTrader Trading Command Hub*!\n\n👉 Text *check [TICKER]* (e.g., _check NVDA_) to pull real-time underlying metrics and active option call strikes.", env);
      }
      else {
        await sendWhatsApp(phone, "🤖 Command unrecognized. Try texting *hello* or *check TSLA*.", env);
      }
      break;
  }
}

/**
 * Ingests live Stock Quotes and matches active Call Option Contracts
 */
async function executeMarketLookupChain(phone, ticker, env) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, "❌ Asset code format invalid. Try: _check AAPL_", env);
    return;
  }

  try {
    await sendWhatsApp(phone, `🔍 Fetching live data chain metrics for *${ticker}*...`, env);

    // 1. Fetch live stock quotes from the explicit free IEX feed
    const stockUrl = "https://data.alpaca.markets/v2/stocks/" + encodeURIComponent(ticker) + "/quotes/latest?feed=iex";
    const stockRes = await fetch(stockUrl, {
      method: "GET",
      headers: {
        "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
        "Accept": "application/json"
      }
    });

    if (!stockRes.ok) {
      console.error("Alpaca data feed error:", stockRes.status, await stockRes.text());
      await sendWhatsApp(phone, "⚠️ Underlying data matrix error. Confirm your credentials match up.", env);
      return;
    }

    const stockData = await stockRes.json();
    const bidPrice = stockData?.quote?.bp || 0;
    const askPrice = stockData?.quote?.ap || 0;

    if (!bidPrice || bidPrice === 0) {
      await sendWhatsApp(phone, `⚠️ Asset symbol *${ticker}* data returned empty parameters. Confirm that the token is valid.`, env);
      return;
    }

    // 2. Resolve target API baseline parameters (Paper sandbox vs Production environment paths)
    const apiBase = env.ALPACA_PAPER_TRADING === "true" 
      ? "https://paper-api.alpaca.markets" 
      : "https://api.alpaca.markets";

    // 3. Request active call options contract parameters
    const optionUrl = apiBase + "/v2/options/contracts?underlying_symbols=" + encodeURIComponent(ticker) + "&status=active&type=call&limit=3";
    const optionRes = await fetch(optionUrl, {
      method: "GET",
      headers: {
        "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
        "Accept": "application/json"
      }
    });

    let optionContracts = [];
    if (optionRes.ok) {
      const optionData = await optionRes.json();
      optionContracts = optionData?.option_contracts || [];
    } else {
      console.error("Alpaca Options network query failed:", optionRes.status, await optionRes.text());
    }

    // 4. Build message visual layout format
    let feedback = `📈 *${ticker} Market Summary*\n\n`;
    feedback += `💵 *Bid Price:* $${bidPrice}\n`;
    feedback += `💵 *Ask Price:* $${askPrice}\n\n`;
    feedback += `🔔 *Active Call Contracts:*\n`;

    if (optionContracts.length === 0) {
      feedback += "⚠️ No active near-term call chains returned from your account tiers.";
    } else {
      optionContracts.forEach((c) => {
        feedback += `• *Strike:* $${c.strike_price} | *Expiry:* ${c.expiration_date}\n  _OSID: ${c.symbol}_\n`;
      });
    }

    feedback += "\n🟢 _Phase 2 operational. Ready for Phase 3: Order Execution Engine routing commands._";
    await sendWhatsApp(phone, feedback, env);

  } catch (err) {
    console.error("Market interface exception:", err);
    await sendWhatsApp(phone, "⚠️ Connection error communicating with database loops.", env);
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
