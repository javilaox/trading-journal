/**
 * Versión móvil del diario: una única página estática que se publica en GitHub Pages (docs/) y
 * se abre desde el navegador del teléfono.
 *
 * Por qué una web y no una app nativa: no hay que pasar por App Store, funciona igual en iPhone
 * y en Android, y se actualiza sola al publicar. Desde Safari se puede "Añadir a pantalla de
 * inicio" y queda con su icono, indistinguible de una app para el uso que se le va a dar.
 *
 * Cómo se mantiene sincronizada: NO hay servidor propio ni copia de datos. La página habla
 * directamente con la misma base de Supabase que la aplicación de escritorio, con el mismo
 * usuario. Un trade metido desde el móvil ya está en la base; el escritorio lo baja en su
 * siguiente `pullRemoteData` (al abrir o al refrescar). No hay nada que "sincronizar" a mano
 * porque no existen dos fuentes de verdad.
 *
 * Seguridad: el archivo solo lleva la URL y la clave anónima de Supabase, que son públicas por
 * diseño. Sin iniciar sesión no se puede leer ni escribir nada, y las políticas RLS de cada
 * tabla limitan cada consulta a las filas del propio usuario. La sesión se guarda en el
 * navegador, así que no hay que escribir la contraseña cada vez.
 *
 * El formulario escribe exactamente la misma forma de fila que `createTradeRemote` en main.js
 * (mismos nombres de columna, mismos valores por defecto, `client_uuid` incluido), para que un
 * trade creado en el móvil sea indistinguible de uno creado en el ordenador.
 */

const { ASSET_CATALOG } = require('./assetCatalog');
const { ACCOUNT_SIZES, CATEGORY_SUGGESTIONS } = require('./expenseOptions');
const {
  accountSizeToCapital,
  buildAccountNameFromExpense,
  looksLikeAccountPurchase,
} = require('./accountFromExpense');

