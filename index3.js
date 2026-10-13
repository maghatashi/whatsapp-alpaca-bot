/**
 * WhatsApp KokuTrader Trading Bot Engine
 * Alpaca MVP. Storage split:
 *   D1 (DB):          users, encrypted broker keys (broker_links)
 *   KV (USER_SESSIONS): dialogue state, one-time link tokens, one-time codes, rate limits (all expire)
 *
 * Secrets: WHATSAPP_VERIFY_TOKEN, META_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 *          ALPACA_KEY_ID, ALPACA_SECRET_KEY (read-only market-data key), CREDENTIAL_KEY (base64, 32 bytes)
 * Vars:    PUBLIC_BASE_URL (no trailing slash)
 * Bindings: DB (D1), USER_SESSIONS (KV)
 */

const GRAPH_API_VERSION = "v21.0";
const MARKET_TZ = "America/New_York";
const TRADING_MODE_DEFAULT = "paper";

const LANGUAGES = {
  EN: {
    welcome: "🙌 Welcome to your *KokuTrader Trading Command Hub*!\n\n👉 Text *check [TICKER]* (e.g., _check NVDA_) to pull live data.\n👉 Text *lang* to change your language profile anytime.",
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
    marketClosedTitle: "🕒 *Market Closed*",
    marketClosedBody: "Quotes may be stale or show no bid until trading resumes.",
    marketHoursLine: "🗓 *Regular session:* Mon–Fri, 9:30 AM – 4:00 PM ET",
    extendedHoursLine: "🌅 *Extended hours:* Pre-market 4:00–9:30 AM · After-hours 4:00–8:00 PM ET",
    nextOpenLine: "⏭ *Next open:* {nextOpen}",
    marketOpenLine: "🟢 *Market Open* · closes 4:00 PM ET"
  },
  ES: {
    welcome: "🙌 ¡Bienvenido a tu *KokuTrader Centro de Control*!\n\n👉 Envía *check [TICKER]* (ej: _check NVDA_) para ver datos del mercado.\n👉 Envía *lang* para cambiar de idioma en cualquier momento.",
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
    marketClosedTitle: "🕒 *Mercado Cerrado*",
    marketClosedBody: "Las cotizaciones pueden estar desactualizadas o sin bid hasta que se reanude la negociación.",
    marketHoursLine: "🗓 *Sesión regular:* Lun–Vie, 9:30 AM – 4:00 PM ET",
    extendedHoursLine: "🌅 *Horario extendido:* Pre-mercado 4:00–9:30 AM · Post-mercado 4:00–8:00 PM ET",
    nextOpenLine: "⏭ *Próxima apertura:* {nextOpen}",
    marketOpenLine: "🟢 *Mercado Abierto* · cierra 4:00 PM ET"
  },
  PT: {
    welcome: "🙌 Bem-vindo ao seu *KokuTrader Centro de Comando*!\n\n👉 Envie *check [TICKER]* (ex: _check NVDA_) para buscar dados ao vivo.\n👉 Envie *lang* para alterar o idioma a qualquer momento.",
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
    marketClosedTitle: "🕒 *Mercado Fechado*",
    marketClosedBody: "As cotações podem estar defasadas ou sem bid até a retomada das negociações.",
    marketHoursLine: "🗓 *Pregão regular:* Seg–Sex, 9:30 – 16:00 ET",
    extendedHoursLine: "🌅 *Horário estendido:* Pré-mercado 4:00–9:30 · After-market 16:00–20:00 ET",
    nextOpenLine: "⏭ *Próxima abertura:* {nextOpen}",
    marketOpenLine: "🟢 *Mercado Aberto* · fecha às 16:00 ET"
  }
};

const LANG_PROMPT = "🌐 Select your language / Selecciona tu idioma / Selecione seu idioma";

