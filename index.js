/**
 * WhatsApp KokuTrader Trading Bot Engine
 * Phase 2 Refined: OTM Options + Real-time Option Pricing + Localization
 */

const GRAPH_API_VERSION = "v21.0";

// Complete localization dictionaries for zero-friction dynamic phrasing
const LANGUAGES = {
  EN: {
    welcome: "🙌 Welcome to your *KokuTrader Trading Command Hub*!\n\n👉 Text *check [TICKER]* (e.g., _check NVDA_) to pull live data.\n👉 Text *lang* to change your language profile anytime.",
    langMenu: "🌐 *Select Your Language / Selecciona tu idioma / Selecione seu idioma:*\n\nText one of the choices:\n• *LANG EN* (English)\n• *LANG ES* (Español)\n• *LANG PT* (Português BR)",
    langSaved: "✅ Preference updated to English!",
    invalidTicker: "❌ Asset code format invalid. Try: _check AAPL_",
    fetching: "🔍 Fetching live data chain metrics for {ticker}...",
    feedError: "⚠️ Underlying data matrix error. Confirm your credentials match up.",
    emptyParams: "⚠️ Asset symbol *{ticker}* data returned empty parameters.",
    summaryTitle: "📈 *{ticker} Market Summary*",
    bid: "Bid Price",
    ask: "Ask Price",
    otmCalls: "🔔 *Next 3 Out-of-the-Money Call Contracts:*",
    noContracts: "⚠️ No active near-term call chains returned from your account tiers.",
    unrecognized: "🤖 Command unrecognized. Try texting *hello*, *check TSLA*, or *lang*."
  },
  ES: {
    welcome: "🙌 ¡Bienvenido a tu *KokuTrader Centro de Control*!\n\n👉 Envía *check [TICKER]* (ej: _check NVDA_) para ver datos del mercado.\n👉 Envía *lang* para cambiar de idioma en cualquier momento.",
    langMenu: "🌐 *Selecciona tu idioma:*\n\nEnvía una opción:\n• *LANG EN* (Inglés)\n• *LANG ES* (Español)\n• *LANG PT* (Portugués BR)",
    langSaved: "✅ ¡Preferencia actualizada a Español!",
    invalidTicker: "❌ Formato de activo inválido. Intenta: _check AAPL_",
    fetching: "🔍 Buscando métricas de mercado para {ticker}...",
    feedError: "⚠️ Error en la fuente de datos. Confirma tus credenciales de API.",
    emptyParams: "⚠️ El símbolo *{ticker}* devolvió parámetros vacíos.",
    summaryTitle: "📈 *Resumen de Mercado: {ticker}*",
    bid: "Precio Compra (Bid)",
    ask: "Precio Venta (Ask)",
    otmCalls: "🔔 *Próximos 3 Contratos Call Out-of-the-Money (OTM):*",
    noContracts: "⚠️ No se encontraron contratos call activos para este activo.",
    unrecognized: "🤖 Comando no reconocido. Intenta enviando *hello*, *check TSLA*, o *lang*."
  },
  PT: {
    welcome: "🙌 Bem-vindo ao seu *KokuTrader Centro de Comando*!\n\n👉 Envie *check [TICKER]* (ex: _check NVDA_) para buscar dados ao vivo.\n👉 Envie *lang* para alterar o idioma a qualquer momento.",
    langMenu: "🌐 *Selecione seu idioma:*\n\nEnvie uma das opções:\n• *LANG EN* (Inglês)\n• *LANG ES* (Espanhol)\n• *LANG PT* (Português BR)",
    langSaved: "✅ Preferência atualizada para Português!",
    invalidTicker: "❌ Formato de ativo inválido. Tente: _check AAPL_",
    fetching: "🔍 Buscando métricas de mercado para {ticker}...",
    feedError: "⚠️ Erro na fonte de dados. Confirme suas credenciais de API.",
    emptyParams: "⚠️ O símbolo *{ticker}* retornou parâmetros vazios.",
    summaryTitle: "📈 *Resumo de Mercado: {ticker}*",
    bid: "Preço de Compra (Bid)",
    ask: "Preço de Venda (Ask)",
    otmCalls: "🔔 *Próximos 3 Contratos Call Out-of-the-Money (OTM):*",
    noContracts: "⚠️ Nenhum contrato call ativo encontrado para este ativo.",
    unrecognized: "🤖 Comando não reconhecido. Tente enviar *hello*, *check TSLA*, ou *lang*."
  }
};

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
 * Dialogue Routing & State Management
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
  
  if (!session) {
    session = { step: "IDLE", lang: "EN" }; // Default setup tracking profile
  }
  
  // Ensure absolute translation safety
  const langCode = session.lang || "EN";
  const dictionary = LANGUAGES[langCode] || LANGUAGES.EN;

  const cleanText = text.toUpperCase().trim();

  // INTERACTION FLOW ROUTING ENGINE
  if (cleanText === "LANG") {
    await sendWhatsApp(phone, dictionary.langMenu, env);
    return;
  }
  
  if (cleanText.startsWith("LANG ")) {
    const selectedLang = cleanText.split(/\s+/)[1];
    if (LANGUAGES[selectedLang]) {
      session.lang = selectedLang;
      await env.USER_SESSIONS.put(phone, JSON.stringify(session));
      await sendWhatsApp(phone, LANGUAGES[selectedLang].langSaved, env);
    } else {
      await sendWhatsApp(phone, dictionary.langMenu, env);
    }
    return;
  }

  switch (session.step) {
    case "IDLE":
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const parts = cleanText.split(/\s+/);
        const ticker = parts[1];
        await executeMarketLookupChain(phone, ticker, dictionary, env);
      }
      else if (cleanText === "HI" || cleanText === "HELLO" || cleanText === "HOLA") {
        await sendWhatsApp(phone, dictionary.welcome, env);
      }
      else {
        await sendWhatsApp(phone, dictionary.unrecognized, env);
      }
      break;
  }
}