function buildMobileHtml({ supabaseUrl, supabaseAnonKey }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Trading Journal" />
<meta name="theme-color" content="#0f172a" />
<!-- Icono del acceso directo en la pantalla de inicio. Se genera desde el icono de la
     aplicacion de escritorio, asi que los dos son el mismo. -->
<link rel="apple-touch-icon" href="icono.png" />
<link rel="icon" type="image/png" href="icono.png" />
<title>Trading Journal · Móvil</title>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<style>
  :root{
    --bg:#0f172a; --card:#131f37; --border:rgba(148,163,184,.18);
    --text:#e2e8f0; --muted:#94a3b8; --green:#22c55e; --red:#ef4444; --accent:#38bdf8;
    --safe-bottom:env(safe-area-inset-bottom,0px);
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{margin:0;background:var(--bg);color:var(--text);font-size:16px;line-height:1.45;
       font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
  .wrap{max-width:560px;margin:0 auto;padding:16px 14px calc(84px + var(--safe-bottom))}
  h1{font-size:1.15rem;margin:0}
  h2{font-size:1rem;margin:0 0 10px}
  .muted{color:var(--muted)} .small{font-size:.82rem}
  .pos{color:var(--green)} .neg{color:var(--red)}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px}
  label{display:block;font-size:.78rem;color:var(--muted);margin-bottom:6px}
  input,select,textarea{width:100%;background:rgba(255,255,255,.04);color:var(--text);
       border:1px solid var(--border);border-radius:10px;padding:12px;font-size:16px;font-family:inherit}
  input:focus,select:focus{outline:none;border-color:var(--accent)}
  /* Los campos de fecha y hora de iOS piden mas ancho del que tienen y se salian de su
     columna, pisando la de al lado. min-width:0 permite que el hijo del grid se encoja. */
  .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .row>*{min-width:0}
  input,select{max-width:100%}
  input[type=date],input[type=time]{-webkit-appearance:none;appearance:none;min-height:46px}
  .field{margin-bottom:12px}
  /* Botones tipo segmento: en el movil se acierta mucho antes que con un desplegable. */
  .seg{display:flex;gap:8px}
  .seg button{flex:1;padding:12px 6px;border-radius:10px;border:1px solid var(--border);
       background:rgba(255,255,255,.04);color:var(--text);font-size:.9rem;font-weight:600;font-family:inherit}
  .seg button.on{border-color:var(--accent);background:rgba(56,189,248,.16);color:#bae6fd}
  .seg button.on.tp{border-color:var(--green);background:rgba(34,197,94,.16);color:#bbf7d0}
  .seg button.on.sl{border-color:var(--red);background:rgba(239,68,68,.16);color:#fecaca}
  .btn{display:block;width:100%;padding:14px;border:none;border-radius:12px;font-size:1rem;
       font-weight:700;font-family:inherit;background:var(--green);color:#04210f}
  .btn:disabled{opacity:.6}
  .btn.secondary{background:rgba(255,255,255,.06);color:var(--text);border:1px solid var(--border);font-weight:600}
  .btn.danger{background:rgba(239,68,68,.12);color:var(--red);border:1px solid rgba(239,68,68,.4);font-weight:600}
  .btn+.btn{margin-top:10px}
  .kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .kpi{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:12px}
  .kpi span{display:block;color:var(--muted);font-size:.68rem;text-transform:uppercase;letter-spacing:.04em}
  .kpi strong{display:block;font-size:1.2rem;margin-top:4px;font-variant-numeric:tabular-nums}
  .kpi small{display:block;font-size:.7rem;margin-top:2px}
  .kpi-wide{grid-column:1 / -1}
  .trade{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
  .trade:last-child{border-bottom:none}
  .trade-main{flex:1;min-width:0}
  .trade-main strong{display:block;font-size:.95rem}
  .trade-main small{color:var(--muted);font-size:.75rem}
  .trade-pnl{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}
  .badge{display:inline-block;padding:1px 7px;border-radius:999px;font-size:.66rem;font-weight:800;margin-right:6px}
  .badge.tp{background:rgba(34,197,94,.15);color:var(--green)}
  .badge.sl{background:rgba(239,68,68,.15);color:var(--red)}
  .badge.be{background:rgba(148,163,184,.15);color:var(--muted)}
  .checks label{display:flex;align-items:center;gap:10px;color:var(--text);font-size:.9rem;
       margin:0 0 10px;padding:10px;border:1px solid var(--border);border-radius:10px}
  .checks input{width:22px;height:22px;flex:0 0 auto}
  .switch-row{display:flex;align-items:center;gap:10px;color:var(--text);font-size:.9rem;margin:0;
       padding:12px;border:1px solid var(--border);border-radius:10px}
  .switch-row input{width:22px;height:22px;flex:0 0 auto}
  /* ── Selector de activo (hoja inferior) ── */
  .picker{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
       background:rgba(255,255,255,.04);color:var(--text);border:1px solid var(--border);
       border-radius:10px;padding:12px;font-size:16px;font-family:inherit;text-align:left}
  .picker em{font-style:normal;color:var(--muted)}
  .picker.empty span{color:var(--muted)}
  .sheet{position:fixed;inset:0;background:rgba(2,6,23,.6);z-index:30;display:flex;align-items:flex-end}
  .sheet-body{width:100%;max-height:86vh;display:flex;flex-direction:column;background:var(--card);
       border-top-left-radius:18px;border-top-right-radius:18px;border-top:1px solid var(--border);
       padding:14px 14px calc(14px + var(--safe-bottom))}
  .sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .sheet-list{overflow-y:auto;-webkit-overflow-scrolling:touch;margin-top:10px}
  .sheet-group{color:var(--muted);font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;
       margin:14px 0 6px}
  .sheet-item{width:100%;text-align:left;background:none;border:none;border-bottom:1px solid var(--border);
       color:var(--text);font-size:.95rem;font-family:inherit;padding:13px 4px}
  .sheet-item.on{color:var(--accent);font-weight:700}
  .detail-row{display:flex;justify-content:space-between;gap:14px;padding:11px 0;border-bottom:1px solid var(--border)}
  .detail-row:last-child{border-bottom:none}
  .detail-row span{color:var(--muted);font-size:.82rem}
  .detail-row strong{text-align:right;font-size:.92rem;word-break:break-word}
  .filters-card{padding:10px 14px}
  .filters-card label{margin-bottom:4px}
  /* ── Calendario del mes ── */
  .cal-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
  .cal-head strong{font-size:1rem;text-transform:capitalize}
  .cal-nav{display:flex;gap:6px}
  .cal-nav button{width:40px;height:40px;border-radius:10px;border:1px solid var(--border);
       background:rgba(255,255,255,.04);color:var(--text);font-size:1.1rem;font-family:inherit}
  .cal-week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px}
  .cal-week span{text-align:center;color:var(--muted);font-size:.66rem;text-transform:uppercase;letter-spacing:.03em}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .cal-day{aspect-ratio:1;border:1px solid var(--border);border-radius:10px;background:rgba(255,255,255,.02);
       display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
       font-family:inherit;color:var(--text);padding:2px}
  .cal-day.empty{border:none;background:none}
  .cal-day b{font-size:.82rem;font-weight:600;font-variant-numeric:tabular-nums}
  .cal-day i{font-style:normal;font-size:.58rem;font-variant-numeric:tabular-nums;line-height:1}
  .cal-day.win{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.45)}
  .cal-day.win i{color:var(--green)}
  .cal-day.loss{background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.45)}
  .cal-day.loss i{color:var(--red)}
  .cal-day.flat{background:rgba(148,163,184,.14)}
  .cal-day.flat i{color:var(--muted)}
  .cal-day.today{box-shadow:inset 0 0 0 1px var(--accent)}
  .cal-day.sel{outline:2px solid var(--accent);outline-offset:1px}
  .cal-day.out{opacity:.28}
  .cal-summary{display:flex;justify-content:space-between;gap:10px;margin-top:14px;padding-top:12px;
       border-top:1px solid var(--border);font-size:.85rem}
  .day-title{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px}
  .day-title h2{margin:0;text-transform:capitalize}
  .shots{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .shot img{width:100%;border-radius:10px;border:1px solid var(--border);display:block;margin-top:6px}
  /* Barra inferior fija: el pulgar llega sin estirar la mano. */
  nav{position:fixed;left:0;right:0;bottom:0;display:flex;background:rgba(15,23,42,.96);
      border-top:1px solid var(--border);padding-bottom:var(--safe-bottom);backdrop-filter:blur(10px);z-index:5}
  nav button{flex:1;background:none;border:none;color:var(--muted);font-family:inherit;
      font-size:.72rem;padding:10px 4px 12px;font-weight:600}
  nav button.on{color:var(--accent)}
  nav button i{display:block;font-size:1.15rem;font-style:normal;margin-bottom:2px}
  .toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(78px + var(--safe-bottom));
      background:#0b1220;border:1px solid var(--border);border-radius:12px;padding:10px 16px;
      font-size:.85rem;z-index:20;opacity:0;transition:opacity .2s ease;pointer-events:none;max-width:92vw}
  .toast.show{opacity:1}
  .toast.err{border-color:rgba(239,68,68,.5);color:#fecaca}
  .toast.ok{border-color:rgba(34,197,94,.5);color:#bbf7d0}
  #gate{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  #gate .card{width:100%;max-width:380px}
  .head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
  .link{background:none;border:none;color:var(--muted);font-size:.8rem;font-family:inherit;padding:0}
  .hidden{display:none !important}
</style>
</head>
<body>

<div id="gate">
  <div class="card">
    <h1 style="margin-bottom:4px">Trading Journal</h1>
    <p class="muted small" style="margin:0 0 16px">Entra con la misma cuenta que usas en el ordenador.</p>
    <div class="field">
      <label for="email">Correo</label>
      <input id="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" />
    </div>
    <div class="field">
      <label for="password">Contraseña</label>
      <input id="password" type="password" autocomplete="current-password" />
    </div>
    <button class="btn" id="loginBtn">Entrar</button>
    <p class="small" id="gateError" style="color:var(--red);min-height:20px;margin:12px 0 0"></p>
  </div>
</div>

<div class="wrap hidden" id="app">
  <div class="head">
    <h1 id="viewTitle">Nuevo trade</h1>
    <button class="link" id="logoutBtn">Salir</button>
  </div>

  <!-- ───────── Nuevo / editar trade ───────── -->
  <section id="viewForm">
    <div class="card">
      <div class="row">
        <div class="field"><label for="fDate">Fecha</label><input id="fDate" type="date" /></div>
        <div class="field">
          <label for="assetBtn">Par</label>
          <button type="button" class="picker" id="assetBtn"><span id="assetLabel">Elegir activo</span><em>▾</em></button>
        </div>
      </div>
      <div class="row">
        <div class="field"><label for="fEntry">Hora entrada</label><input id="fEntry" type="time" /></div>
        <div class="field"><label for="fExit">Hora salida</label><input id="fExit" type="time" /></div>
      </div>
      <div class="field"><label for="fAccount">Cuenta</label><select id="fAccount"></select></div>
      <div class="field"><label for="fStrategy">Estrategia</label><select id="fStrategy"></select></div>

      <div class="field">
        <label>Dirección</label>
        <div class="seg" id="segDirection">
          <button type="button" data-value="LONG">Compra</button>
          <button type="button" data-value="SHORT">Venta</button>
        </div>
      </div>

      <div class="field">
        <label>Resultado</label>
        <div class="seg" id="segResult">
          <button type="button" class="tp" data-value="TP">TP</button>
          <button type="button" class="sl" data-value="SL">SL</button>
          <button type="button" data-value="BE">BE</button>
        </div>
      </div>

      <div class="field hidden" id="beRow">
        <label>El BE, ¿en qué habría acabado?</label>
        <div class="seg" id="segBeAfter">
          <button type="button" class="tp" data-value="TP">Habría sido TP</button>
          <button type="button" class="sl" data-value="SL">Habría sido SL</button>
        </div>
      </div>

      <div class="row">
        <div class="field"><label for="fPnl">PnL (€)</label><input id="fPnl" type="number" inputmode="decimal" step="0.01" /></div>
        <div class="field"><label for="fLot">Lotaje</label><input id="fLot" type="number" inputmode="decimal" step="0.01" /></div>
      </div>
      <div class="row">
        <div class="field"><label for="fComm">Comisión (€)</label><input id="fComm" type="number" inputmode="decimal" step="0.01" /></div>
        <div class="field"><label for="fNet">PnL neto (€)</label><input id="fNet" type="number" inputmode="decimal" step="0.01" /></div>
      </div>
    </div>

    <div class="card hidden" id="metricsCard">
      <h2>Métricas de la estrategia</h2>
      <div class="checks" id="metricsList"></div>
    </div>

    <div class="card">
      <h2>Capturas</h2>
      <div class="shots">
        <div class="shot">
          <label for="fImgBefore">Antes</label>
          <input id="fImgBefore" type="file" accept="image/*" />
          <img id="imgBeforePreview" class="hidden" alt="" />
        </div>
        <div class="shot">
          <label for="fImgAfter">Después</label>
          <input id="fImgAfter" type="file" accept="image/*" />
          <img id="imgAfterPreview" class="hidden" alt="" />
        </div>
      </div>
    </div>

    <button class="btn" id="saveBtn">Guardar trade</button>
    <button class="btn secondary hidden" id="cancelEditBtn">Cancelar edición</button>
    <button class="btn danger hidden" id="deleteBtn">Eliminar trade</button>
  </section>

  <!-- ───────── Lista de trades ───────── -->
  <section id="viewList" class="hidden">
    <div class="card filters-card">
      <div class="row">
        <div><label for="filterAccount">Cuenta</label><select id="filterAccount"></select></div>
        <div><label for="filterStrategy">Estrategia</label><select id="filterStrategy"></select></div>
      </div>
    </div>
    <div class="card">
      <div class="cal-head">
        <strong id="calMonth">—</strong>
        <div class="cal-nav">
          <button type="button" id="calPrev" aria-label="Mes anterior">‹</button>
          <button type="button" id="calToday" aria-label="Hoy">•</button>
          <button type="button" id="calNext" aria-label="Mes siguiente">›</button>
        </div>
      </div>
      <div class="cal-week">
        <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
      </div>
      <div class="cal-grid" id="calGrid"></div>
      <div class="cal-summary">
        <span class="muted">Mes: <b id="calMonthOps">0</b> ops</span>
        <strong id="calMonthPnl">0.00€</strong>
      </div>
    </div>
    <div class="card">
      <div class="day-title">
        <h2 id="dayTitle">Selecciona un día</h2>
        <strong id="dayPnl" class="small"></strong>
      </div>
      <div id="tradeList"><p class="muted small">Toca un día del calendario.</p></div>
    </div>
  </section>

  <!-- ───────── Resumen ───────── -->
  <section id="viewStats" class="hidden">
    <div class="card filters-card">
      <div class="row">
        <div><label for="filterAccount2">Cuenta</label><select id="filterAccount2"></select></div>
        <div><label for="filterStrategy2">Estrategia</label><select id="filterStrategy2"></select></div>
      </div>
    </div>
    <div class="card">
      <div class="seg" id="segPeriod" style="margin-bottom:14px">
        <button type="button" data-value="month" class="on">Este mes</button>
        <button type="button" data-value="90">90 días</button>
        <button type="button" data-value="all">Todo</button>
      </div>
      <div class="kpis" id="statsKpis"></div>
    </div>
    <div class="card">
      <h2>Por estrategia</h2>
      <div id="statsByStrategy"></div>
    </div>
  </section>
</div>

  <!-- ───────── Gestión: retiros y gastos ───────── -->
  <section id="viewManage" class="hidden">
    <div class="card">
      <div class="seg" id="segManage" style="margin-bottom:14px">
        <button type="button" data-value="withdrawals" class="on">Retiros</button>
        <button type="button" data-value="expenses">Gastos</button>
      </div>
      <div class="kpis" id="manageKpis"></div>
    </div>

    <div class="card">
      <div class="day-title">
        <h2 id="manageFormTitle">Nuevo retiro</h2>
      </div>
      <div class="field">
        <label for="mgPropBtn">Prop</label>
        <button type="button" class="picker" id="mgPropBtn"><span id="mgPropLabel">Elegir prop</span><em>▾</em></button>
      </div>
      <div class="row">
        <div class="field"><label for="mgAmount">Importe (€)</label><input id="mgAmount" type="number" inputmode="decimal" step="0.01" /></div>
        <div class="field"><label for="mgDate">Fecha</label><input id="mgDate" type="date" /></div>
      </div>
      <div class="field expense-only hidden">
        <label for="mgCategoryBtn">Categoría</label>
        <button type="button" class="picker" id="mgCategoryBtn"><span id="mgCategoryLabel">Elegir categoría</span><em>▾</em></button>
      </div>
      <div class="field expense-only hidden">
        <label for="mgSize">Tamaño de cuenta</label>
        <select id="mgSize"></select>
      </div>
      <div class="field"><label for="mgNote">Nota (opcional)</label><input id="mgNote" /></div>

      <!-- Comprar un challenge es un gasto y una cuenta nueva a la vez. -->
      <div class="field expense-only hidden" id="mgCreateAccountWrap">
        <label class="switch-row" for="mgCreateAccount">
          <input id="mgCreateAccount" type="checkbox" />
          <span>Crear también la cuenta de esta compra</span>
        </label>
        <div id="mgAccountNumberWrap" class="hidden" style="margin-top:10px">
          <label for="mgAccountNumber">Nº de cuenta (opcional)</label>
          <input id="mgAccountNumber" placeholder="Los últimos dígitos" />
          <p class="muted small" id="mgAccountPreview" style="margin:6px 0 0"></p>
        </div>
      </div>

      <button class="btn" id="mgSaveBtn">Guardar</button>
      <button class="btn secondary hidden" id="mgCancelBtn">Cancelar edición</button>
    </div>

    <div class="card">
      <h2 id="manageListTitle">Últimos retiros</h2>
      <div id="manageList"><p class="muted small">Cargando…</p></div>
    </div>
  </section>

<!-- Ficha de un retiro o gasto: se abre al tocarlo en la lista y muestra todos sus datos,
     porque en la fila solo caben tres. Desde aquí se edita o se borra. -->
<div class="sheet hidden" id="detailSheet">
  <div class="sheet-body">
    <div class="sheet-head">
      <strong id="detailTitle">Detalle</strong>
      <button type="button" class="link" id="detailClose">Cerrar</button>
    </div>
    <div class="sheet-list">
      <div id="detailBody"></div>
      <button class="btn secondary" id="detailEditBtn" style="margin-top:14px">Editar</button>
      <button class="btn danger" id="detailDeleteBtn">Borrar</button>
    </div>
  </div>
</div>

<!-- Hoja inferior reutilizable para las listas simples (prop, categoría): misma que la de
     activos pero sin grupos. Una sola en el documento, se rellena al abrirla. -->
<div class="sheet hidden" id="listSheet">
  <div class="sheet-body">
    <div class="sheet-head">
      <strong id="listSheetTitle">Elegir</strong>
      <button type="button" class="link" id="listSheetClose">Cerrar</button>
    </div>
    <input type="search" id="listSheetSearch" placeholder="Buscar…" autocomplete="off" />
    <div class="sheet-list" id="listSheetOptions"></div>
  </div>
</div>

<!-- Selector de activo: hoja inferior con buscador. La lista es cerrada a proposito (ver
     services/assetCatalog.js): un activo escrito a mano parte las estadisticas por par. -->
<div class="sheet hidden" id="assetSheet">
  <div class="sheet-body">
    <div class="sheet-head">
      <strong>Elegir activo</strong>
      <button type="button" class="link" id="assetClose">Cerrar</button>
    </div>
    <input type="search" id="assetSearch" placeholder="Buscar activo…" autocomplete="off" />
    <div class="sheet-list" id="assetOptions"></div>
  </div>
</div>

<nav class="hidden" id="nav">
  <button data-view="form" class="on"><i>＋</i>Nuevo</button>
  <button data-view="list"><i>≡</i>Trades</button>
  <button data-view="stats"><i>◔</i>Resumen</button>
  <button data-view="manage"><i>€</i>Gestión</button>
</nav>

<div class="toast" id="toast"></div>

<script>
(function () {
  'use strict';

  var SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
  var SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
  var IMAGES_BUCKET = 'trade-images';

  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
  });

  var USER = null;
  var ACCOUNTS = [];
  var STRATEGIES = [];
  var TRADES = [];
  var MONTH = null;            // { y, m } del mes que muestra el calendario
  var MONTH_TRADES = [];       // trades de ese mes (consulta propia, no depende del limite)
  var SELECTED_DAY = null;     // 'AAAA-MM-DD' del dia abierto bajo el calendario
  var PROPS = [];              // props guardadas (expense_props), para retiros y gastos
  var MOVEMENTS = { withdrawals: [], expenses: [] };
  var FILTERS = { account: '', strategy: '' };
  var EDITING = null;          // trade que se está editando, o null si es uno nuevo
  var IMAGES = { before: null, after: null };  // referencias "storage:..." ya subidas
  var netTouched = false;      // si el usuario escribe el neto a mano, se deja de calcular

  var $ = function (id) { return document.getElementById(id); };

  function toast(msg, kind) {
    var el = $('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (kind || '');
    setTimeout(function () { el.className = 'toast ' + (kind || ''); }, 2600);
  }

  function money(v) {
    var n = Number(v) || 0;
    return (n > 0 ? '+' : '') + n.toFixed(2) + '€';
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function displayDate(iso) {
    var s = String(iso || '').slice(0, 10).split('-');
    return s.length === 3 ? s[2] + '-' + s[1] + '-' + s[0] : String(iso || '');
  }

  /* ─────────────────────────── Sesión ─────────────────────────── */

  async function boot() {
    var res = await db.auth.getSession();
    if (res.data && res.data.session) {
      USER = res.data.session.user;
      await startApp();
    } else {
      $('gate').classList.remove('hidden');
    }
  }

  $('loginBtn').addEventListener('click', async function () {
    var btn = $('loginBtn');
    btn.disabled = true;
    $('gateError').textContent = '';
    var out = await db.auth.signInWithPassword({
      email: ($('email').value || '').trim(),
      password: $('password').value || '',
    });
    btn.disabled = false;
    if (out.error) {
      $('gateError').textContent = out.error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : out.error.message;
      return;
    }
    USER = out.data.user;
    $('gate').classList.add('hidden');
    await startApp();
  });

  $('password').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('loginBtn').click();
  });

  $('logoutBtn').addEventListener('click', async function () {
    await db.auth.signOut();
    location.reload();
  });

  async function startApp() {
    $('gate').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('nav').classList.remove('hidden');
    resetForm();
    SELECTED_DAY = todayIso();
    $('mgDate').value = todayIso();
    syncManageForm();
    await Promise.all([loadCatalogs(), loadTrades(), loadMonth()]);
  }

  /* ─────────────────────── Cuentas y estrategias ─────────────────────── */

  async function loadCatalogs() {
    var accRes = await db.from('real_accounts').select('id,name,disabled_by_max_dd').order('name');
    var strRes = await db.from('real_strategies').select('id,name,custom_metrics,is_active').order('name');
    var propRes = await db.from('expense_props').select('id,name').is('deleted_at', null).order('name');
    var catRes = await db.from('expense_categories').select('id,name').is('deleted_at', null).order('name');

    ACCOUNTS = (accRes.data || []).filter(function (a) { return a.name; });
    STRATEGIES = (strRes.data || []).filter(function (s) { return s.name && s.is_active !== false; });
    PROPS = (propRes.data || []).filter(function (p) { return p.name; });
    // Si la migración de categorías aún no está aplicada, catRes trae error: no se rompe nada,
    // simplemente se sigue con las sugerencias y las ya usadas en gastos.
    SAVED_CATEGORIES = (catRes && !catRes.error ? catRes.data || [] : [])
      .map(function (c) { return c.name; })
      .filter(Boolean);

    // Una cuenta marcada como deshabilitada (quemada por máximo DD) no se puede seguir
    // operando, así que no aparece al registrar un trade. En los filtros sí sale, porque sus
    // operaciones antiguas siguen existiendo y hay que poder verlas.
    var operable = ACCOUNTS.filter(function (a) { return !a.disabled_by_max_dd; }).map(function (a) { return a.name; });
    fillSelect($('fAccount'), operable, localStorage.getItem('lastAccount'));
    fillSelect($('fStrategy'), STRATEGIES.map(function (s) { return s.name; }), localStorage.getItem('lastStrategy'));
    renderFilters();
    renderMetrics({});
  }

  /* ───────── Filtros de cuenta y estrategia (Trades y Resumen) ───────── */

  function renderFilters() {
    var accounts = ACCOUNTS.map(function (a) { return a.name; });
    var strategies = STRATEGIES.map(function (s) { return s.name; });
    var opts = function (list, selected, allLabel) {
      return '<option value="">' + allLabel + '</option>' + list.map(function (n) {
        return '<option value="' + escapeAttr(n) + '"' + (n === selected ? ' selected' : '') + '>' + escapeHtml(n) + '</option>';
      }).join('');
    };
    ['filterAccount', 'filterAccount2'].forEach(function (id) {
      if ($(id)) $(id).innerHTML = opts(accounts, FILTERS.account, 'Todas las cuentas');
    });
    ['filterStrategy', 'filterStrategy2'].forEach(function (id) {
      if ($(id)) $(id).innerHTML = opts(strategies, FILTERS.strategy, 'Todas las estrategias');
    });
  }

  ['filterAccount', 'filterAccount2', 'filterStrategy', 'filterStrategy2'].forEach(function (id) {
    $(id).addEventListener('change', function (e) {
      // Los dos pares de desplegables son el mismo filtro: se comparte para que al cambiarlo en
      // una pestaña la otra ya esté igual y no haya dos verdades.
      if (id.indexOf('filterAccount') === 0) FILTERS.account = e.target.value;
      else FILTERS.strategy = e.target.value;
      renderFilters();
      renderCalendar();
      renderStats();
    });
  });

  /** Filtro común: un trade cuenta si encaja con la cuenta y la estrategia elegidas. */
  function matchesFilters(t) {
    if (FILTERS.account && String(t.account || '') !== FILTERS.account) return false;
    if (FILTERS.strategy && String(t.strategy || '') !== FILTERS.strategy) return false;
    return true;
  }

  function fillSelect(sel, names, preferred) {
    sel.innerHTML = names.map(function (n) {
      return '<option value="' + escapeAttr(n) + '">' + escapeHtml(n) + '</option>';
    }).join('');
    if (!names.length) sel.innerHTML = '<option value="">(sin datos)</option>';
    if (preferred && names.indexOf(preferred) >= 0) sel.value = preferred;
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(v) { return escapeHtml(v).replace(/"/g, '&quot;'); }

  /** Checklist propio de la estrategia elegida; los valores viajan en custom_metrics del trade. */
  function renderMetrics(values) {
    var name = $('fStrategy').value;
    var strategy = STRATEGIES.filter(function (s) { return s.name === name; })[0];
    var raw = strategy && strategy.custom_metrics;
    var list = Array.isArray(raw) ? raw : [];
    var names = list.map(function (m) { return typeof m === 'string' ? m : String((m && m.name) || ''); })
                    .filter(Boolean);

    if (!names.length) {
      $('metricsCard').classList.add('hidden');
      $('metricsList').innerHTML = '';
      return;
    }
    $('metricsCard').classList.remove('hidden');
    $('metricsList').innerHTML = names.map(function (n) {
      var checked = values && values[n] === true ? ' checked' : '';
      return '<label><input type="checkbox" data-metric="' + escapeAttr(n) + '"' + checked + ' />' +
             '<span>' + escapeHtml(n) + '</span></label>';
    }).join('');
  }

  function readMetrics() {
    var out = {};
    var boxes = $('metricsList').querySelectorAll('[data-metric]');
    for (var i = 0; i < boxes.length; i += 1) out[boxes[i].getAttribute('data-metric')] = boxes[i].checked;
    return out;
  }

  $('fStrategy').addEventListener('change', function () { renderMetrics({}); });

  /* ─────────────────────────── Segmentos ─────────────────────────── */

  function segValue(id) {
    var on = $(id).querySelector('button.on');
    return on ? on.getAttribute('data-value') : '';
  }
  function segSet(id, value) {
    var btns = $(id).querySelectorAll('button');
    for (var i = 0; i < btns.length; i += 1) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-value') === value);
    }
  }
  ['segDirection', 'segResult', 'segBeAfter', 'segPeriod', 'segManage'].forEach(function (id) {
    $(id).addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      segSet(id, btn.getAttribute('data-value'));
      if (id === 'segResult') $('beRow').classList.toggle('hidden', btn.getAttribute('data-value') !== 'BE');
      if (id === 'segPeriod') renderStats();
    });
  });

  /* ─────────────────────── PnL neto automático ─────────────────────── */

  function syncNet() {
    if (netTouched) return;
    var pnl = Number($('fPnl').value) || 0;
    var comm = Number($('fComm').value) || 0;
    $('fNet').value = (pnl - comm).toFixed(2);
  }
  $('fPnl').addEventListener('input', syncNet);
  $('fComm').addEventListener('input', syncNet);
  $('fNet').addEventListener('input', function () { netTouched = true; });

  /* ─────────────────────────── Imágenes ─────────────────────────── */

  async function handleImage(inputId, previewId, slot) {
    var file = $(inputId).files && $(inputId).files[0];
    if (!file) return;
    toast('Subiendo imagen…');
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var path = USER.id + '/' + cryptoUuid() + '.' + ext;
    var up = await db.storage.from(IMAGES_BUCKET).upload(path, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });
    if (up.error) { toast('No se pudo subir la imagen', 'err'); return; }
    // Misma referencia que usa el escritorio, para que la imagen se vea en los dos sitios.
    IMAGES[slot] = 'storage:' + path;
    var url = URL.createObjectURL(file);
    var img = $(previewId);
    img.src = url;
    img.classList.remove('hidden');
    toast('Imagen lista', 'ok');
  }
  $('fImgBefore').addEventListener('change', function () { handleImage('fImgBefore', 'imgBeforePreview', 'before'); });
  $('fImgAfter').addEventListener('change', function () { handleImage('fImgAfter', 'imgAfterPreview', 'after'); });

  function cryptoUuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  async function showStoredImage(ref, previewId) {
    var img = $(previewId);
    img.classList.add('hidden');
    if (!ref || String(ref).indexOf('storage:') !== 0) return;
    var res = await db.storage.from(IMAGES_BUCKET).createSignedUrl(String(ref).slice(8), 3600);
    if (res.data && res.data.signedUrl) {
      img.src = res.data.signedUrl;
      img.classList.remove('hidden');
    }
  }

  /* ─────────────────────────── Guardar ─────────────────────────── */

  function resetForm() {
    EDITING = null;
    IMAGES = { before: null, after: null };
    netTouched = false;
    $('viewTitle').textContent = 'Nuevo trade';
    $('fDate').value = todayIso();
    setAsset(localStorage.getItem('lastAsset') || '');
    $('fEntry').value = '';
    $('fExit').value = '';
    $('fPnl').value = '';
    $('fLot').value = '';
    $('fComm').value = '';
    $('fNet').value = '';
    segSet('segDirection', 'LONG');
    segSet('segResult', 'TP');
    segSet('segBeAfter', '');
    $('beRow').classList.add('hidden');
    $('imgBeforePreview').classList.add('hidden');
    $('imgAfterPreview').classList.add('hidden');
    $('fImgBefore').value = '';
    $('fImgAfter').value = '';
    $('cancelEditBtn').classList.add('hidden');
    $('deleteBtn').classList.add('hidden');
    $('saveBtn').textContent = 'Guardar trade';
    renderMetrics({});
  }

  function buildRow() {
    var pnl = Number($('fPnl').value);
    if (!isFinite(pnl)) return { error: 'Escribe el PnL de la operación.' };
    var result = segValue('segResult');
    if (!result) return { error: 'Marca si fue TP, SL o BE.' };
    if (!ASSET) return { error: 'Elige el activo de la lista.' };
    var comm = Number($('fComm').value) || 0;
    var netRaw = $('fNet').value;
    var net = netRaw === '' ? pnl - comm : Number(netRaw) || 0;

    return {
      row: {
        date: $('fDate').value || todayIso(),
        asset: ASSET,
        result: result,
        be_after_result: result === 'BE' ? (segValue('segBeAfter') || null) : null,
        pnl: pnl,
        strategy: $('fStrategy').value || '',
        account: $('fAccount').value || null,
        lotaje: Number($('fLot').value) || 0,
        commission: comm,
        pnl_net: net,
        image_before: IMAGES.before,
        image_after: IMAGES.after,
        entry_time: $('fEntry').value || null,
        exit_time: $('fExit').value || null,
        direction: segValue('segDirection') || 'LONG',
        custom_metrics: readMetrics(),
        is_composite_position: false,
        position_legs: [],
        updated_at: new Date().toISOString(),
      },
    };
  }

  $('saveBtn').addEventListener('click', async function () {
    var built = buildRow();
    if (built.error) { toast(built.error, 'err'); return; }
    var btn = $('saveBtn');
    btn.disabled = true;

    var out;
    if (EDITING) {
      out = await db.from('trades').update(built.row).eq('id', EDITING.id).eq('user_id', USER.id);
    } else {
      // client_uuid: la aplicación de escritorio lo usa para no duplicar filas al sincronizar.
      built.row.user_id = USER.id;
      built.row.client_uuid = cryptoUuid();
      out = await db.from('trades').insert(built.row);
    }
    btn.disabled = false;

    if (out.error) { toast('No se pudo guardar: ' + out.error.message, 'err'); return; }

    localStorage.setItem('lastAccount', $('fAccount').value || '');
    localStorage.setItem('lastStrategy', $('fStrategy').value || '');
    localStorage.setItem('lastAsset', ASSET);
    toast(EDITING ? 'Trade actualizado' : 'Trade guardado', 'ok');
    resetForm();
    await Promise.all([loadTrades(), loadMonth()]);
  });

  $('cancelEditBtn').addEventListener('click', function () { resetForm(); });

  $('deleteBtn').addEventListener('click', async function () {
    if (!EDITING) return;
    if (!window.confirm('¿Eliminar este trade? No se puede deshacer.')) return;
    var out = await db.from('trades').delete().eq('id', EDITING.id).eq('user_id', USER.id);
    if (out.error) { toast('No se pudo eliminar: ' + out.error.message, 'err'); return; }
    toast('Trade eliminado', 'ok');
    resetForm();
    await Promise.all([loadTrades(), loadMonth()]);
    showView('list');
  });

  /* ─────────────────────────── Lista ─────────────────────────── */

  async function loadTrades() {
    var res = await db.from('trades').select('*').order('date', { ascending: false }).limit(200);
    if (res.error) { toast('No se pudieron cargar los trades', 'err'); return; }
    TRADES = res.data || [];
    renderStats();
  }

  /* ───────── Selector de activo ─────────
   * Lista cerrada (la misma del ordenador) y buscador. Antes era un campo de texto libre: se
   * podia guardar "Nas100" o un activo inventado, y como el activo es la clave con la que se
   * agrupan las estadisticas por par, cada variante habria contado como un activo distinto.
   */

  var ASSET_CATALOG = ${JSON.stringify(ASSET_CATALOG)};
  var ASSET = '';

  function setAsset(value) {
    ASSET = value || '';
    var btn = $('assetBtn');
    $('assetLabel').textContent = ASSET || 'Elegir activo';
    btn.classList.toggle('empty', !ASSET);
  }

  function recentAssets() {
    var seen = {};
    var out = [];
    TRADES.forEach(function (t) {
      if (t.asset && !seen[t.asset]) { seen[t.asset] = true; out.push(t.asset); }
    });
    return out.slice(0, 6);
  }

  function renderAssetOptions() {
    var q = ($('assetSearch').value || '').trim().toUpperCase();
    var html = '';

    // Los ultimos activos operados primero: en la practica se repiten casi siempre.
    if (!q) {
      var recent = recentAssets();
      if (recent.length) {
        html += '<div class="sheet-group">Recientes</div>' + recent.map(function (a) {
          return '<button type="button" class="sheet-item' + (a === ASSET ? ' on' : '') +
                 '" data-asset="' + escapeAttr(a) + '">' + escapeHtml(a) + '</button>';
        }).join('');
      }
    }

    ASSET_CATALOG.forEach(function (group) {
      var items = group.assets.filter(function (a) {
        return !q || a.value.toUpperCase().indexOf(q) >= 0 || String(a.label).toUpperCase().indexOf(q) >= 0;
      });
      if (!items.length) return;
      html += '<div class="sheet-group">' + escapeHtml(group.group) + '</div>' + items.map(function (a) {
        return '<button type="button" class="sheet-item' + (a.value === ASSET ? ' on' : '') +
               '" data-asset="' + escapeAttr(a.value) + '">' + escapeHtml(a.label) + '</button>';
      }).join('');
    });

    $('assetOptions').innerHTML = html || '<p class="muted small">Ningún activo coincide.</p>';
    $('assetOptions').querySelectorAll('[data-asset]').forEach(function (el) {
      el.addEventListener('click', function () {
        setAsset(el.getAttribute('data-asset'));
        closeAssetSheet();
      });
    });
  }

  function openAssetSheet() {
    $('assetSheet').classList.remove('hidden');
    $('assetSearch').value = '';
    renderAssetOptions();
  }
  function closeAssetSheet() { $('assetSheet').classList.add('hidden'); }

  $('assetBtn').addEventListener('click', openAssetSheet);
  $('assetClose').addEventListener('click', closeAssetSheet);
  $('assetSearch').addEventListener('input', renderAssetOptions);
  $('assetSheet').addEventListener('click', function (e) {
    if (e.target === $('assetSheet')) closeAssetSheet();
  });

  /* ───────── Calendario del mes ─────────
   * Misma idea que el calendario del ordenador: un vistazo al mes y el color dice si el día fue
   * bueno o malo. Se consulta el mes entero por su rango de fechas y no se reutiliza la lista
   * de "últimos trades", porque al retroceder meses esa lista se queda corta y el calendario
   * mostraría días vacíos que sí tienen operaciones.
   */

  var MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                     'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoOf(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }

  async function loadMonth() {
    if (!MONTH) {
      var now = new Date();
      MONTH = { y: now.getFullYear(), m: now.getMonth() };
    }
    var first = isoOf(MONTH.y, MONTH.m, 1);
    var lastDay = new Date(MONTH.y, MONTH.m + 1, 0).getDate();
    var last = isoOf(MONTH.y, MONTH.m, lastDay);

    var res = await db.from('trades').select('*').gte('date', first).lte('date', last);
    if (res.error) { toast('No se pudo cargar el mes', 'err'); return; }
    MONTH_TRADES = res.data || [];
    renderCalendar();
  }

  function byDay() {
    var map = {};
    MONTH_TRADES.filter(matchesFilters).forEach(function (t) {
      var key = String(t.date || '').slice(0, 10);
      if (!map[key]) map[key] = { pnl: 0, n: 0, trades: [] };
      map[key].pnl += Number(t.pnl) || 0;
      map[key].n += 1;
      map[key].trades.push(t);
    });
    return map;
  }

  /** 1.118 € ocupa demasiado en una celda de 45 px: se abrevia a 1.1k. */
  function shortMoney(v) {
    var n = Number(v) || 0;
    var sign = n > 0 ? '+' : n < 0 ? '-' : '';
    var abs = Math.abs(n);
    if (abs >= 1000) return sign + (abs / 1000).toFixed(abs >= 10000 ? 0 : 1) + 'k';
    return sign + Math.round(abs);
  }

  function renderCalendar() {
    var map = byDay();
    $('calMonth').textContent = MONTH_NAMES[MONTH.m] + ' ' + MONTH.y;

    // La semana empieza en lunes, como en el ordenador (getDay() da 0 para domingo).
    var firstWeekday = (new Date(MONTH.y, MONTH.m, 1).getDay() + 6) % 7;
    var days = new Date(MONTH.y, MONTH.m + 1, 0).getDate();
    var todayIsoStr = todayIso();

    var cells = [];
    for (var b = 0; b < firstWeekday; b += 1) cells.push('<div class="cal-day empty"></div>');
    for (var d = 1; d <= days; d += 1) {
      var iso = isoOf(MONTH.y, MONTH.m, d);
      var info = map[iso];
      var cls = 'cal-day';
      if (info) cls += info.pnl > 0 ? ' win' : info.pnl < 0 ? ' loss' : ' flat';
      else cls += ' out';
      if (iso === todayIsoStr) cls += ' today';
      if (iso === SELECTED_DAY) cls += ' sel';
      cells.push(
        '<button type="button" class="' + cls + '" data-day="' + iso + '">' +
          '<b>' + d + '</b>' +
          (info ? '<i>' + shortMoney(info.pnl) + '</i>' : '') +
        '</button>'
      );
    }
    $('calGrid').innerHTML = cells.join('');

    var visible = MONTH_TRADES.filter(matchesFilters);
    var monthPnl = 0;
    visible.forEach(function (t) { monthPnl += Number(t.pnl) || 0; });
    $('calMonthOps').textContent = visible.length;
    var pnlEl = $('calMonthPnl');
    pnlEl.textContent = money(monthPnl);
    pnlEl.className = monthPnl >= 0 ? 'pos' : 'neg';

    $('calGrid').querySelectorAll('[data-day]').forEach(function (el) {
      el.addEventListener('click', function () { selectDay(el.getAttribute('data-day')); });
    });

    // Si el día abierto ya no pertenece a este mes, se limpia el detalle.
    if (SELECTED_DAY && SELECTED_DAY.slice(0, 7) !== MONTH.y + '-' + pad2(MONTH.m + 1)) {
      SELECTED_DAY = null;
    }
    renderDay();
  }

  function selectDay(iso) {
    SELECTED_DAY = SELECTED_DAY === iso ? null : iso;
    renderCalendar();
  }

  function renderDay() {
    var host = $('tradeList');
    var title = $('dayTitle');
    var pnlEl = $('dayPnl');

    if (!SELECTED_DAY) {
      title.textContent = 'Selecciona un día';
      pnlEl.textContent = '';
      host.innerHTML = '<p class="muted small">Toca un día del calendario para ver sus operaciones.</p>';
      return;
    }

    var parts = SELECTED_DAY.split('-');
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    title.textContent = DAY_NAMES[date.getDay()] + ' ' + Number(parts[2]) + ' de ' + MONTH_NAMES[date.getMonth()];

    var list = MONTH_TRADES.filter(matchesFilters).filter(function (t) {
      return String(t.date || '').slice(0, 10) === SELECTED_DAY;
    });
    list.sort(function (a, b) {
      return String(a.entry_time || '').localeCompare(String(b.entry_time || ''));
    });

    var pnl = 0;
    list.forEach(function (t) { pnl += Number(t.pnl) || 0; });
    pnlEl.textContent = list.length ? money(pnl) : '';
    pnlEl.className = 'small ' + (pnl >= 0 ? 'pos' : 'neg');

    if (!list.length) {
      host.innerHTML = '<p class="muted small">Sin operaciones este día. ' +
        '<button class="link" id="newHere" style="color:var(--accent)">Añadir una</button></p>';
      $('newHere').addEventListener('click', function () {
        resetForm();
        $('fDate').value = SELECTED_DAY;
        showView('form');
      });
      return;
    }

    host.innerHTML = list.map(function (t) { return tradeRow(t); }).join('');
    host.querySelectorAll('.trade').forEach(function (el) {
      el.addEventListener('click', function () { editTrade(Number(el.getAttribute('data-id'))); });
    });
  }

  function tradeRow(t) {
    var r = String(t.result || '').toUpperCase();
    var cls = r === 'TP' ? 'tp' : r === 'SL' ? 'sl' : 'be';
    var pnl = Number(t.pnl) || 0;
    var meta = [];
    if (t.entry_time) meta.push(String(t.entry_time).slice(0, 5));
    if (t.strategy) meta.push(escapeHtml(t.strategy));
    if (t.direction) meta.push(t.direction === 'SHORT' ? 'Venta' : 'Compra');
    return '<div class="trade" data-id="' + t.id + '">' +
      '<div class="trade-main">' +
        '<strong><span class="badge ' + cls + '">' + escapeHtml(r || '—') + '</span>' + escapeHtml(t.asset || '—') + '</strong>' +
        '<small>' + meta.join(' · ') + '</small>' +
      '</div>' +
      '<div class="trade-pnl ' + (pnl >= 0 ? 'pos' : 'neg') + '">' + money(pnl) + '</div>' +
    '</div>';
  }

  $('calPrev').addEventListener('click', function () {
    MONTH = MONTH.m === 0 ? { y: MONTH.y - 1, m: 11 } : { y: MONTH.y, m: MONTH.m - 1 };
    loadMonth();
  });
  $('calNext').addEventListener('click', function () {
    MONTH = MONTH.m === 11 ? { y: MONTH.y + 1, m: 0 } : { y: MONTH.y, m: MONTH.m + 1 };
    loadMonth();
  });
  $('calToday').addEventListener('click', function () {
    var now = new Date();
    MONTH = { y: now.getFullYear(), m: now.getMonth() };
    SELECTED_DAY = todayIso();
    loadMonth();
  });

  async function editTrade(id) {
    var pool = MONTH_TRADES.concat(TRADES);
    var t = pool.filter(function (x) { return Number(x.id) === id; })[0];
    if (!t) return;
    resetForm();
    EDITING = t;
    netTouched = true;
    $('viewTitle').textContent = 'Editar trade';
    $('saveBtn').textContent = 'Guardar cambios';
    $('cancelEditBtn').classList.remove('hidden');
    $('deleteBtn').classList.remove('hidden');

    $('fDate').value = String(t.date || '').slice(0, 10);
    setAsset(t.asset || '');
    $('fEntry').value = (t.entry_time || '').slice(0, 5);
    $('fExit').value = (t.exit_time || '').slice(0, 5);
    if (t.account) $('fAccount').value = t.account;
    if (t.strategy) $('fStrategy').value = t.strategy;
    $('fPnl').value = t.pnl != null ? t.pnl : '';
    $('fLot').value = t.lotaje != null ? t.lotaje : '';
    $('fComm').value = t.commission != null ? t.commission : '';
    $('fNet').value = t.pnl_net != null ? t.pnl_net : '';
    segSet('segDirection', t.direction === 'SHORT' ? 'SHORT' : 'LONG');
    segSet('segResult', String(t.result || 'TP').toUpperCase());
    $('beRow').classList.toggle('hidden', String(t.result || '').toUpperCase() !== 'BE');
    segSet('segBeAfter', t.be_after_result || '');
    renderMetrics(t.custom_metrics || {});
    IMAGES = { before: t.image_before || null, after: t.image_after || null };
    showStoredImage(t.image_before, 'imgBeforePreview');
    showStoredImage(t.image_after, 'imgAfterPreview');

    showView('form');
    window.scrollTo(0, 0);
  }

  /* ─────────────────────────── Resumen ─────────────────────────── */

  function periodFilter() {
    var mode = segValue('segPeriod');
    if (mode === 'all') return function () { return true; };
    if (mode === '90') {
      var from = new Date();
      from.setDate(from.getDate() - 90);
      var iso = from.toISOString().slice(0, 10);
      return function (t) { return String(t.date || '') >= iso; };
    }
    var now = new Date();
    var prefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    return function (t) { return String(t.date || '').indexOf(prefix) === 0; };
  }

  function renderStats() {
    var list = TRADES.filter(periodFilter()).filter(matchesFilters);
    var tp = 0, sl = 0, be = 0, pnl = 0;
    list.forEach(function (t) {
      var r = String(t.result || '').toUpperCase();
      if (r === 'TP') tp += 1; else if (r === 'SL') sl += 1; else be += 1;
      pnl += Number(t.pnl) || 0;
    });
    var decided = tp + sl;
    var winrate = decided ? (tp / decided) * 100 : 0;

    // Racha actual, en orden cronológico y sin que los BE la corten (mismo criterio que la app).
    var ordered = list.slice().sort(function (a, b) {
      return String(a.date).localeCompare(String(b.date)) ||
             String(a.entry_time || '').localeCompare(String(b.entry_time || ''));
    });
    var runTp = 0, runSl = 0;
    ordered.forEach(function (t) {
      var r = String(t.result || '').toUpperCase();
      if (r === 'TP') { runTp += 1; runSl = 0; }
      else if (r === 'SL') { runSl += 1; runTp = 0; }
    });
    var streak = runTp > 0 ? runTp + ' TP' : runSl > 0 ? runSl + ' SL' : '—';

    $('statsKpis').innerHTML =
      '<div class="kpi"><span>PnL</span><strong class="' + (pnl >= 0 ? 'pos' : 'neg') + '">' + money(pnl) + '</strong></div>' +
      '<div class="kpi"><span>Ratio de aciertos</span><strong>' + (decided ? winrate.toFixed(1) + '%' : '—') + '</strong></div>' +
      '<div class="kpi"><span>Operaciones</span><strong>' + list.length + '</strong></div>' +
      '<div class="kpi"><span>Racha actual</span><strong class="' + (runTp ? 'pos' : runSl ? 'neg' : '') + '">' + streak + '</strong></div>' +
      '<div class="kpi"><span>TP / SL / BE</span><strong>' + tp + ' / ' + sl + ' / ' + be + '</strong></div>' +
      '<div class="kpi"><span>Media por operación</span><strong class="' + (pnl >= 0 ? 'pos' : 'neg') + '">' +
        (list.length ? money(pnl / list.length) : '—') + '</strong></div>';

    var byStrategy = {};
    list.forEach(function (t) {
      var k = t.strategy || '—';
      if (!byStrategy[k]) byStrategy[k] = { n: 0, pnl: 0, tp: 0, decided: 0 };
      byStrategy[k].n += 1;
      byStrategy[k].pnl += Number(t.pnl) || 0;
      var r = String(t.result || '').toUpperCase();
      if (r === 'TP') { byStrategy[k].tp += 1; byStrategy[k].decided += 1; }
      else if (r === 'SL') { byStrategy[k].decided += 1; }
    });
    var keys = Object.keys(byStrategy).sort(function (a, b) { return byStrategy[b].pnl - byStrategy[a].pnl; });
    $('statsByStrategy').innerHTML = keys.length
      ? keys.map(function (k) {
          var v = byStrategy[k];
          var wr = v.decided ? ((v.tp / v.decided) * 100).toFixed(0) + '%' : '—';
          return '<div class="trade"><div class="trade-main"><strong>' + escapeHtml(k) + '</strong>' +
            '<small>' + v.n + ' ops · acierto ' + wr + '</small></div>' +
            '<div class="trade-pnl ' + (v.pnl >= 0 ? 'pos' : 'neg') + '">' + money(v.pnl) + '</div></div>';
        }).join('')
      : '<p class="muted small">Sin datos en este período.</p>';
  }

  /* ───────── Gestión: retiros y gastos ─────────
   * Escribe en las mismas tablas que el ordenador (real_account_withdrawals /
   * real_account_expenses) y con la misma forma de fila. Un detalle que no es opcional: aquí
   * NO se borra de verdad, se marca deleted_at. La app de escritorio hace lo mismo y sus
   * consultas filtran por "deleted_at is null"; si el móvil borrase la fila, la copia local del
   * ordenador la conservaría para siempre porque su sincronización no vería ninguna diferencia.
   */

  ${accountSizeToCapital.toString()}
  ${buildAccountNameFromExpense.toString()}
  ${looksLikeAccountPurchase.toString()}

  var MANAGE_PROP = '';
  var MANAGE_CATEGORY = '';
  var CATEGORIES = [];
  var SAVED_CATEGORIES = [];   // las guardadas en la tabla sincronizada
  var ACCOUNT_SIZES = ${JSON.stringify(ACCOUNT_SIZES)};
  var CATEGORY_SUGGESTIONS = ${JSON.stringify(CATEGORY_SUGGESTIONS)};

  function manageMode() { return segValue('segManage') || 'withdrawals'; }
  function isExpenses() { return manageMode() === 'expenses'; }

  function setProp(value) {
    MANAGE_PROP = value || '';
    $('mgPropLabel').textContent = MANAGE_PROP || 'Elegir prop';
    $('mgPropBtn').classList.toggle('empty', !MANAGE_PROP);
    syncCreateAccountField(false);
  }

  /* ───────── Hoja de selección reutilizable ─────────
   * Prop y categoría son listas cerradas: se elige de lo que ya existe y no se escribe. Escribir
   * a mano es lo que acaba creando "Suscripcion", "Suscripción" y "suscripcion" como tres cosas
   * distintas, y luego los totales por categoría no cuadran con nada.
   */

  var listPicker = { onPick: null, items: [], current: '' };

  function openListPicker(config) {
    listPicker = { onPick: config.onPick, items: config.items || [], current: config.current || '' };
    $('listSheetTitle').textContent = config.title || 'Elegir';
    $('listSheetSearch').placeholder = config.searchPlaceholder || 'Buscar…';
    $('listSheetSearch').value = '';
    renderListPicker(config.emptyText);
    $('listSheet').classList.remove('hidden');
  }

  function closeListPicker() { $('listSheet').classList.add('hidden'); }

  function renderListPicker(emptyText) {
    var q = ($('listSheetSearch').value || '').trim().toUpperCase();
    var items = listPicker.items.filter(function (n) {
      return !q || String(n).toUpperCase().indexOf(q) >= 0;
    });
    $('listSheetOptions').innerHTML = items.length
      ? items.map(function (n) {
          return '<button type="button" class="sheet-item' + (n === listPicker.current ? ' on' : '') +
                 '" data-pick="' + escapeAttr(n) + '">' + escapeHtml(n) + '</button>';
        }).join('')
      : '<p class="muted small">' + escapeHtml(emptyText || 'Nada que elegir.') + '</p>';

    $('listSheetOptions').querySelectorAll('[data-pick]').forEach(function (el) {
      el.addEventListener('click', function () {
        var value = el.getAttribute('data-pick');
        closeListPicker();
        if (listPicker.onPick) listPicker.onPick(value);
      });
    });
  }

  $('listSheetClose').addEventListener('click', closeListPicker);
  $('listSheetSearch').addEventListener('input', function () { renderListPicker(); });
  $('listSheet').addEventListener('click', function (e) {
    if (e.target === $('listSheet')) closeListPicker();
  });

  function setCategory(value) {
    MANAGE_CATEGORY = value || '';
    $('mgCategoryLabel').textContent = MANAGE_CATEGORY || 'Elegir categoría';
    $('mgCategoryBtn').classList.toggle('empty', !MANAGE_CATEGORY);
    syncCreateAccountField(true);
  }

  $('mgPropBtn').addEventListener('click', function () {
    openListPicker({
      title: 'Elegir prop',
      searchPlaceholder: 'Buscar prop…',
      items: PROPS.map(function (p) { return p.name; }),
      current: MANAGE_PROP,
      emptyText: 'No hay props guardadas. Se crean en el ordenador, en Configuración.',
      onPick: setProp,
    });
  });

  $('mgCategoryBtn').addEventListener('click', function () {
    openListPicker({
      title: 'Elegir categoría',
      searchPlaceholder: 'Buscar categoría…',
      items: CATEGORIES,
      current: MANAGE_CATEGORY,
      emptyText: 'No hay categorías todavía.',
      onPick: setCategory,
    });
  });

  $('segManage').addEventListener('click', function () {
    // Un gasto y un retiro no tienen los mismos campos: si se estaba editando uno, cambiar de
    // pestaña cancela la edición en vez de arrastrar datos de un tipo al otro. Si no se estaba
    // editando no se toca nada: vaciar el formulario por cambiar de pestaña sería una faena.
    if (MOVEMENT_EDITING) cancelMovementEdit();
    else syncManageForm();
    renderManage();
  });

  /* ───────── Ficha de un movimiento: ver, editar, borrar ─────────
   * En la fila solo caben tres datos; el resto (categoría, tamaño, nota) solo se puede
   * comprobar abriéndola. Y editar es tan necesario como borrar: hasta ahora, corregir un
   * importe mal tecleado obligaba a borrar y volver a crear, con lo que se perdía la fecha
   * original del registro.
   */

  var MOVEMENT_EDITING = null;   // fila que se está editando, o null si es un alta
  var DETAIL_MOVEMENT = null;    // fila abierta en la ficha

  function movementLabel(plural) {
    if (plural) return isExpenses() ? 'gastos' : 'retiros';
    return isExpenses() ? 'gasto' : 'retiro';
  }

  function openMovementDetail(id) {
    var list = isExpenses() ? MOVEMENTS.expenses : MOVEMENTS.withdrawals;
    var m = list.filter(function (x) { return Number(x.id) === Number(id); })[0];
    if (!m) return;
    DETAIL_MOVEMENT = m;

    var expenses = isExpenses();
    var rows = [
      ['Prop', m.account_name || '—'],
      ['Importe', (expenses ? '-' : '+') + (Number(m.amount) || 0).toFixed(2) + '€'],
      ['Fecha', displayDate(m.date)],
    ];
    if (expenses) {
      rows.push(['Categoría', m.category || '—']);
      rows.push(['Tamaño de cuenta', m.account_size || '—']);
    }
    rows.push(['Nota', m.note || '—']);
    if (m.created_at) rows.push(['Registrado', displayDate(String(m.created_at).slice(0, 10))]);

    $('detailTitle').textContent = expenses ? 'Detalle del gasto' : 'Detalle del retiro';
    $('detailBody').innerHTML = rows.map(function (r) {
      return '<div class="detail-row"><span>' + escapeHtml(r[0]) + '</span><strong>' +
             escapeHtml(r[1]) + '</strong></div>';
    }).join('');
    $('detailSheet').classList.remove('hidden');
  }

  function closeMovementDetail() {
    $('detailSheet').classList.add('hidden');
    DETAIL_MOVEMENT = null;
  }

  $('detailClose').addEventListener('click', closeMovementDetail);
  $('detailSheet').addEventListener('click', function (e) {
    if (e.target === $('detailSheet')) closeMovementDetail();
  });

  $('detailEditBtn').addEventListener('click', function () {
    if (!DETAIL_MOVEMENT) return;
    startMovementEdit(DETAIL_MOVEMENT);
    closeMovementDetail();
  });

  $('detailDeleteBtn').addEventListener('click', function () {
    if (!DETAIL_MOVEMENT) return;
    var id = DETAIL_MOVEMENT.id;
    closeMovementDetail();
    deleteMovement(id);
  });

  function startMovementEdit(m) {
    MOVEMENT_EDITING = m;
    setProp(m.account_name || '');
    setCategory(m.category || '');
    $('mgAmount').value = m.amount != null ? m.amount : '';
    $('mgDate').value = String(m.date || '').slice(0, 10);
    $('mgNote').value = m.note || '';
    // El tamaño guardado puede no estar en la lista (un gasto antiguo con "50k" escrito a mano,
    // o un tamaño que se retiró de las opciones). Se añade solo para este registro: si no, al
    // guardar los cambios el gasto perdería el tamaño sin que nadie lo note.
    setSizeValue(m.account_size || '');
    syncManageForm();
    window.scrollTo(0, 0);
  }

  /**
   * Deja el formulario listo para un alta.
   *
   * "keepProp" es la diferencia entre guardar y cancelar: tras guardar se conserva la prop
   * porque lo normal es meter varios movimientos seguidos de la misma; al cancelar una edición
   * se limpia todo, que es lo que se espera de "cancelar".
   */
  function resetMovementForm(keepProp) {
    MOVEMENT_EDITING = null;
    if (!keepProp) setProp('');
    setCategory('');
    $('mgAmount').value = '';
    $('mgNote').value = '';
    $('mgSize').value = '';
    $('mgDate').value = todayIso();
    var check = $('mgCreateAccount');
    check.checked = false;
    delete check.dataset.touched;
    $('mgAccountNumber').value = '';
    syncManageForm();
  }

  function cancelMovementEdit() {
    resetMovementForm(false);
  }

  function setSizeValue(value) {
    var select = $('mgSize');
    var wanted = String(value || '');
    if (wanted && ![].some.call(select.options, function (o) { return o.value === wanted; })) {
      var option = document.createElement('option');
      option.value = wanted;
      option.textContent = wanted + ' (antiguo)';
      select.appendChild(option);
    }
    select.value = wanted;
  }

  $('mgCancelBtn').addEventListener('click', cancelMovementEdit);

  function syncManageForm() {
    var expenses = isExpenses();
    var editing = Boolean(MOVEMENT_EDITING);
    $('manageFormTitle').textContent = editing
      ? (expenses ? 'Editar gasto' : 'Editar retiro')
      : (expenses ? 'Nuevo gasto' : 'Nuevo retiro');
    $('mgSaveBtn').textContent = editing ? 'Guardar cambios' : 'Guardar';
    $('mgCancelBtn').classList.toggle('hidden', !editing);
    if (!$('mgSize').options.length) {
      // Los mismos tamaños que ofrece el ordenador, para que la columna no acabe con "50k",
      // "50K" y "50.000" conviviendo.
      $('mgSize').innerHTML = '<option value="">Sin especificar</option>' +
        ACCOUNT_SIZES.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
    }
    $('manageListTitle').textContent = expenses ? 'Últimos gastos' : 'Últimos retiros';
    document.querySelectorAll('.expense-only').forEach(function (el) {
      el.classList.toggle('hidden', !expenses);
    });
    syncCreateAccountField(false);
  }

  /* ───────── Crear la cuenta al registrar la compra de un challenge ─────────
   * Mismas reglas que en el ordenador (services/accountFromExpense.js, insertado abajo): el
   * nombre es prop + tamaño + los últimos dígitos de la cuenta, y si ya existe se numera.
   */

  function accountPreviewName() {
    return buildAccountNameFromExpense({
      prop: MANAGE_PROP,
      size: $('mgSize').value,
      accountNumber: ($('mgAccountNumber').value || '').trim(),
      existingNames: ACCOUNTS.map(function (a) { return a.name; }),
    });
  }

  function syncCreateAccountField(auto) {
    var wrap = $('mgCreateAccountWrap');
    var check = $('mgCreateAccount');
    // Al editar no se crean cuentas: si tocaba, ya se creó al registrar el gasto.
    var visible = isExpenses() && !MOVEMENT_EDITING;
    wrap.classList.toggle('hidden', !visible);
    if (!visible) { check.checked = false; return; }

    if (auto && !check.dataset.touched) {
      check.checked = Boolean($('mgSize').value) && looksLikeAccountPurchase(MANAGE_CATEGORY);
    }
    $('mgAccountNumberWrap').classList.toggle('hidden', !check.checked);
    var name = accountPreviewName();
    $('mgAccountPreview').textContent = name
      ? 'Se creará la cuenta "' + name + '"'
      : 'Elige prop y tamaño para crear la cuenta.';
  }

  $('mgCreateAccount').addEventListener('change', function (e) {
    e.target.dataset.touched = '1';
    syncCreateAccountField(false);
  });
  $('mgAccountNumber').addEventListener('input', function () { syncCreateAccountField(false); });
  $('mgSize').addEventListener('change', function () { syncCreateAccountField(true); });

  /** Crea la cuenta del gasto recién guardado. Nunca tumba el gasto: son dos apuntes distintos. */
  async function createAccountForExpense(prop, size, accountNumber) {
    var name = buildAccountNameFromExpense({
      prop: prop,
      size: size,
      accountNumber: accountNumber,
      existingNames: ACCOUNTS.map(function (a) { return a.name; }),
    });
    if (!name) return null;

    var out = await db.from('real_accounts').insert({
      user_id: USER.id,
      name: name,
      prop_name: prop || null,
      account_number: accountNumber || null,
      account_type: 'challenge',
      balance: accountSizeToCapital(size),
      challenge_passed: false,
      disabled_by_max_dd: false,
    });
    if (out.error) {
      toast('Gasto guardado, pero la cuenta no se pudo crear', 'err');
      return null;
    }
    await loadCatalogs();
    return name;
  }

  async function loadManage() {
    var wRes = await db.from('real_account_withdrawals').select('*')
      .is('deleted_at', null).order('date', { ascending: false }).limit(100);
    var eRes = await db.from('real_account_expenses').select('*')
      .is('deleted_at', null).order('date', { ascending: false }).limit(100);
    if (wRes.error || eRes.error) { toast('No se pudo cargar Gestión', 'err'); return; }
    MOVEMENTS.withdrawals = wRes.data || [];
    MOVEMENTS.expenses = eRes.data || [];

    // Categorías: manda la lista guardada, y punto. Sumarle las sugerencias por defecto y las
    // que aparecieran en gastos antiguos hacía que el móvil ofreciera categorías que en el
    // ordenador no existen, incluidas las que se habían borrado a propósito.
    //
    // El respaldo (sugerencias + usadas) solo entra si NO hay lista guardada, que es el caso de
    // quien todavía no haya abierto la aplicación con la migración aplicada: ahí es preferible
    // ofrecer algo razonable a dejar el campo vacío.
    var seen = {};
    CATEGORIES = [];
    var source = SAVED_CATEGORIES.length
      ? SAVED_CATEGORIES
      : CATEGORY_SUGGESTIONS.concat(MOVEMENTS.expenses.map(function (e) { return e.category; }));
    source.forEach(function (c) {
      var name = String(c || '').trim();
      if (!name || seen[name.toLowerCase()]) return;
      seen[name.toLowerCase()] = true;
      CATEGORIES.push(name);
    });
    CATEGORIES.sort(function (a, b) { return a.localeCompare(b, 'es', { sensitivity: 'base' }); });

    renderManage();
  }

  function renderManage() {
    var expenses = isExpenses();
    var list = expenses ? MOVEMENTS.expenses : MOVEMENTS.withdrawals;

    var now = new Date();
    var monthPrefix = now.getFullYear() + '-' + pad2(now.getMonth() + 1);
    var total = 0;
    var monthTotal = 0;
    list.forEach(function (m) {
      var amount = Number(m.amount) || 0;
      total += amount;
      if (String(m.date || '').indexOf(monthPrefix) === 0) monthTotal += amount;
    });

    // El balance es la cifra que de verdad importa y no depende de la pestaña abierta: lo
    // retirado menos lo gastado, con TODO lo registrado, no solo con la lista que se está viendo.
    var allWithdrawn = 0;
    var allSpent = 0;
    MOVEMENTS.withdrawals.forEach(function (m) { allWithdrawn += Number(m.amount) || 0; });
    MOVEMENTS.expenses.forEach(function (m) { allSpent += Number(m.amount) || 0; });
    var balance = allWithdrawn - allSpent;

    var tone = expenses ? 'neg' : 'pos';
    var sign = expenses ? '-' : '+';
    $('manageKpis').innerHTML =
      '<div class="kpi"><span>' + (expenses ? 'Gastado este mes' : 'Retirado este mes') + '</span>' +
        '<strong class="' + tone + '">' + sign + monthTotal.toFixed(2) + '€</strong></div>' +
      '<div class="kpi"><span>' + (expenses ? 'Gastado en total' : 'Retirado en total') + '</span>' +
        '<strong class="' + tone + '">' + sign + total.toFixed(2) + '€</strong></div>' +
      '<div class="kpi kpi-wide"><span>Balance · retirado menos gastado</span>' +
        '<strong class="' + (balance >= 0 ? 'pos' : 'neg') + '">' + money(balance) + '</strong>' +
        '<small class="muted">' + allWithdrawn.toFixed(2) + '€ retirados − ' + allSpent.toFixed(2) + '€ gastados</small>' +
      '</div>';

    var host = $('manageList');
    if (!list.length) {
      host.innerHTML = '<p class="muted small">Todavía no hay ' + (expenses ? 'gastos' : 'retiros') + '.</p>';
      return;
    }
    host.innerHTML = list.map(function (m) {
      var meta = [displayDate(m.date)];
      if (expenses && m.category) meta.push(escapeHtml(m.category));
      if (expenses && m.account_size) meta.push(escapeHtml(m.account_size));
      if (m.note) meta.push(escapeHtml(m.note));
      return '<div class="trade" data-movement="' + m.id + '">' +
        '<div class="trade-main"><strong>' + escapeHtml(m.account_name || '—') + '</strong>' +
        '<small>' + meta.join(' · ') + '</small></div>' +
        '<div class="trade-pnl ' + tone + '">' + sign + (Number(m.amount) || 0).toFixed(2) + '€</div>' +
      '</div>';
    }).join('');

    host.querySelectorAll('[data-movement]').forEach(function (row) {
      row.addEventListener('click', function () {
        openMovementDetail(Number(row.getAttribute('data-movement')));
      });
    });
  }

  async function deleteMovement(id) {
    var expenses = isExpenses();
    if (!window.confirm('¿Borrar este ' + movementLabel() + '?')) return;
    var table = expenses ? 'real_account_expenses' : 'real_account_withdrawals';
    var now = new Date().toISOString();
    // Borrado suave, igual que en el ordenador: así su sincronización ve el cambio y lo aplica.
    var out = await db.from(table).update({ deleted_at: now, updated_at: now })
      .eq('id', id).eq('user_id', USER.id);
    if (out.error) { toast('No se pudo borrar: ' + out.error.message, 'err'); return; }
    toast('Eliminado', 'ok');
    if (MOVEMENT_EDITING && Number(MOVEMENT_EDITING.id) === Number(id)) cancelMovementEdit();
    await loadManage();
  }

  $('mgSaveBtn').addEventListener('click', async function () {
    var expenses = isExpenses();
    var amount = Number($('mgAmount').value);
    if (!MANAGE_PROP) { toast('Elige la prop.', 'err'); return; }
    if (!isFinite(amount) || amount <= 0) { toast('El importe tiene que ser mayor que 0.', 'err'); return; }

    var row = {
      user_id: USER.id,
      client_uuid: cryptoUuid(),
      account_id: null,
      account_name: MANAGE_PROP,
      amount: amount,
      date: $('mgDate').value || todayIso(),
      note: ($('mgNote').value || '').trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (expenses) {
      row.category = MANAGE_CATEGORY || null;
      row.account_size = ($('mgSize').value || '').trim() || null;
    }

    var table = expenses ? 'real_account_expenses' : 'real_account_withdrawals';
    var btn = $('mgSaveBtn');
    var out;

    if (MOVEMENT_EDITING) {
      // Confirmación solo al editar: crear de más se arregla borrando, pero machacar un
      // registro que ya existía no se puede deshacer.
      if (!window.confirm('¿Guardar los cambios de este ' + movementLabel() + '?')) return;
      var patch = {
        account_name: row.account_name,
        amount: row.amount,
        date: row.date,
        note: row.note,
        updated_at: row.updated_at,
      };
      if (expenses) {
        patch.category = row.category;
        patch.account_size = row.account_size;
      }
      btn.disabled = true;
      out = await db.from(table).update(patch).eq('id', MOVEMENT_EDITING.id).eq('user_id', USER.id);
    } else {
      btn.disabled = true;
      out = await db.from(table).insert(row);
    }
    btn.disabled = false;
    if (out.error) { toast('No se pudo guardar: ' + out.error.message, 'err'); return; }

    var creada = null;
    if (!MOVEMENT_EDITING && expenses && $('mgCreateAccount').checked) {
      creada = await createAccountForExpense(row.account_name, row.account_size, ($('mgAccountNumber').value || '').trim());
    }

    toast(
      creada ? 'Gasto guardado y cuenta "' + creada + '" creada'
        : (MOVEMENT_EDITING ? 'Cambios guardados' : (expenses ? 'Gasto guardado' : 'Retiro guardado')),
      'ok'
    );
    resetMovementForm(true);
    await loadManage();
  });

  /* ─────────────────────────── Navegación ─────────────────────────── */

  function showView(view) {
    $('viewForm').classList.toggle('hidden', view !== 'form');
    $('viewList').classList.toggle('hidden', view !== 'list');
    $('viewStats').classList.toggle('hidden', view !== 'stats');
    $('viewManage').classList.toggle('hidden', view !== 'manage');
    $('viewTitle').textContent =
      view === 'list' ? 'Trades'
        : view === 'stats' ? 'Resumen'
          : view === 'manage' ? 'Gestión'
            : (EDITING ? 'Editar trade' : 'Nuevo trade');
    var btns = $('nav').querySelectorAll('button');
    for (var i = 0; i < btns.length; i += 1) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-view') === view);
    }
  }

  $('nav').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var view = btn.getAttribute('data-view');
    if (view === 'form' && EDITING) resetForm();
    if (view === 'list') loadMonth();
    if (view === 'stats') loadTrades();
    if (view === 'manage') loadManage();
    showView(view);
  });

  boot();
})();
</script>
</body>
</html>`;
}

module.exports = { buildMobileHtml };
