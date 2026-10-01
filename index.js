export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Meta Webhook Verification setup
    if (request.method === "GET" && url.pathname === "/webhook") {
      const verifyToken = env.WHATSAPP_VERIFY_TOKEN;
      if (url.searchParams.get("hub.verify_token") === verifyToken) {
        return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }

    // Inbound Messages from Friends
    if (request.method === "POST" && url.pathname === "/webhook") {
      const payload = await request.json();
      const messageObj = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      
      if (!messageObj) return new Response("OK", { status: 200 });

      const fromNumber = messageObj.from;
      const userText = messageObj.text?.body?.trim() || "";

      // Instantly acknowledge Meta's server so it doesn't time out
      ctx.waitUntil(handleStateEngine(fromNumber, userText, env));
      return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }
};

// This replaces BuilderBot's flow manager using Cloudflare KV
async handleStateEngine(phone, text, env) {
  // 1. Check Cloudflare KV to see if this friend has a saved session state
  let session = await env.USER_SESSIONS.get(phone, { type: "json" });

  // If no session exists, create a default blank one
  if (!session) {
    session = { step: "IDLE", name: "", age: "" };
  }

  const cleanText = text.toUpperCase();

  // 2. Handle the "BuilderBot Flows" manually based on their current step
  switch (session.step) {
    
    case "IDLE":
      if (cleanText === "HI" || cleanText === "HELLO") {
        await sendWhatsApp(phone, "🙌 Welcome! Type *register* to sign up, or *check [TICKER]* for stocks.", env);
      } 
      else if (cleanText === "REGISTER") {
        session.step = "AWAITING_NAME";
        await env.USER_SESSIONS.put(phone, JSON.stringify(session));
        await sendWhatsApp(phone, "📝 What is your name?", env);
      } 
      else if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        // Run your exact Alpaca logic here...
        const ticker = cleanText.split(" ")[1];
        await sendWhatsApp(phone, `🔍 Fetching data for ${ticker} via Alpaca...`, env);
      }
      break;

    case "AWAITING_NAME":
      session.name = text; // Keep original casing for their name
      session.step = "AWAITING_AGE";
      await env.USER_SESSIONS.put(phone, JSON.stringify(session));
      await sendWhatsApp(phone, `Thanks ${text}! Now, what is your age?`, env);
      break;

    case "AWAITING_AGE":
      session.age = text;
      session.step = "IDLE"; // Reset back to main menu loop
      await env.USER_SESSIONS.put(phone, JSON.stringify(session));
      await sendWhatsApp(phone, `✅ Profile Complete!\n👤 Name: ${session.name}\n🎂 Age: ${session.age}`, env);
      break;
  }
}

// Global WhatsApp messaging utility
async sendWhatsApp(to, message, env) {
  await fetch(`https://facebook.com{env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
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
