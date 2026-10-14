/**
 * WhatsApp KokuTrade Investment Bot Engine
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
    welcome: "🙌 Welcome to *KokuTrade - Your Investing Assistant*!\n\n👉 Text a ticker like *NVDA* to pull live data.\n👉 Text *lang* to change your language profile anytime.",    langSaved: "✅ Preference updated to English!",
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
    welcome: "🙌 ¡Bienvenido a *KokuTrade - Tu Assistente de Inversiones*!\n\n👉 Envía un símbolo como *NVDA* para ver datos del mercado.\n👉 Envía *lang* para cambiar de idioma en cualquier momento.",    langSaved: "✅ ¡Preferencia actualizada a Español!",
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
    welcome: "🙌 Bem-vindo ao *KokuTrade - Seu Centro de Comando*!\n\n👉 Envie um símbolo como *NVDA* para buscar dados ao vivo.\n👉 Envie *lang* para alterar o idioma a qualquer momento.",    langSaved: "✅ Preferência atualizada para Português!",
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
    formFootnote: "Keys are encrypted and never shown again. Use paper keys only.",

    // === Buy/Sell flow ===
    assetAskSide: "Buy or sell?",
    btnBuy: "Buy",
    btnSell: "Sell",

    assetAskTicker: "Send the ticker symbol (e.g. _NVDA_).",
    assetInvalidTicker: "That symbol isn't tradable. Try another.",
    assetNoPosition: "You don't hold *{ticker}*. Short selling isn't supported yet.",
    assetFetchFailed: "⚠️ Couldn't check that symbol right now. Try again shortly.",

    assetPositionTitle: "📊 *Your position in {ticker}*",
    assetPosQty: "Quantity",
    assetPosMarketValue: "Market value",
    assetPosCostBasis: "Cost basis",
    assetPosPL: "P/L",

    assetAskQtyModeBuy: "Buy by shares or by dollar amount?",
    assetAskQtyModeSell: "Sell by shares or by dollar amount?\n\nSend *MAX* to sell your full position.",
    btnShares: "Shares",
    btnAmount: "Amount",

    assetAskQtyShares: "How many shares?",
    assetAskQtySellShares: "How many shares to sell? Send *MAX* for full position.",
    assetAskQtyAmount: "How much in dollars? (e.g. _1000_ or _$1000_)",
    assetAskQtySellAmount: "How much in dollars to sell? (e.g. _500_ or _$500_)",

    assetInvalidQty: "Invalid quantity. Send a whole number of shares (e.g. _10_).",
    assetInvalidAmount: "Invalid amount. Send a dollar figure (e.g. _1000_).",
    assetQtyTooSmall: "That amount is below the price of one share (~${price}). Try a larger amount.",
    assetSellAmountTooBig: "You can sell up to ~${max} ({qty} shares). Try a smaller amount.",

    assetAskOrderType: "Order type?",
    btnMarket: "Market",
    btnLimit: "Limit",

    assetAskLimit: "Send your limit price (e.g. _123.45_).",
    assetInvalidLimit: "Invalid price. Send a number like _123.45_.",
    assetLimitOffBand: "That price is more than 50% away from the last trade (${last}). Try again.",

    assetConfirmTitle: "📋 *Order Preview*",
    assetConfirmSide: "Side",
    assetConfirmSymbol: "Symbol",
    assetConfirmQty: "Quantity",
    assetConfirmType: "Type",
    assetConfirmLimit: "Limit price",
    assetConfirmEstCost: "Est. cost",
    assetConfirmEstProc: "Est. proceeds",
    assetConfirmMarketWarn: "⚠️ Market is closed. This order will queue for the next open.",
    assetConfirmPrompt: "Tap *Confirm* to submit or *Cancel* to abort.",
    btnConfirm: "Confirm",
    btnCancel: "Cancel",

    assetConfirmExpired: "Preview expired. Send your order again.",
    assetProcessing: "⏳ Your order is being processed. One moment.",
    assetSubmitted: "✅ Order submitted.\n\n• ID: `{id}`\n• Status: {status}",
    assetFailed: "⚠️ Order rejected: {reason}",
    assetFailedGeneric: "⚠️ Order could not be submitted. Try again shortly."
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
    formFootnote: "Las claves se cifran y nunca se vuelven a mostrar. Usa solo claves paper.",

    // === Buy/Sell flow ===
    assetAskSide: "¿Comprar o vender?",
    btnBuy: "Comprar",
    btnSell: "Vender",

    assetAskTicker: "Envía el símbolo (ej: _NVDA_).",
    assetInvalidTicker: "Ese símbolo no es operable. Intenta otro.",
    assetNoPosition: "No tienes *{ticker}*. La venta en corto aún no está soportada.",
    assetFetchFailed: "⚠️ No se pudo verificar ese símbolo ahora. Intenta de nuevo.",

    assetPositionTitle: "📊 *Tu posición en {ticker}*",
    assetPosQty: "Cantidad",
    assetPosMarketValue: "Valor de mercado",
    assetPosCostBasis: "Costo base",
    assetPosPL: "G/P",

    assetAskQtyModeBuy: "¿Comprar por acciones o por monto en dólares?",
    assetAskQtyModeSell: "¿Vender por acciones o por monto en dólares?\n\nEnvía *MAX* para vender toda tu posición.",
    btnShares: "Acciones",
    btnAmount: "Monto",

    assetAskQtyShares: "¿Cuántas acciones?",
    assetAskQtySellShares: "¿Cuántas acciones vender? Envía *MAX* para vender toda tu posición.",
    assetAskQtyAmount: "¿Cuánto en dólares? (ej: _1000_ o _$1000_)",
    assetAskQtySellAmount: "¿Cuánto en dólares vender? (ej: _500_ o _$500_)",

    assetInvalidQty: "Cantidad inválida. Envía un número entero de acciones (ej: _10_).",
    assetInvalidAmount: "Monto inválido. Envía una cifra en dólares (ej: _1000_).",
    assetQtyTooSmall: "Ese monto es menor al precio de una acción (~${price}). Intenta un monto mayor.",
    assetSellAmountTooBig: "Puedes vender hasta ~${max} ({qty} acciones). Intenta un monto menor.",

    assetAskOrderType: "¿Tipo de orden?",
    btnMarket: "Mercado",
    btnLimit: "Límite",

    assetAskLimit: "Envía tu precio límite (ej: _123.45_).",
    assetInvalidLimit: "Precio inválido. Envía un número como _123.45_.",
    assetLimitOffBand: "Ese precio está a más del 50% de la última operación (${last}). Intenta de nuevo.",

    assetConfirmTitle: "📋 *Vista Previa de Orden*",
    assetConfirmSide: "Lado",
    assetConfirmSymbol: "Símbolo",
    assetConfirmQty: "Cantidad",
    assetConfirmType: "Tipo",
    assetConfirmLimit: "Precio límite",
    assetConfirmEstCost: "Costo est.",
    assetConfirmEstProc: "Ingreso est.",
    assetConfirmMarketWarn: "⚠️ El mercado está cerrado. Esta orden se encolará para la próxima apertura.",
    assetConfirmPrompt: "Toca *Confirmar* para enviar o *Cancelar* para abortar.",
    btnConfirm: "Confirmar",
    btnCancel: "Cancelar",

    assetConfirmExpired: "La vista previa expiró. Envía tu orden de nuevo.",
    assetProcessing: "⏳ Tu orden se está procesando. Un momento.",
    assetSubmitted: "✅ Orden enviada.\n\n• ID: `{id}`\n• Estado: {status}",
    assetFailed: "⚠️ Orden rechazada: {reason}",
    assetFailedGeneric: "⚠️ No se pudo enviar la orden. Intenta de nuevo en un momento."
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
    formFootnote: "As chaves são criptografadas e nunca mais são exibidas. Use apenas chaves paper.",

    // === Buy/Sell flow ===
    assetAskSide: "Comprar ou vender?",
    btnBuy: "Comprar",
    btnSell: "Vender",

    assetAskTicker: "Envie o símbolo (ex: _NVDA_).",
    assetInvalidTicker: "Esse símbolo não é negociável. Tente outro.",
    assetNoPosition: "Você não possui *{ticker}*. Venda a descoberto ainda não é suportada.",
    assetFetchFailed: "⚠️ Não foi possível verificar esse símbolo agora. Tente novamente.",

    assetPositionTitle: "📊 *Sua posição em {ticker}*",
    assetPosQty: "Quantidade",
    assetPosMarketValue: "Valor de mercado",
    assetPosCostBasis: "Custo base",
    assetPosPL: "L/P",

    assetAskQtyModeBuy: "Comprar por ações ou por valor em dólares?",
    assetAskQtyModeSell: "Vender por ações ou por valor em dólares?\n\nEnvie *MAX* para vender toda a posição.",
    btnShares: "Ações",
    btnAmount: "Valor",

    assetAskQtyShares: "Quantas ações?",
    assetAskQtySellShares: "Quantas ações vender? Envie *MAX* para vender toda a posição.",
    assetAskQtyAmount: "Quanto em dólares? (ex: _1000_ ou _$1000_)",
    assetAskQtySellAmount: "Quanto em dólares vender? (ex: _500_ ou _$500_)",

    assetInvalidQty: "Quantidade inválida. Envie um número inteiro de ações (ex: _10_).",
    assetInvalidAmount: "Valor inválido. Envie um número em dólares (ex: _1000_).",
    assetQtyTooSmall: "Esse valor é menor que o preço de uma ação (~${price}). Tente um valor maior.",
    assetSellAmountTooBig: "Você pode vender até ~${max} ({qty} ações). Tente um valor menor.",

    assetAskOrderType: "Tipo de ordem?",
    btnMarket: "Mercado",
    btnLimit: "Limite",

    assetAskLimit: "Envie seu preço limite (ex: _123.45_).",
    assetInvalidLimit: "Preço inválido. Envie um número como _123.45_.",
    assetLimitOffBand: "Esse preço está a mais de 50% do último negócio (${last}). Tente novamente.",

    assetConfirmTitle: "📋 *Prévia da Ordem*",
    assetConfirmSide: "Lado",
    assetConfirmSymbol: "Símbolo",
    assetConfirmQty: "Quantidade",
    assetConfirmType: "Tipo",
    assetConfirmLimit: "Preço limite",
    assetConfirmEstCost: "Custo est.",
    assetConfirmEstProc: "Receita est.",
    assetConfirmMarketWarn: "⚠️ O mercado está fechado. Esta ordem entrará na fila para a próxima abertura.",
    assetConfirmPrompt: "Toque em *Confirmar* para enviar ou *Cancelar* para abortar.",
    btnConfirm: "Confirmar",
    btnCancel: "Cancelar",

    assetConfirmExpired: "A prévia expirou. Envie sua ordem novamente.",
    assetProcessing: "⏳ Sua ordem está sendo processada. Um momento.",
    assetSubmitted: "✅ Ordem enviada.\n\n• ID: `{id}`\n• Status: {status}",
    assetFailed: "⚠️ Ordem rejeitada: {reason}",
    assetFailedGeneric: "⚠️ Não foi possível enviar a ordem. Tente novamente em instantes."
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
    clearTrade(session);
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
      await executeMarketLookup(phone, ticker, dict, env, lang);
      return sendMainMenu(phone, lang, env, f.menuPrompt);
    }

    case "TRADE_CHOOSE": {
      if (token === "TRADE_BACK" || token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      if (token === "TRADE_ASSET") {
        clearTrade(session);
        session.trade = { side: null };
        session.step = "ASSET_SIDE";
        await saveSession(phone, session, env);
        return sendAssetSideMenu(phone, lang, env);
      }
      if (token === "TRADE_COVERED_CALL") {
        session.step = "COVERED_CALL_START";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone, f.tradeStub, env);
      }
      return sendTradeMenu(phone, lang, env);
    }

    case "ASSET_SIDE": {
      if (token === "CANCEL" || token === "TRADE_BACK") {
        clearTrade(session);
        session.step = "TRADE_CHOOSE";
        await saveSession(phone, session, env);
        return sendTradeMenu(phone, lang, env);
      }
      if (token === "BUY" || token === "SELL") {
        session.trade.side = token === "BUY" ? "buy" : "sell";
        session.step = "ASSET_TICKER";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone, f.assetAskTicker, env);
      }
      return sendAssetSideMenu(phone, lang, env);
    }

    case "ASSET_TICKER": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const ticker = token.replace(/^(CHECK|PRICE)\s+/, "").split(/\s+/)[0];
      if (!/^[A-Z.]{1,5}$/.test(ticker)) {
        return sendWhatsApp(phone, f.assetInvalidTicker, env);
      }

      const link = await getLink(phone, env);
      if (!link) {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendLinkPrompt(phone, lang, env);
      }

      let creds;
      try {
        creds = await decryptCredentials(link.enc, env);
      } catch (err) {
        console.error("Decrypt failed:", err);
        return sendWhatsApp(phone, f.assetFetchFailed, env);
      }

      // Validate the symbol is tradable
      try {
        await alpacaGetAsset(creds, link.mode, ticker);
      } catch (err) {
        if (err?.kind === "AUTH") {
          clearTrade(session);
          session.step = "MENU";
          await saveSession(phone, session, env);
          return sendWhatsApp(phone, f.authRejected, env);
        }
        if (err?.kind === "NOT_FOUND") {
          return sendWhatsApp(phone, f.assetInvalidTicker, env);
        }
        return sendWhatsApp(phone, f.assetFetchFailed, env);
      }

      // Sell path: fetch position + quote, show summary, then mode menu
      if (session.trade.side === "sell") {
        let pos;
        try {
          pos = await alpacaGetPosition(creds, link.mode, ticker);
        } catch (err) {
          if (err?.kind === "NOT_FOUND") {
            return sendWhatsApp(phone, f.assetNoPosition.replace("{ticker}", ticker), env);
          }
          return sendWhatsApp(phone, f.assetFetchFailed, env);
        }
        const qty = Math.floor(Number(pos?.qty || 0));
        if (!qty || qty <= 0) {
          return sendWhatsApp(phone, f.assetNoPosition.replace("{ticker}", ticker), env);
        }

        const marketValue = parseFloat(pos.market_value) || 0;
        const costBasis = parseFloat(pos.cost_basis) || 0;
        const pl = parseFloat(pos.unrealized_pl) || 0;
        const plpc = parseFloat(pos.unrealized_plpc) || 0;

        // Fetch current bid/ask for display
        let bid = 0, ask = 0;
        try {
          const qres = await fetch(
            "https://data.alpaca.markets/v2/stocks/" + encodeURIComponent(ticker) +
            "/quotes/latest?feed=iex",
            { headers: serverAlpacaHeaders(env) }
          );
          if (qres.ok) {
            const q = await qres.json();
            bid = q?.quote?.bp || 0;
            ask = q?.quote?.ap || 0;
          }
        } catch (_) { /* non-fatal */ }

        const sign = pl >= 0 ? "+" : "-";
        const plAbs = Math.abs(pl).toFixed(2);
        const plpcAbs = (Math.abs(plpc) * 100).toFixed(2);

        let summary = f.assetPositionTitle.replace("{ticker}", ticker) + "\n\n";
        summary += "• *" + f.assetPosQty + ":* " + qty + "\n";
        summary += "• *" + dict.bid + ":* " + fmtQuote(bid) + "\n";
        summary += "• *" + dict.ask + ":* " + fmtQuote(ask) + "\n";
        summary += "• *" + f.assetPosMarketValue + ":* " + fmtUSD(marketValue, lang) + "\n";
        summary += "• *" + f.assetPosCostBasis + ":* " + fmtUSD(costBasis, lang) + "\n";
        summary += "• *" + f.assetPosPL + ":* " + sign + "$" + plAbs + " (" + sign + plpcAbs + "%)";

        await sendWhatsApp(phone, summary, env);

        session.trade.ticker = ticker;
        session.trade.maxQty = qty;
        session.step = "ASSET_QTY_MODE";
        await saveSession(phone, session, env);
        return sendAssetQtyModeMenu(phone, lang, env, session.trade.side);
      }

      // Buy path: straight to mode menu (no summary)
      session.trade.ticker = ticker;
      session.step = "ASSET_QTY_MODE";
      await saveSession(phone, session, env);
      return sendAssetQtyModeMenu(phone, lang, env, session.trade.side);
    }

    case "ASSET_QTY_MODE": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const side = session.trade.side;
      if (token === "QTY_SHARES" || token === "SHARES") {
        session.trade.qtyMode = "shares";
        session.step = side === "sell" ? "ASSET_QTY_SELL_SHARES" : "ASSET_QTY_SHARES";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone,
          side === "sell" ? f.assetAskQtySellShares : f.assetAskQtyShares, env);
      }
      if (token === "QTY_AMOUNT" || token === "AMOUNT") {
        session.trade.qtyMode = "amount";
        session.step = side === "sell" ? "ASSET_QTY_SELL_AMOUNT" : "ASSET_QTY_AMOUNT";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone,
          side === "sell" ? f.assetAskQtySellAmount : f.assetAskQtyAmount, env);
      }
      return sendAssetQtyModeMenu(phone, lang, env, side);
    }

    case "ASSET_QTY_SHARES": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const cleaned = token.replace(/[^0-9]/g, "");
      const qty = /^\d+$/.test(cleaned) ? parseInt(cleaned, 10) : 0;
      if (!qty) return sendWhatsApp(phone, f.assetInvalidQty, env);
      session.trade.qtyRaw = qty;
      session.trade.qty = qty;
      session.step = "ASSET_ORDER_TYPE";
      await saveSession(phone, session, env);
      return sendAssetOrderTypeMenu(phone, lang, env);
    }

    case "ASSET_QTY_SELL_SHARES": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const maxMode = token === "MAX";
      let qty = 0;
      if (maxMode) {
        qty = session.trade.maxQty;
      } else {
        const cleaned = token.replace(/[^0-9]/g, "");
        qty = /^\d+$/.test(cleaned) ? parseInt(cleaned, 10) : 0;
      }
      if (!qty) return sendWhatsApp(phone, f.assetInvalidQty, env);
      if (qty > session.trade.maxQty) {
        return sendWhatsApp(phone, f.assetInvalidQty, env);
      }
      session.trade.qtyRaw = qty;
      session.trade.qty = qty;
      session.step = "ASSET_ORDER_TYPE";
      await saveSession(phone, session, env);
      return sendAssetOrderTypeMenu(phone, lang, env);
    }

    case "ASSET_QTY_AMOUNT": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const match = token.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
      if (!match) return sendWhatsApp(phone, f.assetInvalidAmount, env);
      const amount = parseFloat(match[1]);
      if (!Number.isFinite(amount) || amount <= 0) {
        return sendWhatsApp(phone, f.assetInvalidAmount, env);
      }
      session.trade.qtyRaw = amount;
      session.step = "ASSET_ORDER_TYPE";
      await saveSession(phone, session, env);
      return sendAssetOrderTypeMenu(phone, lang, env);
    }

    case "ASSET_QTY_SELL_AMOUNT": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const match = token.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
      if (!match) return sendWhatsApp(phone, f.assetInvalidAmount, env);
      const amount = parseFloat(match[1]);
      if (!Number.isFinite(amount) || amount <= 0) {
        return sendWhatsApp(phone, f.assetInvalidAmount, env);
      }
      // Resolve against current price to check against maxQty
      const last = await getLastPrice(session.trade.ticker, env);
      if (!last) return sendWhatsApp(phone, f.assetFetchFailed, env);
      const wantQty = Math.floor(amount / last);
      if (wantQty < 1) {
        return sendWhatsApp(phone,
          f.assetQtyTooSmall.replace("${price}", last.toFixed(2)), env);
      }
      if (wantQty > session.trade.maxQty) {
        const maxDollars = (session.trade.maxQty * last).toFixed(2);
        return sendWhatsApp(phone,
          f.assetSellAmountTooBig
            .replace("${max}", "$" + maxDollars)
            .replace("{qty}", String(session.trade.maxQty)), env);
      }
      session.trade.qtyRaw = amount;
      session.step = "ASSET_ORDER_TYPE";
      await saveSession(phone, session, env);
      return sendAssetOrderTypeMenu(phone, lang, env);
    }

    case "ASSET_ORDER_TYPE": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      if (token === "MARKET") {
        session.trade.orderType = "market";
        session.trade.limitPrice = null;
        return buildAndShowPreview(phone, session, lang, env);
      }
      if (token === "LIMIT") {
        session.trade.orderType = "limit";
        session.step = "ASSET_LIMIT_PRICE";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone, f.assetAskLimit, env);
      }
      return sendAssetOrderTypeMenu(phone, lang, env);
    }

    case "ASSET_LIMIT_PRICE": {
      if (token === "CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      const cleaned = token.replace(/[$,]/g, "").trim();
      const price = parseFloat(cleaned);
      if (!Number.isFinite(price) || price <= 0) {
        return sendWhatsApp(phone, f.assetInvalidLimit, env);
      }
      // ±50% band vs last trade
      const last = await getLastPrice(session.trade.ticker, env);
      if (last && (price > last * 1.5 || price < last * 0.5)) {
        return sendWhatsApp(phone,
          f.assetLimitOffBand.replace("${last}", last.toFixed(2)), env);
      }
      session.trade.limitPrice = price;
      return buildAndShowPreview(phone, session, lang, env);
    }

    case "ASSET_CONFIRM": {
      if (token === "CANCEL" || token === "ASSET_CANCEL") {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      if (token === "CONFIRM" || token === "ASSET_CONFIRM") {
        // Expiry check
        if (!session.trade?.confirmExpiresAt || Date.now() > session.trade.confirmExpiresAt) {
          clearTrade(session);
          session.step = "MENU";
          await saveSession(phone, session, env);
          await sendWhatsApp(phone, f.assetConfirmExpired, env);
          return sendMainMenu(phone, lang, env, f.menuPrompt);
        }
        // Flip step BEFORE fetch — idempotency guard layer 2
        session.step = "ASSET_SUBMITTING";
        await saveSession(phone, session, env, 120);
        await sendWhatsApp(phone, f.assetProcessing, env);
        await submitTrade(phone, session, lang, env);
        // submitTrade resets session and returns to menu itself
        return;
      }
      // Any other input → re-show preview
      return buildAndShowPreview(phone, session, lang, env, true);
    }

    case "ASSET_SUBMITTING": {
      // Double-tap guard. Do not re-submit.
      return sendWhatsApp(phone, f.assetProcessing, env);
    }

    case "COVERED_CALL_START":
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

      // Shortcut: bare ticker ("NVDA") or "CHECK NVDA" / "PRICE NVDA"
      if (token.startsWith("CHECK ") || token.startsWith("PRICE ")) {
        const ticker = token.split(/\s+/)[1];
        await executeMarketLookup(phone, ticker, dict, env, lang);
        return sendMainMenu(phone, lang, env, f.menuPrompt);
      }
      if (/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(token)) {
        await executeMarketLookup(phone, token, dict, env, lang);
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

async function saveSession(phone, session, env, ttlSeconds = 60 * 60 * 24 * 30) {
  try {
    await env.USER_SESSIONS.put("sess:" + phone, JSON.stringify(session), { expirationTtl: ttlSeconds });
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

function sendAssetSideMenu(phone, lang, env) {
  const f = FLOW[lang];
  return sendWhatsAppButtons(phone, f.assetAskSide, [
    { id: "BUY", title: f.btnBuy },
    { id: "SELL", title: f.btnSell },
    { id: "CANCEL", title: f.btnBack }
  ], env);
}

function sendAssetQtyModeMenu(phone, lang, env, side) {
  const f = FLOW[lang];
  const prompt = side === "sell" ? f.assetAskQtyModeSell : f.assetAskQtyModeBuy;
  return sendWhatsAppButtons(phone, prompt, [
    { id: "QTY_SHARES", title: f.btnShares },
    { id: "QTY_AMOUNT", title: f.btnAmount },
    { id: "CANCEL", title: f.btnBack }
  ], env);
}

function sendAssetOrderTypeMenu(phone, lang, env) {
  const f = FLOW[lang];
  return sendWhatsAppButtons(phone, f.assetAskOrderType, [
    { id: "MARKET", title: f.btnMarket },
    { id: "LIMIT", title: f.btnLimit },
    { id: "CANCEL", title: f.btnBack }
  ], env);
}

function fmtUSD(n, lang) {
  const locale = lang === "ES" ? "es-ES" : lang === "PT" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" })
    .format(Number.isFinite(n) ? n : 0);
}

function clearTrade(session) {
  session.trade = null;
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
    this.kind = kind;     // "AUTH" | "UPSTREAM" | "NOT_FOUND"
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
 * ASSET ORDER FLOW
 * ============================================================ */
async function alpacaGetAsset(creds, mode, symbol) {
  const res = await fetch(alpacaBase(mode) + "/v2/assets/" + encodeURIComponent(symbol), {
    headers: {
      "APCA-API-KEY-ID": creds.keyId,
      "APCA-API-SECRET-KEY": creds.secret,
      "Accept": "application/json"
    }
  });
  if (res.status === 401 || res.status === 403) throw new BrokerError("AUTH", res.status);
  if (res.status === 404) throw new BrokerError("NOT_FOUND", 404);
  if (!res.ok) throw new BrokerError("UPSTREAM", res.status);
  const a = await res.json();
  if (a.tradable === false) throw new BrokerError("NOT_FOUND", 404);
  return a;
}

async function alpacaGetPosition(creds, mode, symbol) {
  const res = await fetch(alpacaBase(mode) + "/v2/positions/" + encodeURIComponent(symbol), {
    headers: {
      "APCA-API-KEY-ID": creds.keyId,
      "APCA-API-SECRET-KEY": creds.secret,
      "Accept": "application/json"
    }
  });
  if (res.status === 401 || res.status === 403) throw new BrokerError("AUTH", res.status);
  if (res.status === 404) throw new BrokerError("NOT_FOUND", 404);
  if (!res.ok) throw new BrokerError("UPSTREAM", res.status);
  return res.json();
}

async function getLastPrice(ticker, env) {
  try {
    const url = "https://data.alpaca.markets/v2/stocks/" +
      encodeURIComponent(ticker) + "/trades/latest?feed=iex";
    const res = await fetch(url, { headers: serverAlpacaHeaders(env) });
    if (!res.ok) return null;
    const data = await res.json();
    const p = parseFloat(data?.trade?.p);
    return Number.isFinite(p) ? p : null;
  } catch (err) {
    console.error("Last price failed:", err?.message || err);
    return null;
  }
}

async function buildAndShowPreview(phone, session, lang, env, isRetry = false) {
  const f = FLOW[lang];
  const link = await getLink(phone, env);
  if (!link) {
    clearTrade(session);
    session.step = "MENU";
    await saveSession(phone, session, env);
    return sendLinkPrompt(phone, lang, env);
  }

  let creds;
  try {
    creds = await decryptCredentials(link.enc, env);
  } catch (err) {
    return sendWhatsApp(phone, f.assetFailedGeneric, env);
  }

  // Resolve qty for amount mode
  const lastPrice = await getLastPrice(session.trade.ticker, env);
  const refPrice = session.trade.orderType === "limit"
    ? session.trade.limitPrice
    : lastPrice;

  if (!refPrice || refPrice <= 0) {
    return sendWhatsApp(phone, f.assetFetchFailed, env);
  }

  let resolvedQty;
  if (session.trade.qtyMode === "amount") {
    resolvedQty = Math.floor(session.trade.qtyRaw / refPrice);
    if (resolvedQty < 1) {
      return sendWhatsApp(phone,
        f.assetQtyTooSmall.replace("${price}", refPrice.toFixed(2)), env);
    }
  } else {
    resolvedQty = session.trade.qtyRaw;
  }
  session.trade.qty = resolvedQty;
  session.trade.estPrice = refPrice;

  // Generate client_order_id once
  if (!session.trade.clientOrderId) {
    session.trade.clientOrderId = "koku-" + crypto.randomUUID();
  }
  session.trade.confirmExpiresAt = Date.now() + 5 * 60 * 1000;

  // Market closed warning?
  const status = await getMarketStatus(alpacaBase(link.mode), serverAlpacaHeaders(env));
  const marketWarn = status.isOpen ? "" : "\n\n" + f.assetConfirmMarketWarn;

  const sideLabel = session.trade.side === "buy" ? f.btnBuy : f.btnSell;
  const qtyLabel = resolvedQty + (resolvedQty === 1 ? " share" : " shares");
  const estTotal = (refPrice * resolvedQty).toFixed(2);
  const costLabel = session.trade.side === "buy" ? f.assetConfirmEstCost : f.assetConfirmEstProc;

  let msg = f.assetConfirmTitle + "\n\n";
  msg += "• *" + f.assetConfirmSide + ":* " + sideLabel + "\n";
  msg += "• *" + f.assetConfirmSymbol + ":* " + session.trade.ticker + "\n";
  msg += "• *" + f.assetConfirmQty + ":* " + qtyLabel + "\n";
  msg += "• *" + f.assetConfirmType + ":* " +
    (session.trade.orderType === "limit" ? f.btnLimit : f.btnMarket) + "\n";
  if (session.trade.orderType === "limit") {
    msg += "• *" + f.assetConfirmLimit + ":* $" + session.trade.limitPrice.toFixed(2) + "\n";
  }
  msg += "• *" + costLabel + ":* ~$" + estTotal + " (@" + refPrice.toFixed(2) + ")";
  msg += marketWarn;
  msg += "\n\n" + f.assetConfirmPrompt;

  session.step = "ASSET_CONFIRM";
  await saveSession(phone, session, env, 300);

  return sendWhatsAppButtons(phone, msg, [
    { id: "CONFIRM", title: f.btnConfirm },
    { id: "CANCEL", title: f.btnCancel }
  ], env);
}

async function submitTrade(phone, session, lang, env) {
  const f = FLOW[lang];
  const link = await getLink(phone, env);
  if (!link) {
    clearTrade(session);
    session.step = "MENU";
    await saveSession(phone, session, env);
    return sendLinkPrompt(phone, lang, env);
  }

  let creds;
  try {
    creds = await decryptCredentials(link.enc, env);
  } catch (err) {
    clearTrade(session);
    session.step = "MENU";
    await saveSession(phone, session, env);
    return sendWhatsApp(phone, f.assetFailedGeneric, env);
  }

  const body = {
    symbol: session.trade.ticker,
    qty: String(session.trade.qty),
    side: session.trade.side,
    type: session.trade.orderType,
    time_in_force: "day",
    client_order_id: session.trade.clientOrderId
  };
  if (session.trade.orderType === "limit") {
    body.limit_price = session.trade.limitPrice.toFixed(2);
  }

  let order = null;
  try {
    const res = await fetch(alpacaBase(link.mode) + "/v2/orders", {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": creds.keyId,
        "APCA-API-SECRET-KEY": creds.secret,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearTrade(session);
        session.step = "MENU";
        await saveSession(phone, session, env);
        return sendWhatsApp(phone, f.authRejected, env);
      }
      const reason = friendlyAlpacaError(payload, lang);
      clearTrade(session);
      session.step = "MENU";
      await saveSession(phone, session, env);
      await sendWhatsApp(phone, f.assetFailed.replace("{reason}", reason), env);
      return sendMainMenu(phone, lang, env, f.menuPrompt);
    }
    order = payload;
  } catch (err) {
    console.error("Order submit failed:", err?.message || err);
    clearTrade(session);
    session.step = "MENU";
    await saveSession(phone, session, env);
    await sendWhatsApp(phone, f.assetFailedGeneric, env);
    return sendMainMenu(phone, lang, env, f.menuPrompt);
  }

  clearTrade(session);
  session.step = "MENU";
  await saveSession(phone, session, env);

  const statusLine = [order.status, order.filled_qty ? order.filled_qty + " filled" : null]
    .filter(Boolean).join(" · ");
  await sendWhatsApp(phone,
    f.assetSubmitted.replace("{id}", order.id || "—").replace("{status}", statusLine || "accepted"),
    env);
  return sendMainMenu(phone, lang, env, f.menuPrompt);
}

function friendlyAlpacaError(payload, lang) {
  const code = (payload?.code || "").toString();
  const message = (payload?.message || "").toString();

  // Common Alpaca rejections, mapped to plain language
  if (code === 40310000 || /insufficient (buying power|qty)/i.test(message)) {
    return lang === "ES" ? "fondos insuficientes"
         : lang === "PT" ? "saldo insuficiente"
         : "insufficient buying power";
  }
  if (code === 42210000 || /not tradable/i.test(message)) {
    return lang === "ES" ? "símbolo no operable"
         : lang === "PT" ? "símbolo não negociável"
         : "symbol not tradable";
  }
  if (code === 40010001 || /client_order_id must be unique/i.test(message)) {
    return lang === "ES" ? "orden ya enviada"
         : lang === "PT" ? "ordem já enviada"
         : "order already submitted";
  }
  if (/market is closed/i.test(message)) {
    return lang === "ES" ? "mercado cerrado para este tipo de orden"
         : lang === "PT" ? "mercado fechado para este tipo de ordem"
         : "market closed for this order type";
  }
  // Fallback: first sentence of message, trimmed
  const short = message.split(".")[0].slice(0, 120);
  return short || "unknown error";
}

/* ============================================================
 * LIVE QUOTE (bid / ask only)
 * ============================================================ */
async function executeMarketLookup(phone, ticker, dict, env, langCode) {
  if (!ticker || ticker.length > 5) {
    await sendWhatsApp(phone, dict.invalidTicker, env);
    return;
  }

  const authHeaders = serverAlpacaHeaders(env);
  const apiBase = alpacaBase(tradingMode());

  try {
    await sendWhatsApp(phone, dict.fetching.replace("{ticker}", ticker), env);

    const statusPromise = getMarketStatus(apiBase, authHeaders);

    const stockUrl = "https://data.alpaca.markets/v2/stocks/"
      + encodeURIComponent(ticker) + "/quotes/latest?feed=iex";
    const stockRes = await fetch(stockUrl, { method: "GET", headers: authHeaders });
    if (!stockRes.ok) {
      await sendWhatsApp(phone, dict.feedError, env);
      return;
    }

    const stockData = await stockRes.json();
    const status = await statusPromise;
    const footer = buildMarketFooter(dict, status, langCode);

    const bid = stockData?.quote?.bp || 0;
    const ask = stockData?.quote?.ap || 0;

    if (!bid && !ask) {
      await sendWhatsApp(phone,
        dict.emptyParams.replace("{ticker}", ticker) + "\n" + footer, env);
      return;
    }

    let msg = dict.summaryTitle.replace("{ticker}", ticker) + "\n\n";
    msg += "💵 *" + dict.bid + ":* " + fmtQuote(bid) + "\n";
    msg += "💵 *" + dict.ask + ":* " + fmtQuote(ask);
    msg += footer;

    await sendWhatsApp(phone, msg, env);
  } catch (err) {
    console.error("Market lookup exception:", err?.message || err);
    await sendWhatsApp(phone, dict.feedError, env);
  }
}

function fmtQuote(n) {
  return Number.isFinite(n) && n > 0 ? "$" + n.toFixed(2) : "—";
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