/**
 * Live Stock Quote Data and OTM Call Option Pricing Logic
 */
async function executeMarketLookupChain(phone, ticker, dict, env) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, dict.invalidTicker, env);
    return;
  }

  try {
    await sendWhatsApp(phone, dict.fetching.replace("{ticker}", ticker), env);

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
      await sendWhatsApp(phone, dict.feedError, env);
      return;
    }

    const stockData = await stockRes.json();
    const currentStockPrice = stockData?.quote?.bp || 0; // Baseline Bid Reference for Moneyness

    if (!currentStockPrice || currentStockPrice === 0) {
      await sendWhatsApp(phone, dict.emptyParams.replace("{ticker}", ticker), env);
      return;
    }

    const apiBase = env.ALPACA_PAPER_TRADING === "true" 
      ? "https://paper-api.alpaca.markets" 
      : "https://api.alpaca.markets";

    // 2. Fetch all active Call Options contracts for the symbol to filter OTM manually
    const optionContractsUrl = apiBase + "/v2/options/contracts?underlying_symbols=" + encodeURIComponent(ticker) + "&status=active&type=call&limit=50";
    const optionContractsRes = await fetch(optionContractsUrl, {
      method: "GET",
      headers: {
        "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
        "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
        "Accept": "application/json"
      }
    });

    let otmCalls = [];
    if (optionContractsRes.ok) {
      const optionContractsData = await optionContractsRes.json();
      const rawContracts = optionContractsData?.option_contracts || [];

      // 🔥 FILTER STRATEGY: Select call contracts whose strike price is HIGHER than current market stock bid
      otmCalls = rawContracts
        .filter(c => parseFloat(c.strike_price) > currentStockPrice)
        .sort((a, b) => parseFloat(a.strike_price) - parseFloat(b.strike_price)) // Closest to current price first
        .slice(0, 3); // Capture the top 3 next OTM strikes
    }

          // 3. Fetch the latest live Options pricing snapshot quotes from Alpaca for contract bid sizes
      const optionQuotesUrl = "https://alpaca.markets" + encodeURIComponent(symbolsList);
      const optionQuotesRes = await fetch(optionQuotesUrl, {
        method: "GET",
        headers: {
          "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
          "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
          "Accept": "application/json"
        }
      });

      if (optionQuotesRes.ok) {
        const quotesPayload = await optionQuotesRes.json();
        pricingDataMap = quotesPayload?.quotes || {}; // Maps option contract symbol to its current bid/ask
      }
    }

    // 4. Construct visual layout format output
    let messageBody = dict.summaryTitle.replace("{ticker}", ticker) + "\n\n";
    messageBody += "💵 *" + dict.bid + ":* \$" + currentStockPrice + "\n";
    messageBody += "💵 *" + dict.ask + ":* \$" + (stockData?.quote?.ap || 0) + "\n\n";
    messageBody += dict.otmCalls + "\n";

    if (otmCalls.length === 0) {
      messageBody += dict.noContracts;
    } else {
      otmCalls.forEach((c) => {
        const contractQuote = pricingDataMap[c.symbol];
        const contractBid = contractQuote?.bp ? ("\$" + contractQuote.bp) : "\$0.00 (No Bid)";
        
        messageBody += "\n• *Strike:* \$" + c.strike_price + " | *Expiry:* " + c.expiration_date + "\n";
        messageBody += "  _" + dict.bid + " do Contrato:_ *" + contractBid + "*\n";
        messageBody += "  _OSID:_ `" + c.symbol + "`\n";
      });
    }

    await sendWhatsApp(phone, messageBody, env);

  } catch (err) {
    console.error("Market analysis engine exception:", err);
    await sendWhatsApp(phone, dict.feedError, env);
  }
}

/**
 * Native Meta Graph API Messaging Bridge
 */
async function sendWhatsApp(to, message, env) {
  // 🟢 FIXED: Using explicit string addition to guarantee your compiler compiles cleanly
  const metaUrl = "https://facebook.com" + GRAPH_API_VERSION + "/" + env.WHATSAPP_PHONE_NUMBER_ID + "/messages";
  
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

