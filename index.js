/**
 * WhatsApp KokuTrader Trading Bot Engine
 * Phase 2 Refined: OTM Options + Real-time Option Pricing + Localization + Market Hours
 */

const GRAPH_API_VERSION = "v21.0";
const MARKET_TZ = "America/New_York";

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
    contractBid: "Contract Bid",
    noBid: "No Bid",
    otmCalls: "🔔 *Next 3 Out-of-the-Money Call Contracts:*",
    noContracts: "⚠️ No active near-term call chains returned from your account tiers.",
    unrecognized: "🤖 Command unrecognized. Try texting *hello*, *check TSLA*, or *lang*.",
    marketClosedTitle: "🕒 *Market Closed*",
    marketClosedBody: "Quotes may be stale or show no bid until trading resumes.",
    marketHoursLine: "🗓 *Regular session:* Mon–Fri, 9:30 AM – 4:00 PM ET",
    extendedHoursLine: "🌅 *Extended hours:* Pre-market 4:00–9:30 AM · After-hours 4:00–8:00 PM ET",
    nextOpenLine: "⏭ *Next open:* {nextOpen}",
    marketOpenLine: "🟢 *Market Open* · closes 4:00 PM ET"
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
    contractBid: "Bid del Contrato",
    noBid: "Sin Bid",
    otmCalls: "🔔 *Próximos 3 Contratos Call Out-of-the-Money (OTM):*",
    noContracts: "⚠️ No se encontraron contratos call activos para este activo.",
    unrecognized: "🤖 Comando no reconocido. Intenta enviando *hello*, *check TSLA*, o *lang*.",
    marketClosedTitle: "🕒 *Mercado Cerrado*",
    marketClosedBody: "Las cotizaciones pueden estar desactualizadas o sin bid hasta que se reanude la negociación.",
    marketHoursLine: "🗓 *Sesión regular:* Lun–Vie, 9:30 AM – 4:00 PM ET",
    extendedHoursLine: "🌅 *Horario extendido:* Pre-mercado 4:00–9:30 AM · Post-mercado 4:00–8:00 PM ET",
    nextOpenLine: "⏭ *Próxima apertura:* {nextOpen}",
    marketOpenLine: "🟢 *Mercado Abierto* · cierra 4:00 PM ET"
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
    contractBid: "Bid do Contrato",
    noBid: "Sem Bid",
    otmCalls: "🔔 *Próximos 3 Contratos Call Out-of-the-Money (OTM):*",
    noContracts: "⚠️ Nenhum contrato call ativo encontrado para este ativo.",
    unrecognized: "🤖 Comando não reconhecido. Tente enviar *hello*, *check TSLA*, ou *lang*.",
    marketClosedTitle: "🕒 *Mercado Fechado*",
    marketClosedBody: "As cotações podem estar defasadas ou sem bid até a retomada das negociações.",
    marketHoursLine: "🗓 *Pregão regular:* Seg–Sex, 9:30 – 16:00 ET",
    extendedHoursLine: "🌅 *Horário estendido:* Pré-mercado 4:00–9:30 · After-market 16:00–20:00 ET",
    nextOpenLine: "⏭ *Próxima abertura:* {nextOpen}",
    marketOpenLine: "🟢 *Mercado Aberto* · fecha às 16:00 ET"
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
    session = { step: "IDLE", lang: "EN" };
  }

  const langCode = session.lang || "EN";
  const dictionary = LANGUAGES[langCode] || LANGUAGES.EN;

  const cleanText = text.toUpperCase().trim();

  if (cleanText === "LANG") {
    await sendWhatsApp(phone, dictionary.langMenu, env);
    return;
  }

  if (cleanText.startsWith("LANG ")) {
    const selectedLang = cleanText.split(/\s+/)[1];
    if (LANGUAGES[selectedLang]) {
      session.lang = selectedLang;
      try {
        if (env.USER_SESSIONS) {
          await env.USER_SESSIONS.put(phone, JSON.stringify(session));
        }
      } catch (err) {
        console.error("KV write failed:", err);
      }
      await sendWhatsApp(phone, LANGUAGES[selectedLang].langSaved, env);
    } else {
      await sendWhatsApp(phone, dictionary.langMenu, env);
    }
    return;
  }

  switch (session.step) {
    case "IDLE":
    default:
      if (cleanText.startsWith("CHECK ") || cleanText.startsWith("PRICE ")) {
        const parts = cleanText.split(/\s+/);
        const ticker = parts[1];
        await executeMarketLookupChain(phone, ticker, dictionary, env, langCode);
      } else if (cleanText === "HI" || cleanText === "HELLO" || cleanText === "HOLA") {
        await sendWhatsApp(phone, dictionary.welcome, env);
      } else {
        await sendWhatsApp(phone, dictionary.unrecognized, env);
      }
      break;
  }
}

/**
 * Market hours helpers (US equities, Eastern Time)
 */
function easternParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MARKET_TZ,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    weekday: get("weekday"),
    minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10)
  };
}

function isRegularSession(date) {
  const { weekday, minutes } = easternParts(date);
  if (weekday === "Sat" || weekday === "Sun") return false;
  return minutes >= 570 && minutes < 960; // 9:30 AM – 4:00 PM ET
}