const FLOW = {
  EN: {
    menuPrompt: "What would you like to do?",
    btnBalance: "Account balance",
    btnPrices: "Market prices",
    btnTrade: "Trade",
    askTicker: "🔎 Send the ticker symbol (e.g., _NVDA_), or *MENU* to go back.",
    tradeMenuPrompt: "What would you like to do?",
    btnAsset: "Buy / Sell asset",
    btnCoveredCall: "Create Covered Call",
    btnBack: "Back",
    tradeStub: "🚧 Trading is the next step. Your selection is saved.",
    balanceTitle: "💼 *Account balance*",
    cash: "Available cash",
    margin: "Margin available",
    total: "Total account value",
    assets: "*Assets*",
    noAssets: "No open positions.",
    linkPrompt: "🔗 Connect your Alpaca *paper* account:\n{url}\n\nThis link expires in 10 minutes and works once. We'll send a code to this WhatsApp to confirm it's you.",
    notLinked: "🔒 No broker linked yet.",
    linkedOk: "✅ Connected to Alpaca (paper). Text *menu* to continue.",
    disconnected: "🔌 Broker keys deleted. Revoke them in your Alpaca dashboard too.",
    authRejected: "⚠️ Your Alpaca keys were rejected. Text *link* to reconnect.",
    otpMessage: "🔐 Your KokuTrader linking code is *{code}*. It expires in 10 minutes. Never share it.",
    otpLimit: "⚠️ Too many codes requested. Try again in an hour.",
    linkInvalid: "This link is invalid.",
    linkExpired: "This link has expired or was already used. Text *link* in WhatsApp for a new one.",
    codeExpired: "Code expired. Text *link* in WhatsApp for a new one.",
    tooManyAttempts: "Too many wrong codes. Text *link* in WhatsApp for a new link.",
    wrongCode: "Incorrect code. Check WhatsApp and try again.",
    keysRejected: "Those keys were rejected by Alpaca. Copy them again from the paper dashboard.",
    alpacaDown: "Could not reach Alpaca. Try again shortly.",
    connectedPage: "Connected. You can close this page and return to WhatsApp.",
    formTitle: "Connect Alpaca (paper)",
    formCode: "WhatsApp code",
    formKeyId: "API Key ID",
    formSecret: "API Secret",
    formButton: "Connect",
    formFootnote: "Keys are encrypted and never shown again. Use paper keys only."
  },
  ES: {
    menuPrompt: "¿Qué quieres hacer?",
    btnBalance: "Saldo de cuenta",
    btnPrices: "Precios de mercado",
    btnTrade: "Operar",
    askTicker: "🔎 Envía el símbolo (ej: _NVDA_), o *MENU* para volver.",
    tradeMenuPrompt: "¿Qué quieres hacer?",
    btnAsset: "Comprar / Vender",
    btnCoveredCall: "Crear Covered Call",
    btnBack: "Volver",
    tradeStub: "🚧 Operar es el siguiente paso. Tu selección quedó guardada.",
    balanceTitle: "💼 *Saldo de la cuenta*",
    cash: "Efectivo disponible",
    margin: "Margen disponible",
    total: "Valor total de la cuenta",
    assets: "*Activos*",
    noAssets: "Sin posiciones abiertas.",
    linkPrompt: "🔗 Conecta tu cuenta *paper* de Alpaca:\n{url}\n\nEl enlace expira en 10 minutos y sirve una sola vez. Te enviaremos un código a este WhatsApp para confirmar que eres tú.",
    notLinked: "🔒 Aún no tienes un broker conectado.",
    linkedOk: "✅ Conectado a Alpaca (paper). Escribe *menu* para continuar.",
    disconnected: "🔌 Claves eliminadas. Revócalas también en tu panel de Alpaca.",
    authRejected: "⚠️ Tus claves de Alpaca fueron rechazadas. Escribe *link* para reconectar.",
    otpMessage: "🔐 Tu código de vinculación de KokuTrader es *{code}*. Expira en 10 minutos. No lo compartas.",
    otpLimit: "⚠️ Demasiados códigos solicitados. Intenta en una hora.",
    linkInvalid: "Este enlace no es válido.",
    linkExpired: "Este enlace expiró o ya se usó. Escribe *link* en WhatsApp para uno nuevo.",
    codeExpired: "El código expiró. Escribe *link* en WhatsApp para uno nuevo.",
    tooManyAttempts: "Demasiados códigos incorrectos. Escribe *link* en WhatsApp para un enlace nuevo.",
    wrongCode: "Código incorrecto. Revisa WhatsApp e inténtalo de nuevo.",
    keysRejected: "Alpaca rechazó esas claves. Cópialas de nuevo desde el panel paper.",
    alpacaDown: "No se pudo conectar con Alpaca. Intenta de nuevo en un momento.",
    connectedPage: "Conectado. Puedes cerrar esta página y volver a WhatsApp.",
    formTitle: "Conectar Alpaca (paper)",
    formCode: "Código de WhatsApp",
    formKeyId: "API Key ID",
    formSecret: "API Secret",
    formButton: "Conectar",
    formFootnote: "Las claves se cifran y nunca se vuelven a mostrar. Usa solo claves paper."
  },
  PT: {
    menuPrompt: "O que você gostaria de fazer?",
    btnBalance: "Saldo da conta",
    btnPrices: "Preços de mercado",
    btnTrade: "Negociar",
    askTicker: "🔎 Envie o símbolo (ex: _NVDA_), ou *MENU* para voltar.",
    tradeMenuPrompt: "O que você gostaria de fazer?",
    btnAsset: "Comprar / Vender",
    btnCoveredCall: "Criar Covered Call",
    btnBack: "Voltar",
    tradeStub: "🚧 Negociar é o próximo passo. Sua escolha foi salva.",
    balanceTitle: "💼 *Saldo da conta*",
    cash: "Caixa disponível",
    margin: "Margem disponível",
    total: "Valor total da conta",
    assets: "*Ativos*",
    noAssets: "Sem posições abertas.",
    linkPrompt: "🔗 Conecte sua conta *paper* da Alpaca:\n{url}\n\nO link expira em 10 minutos e funciona uma única vez. Enviaremos um código para este WhatsApp para confirmar que é você.",
    notLinked: "🔒 Nenhum corretor conectado ainda.",
    linkedOk: "✅ Conectado à Alpaca (paper). Envie *menu* para continuar.",
    disconnected: "🔌 Chaves excluídas. Revogue-as também no painel da Alpaca.",
    authRejected: "⚠️ Suas chaves da Alpaca foram rejeitadas. Envie *link* para reconectar.",
    otpMessage: "🔐 Seu código de vinculação do KokuTrader é *{code}*. Expira em 10 minutos. Nunca o compartilhe.",
    otpLimit: "⚠️ Muitos códigos solicitados. Tente novamente em uma hora.",
    linkInvalid: "Este link é inválido.",
    linkExpired: "Este link expirou ou já foi usado. Envie *link* no WhatsApp para um novo.",
    codeExpired: "O código expirou. Envie *link* no WhatsApp para um novo.",
    tooManyAttempts: "Muitos códigos incorretos. Envie *link* no WhatsApp para um novo link.",
    wrongCode: "Código incorreto. Verifique o WhatsApp e tente novamente.",
    keysRejected: "A Alpaca rejeitou essas chaves. Copie-as novamente do painel paper.",
    alpacaDown: "Não foi possível conectar à Alpaca. Tente novamente em instantes.",
    connectedPage: "Conectado. Você pode fechar esta página e voltar ao WhatsApp.",
    formTitle: "Conectar Alpaca (paper)",
    formCode: "Código do WhatsApp",
    formKeyId: "API Key ID",
    formSecret: "API Secret",
    formButton: "Conectar",
    formFootnote: "As chaves são criptografadas e nunca mais são exibidas. Use apenas chaves paper."
  }
};

