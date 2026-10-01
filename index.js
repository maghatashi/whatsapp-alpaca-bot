/**
 * WhatsApp Alpaca Trading Bot Engine
 * Cloudflare Worker Implementation (Zero Overhead / 100% Free Tier Compatible)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. WHATSAPP WEBHOOK VALIDATION (Required once by Meta when setting up the webhook)
    if (request.method === "GET" && url.pathname.includes("/webhook")) {
      const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === verifyToken) {
        return new Response(challenge, { 
          status: 200,
          headers: { "Content-Type": "text/plain" } 
        });
      }
      return new Response("Forbidden: Token Mismatch", { status: 403 });
    }

    // 2. INBOUND MESSAGE WEBHOOK PROCESSING
    if (request.method === "POST" && url.pathname.includes("/webhook")) {
      try {
        const payload = await request.json();
        
        // Safely extract the first entry and change object from Meta's payload structure
        const changes = payload.entry?.[0]?.changes?.[0]?.value;
        const messageObj = changes?.messages?.[0];
        
        if (!messageObj) {
          return new Response("OK", { status: 200 }); // Ignore delivery receipts
        }

        const fromNumber = messageObj.from; 
        const userText = messageObj.text?.body || "";

        // 🔥 IMMEDIATE ACKNOWLEDGEMENT:
        // Reply HTTP 200 OK instantly to Meta so it doesn't cause a duplication loop.
        ctx.waitUntil(handleStateEngine(fromNumber, userText, env));
        return new Response("OK", { status: 200 });

      } catch (err) {
        console.error("Webhook payload parsing breakdown:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // Fallback for paths other than /webhook
    return new Response("Not Found", { status: 404 });
  }
};

/**
 * State Router & Core Logic Controller
 * Replaces BuilderBot flow managers using Cloudflare KV storage
 */
async function handleStateEngine(phone, text, env) {
  // Fetch user state history from Cloudflare KV Namespace
  let session = await env.USER_SESSIONS.get(phone, { type: "json" });
  if (!session) {
    session = { step: "IDLE", name: "", age: "" };
  }

  const cleanText = text.toUpperCase().trim();

  // Dynamic Dialog State Machine
  switch (session.step) {
    
    case "IDLE":
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const parts = cleanText.split(" ");
        const ticker = parts[1];
        await executeAlpacaLookup(phone, ticker, env);
      } 
      else if (cleanText === "HI" || cleanText === "HELLO" || cleanText === "HOLA") {
        await sendWhatsApp(phone, "🙌 Hello welcome to this *Chatbot*!\n\n👉 Text *register* to save your profile.\n👉 Text *check [TICKER]* (e.g., *check NVDA*) to check stock data.", env);
      } 
      else if (cleanText === "REGISTER") {
        session.step = "AWAITING_NAME";
        await env.USER_SESSIONS.put(phone, JSON.stringify(session));
        await sendWhatsApp(phone, "📝 What is your name?", env);
      } 
      else {
        await sendWhatsApp(phone, "🤖 Command unrecognized. Try saying *hello*, *register*, or *check NVDA*.", env);
      }
      break;

    case "AWAITING_NAME":
      session.name = text; // Retain case layout for presentation formatting
      session.step = "AWAITING_AGE";
      await env.USER_SESSIONS.put(phone, JSON.stringify(session));
      await sendWhatsApp(phone, `Thanks ${text}! Now, what is your age?`, env);
      break;

    case "AWAITING_AGE":
      session.age = text;
      session.step = "IDLE"; // Terminate dialog interaction flow
      await env.USER_SESSIONS.put(phone, JSON.stringify(session));
      await sendWhatsApp(phone, `✅ *Profile Information Compiled!*\n\n👤 Name: ${session.name}\n🎂 Age: ${session.age}\n\nYou can now query the market anytime using *check [TICKER]*.`, env);
      break;
  }
}

/**
 * Alpaca Live Market Data Interface Core Loop
 */
async function executeAlpacaLookup(phone, ticker, env) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, "❌ Asset code format invalid. Use: *check TSLA*", env);
    return;
  }

  try {
    await sendWhatsApp(phone, `🔍 Pulling real-time records for *${ticker}* via Alpaca feeds...`, env);

    // 1. Fetch live stock quotes from Alpaca Data API
    const stockResponse = await fetch(`https://alpaca.markets{ticker}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
        'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
      }
    });
    
    const stockData = await stockResponse.json();
    const currentPrice = stockData?.quote?.bp || "Unavailable"; // Extracts Bid Price

    // 2. Adjust core base routing based on paper vs live trade configurations
    const apiBase = env.ALPACA_PAPER_TRADING === "true" 
      ? "https://alpaca.markets" 
      : "https://alpaca.markets";

    // 3. Request active Call Option lists matching target underlying symbol metrics
    const optionResponse = await fetch(`${apiBase}/v2/options/contracts?underlying_symbols=${ticker}&status=active&type=call&limit=3`, {
      headers: {
        'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
        'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
      }
    });
    
    const optionData = await optionResponse.json();
    const contracts = optionData?.option_contracts || [];

    // 4. Construct visual layout format output optimized for mobile screens
    let replyMessage = `📈 *${ticker} Market Update*\n💵 Stock Bid Price: *$${currentPrice}*\n\n`;
    
    if (contracts.length === 0) {
      replyMessage += "⚠️ No near-term active call contracts returned from your Alpaca feed.";
    } else {
      replyMessage += `🔔 *Nearest Active Call Contracts:*\n`;
      contracts.forEach(c => {
        replyMessage += `• *Strike:* $${c.strike_price} | *Expiry:* ${c.expiration_date}\n  _Symbol: ${c.symbol}_\n`;
      });
    }

    await sendWhatsApp(phone, replyMessage, env);

  } catch (err) {
    console.error("Alpaca Fetch Error Execution Trace:", err);
    await sendWhatsApp(phone, "⚠️ System error executing transaction data query against Alpaca.", env);
  }
}

/**
 * Native Meta Graph API Messenger Pipeline
 */
async function sendWhatsApp(to, message, env) {
  const metaUrl = `https://facebook.com{env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  await fetch(metaUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: message }
    })
  });
}
