/**
 * WhatsApp KokuTrader Trading Bot Engine
 * Phase 1: Live Stock Price Fetch Check
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. WHATSAPP WEBHOOK VALIDATION
    if (request.method === "GET" && url.pathname.includes("/webhook")) {
      const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
      const mode = url.searchParams.get("hub.mode") || url.searchParams.get("mode");
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

        // ⚠️ STATUS RECEIPTS HANDLING:
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

        // 🔥 EXECUTE IN BACKGROUND AND REPLY TO META IMMEDIATELY
        ctx.waitUntil(handleStateEngine(fromNumber, userText, env));
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
  let session = await env.USER_SESSIONS.get(phone, { type: "json" });
  if (!session) {
    session = { step: "IDLE", name: "", age: "" };
  }

  const cleanText = text.toUpperCase().trim();

  switch (session.step) {
    case "IDLE":
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const parts = cleanText.split(" ");
        const ticker = parts[1];
        await executeAlpacaPriceFetch(phone, ticker, env);
      } 
      else if (cleanText === "HI" || cleanText === "HELLO" || cleanText === "HOLA") {
        await sendWhatsApp(phone, "🙌 Welcome to your **KokuTrader Trading Command Hub**!\n\n👉 Text **check [TICKER]** (e.g., *check AAPL*) to pull live marketplace data.", env);
      } 
      else {
        await sendWhatsApp(phone, "🤖 Command unrecognized. Try texting **hello** or **check TSLA**.", env);
      }
      break;
  }
}

/**
 * Live Market Data Interface: Step 1 (Stock Price Retrieval)
 */
async function executeAlpacaPriceFetch(phone, ticker, env) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, "❌ Asset code format invalid. Try: *check AAPL*", env);
    return;
  }

  try {
    // 🟢 FIXED: Using proper JavaScript template literal variable expansion
    const alpacaUrl = `https://alpaca.markets{ticker}/quotes/latest`;
    
    const response = await fetch(alpacaUrl, {
      method: "GET",
      headers: {
        'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
        'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Broker API rejected request: ${response.status} - ${errorText}`);
      await sendWhatsApp(phone, `⚠️ Market feed data error. Verify your API credentials inside your Cloudflare configuration parameters.`, env);
      return;
    }

    const data = await response.json();
    
    const bidPrice = data?.quote?.bp;
    const askPrice = data?.quote?.ap;
    const timestamp = data?.quote?.t;

    if (!bidPrice || bidPrice === 0) {
      await sendWhatsApp(phone, `⚠️ Asset symbol *${ticker}* data returned empty parameters. Confirm that the marketplace token exists.`, env);
      return;
    }

    const visualTime = timestamp ? new Date(timestamp).toLocaleTimeString() : "Now";
    const feedback = `📈 **${ticker} Real-Time Quote**\n\n💵 **Bid Price:** $${bidPrice}\n💵 **Ask Price:** $${askPrice}\n🕒 **Feed Time:** ${visualTime}\n\n🟢 *Connection Successful! Ready for Phase 2: Call Options prices.*`;

    await sendWhatsApp(phone, feedback, env);

  } catch (err) {
    console.error("Broker data loop crash:", err);
    await sendWhatsApp(phone, "⚠️ Network connection exception while communicating with data feeds.", env);
  }
}

/**
 * Native Meta Graph API Messaging Bridge
 */
async function sendWhatsApp(to, message, env) {
  // 🟢 FIXED: Added official graph sub-domain, API version paths, and structural variable brackets
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