/* ============================================================
 * WORKER ENTRY
 * ============================================================ */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. WhatsApp webhook verification
    if (request.method === "GET" && url.pathname.includes("/webhook")) {
      const token = url.searchParams.get("hub.verify_token") || url.searchParams.get("verify_token");
      const challenge = url.searchParams.get("hub.challenge") || url.searchParams.get("challenge");
      if (token === env.WHATSAPP_VERIFY_TOKEN) {
        return new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return new Response("Forbidden: Token Mismatch", { status: 403 });
    }

    // 2. Inbound messages
    if (request.method === "POST" && url.pathname.includes("/webhook")) {
      try {
        const payload = await request.json();
        const value = payload?.entry?.[0]?.changes?.[0]?.value;

        if (value?.statuses) return new Response("OK", { status: 200 });

        const messageObj = value?.messages?.[0];
        if (!messageObj) return new Response("OK", { status: 200 });

        const fromNumber = messageObj.from;
        let userText = "";
        let buttonId = "";

        if (messageObj.type === "text") {
          userText = messageObj.text?.body || "";
        } else if (messageObj.type === "interactive") {
          const reply = messageObj.interactive?.button_reply || messageObj.interactive?.list_reply;
          buttonId = reply?.id || "";
          userText = reply?.title || "";
        } else if (messageObj.type === "button") {
          userText = messageObj.button?.text || "";
        }

        if (!userText && !buttonId) return new Response("OK", { status: 200 });

        ctx.waitUntil(
          handleStateEngine(fromNumber, { text: userText, buttonId }, env).catch((err) => {
            console.error("handleStateEngine failed:", err?.stack || err);
          })
        );
        return new Response("OK", { status: 200 });
      } catch (err) {
        console.error("Webhook payload processing fault:", err);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    
    // Public configuration for the KokuTrade landing page
    if (url.pathname === "/public-config") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      if (request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: corsHeaders,
        });
      }

      return new Response(
        JSON.stringify({
          Whatsapp_Phone_Number: env.WHATSAPP_PUBLIC_NUMBER || "",
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // 3. Broker linking page (opened in a browser from WhatsApp)
    if (url.pathname.startsWith("/link/")) {
      try {
        return await handleLinkRoute(request, url, env, ctx);
      } catch (err) {
        console.error("Link route failed:", err?.stack || err);
        return htmlPage("Debug: " + (err?.message || String(err)), 500);
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

/* ============================================================
 * DIALOGUE ROUTING
 * ============================================================ */
async function handleStateEngine(phone, input, env) {
  const token = (input.buttonId || input.text || "").trim().toUpperCase();
  console.log("inbound", { last4: phone.slice(-4), token: token.slice(0, 30) });

  await ensureUser(phone, env);

  
const session = await loadSession(phone, env);
let lang = session.lang;

// Detect greeting and select the corresponding language
const greeting = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const greetingLanguages = {
  HELLO: "EN",
  HI: "EN",
  HOLA: "ES",
  OLA: "PT",
  OI: "PT"
};

if (greetingLanguages[greeting]) {
  lang = greetingLanguages[greeting];
  session.lang = lang;
  session.step = "MENU";
  await saveSession(phone, session, env);

  const linked = await getLink(phone, env);

  if (!linked) {
    return sendLinkPrompt(phone, lang, env);
  }

  return sendMainMenu(
    phone,
    lang,
    env,
    LANGUAGES[lang].welcome + "\n\n" + FLOW[lang].menuPrompt
  );
}


  // 1. Language choice: button ID, "LANG EN", or bare "EN" while picking
  const langMatch =
    token.match(/^LANG[_ ](EN|ES|PT)$/) ||
    (session.step === "LANG_PICK" && token.match(/^(EN|ES|PT)$/));

  if (langMatch) {
    session.lang = langMatch[1];
    session.step = "MENU";
    await saveSession(phone, session, env);
    await sendWhatsApp(phone, LANGUAGES[session.lang].langSaved, env);

    const linked = await getLink(phone, env);
    if (!linked) return sendLinkPrompt(phone, session.lang, env);
    return sendMainMenu(phone, session.lang, env,
      LANGUAGES[session.lang].welcome + "\n\n" + FLOW[session.lang].menuPrompt);
  }

  // 2. First contact, or user asks to change language
  if (!lang || token === "LANG") {
    session.step = "LANG_PICK";
    await saveSession(phone, session, env);
    return sendLanguageMenu(phone, env);
  }

  const dict = LANGUAGES[lang];
  const f = FLOW[lang];

  // 3. Global keywords, valid from any step
  if (["MENU", "HI", "HELLO", "HOLA", "OI"].includes(token)) {
    session.step = "MENU";
    await saveSession(phone, session, env);
    return sendMainMenu(phone, lang, env, dict.welcome + "\n\n" + f.menuPrompt);
  }

  if (token === "LINK") return sendLinkPrompt(phone, lang, env);

  if (token === "DISCONNECT") {
    await deleteLink(phone, env);
    return sendWhatsApp(phone, f.disconnected, env);
  }

  // 4. Step router
  switch (session.step) {
    case "LANG_PICK":
      return sendLanguageMenu(phone, env);

    case "PRICE_ASK": {
      if (token === "CANCEL") {
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const ticker = token.replace(/^CHECK\s+/, "").split(/\s+/)[0];
      if (!/^[A-Z.]{1,5}$/.test(ticker)) {
        return sendWhatsApp(phone, dict.invalidTicker, env);
      }
      session.step = "MENU";
      await saveSession(phone, session, env);
      await executeMarketLookupChain(phone, ticker, dict, env, lang);
      return sendMainMenu(phone, lang, env, f.menuPrompt);
    }

    case "TRADE_CHOOSE": {
      if (token === "TRADE_BACK") {
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      if (token === "TRADE_ASSET" || token === "TRADE_COVERED_CALL") {
        session.step = token === "TRADE_ASSET" ? "ASSET_TICKER" : "COVERED_CALL_START";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone, f.tradeStub, env);
      }
      return sendTradeMenu(phone, lang, env);
    }

    case "ASSET_TICKER":
    case "COVERED_CALL_START":
      // Placeholders until the trade phase is designed
      session.step = "MENU";
      await saveSession(phone, session, env);
      return sendMainMenu(phone, lang, env, f.menuPrompt);

    case "MENU":
    default: {
      if (token === "MENU_BALANCE" || token === "1") return showBalance(phone, lang, env);

      if (token === "MENU_PRICES" || token === "2") {
        session.step = "PRICE_ASK";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone, f.askTicker, env);
      }

      if (token === "MENU_TRADE" || token === "3") {
        session.step = "TRADE_CHOOSE";
        await saveSession(phone, session, env);
        return sendTradeMenu(phone, lang, env);
      }

      // Shortcut: "check NVDA" works from the menu too
      if (token.startsWith("CHECK ") || token.startsWith("PRICE ")) {
        const ticker = token.split(/\s+/)[1];
        await executeMarketLookupChain(phone, ticker, dict, env, lang);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }

      return sendMainMenu(phone, lang, env, f.menuPrompt);
    }
  }
}

/* ============================================================
 * D1: USERS AND BROKER LINKS
 * ============================================================ */
async function ensureUser(phone, env) {
  await env.DB.prepare("INSERT OR IGNORE INTO users (phone) VALUES (?)").bind(phone).run();
}

async function getLink(phone, env) {
  const row = await env.DB.prepare(
    "SELECT broker, mode, key_tail, enc_iv, enc_ct FROM broker_links WHERE phone = ?"
  ).bind(phone).first();
  if (!row) return null;
  return {
    broker: row.broker,
    mode: row.mode,
    keyTail: row.key_tail,
    enc: { iv: row.enc_iv, ct: row.enc_ct }
  };
}

async function saveLink(phone, link, enc, env) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO broker_links
       (phone, broker, mode, key_tail, enc_iv, enc_ct, linked_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(phone, link.broker, link.mode, link.keyTail, enc.iv, enc.ct).run();
}

async function deleteLink(phone, env) {
  await env.DB.prepare("DELETE FROM broker_links WHERE phone = ?").bind(phone).run();
}

/* ============================================================
 * SESSIONS (KV, expire automatically)
 * ============================================================ */
async function loadSession(phone, env) {
  try {
    const s = await env.USER_SESSIONS.get("sess:" + phone, { type: "json" });
    if (s) return s;
  } catch (err) {
    console.error("KV read failed:", err);
  }
  return { step: "LANG_PICK", lang: null };
}

async function saveSession(phone, session, env) {
  try {
    await env.USER_SESSIONS.put("sess:" + phone, JSON.stringify(session), { expirationTtl: 60 * 60 * 24 * 30 });
  } catch (err) {
    console.error("KV write failed:", err);
  }
}

/* ============================================================
 * ACCOUNT BALANCE (per-user Alpaca keys)
 * ============================================================ */
async function showBalance(phone, lang, env) {
  const f = FLOW[lang];
  const dict = LANGUAGES[lang];

  const link = await getLink(phone, env);
  if (!link) {
    await sendWhatsApp(phone, f.notLinked, env);
    return sendLinkPrompt(phone, lang, env);
  }

  try {
    const creds = await decryptCredentials(link.enc, env);
    const acc = await alpacaGetAccount(creds, link.mode);
    const positions = await alpacaGetPositions(creds, link.mode);

    let msg = f.balanceTitle + "\n\n";
    msg += "💵 *" + f.cash + ":* " + fmtUSD(acc.cash, lang) + "\n";
    msg += "🏦 *" + f.margin + ":* " + fmtUSD(acc.marginAvailable, lang) + "\n";
    msg += "📊 *" + f.total + ":* " + fmtUSD(acc.total, lang) + "\n\n";
    msg += f.assets + "\n";

    if (positions.length === 0) {
      msg += f.noAssets;
    } else {
      positions.forEach((p) => {
        const icon = p.assetClass === "us_option" ? "📄" : "📈";
        msg += icon + " `" + p.symbol + "` · " + p.qty + " · " + fmtUSD(p.marketValue, lang) + "\n";
      });
    }

    await sendWhatsApp(phone, msg, env);
    return sendMainMenu(phone, lang, env, f.menuPrompt);
  } catch (err) {
    console.error("Balance fetch failed:", err?.kind || err?.message || err);
    if (err?.kind === "AUTH") return sendWhatsApp(phone, f.authRejected, env);
    return sendWhatsApp(phone, dict.feedError, env);
  }
}

/* ============================================================
 * MENUS
 * ============================================================ */
function sendLanguageMenu(phone, env) {
  return sendWhatsAppButtons(phone, LANG_PROMPT, [
    { id: "LANG_EN", title: "English" },
    { id: "LANG_ES", title: "Español" },
    { id: "LANG_PT", title: "Português" }
  ], env);
}

function sendMainMenu(phone, lang, env, body) {
  const f = FLOW[lang];
  return sendWhatsAppButtons(phone, body, [
    { id: "MENU_BALANCE", title: f.btnBalance },
    { id: "MENU_PRICES", title: f.btnPrices },
    { id: "MENU_TRADE", title: f.btnTrade }
  ], env);
}

function sendTradeMenu(phone, lang, env) {
  const f = FLOW[lang];
  return sendWhatsAppButtons(phone, f.tradeMenuPrompt, [
    { id: "TRADE_ASSET", title: f.btnAsset },
    { id: "TRADE_COVERED_CALL", title: f.btnCoveredCall },
    { id: "TRADE_BACK", title: f.btnBack }
  ], env);
}

function fmtUSD(n, lang) {
  const locale = lang === "ES" ? "es-ES" : lang === "PT" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" })
    .format(Number.isFinite(n) ? n : 0);
}

/* ============================================================
 * ALPACA
 * ============================================================ */
function tradingMode() {
  // MVP: paper only. Phase 2: read a per-user setting, default live.
  return TRADING_MODE_DEFAULT;
}

function alpacaBase(mode) {
  return mode === "live"
    ? "https://api.alpaca.markets"
    : "https://paper-api.alpaca.markets";
}

// Server read-only key for public market data only
function serverAlpacaHeaders(env) {
  return {
    "APCA-API-KEY-ID": env.ALPACA_KEY_ID,
    "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY,
    "Accept": "application/json"
  };
}

class BrokerError extends Error {
  constructor(kind, status) {
    super(kind + ":" + status);
    this.kind = kind;     // "AUTH" | "UPSTREAM"
    this.status = status;
  }
}

async function alpacaUserGet(creds, mode, path) {
  const res = await fetch(alpacaBase(mode) + path, {
    headers: {
      "APCA-API-KEY-ID": creds.keyId,
      "APCA-API-SECRET-KEY": creds.secret,
      "Accept": "application/json"
    }
  });
  if (res.status === 401 || res.status === 403) throw new BrokerError("AUTH", res.status);
  if (!res.ok) throw new BrokerError("UPSTREAM", res.status);
  return res.json();
}

async function alpacaValidate(creds, mode) {
  const acc = await alpacaUserGet(creds, mode, "/v2/account");
  if (acc.status && acc.status !== "ACTIVE") throw new BrokerError("UPSTREAM", 200);
  return true;
}

async function alpacaGetAccount(creds, mode) {
  const acc = await alpacaUserGet(creds, mode, "/v2/account");
  const cash = parseFloat(acc.cash);
  const buyingPower = parseFloat(acc.buying_power);
  return {
    cash,
    // Buying power not covered by positive cash. A margin loan must not inflate it.
    marginAvailable: Math.max(buyingPower - Math.max(cash, 0), 0),
    total: parseFloat(acc.portfolio_value || acc.equity)
  };
}

async function alpacaGetPositions(creds, mode) {
  const list = await alpacaUserGet(creds, mode, "/v2/positions");
  return list.map((p) => ({
    symbol: p.symbol,
    qty: p.qty,
    marketValue: parseFloat(p.market_value),
    assetClass: p.asset_class
  }));
}

/* ============================================================
 * LIVE QUOTE AND OTM CALL LOOKUP (derivative capability, retained)
 * ============================================================ */
async function executeMarketLookupChain(phone, ticker, dict, env, langCode) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, dict.invalidTicker, env);
    return;
  }

  const authHeaders = serverAlpacaHeaders(env);
  const apiBase = alpacaBase(tradingMode());

  try {
    await sendWhatsApp(phone, dict.fetching.replace("{ticker}", ticker), env);

    const statusPromise = getMarketStatus(apiBase, authHeaders);

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
      const data = await optionContractsRes.json();
      otmCalls = (data?.option_contracts || [])
        .filter((c) => parseFloat(c.strike_price) > currentStockPrice)
        .sort((a, b) =>
          a.expiration_date.localeCompare(b.expiration_date) ||
          parseFloat(a.strike_price) - parseFloat(b.strike_price)
        )
        .slice(0, 3);
    }

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
        console.error("Option quotes failed:", optionQuotesRes.status);
      }
    }

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
    console.error("Market analysis engine exception:", err?.message || err);
    await sendWhatsApp(phone, dict.feedError, env);
  }
}

