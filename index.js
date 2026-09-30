export default {
  async fetch(request, env) {
    // Only accept incoming text data payloads
    if (request.method !== "POST") return new Response("POST only", { status: 405 });

    try {
      const data = await request.json();
      
      // Evolution API passes incoming texts inside data.data.message.conversation
      const incomingText = data?.data?.message?.conversation || data?.data?.message?.extendedTextMessage?.text || "";
      const text = incomingText.toUpperCase().trim();
      
      // Extract the target stock ticker (e.g. "AAPL", "NVDA")
      const tickerMatch = text.match(/\b[A-Z]{1,5}\b/);
      if (!tickerMatch) {
        return new Response(JSON.stringify({ reply: "❌ Please send a valid stock ticker symbol (e.g., NVDA or TSLA)." }), { headers: { "Content-Type": "application/json" } });
      }
      
      const ticker = tickerMatch[0];
      const dataUrl = "https://alpaca.markets";
      const baseUrl = env.ALPACA_PAPER_TRADING === "true" ? "https://alpaca.markets" : "https://alpaca.markets";

      // 1. Fetch current stock quote from Alpaca
      const stockRes = await fetch(`${dataUrl}/v2/stocks/${ticker}/quotes/latest`, {
        headers: {
          'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
          'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
        }
      });
      const stockData = await stockRes.json();
      const currentPrice = stockData?.quote?.bp || "N/A";

      // 2. Fetch the nearest 3 active call options contracts
      const optionRes = await fetch(`${baseUrl}/v2/options/contracts?underlying_symbols=${ticker}&status=active&type=call&limit=3`, {
        headers: {
          'APCA-API-KEY-ID': env.ALPACA_KEY_ID,
          'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
        }
      });
      const optionData = await optionRes.json();
      const contracts = optionData?.option_contracts || [];

      // 3. Construct your WhatsApp string message layout
      let replyMessage = `📈 *${ticker} Options Check*\n💵 Stock Price: *$${currentPrice}*\n\n`;
      
      if (contracts.length === 0) {
        replyMessage += "⚠️ No active near-term call contracts returned from your Alpaca feed.";
      } else {
        replyMessage += `🔔 *Nearest Active Call Contracts:*\n`;
        contracts.forEach(c => {
          replyMessage += `• *Strike:* $${c.strike_price} | *Expiry:* ${c.expiration_date}\n  _Symbol: ${c.symbol}_\n`;
        });
      }

      // 4. Send the formatted text BACK to your Evolution API instance to text your phone
      // Replace with your actual Evolution domain URL and Instance Name
      await fetch(`https://your-evolution-api-domain.com{env.EVOLUTION_INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.EVOLUTION_GLOBAL_API_KEY
        },
        body: JSON.stringify({
          number: data.data.key.remoteJid.split('@')[0], // Automatically replies to whoever texted the bot
          options: { delay: 1200, presence: "composing" },
          text: replyMessage
        })
      });

      return new Response(JSON.stringify({ status: "success" }), { status: 200 });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};
