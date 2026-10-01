/**
 * WhatsApp Alpaca Trading Bot Engine
 * Cloudflare Worker Implementation (Zero Overhead / 100% Free Tier Compatible)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. WHATSAPP WEBHOOK VALIDATION (Required once by Meta when setting up the webhook)
    if (request.method === "GET" && url.pathname === "/webhook") {
      const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode && token === verifyToken) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // 2. INBOUND MESSAGE WEBHOOK PROCESSING
    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const payload = await request.json();
        
        // Extract the inward text object from the incoming Meta JSON pattern
        const messageObj = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!messageObj) {
          return new Response("OK", { status: 200 }); // Ignore status delivery receipts
        }

        const fromNumber = messageObj.from; 
        const userText = messageObj.text?.body || "";

        // 🔥 IMMEDIATE RESPONSE CRITICAL: 
        // We reply HTTP 200 OK instantly so Meta doesn't flag a timeout and send duplicate messages.
        // ctx.waitUntil safely executes our logic loop in the background.
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
  // 1. Fetch friend state sequence from Cloudflare KV Namespace
  let session = await env.USER_SESSIONS.get(phone, { type: "json" });
  if (!session) {
    session = { step: "IDLE", name: "", age: "" };
  }

  const cleanText = text.toUpperCase().trim();

  // 2. Dynamic Dialogue Step Engine
  switch (session.step) {
    
    case "IDLE":
      // Check for structural text lookup codes first (e.g., "check AAPL" or "price NVDA")
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const parts = cleanText.split(" ");
        const ticker = parts[1];
        await executeAlpacaLookup(phone, ticker, env);
      } 
      // Main interactive flow matching your original setup
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
      session.name = text; // Retain standard casing for formatting
      session.step = "AWAITING_AGE";
      await env.USER_SESSIONS.put(phone, JSON.stringify(session));
      await sendWhatsApp(phone, `Thanks ${text}! Now, what is your age?`, env);
      break;

    case "AWAITING_AGE":
      session.age = text;
      session.step = "IDLE"; // Terminate form and push user back to baseline routing
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
    // Acknowledge processing status immediately to keep the chat feeling responsive
    await sendWhatsApp(phone, `🔍 Pulling real-time records for *${ticker}* via Alpaca feeds...`, env);

    // 1. Access live baseline stock quote parameters
    const stockResponse = await fetch(`https://alpaca.markets{ticker}/quotes/latest`, {
      headers: {
        'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
        'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
      }
    });
    
    const stockData = await stockResponse.json();
    const currentPrice = stockData?.quote?.bp || "Unavailable"; // Extracts Bid Price

    // 2. Identify environment path parameters for tracking Options listings
    const apiBase = env.ALPACA_PAPER_TRADING === "true" 
      ? "https://alpaca.markets" 
      : "https://alpaca.markets";

    // 3. Request active Call Option structures matching underlying asset parameters
    const optionResponse = await fetch(`${apiBase}/v2/options/contracts?underlying_symbols=${ticker}&status=active&type=call&limit=3`, {
      headers: {
        'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
        'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
      }
    });
    
    const optionData = await optionResponse.json();
    const contracts = optionData?.option_contracts || [];

    // 4. Construct structural message output layout optimized for mobile screens
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