/* ============================================================
 * MARKET HOURS (US equities, Eastern Time)
 * ============================================================ */
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
  return minutes >= 570 && minutes < 960;
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
  try {
    const res = await fetch(apiBase + "/v2/clock", { method: "GET", headers: authHeaders });
    if (res.ok) {
      const clock = await res.json();
      return { isOpen: !!clock.is_open, nextOpen: clock.next_open ? new Date(clock.next_open) : null };
    }
  } catch (err) {
    console.error("Clock fetch failed, using fallback:", err?.message || err);
  }

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
  if (status.isOpen) return "\n" + dict.marketOpenLine;
  let footer = "\n━━━━━━━━━━━━━━\n" + dict.marketClosedTitle + "\n" + dict.marketClosedBody + "\n\n";
  footer += dict.marketHoursLine + "\n" + dict.extendedHoursLine;
  if (status.nextOpen) {
    footer += "\n" + dict.nextOpenLine.replace("{nextOpen}", formatNextOpen(status.nextOpen, langCode));
  }
  return footer;
}

/* ============================================================
 * LINKING: one-time link, WhatsApp code, validate and store keys
 * ============================================================ */
async function sendLinkPrompt(phone, lang, env) {
  const token = randomHex(32);
  const hash = await sha256Hex(token);
  await env.USER_SESSIONS.put("link:" + hash, JSON.stringify({ phone }), { expirationTtl: 600 });
  const url = env.PUBLIC_BASE_URL + "/link/" + token;
  return sendWhatsApp(phone, FLOW[lang].linkPrompt.replace("{url}", url), env);
}