function formatNextOpen(date, langCode) {
  const locale = langCode === "ES" ? "es-ES" : langCode === "PT" ? "pt-BR" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    timeZone: MARKET_TZ,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

async function getMarketStatus(apiBase, authHeaders) {
  // Preferred: Alpaca clock (accounts for holidays and early closes)
  try {
    const res = await fetch(apiBase + "/v2/clock", { method: "GET", headers: authHeaders });
    if (res.ok) {
      const clock = await res.json();
      return { isOpen: !!clock.is_open, nextOpen: clock.next_open ? new Date(clock.next_open) : null };
    }
  } catch (err) {
    console.error("Clock fetch failed, using fallback:", err);
  }

  // Fallback: weekday + hours check (no holiday awareness)
  const now = new Date();
  if (isRegularSession(now)) return { isOpen: true, nextOpen: null };

  const probe = new Date(now.getTime());
  for (let i = 0; i < 7 * 24 * 60; i++) {
    probe.setTime(probe.getTime() + 60 * 1000);
    if (isRegularSession(probe)) return { isOpen: false, nextOpen: new Date(probe.getTime()) };
  }
  return { isOpen: false, nextOpen: null };
}

function buildMarketFooter(dict, status, langCode) {
  if (status.isOpen) {
    return "\n" + dict.marketOpenLine;
  }
  let footer = "\n━━━━━━━━━━━━━━\n" + dict.marketClosedTitle + "\n" + dict.marketClosedBody + "\n\n";
  footer += dict.marketHoursLine + "\n" + dict.extendedHoursLine;
  if (status.nextOpen) {
    footer += "\n" + dict.nextOpenLine.replace("{nextOpen}", formatNextOpen(status.nextOpen, langCode));
  }
  return footer;
}

/**
 * Live Stock Quote Data and OTM Call Option Pricing Logic
 */
async function executeMarketLookupChain(phone, ticker, dict, env, langCode) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, dict.invalidTicker, env);
    return;
  }

  const authHeaders = {
    "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
    "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
    "Accept": "application/json"
  };

  const apiBase = env.ALPACA_PAPER_TRADING === "true"
    ? "https://paper-api.alpaca.markets"
    : "https://api.alpaca.markets";

  try {
    await sendWhatsApp(phone, dict.fetching.replace("{ticker}", ticker), env);

    // Market status runs in parallel with the stock quote
    const statusPromise = getMarketStatus(apiBase, authHeaders);

    // 1. Live stock quote (free IEX feed)
    const stockUrl = "https://data.alpaca.markets/v2/stocks/" + encodeURIComponent(ticker) + "/quotes/latest?feed=iex";
    const stockRes = await fetch(stockUrl, { method: "GET", headers: authHeaders });

    if (!stockRes.ok) {
      await sendWhatsApp(phone, dict.feedError, env);
      return;
    }

    const stockData = await stockRes.json();
    const status = await statusPromise;
    const footer = buildMarketFooter(dict, status, langCode);
    const currentStockPrice = stockData?.quote?.bp || stockData?.quote?.ap || 0;

    if (!currentStockPrice) {
      await sendWhatsApp(phone, dict.emptyParams.replace("{ticker}", ticker) + "\n" + footer, env);
      return;
    }

    // 2. Active call contracts: future expiries, strikes above spot
    const today = new Date().toISOString().slice(0, 10);
    const optionContractsUrl = apiBase + "/v2/options/contracts"
      + "?underlying_symbols=" + encodeURIComponent(ticker)
      + "&status=active&type=call"
      + "&expiration_date_gte=" + today
      + "&strike_price_gte=" + currentStockPrice
      + "&limit=100";
    const optionContractsRes = await fetch(optionContractsUrl, { method: "GET", headers: authHeaders });

    let otmCalls = [];
    if (optionContractsRes.ok) {
      const optionContractsData = await optionContractsRes.json();
      const rawContracts = optionContractsData?.option_contracts || [];

      otmCalls = rawContracts
        .filter((c) => parseFloat(c.strike_price) > currentStockPrice)
        .sort((a, b) =>
          a.expiration_date.localeCompare(b.expiration_date) ||
          parseFloat(a.strike_price) - parseFloat(b.strike_price)
        ) // nearest expiry first, then closest strike
        .slice(0, 3);
    }

    // 3. Live option quotes for those contracts
    let pricingDataMap = {};
    if (otmCalls.length > 0) {
      const symbolsList = otmCalls.map((c) => c.symbol).join(",");
      const optionQuotesUrl = "https://data.alpaca.markets/v1beta1/options/quotes/latest?feed=indicative&symbols="
        + encodeURIComponent(symbolsList);
      const optionQuotesRes = await fetch(optionQuotesUrl, { method: "GET", headers: authHeaders });

      if (optionQuotesRes.ok) {
        const quotesPayload = await optionQuotesRes.json();
        pricingDataMap = quotesPayload?.quotes || {};
      } else {
        console.error("Option quotes failed:", optionQuotesRes.status, await optionQuotesRes.text());
      }
    }

    // 4. Build message
    let messageBody = dict.summaryTitle.replace("{ticker}", ticker) + "\n\n";
    messageBody += "💵 *" + dict.bid + ":* $" + currentStockPrice + "\n";
    messageBody += "💵 *" + dict.ask + ":* $" + (stockData?.quote?.ap || 0) + "\n\n";
    messageBody += dict.otmCalls + "\n";

    if (otmCalls.length === 0) {
      messageBody += dict.noContracts + "\n";
    } else {
      otmCalls.forEach((c) => {
        const q = pricingDataMap[c.symbol];
        const contractBid = q?.bp ? ("$" + q.bp) : "$0.00 (" + dict.noBid + ")";

        messageBody += "\n• *Strike:* $" + c.strike_price + " | *Expiry:* " + c.expiration_date + "\n";
        messageBody += "  _" + dict.contractBid + ":_ *" + contractBid + "*\n";
        messageBody += "  _OSID:_ `" + c.symbol + "`\n";
      });
    }

    messageBody += footer;

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
  const metaUrl = "https://graph.facebook.com/" + GRAPH_API_VERSION + "/" + env.WHATSAPP_PHONE_NUMBER_ID + "/messages";

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