async function handleLinkRoute(request, url, env, ctx) {
  const token = url.pathname.split("/")[2] || "";
  if (!/^[0-9a-f]{64}$/.test(token)) return htmlPage(FLOW.EN.linkInvalid, 404);

  const hash = await sha256Hex(token);
  const pending = await env.USER_SESSIONS.get("link:" + hash, { type: "json" });
  if (!pending) return htmlPage(FLOW.EN.linkExpired, 410);

  const phone = pending.phone;
  const session = await loadSession(phone, env);
  const lang = session.lang || "EN";
  const t = FLOW[lang];

  if (request.method === "GET") {
    const otp = await env.USER_SESSIONS.get("otp:" + phone, { type: "json" });
    if (!otp) {
      const code = await reserveOtp(phone, env);       // fast, KV-only
      if (!code) return htmlPage(t.otpLimit, 429);
      // Send in the background; do NOT block the page render on Meta.
      ctx.waitUntil(
        sendWhatsApp(phone, t.otpMessage.replace("{code}", code), env)
          .catch((err) => console.error("OTP WhatsApp send failed:", err))
      );
    }
    return linkFormPage(lang, "");
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const code = String(form.get("code") || "").replace(/\D/g, "").slice(0, 6);
    const creds = {
      keyId: String(form.get("keyId") || "").trim().slice(0, 200),
      secret: String(form.get("secret") || "").trim().slice(0, 200)
    };
    const mode = tradingMode();

    // 1. Verify WhatsApp code
    const otp = await env.USER_SESSIONS.get("otp:" + phone, { type: "json" });
    if (!otp) return htmlPage(t.codeExpired, 410);

    if (otp.attempts >= 5) {
      await burnLink(hash, phone, env);
      return htmlPage(t.tooManyAttempts, 429);
    }

    const submitted = await sha256Hex(phone + ":" + code);
    if (!safeEqual(submitted, otp.codeHash)) {
      otp.attempts += 1;
      await env.USER_SESSIONS.put("otp:" + phone, JSON.stringify(otp), { expirationTtl: 600 });
      return linkFormPage(lang, t.wrongCode);
    }

    // 2. Validate keys with Alpaca before storing anything
    try {
      await alpacaValidate(creds, mode);
    } catch (err) {
      const msg = err?.kind === "AUTH" ? t.keysRejected : t.alpacaDown;
      return linkFormPage(lang, msg);
    }

    // 3. Encrypt, store in D1, burn the one-time link and code
    const enc = await encryptCredentials(creds, env);
    await ensureUser(phone, env);
    await saveLink(phone, {
      broker: "alpaca",
      mode,
      keyTail: creds.keyId.slice(-4)
    }, enc, env);

    await burnLink(hash, phone, env);
    await sendWhatsApp(phone, t.linkedOk, env);
    return htmlPage(t.connectedPage, 200);
  }

  return new Response("Method Not Allowed", { status: 405 });
}

async function reserveOtp(phone, env) {
  const rlKey = "rl:otp:" + phone;
  const rl = (await env.USER_SESSIONS.get(rlKey, { type: "json" })) || { n: 0 };
  if (rl.n >= 3) return null;
  await env.USER_SESSIONS.put(rlKey, JSON.stringify({ n: rl.n + 1 }), { expirationTtl: 3600 });

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const codeHash = await sha256Hex(phone + ":" + code);
  await env.USER_SESSIONS.put("otp:" + phone, JSON.stringify({ codeHash, attempts: 0 }), { expirationTtl: 600 });
  return code;
}

async function burnLink(hash, phone, env) {
  await env.USER_SESSIONS.delete("link:" + hash);
  await env.USER_SESSIONS.delete("otp:" + phone);
}

function linkFormPage(lang, notice) {
  const t = FLOW[lang] || FLOW.EN;
  const body = `<!doctype html>
<html lang="${esc(lang.toLowerCase())}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.formTitle)}</title>
<style>
  :root {
    --bg: #0f1115;
    --card: #171a21;
    --border: #262b36;
    --text: #e6e9ef;
    --muted: #8b93a3;
    --accent: #22c55e;
    --accent-hover: #1ea34d;
    --error-bg: #2a1416;
    --error-border: #5a1f24;
    --error-text: #fca5a5;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px 24px;
    box-shadow: 0 12px 32px rgba(0,0,0,.35);
  }
  h1 {
    font-size: 20px;
    margin: 0 0 4px;
    font-weight: 600;
    letter-spacing: -.01em;
  }
  .subtitle {
    color: var(--muted);
    font-size: 13px;
    margin: 0 0 22px;
  }
  .notice {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    color: var(--error-text);
    font-size: 13px;
    padding: 10px 12px;
    border-radius: 8px;
    margin: 0 0 18px;
  }
  .field { margin-bottom: 16px; }
  .field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 6px;
  }
  .field input {
    width: 100%;
    padding: 11px 12px;
    font-size: 15px;
    font-family: inherit;
    color: var(--text);
    background: #0d1016;
    border: 1px solid var(--border);
    border-radius: 9px;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(34,197,94,.15);
  }
  .field input::placeholder { color: #4b5261; }
  #code {
    font-size: 22px;
    letter-spacing: .35em;
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 12px 12px 12px 16px;
  }
  button {
    width: 100%;
    padding: 12px 16px;
    margin-top: 6px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    color: #06120a;
    background: var(--accent);
    border: none;
    border-radius: 9px;
    cursor: pointer;
    transition: background .15s, transform .05s;
  }
  button:hover { background: var(--accent-hover); }
  button:active { transform: translateY(1px); }
  .footnote {
    font-size: 12px;
    color: var(--muted);
    margin: 18px 0 0;
    line-height: 1.5;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
</style>
</head>
<body>
  <main class="card">
    <h1>${esc(t.formTitle)}</h1>
    <p class="subtitle">${esc(t.formCode === "WhatsApp code" ? "Confirm it's you, then paste your Alpaca paper keys." : t.formCode)}</p>

    ${notice ? `<div class="notice">${esc(notice)}</div>` : ""}

    <form method="POST" action="" autocomplete="off">
      <div class="field">
        <label for="code">${esc(t.formCode)}</label>
        <input id="code" name="code" inputmode="numeric" autocomplete="one-time-code"
               maxlength="6" pattern="[0-9]*" placeholder="000000" required autofocus>
      </div>

      <div class="field">
        <label for="keyId">${esc(t.formKeyId)}</label>
        <input id="keyId" name="keyId" type="text" autocomplete="off"
               autocapitalize="off" autocorrect="off" spellcheck="false"
               placeholder="PKXXXXXXXXXXXXXXXXXX" required>
      </div>

      <div class="field">
        <label for="secret">${esc(t.formSecret)}</label>
        <input id="secret" name="secret" type="password" autocomplete="off"
               autocapitalize="off" autocorrect="off" spellcheck="false"
               placeholder="••••••••••••••••••••••••••••••" required>
      </div>

      <button type="submit">${esc(t.formButton)}</button>
    </form>

    <p class="footnote">${esc(t.formFootnote)}</p>
  </main>
</body>
</html>`;
  return htmlPage(body, 200, true);
}

function htmlPage(content, status = 200, isDocument = false) {
  const body = isDocument ? content
    : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px"><p>${esc(content)}</p></body></html>`;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ============================================================
 * CRYPTO
 * ============================================================ */
async function getCryptoKey(env) {
  const raw = Uint8Array.from(atob(env.CREDENTIAL_KEY), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptCredentials(obj, env) {
  const key = await getCryptoKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(String.fromCharCode(...new Uint8Array(ct)))
  };
}

async function decryptCredentials(stored, env) {
  const key = await getCryptoKey(env);
  const iv = Uint8Array.from(atob(stored.iv), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(stored.ct), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
 * WHATSAPP MESSAGING
 * ============================================================ */
async function postToMeta(payload, env, timeoutMs = 8000) {
  const metaUrl = "https://graph.facebook.com/" + GRAPH_API_VERSION + "/"
    + env.WHATSAPP_PHONE_NUMBER_ID + "/messages";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.META_ACCESS_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) {
      console.error("WhatsApp send failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("WhatsApp send error:", err?.name || err?.message || err);
  } finally {
    clearTimeout(timer);
  }
}
function sendWhatsApp(to, message, env) {
  return postToMeta({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message }
  }, env);
}

function sendWhatsAppButtons(to, body, buttons, env) {
  return postToMeta({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) }
        }))
      }
    }
  }, env);
}
