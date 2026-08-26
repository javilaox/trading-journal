/**
 * Visor de informes compartidos: una única página que se publica UNA vez y sirve para todos los
 * informes. El informe concreto se indica en el fragmento de la URL (…/visor.html#TOKEN).
 *
 * Por qué no se aloja en Supabase: Supabase Storage (y las Edge Functions fuera del plan Pro con
 * dominio propio) devuelven los archivos HTML como `text/plain` a propósito, como medida
 * antiabuso, así que el navegador mostraba el código fuente en lugar de la página. Cualquier
 * alojamiento estático normal (GitHub Pages, Netlify, Cloudflare Pages…) sirve el HTML bien.
 *
 * El archivo NO lleva ningún dato del backtest: solo la URL y la clave anónima de Supabase, que
 * es pública por diseño. Los datos los sirve el RPC `open_backtest_report`, que valida la
 * contraseña y el cupo de dispositivos en el servidor. Si los datos viajaran dentro del archivo,
 * ambas protecciones serían decorativas: bastaría con mirar el código fuente.
 *
 * La página es de solo lectura pero interactiva: filtros, orden y gráficas se calculan en el
 * navegador de quien la abre a partir del JSON recibido.
 */

const {
  simulateChallenge,
  compareChallengeAccounts,
  tradesPerTradingDay,
} = require('./challengeSimulator');
const { computeResultStreaks } = require('./backtestStreaks');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildViewerHtml({ supabaseUrl, supabaseAnonKey }) {
  const safeTitle = 'Resultados de backtesting';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${safeTitle}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root{
    --bg:#0f172a; --card:#131f37; --border:rgba(148,163,184,.18);
    --text:#e2e8f0; --muted:#94a3b8; --green:#22c55e; --red:#ef4444; --accent:#38bdf8;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
       font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;line-height:1.5}
  .wrap{max-width:1180px;margin:0 auto;padding:24px 16px 64px}
  h1{font-size:1.5rem;margin:0 0 4px}
  h2{font-size:1.05rem;margin:0 0 12px}
  .muted{color:var(--muted)}
  .small{font-size:.8rem}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:18px}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
  .kpi{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:12px 14px}
  .kpi span{display:block;color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}
  .kpi strong{display:block;font-size:1.35rem;margin-top:4px;font-variant-numeric:tabular-nums}
  .pos{color:var(--green)} .neg{color:var(--red)}
  table{width:100%;border-collapse:collapse;font-size:.85rem}
  th,td{padding:8px 10px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}
  th{color:var(--muted);font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.03em;
     cursor:pointer;user-select:none;position:sticky;top:0;background:var(--card)}
  th.no-sort{cursor:default}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  tbody tr.row-main{cursor:pointer}
  tbody tr.row-main:hover{background:rgba(255,255,255,.03)}
  tr.row-detail td{background:rgba(255,255,255,.02);white-space:normal}
  .badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:.7rem;font-weight:700}
  .badge.tp{background:rgba(34,197,94,.15);color:var(--green)}
  .badge.sl{background:rgba(239,68,68,.15);color:var(--red)}
  .badge.be{background:rgba(148,163,184,.15);color:var(--muted)}
  .filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
  select,input[type=search]{background:rgba(255,255,255,.04);color:var(--text);
       border:1px solid var(--border);border-radius:10px;padding:8px 10px;font-size:.85rem;font-family:inherit}
  .table-scroll{max-height:520px;overflow:auto;max-width:100%}
  .grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{border:1px solid var(--border);border-radius:999px;padding:3px 10px;font-size:.78rem}
  .chip.ok{color:var(--green);border-color:rgba(34,197,94,.4)}
  .hours{display:flex;align-items:flex-end;gap:4px;margin-top:12px;overflow-x:auto;padding-bottom:4px}
  .hour{flex:1 0 26px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;min-width:26px}
  .hour-stack{width:100%;max-width:34px;display:flex;flex-direction:column;justify-content:flex-end;border-radius:4px;overflow:hidden}
  .hour-tp{background:var(--green);width:100%} .hour-sl{background:var(--red);width:100%}
  .hour-count{font-size:.62rem;color:var(--muted);font-variant-numeric:tabular-nums}
  .hour-label{font-size:.66rem;color:var(--muted);font-variant-numeric:tabular-nums}
  /* Puerta de contraseña: ocupa la pantalla hasta que el servidor valida el acceso. */
  #gate{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg);z-index:10}
  #gate .box{width:min(400px,100%);text-align:center}
  #gate input{width:100%;text-align:center;letter-spacing:.12em;font-size:1rem;padding:12px}
  #gate button{width:100%;margin-top:10px;padding:12px;border:none;border-radius:10px;
       background:var(--green);color:#04210f;font-weight:700;font-size:.95rem;cursor:pointer;font-family:inherit}
  #gate button:disabled{opacity:.6;cursor:default}
  #gateError{margin-top:12px;color:var(--red);font-size:.85rem;min-height:20px}
  #app{display:none}
  .app-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
  #refresh{background:rgba(255,255,255,.05);color:var(--text);border:1px solid var(--border);
       border-radius:10px;padding:8px 14px;font-size:.82rem;cursor:pointer;font-family:inherit;white-space:nowrap}
  #refresh:hover:not(:disabled){border-color:var(--accent)}
  #refresh:disabled{opacity:.6;cursor:default}
  .shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:10px}
  .warn{margin:0 0 12px;padding:10px 12px;border-radius:10px;font-size:.85rem;color:#fcd34d;
       background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.35)}
  /* Comparativa de comprar varios challenges: selector de cantidad y dos tarjetas enfrentadas. */
  .rot-title{margin:24px 0 4px;font-size:1rem;padding-top:18px;border-top:1px solid var(--border)}
  .count-picker{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 16px}
  .count-picker label{color:var(--muted);font-size:.82rem}
  #challengeCount{width:72px;flex:0 0 72px;text-align:center;font-variant-numeric:tabular-nums;
       background:rgba(255,255,255,.04);color:var(--text);border:1px solid var(--border);
       border-radius:10px;padding:8px 10px;font-size:.9rem;font-family:inherit}
  .modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:12px}
  .mode-card{border:1px solid var(--border);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.02)}
  .mode-card.is-best{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.05)}
  .mode-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
  .mode-card h4{margin:0;font-size:.95rem}
  .mode-flag{font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--green);
       background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.35);border-radius:999px;padding:2px 8px;white-space:nowrap}
  .mode-card p{margin:6px 0 12px}
  .mode-rows{display:grid;gap:8px}
  .mode-rows>div{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
       padding-bottom:6px;border-bottom:1px solid var(--border)}
  .mode-rows>div:last-child{border-bottom:none;padding-bottom:0}
  .mode-rows span{color:var(--muted);font-size:.82rem}
  .mode-rows strong{font-size:1.05rem;font-variant-numeric:tabular-nums}
  .mode-card .dist{display:flex;flex-wrap:wrap;gap:4px 12px;margin:12px 0 0;padding-top:10px;
       border-top:1px solid var(--border)}
  .mode-card .dist strong{color:var(--text)}
  .rot-details summary{cursor:pointer;color:var(--muted);font-size:.82rem;padding:6px 0}
  tbody tr.is-current{background:rgba(56,189,248,.10)}
  .shots figure{margin:0}
  .shots figcaption{color:var(--muted);font-size:.7rem;margin-bottom:4px}
  .shots img{width:100%;border:1px solid var(--border);border-radius:10px;display:block}
  footer{color:var(--muted);font-size:.75rem;text-align:center;margin-top:28px}
  /* Movil: el informe se consulta mucho desde el telefono, asi que las tablas se desplazan en
     horizontal dentro de su tarjeta (nunca la pagina entera) y los controles pasan a ancho
     completo para que se puedan pulsar con el dedo. */
  @media(max-width:760px){
    body{font-size:14px;overflow-x:hidden}
    .wrap{padding:16px 12px 48px}
    h1{font-size:1.25rem}
    .card{padding:14px;border-radius:12px;margin-bottom:14px}
    .app-header{flex-direction:column;align-items:stretch;gap:10px}
    #refresh{width:100%}
    .kpis{grid-template-columns:repeat(auto-fit,minmax(min(130px,45%),1fr));gap:8px}
    .kpi{padding:10px}
    .kpi strong{font-size:1.15rem}
    .grid-2{grid-template-columns:1fr;gap:14px}
    .filters{gap:8px}
    .filters select,.filters input[type=search]{width:100%}
    /* Los contenedores de tabla ya tienen overflow:auto; en movil hace falta el arrastre suave. */
    .table-scroll{max-height:none;-webkit-overflow-scrolling:touch}
    th,td{padding:7px 8px;font-size:.8rem}
    .shots{grid-template-columns:1fr}
    .hour{flex:1 0 22px;min-width:22px}
  }
  @media(max-width:420px){
    .kpis{grid-template-columns:1fr 1fr}
    th,td{padding:6px 6px;font-size:.75rem}
  }
</style>
</head>
<body>
<div id="gate">
  <div class="box">
    <h1>${safeTitle}</h1>
    <p class="muted small">Introduce la contraseña que te han facilitado para ver los resultados.</p>
    <input id="pwd" type="password" autocomplete="off" placeholder="Contraseña" />
    <button id="enter" type="button">Ver resultados</button>
    <div id="gateError" role="alert"></div>
  </div>
</div>

<div id="app" class="wrap">
  <header class="app-header">
    <div>
      <h1 id="title">${safeTitle}</h1>
      <p class="muted small" id="subtitle"></p>
    </div>
    <button type="button" id="refresh" hidden>Actualizar</button>
  </header>

  <section class="card">
    <h2>Resumen</h2>
    <div class="kpis" id="kpis"></div>
  </section>

  <section class="card">
    <h2>Curva de rentabilidad</h2>
    <canvas id="equityChart" height="110"></canvas>
  </section>

  <div class="grid-2">
    <section class="card">
      <h2>Distribución de resultados</h2>
      <canvas id="resultChart" height="180"></canvas>
    </section>
    <section class="card">
      <h2>Rendimiento por par</h2>
      <div class="table-scroll"><table id="pairTable">
        <thead><tr><th class="no-sort">Par</th><th class="num no-sort">Ops</th><th class="num no-sort">Acierto</th><th class="num no-sort">PnL</th></tr></thead>
        <tbody></tbody></table></div>
    </section>
  </div>

  <section class="card" id="hoursCard">
    <h2>¿A qué horas gana y a qué horas pierde?</h2>
    <p class="muted small">Por hora de entrada. Verde = TP, rojo = SL (los BE no cuentan).</p>
    <div class="hours" id="hours"></div>
  </section>

  <section class="card" id="challengeCard" style="display:none">
    <h2>Challenges</h2>
    <p class="muted small" id="challengeIntro"></p>
    <div id="challengeBody"></div>
    <p class="muted small" id="challengeCaveat"></p>
  </section>

  <section class="card" id="metricsCard">
    <h2>Análisis por métricas</h2>
    <p class="muted small">Resultados cumpliendo cada métrica frente a no cumplirla.</p>
    <div class="table-scroll"><table id="metricsTable">
      <thead><tr><th class="no-sort">Métrica</th><th class="num no-sort">Cumpliéndola</th><th class="num no-sort">Sin cumplirla</th><th class="no-sort">Conclusión</th></tr></thead>
      <tbody></tbody></table></div>
  </section>

  <section class="card" id="beCard" style="display:none">
    <h2>Break even</h2>
    <p class="muted small">Si mover una operación a break even protegió capital o limitó beneficios.</p>
    <div class="kpis" id="beKpis"></div>
  </section>

  <section class="card" id="dailyStopCard" style="display:none">
    <h2>Parar el día tras varios SL</h2>
    <p class="muted small">Recorta cada día en el punto donde se habría parado y lo compara con lo que pasó de verdad.</p>
    <p id="dailyStopSummary"></p>
    <p class="muted small" id="dailyStopContext"></p>
    <div class="table-scroll"><table id="dailyStopTable">
      <thead><tr>
        <th class="no-sort">Si se para tras</th><th class="num no-sort">PnL del periodo</th>
        <th class="num no-sort">Diferencia</th><th class="num no-sort">Días en que se habría parado</th>
        <th class="no-sort">Conclusión</th>
      </tr></thead>
      <tbody></tbody></table></div>
    <p class="muted small">Es un repaso de lo que ya pasó: supone que las operaciones posteriores habrían ocurrido igual. Cuantos menos días afectados, menos fiable es la conclusión.</p>
  </section>

  <section class="card">
    <h2>Operaciones</h2>
    <div class="filters">
      <select id="fSession"><option value="">Todas las sesiones</option></select>
      <select id="fAsset"><option value="">Todos los pares</option></select>
      <select id="fResult">
        <option value="">Todos los resultados</option>
        <option value="TP">Solo TP</option>
        <option value="SL">Solo SL</option>
        <option value="BE">Solo BE</option>
      </select>
      <select id="fDirection">
        <option value="">Compras y ventas</option>
        <option value="LONG">Solo compras</option>
        <option value="SHORT">Solo ventas</option>
      </select>
      <input id="fSearch" type="search" placeholder="Buscar en notas..." />
    </div>
    <p class="muted small" id="tradesCount"></p>
    <div class="table-scroll"><table id="tradesTable">
      <thead><tr>
        <th data-sort="date">Fecha</th>
        <th data-sort="asset">Par</th>
        <th data-sort="direction">Dir.</th>
        <th data-sort="result">Res.</th>
        <th class="num" data-sort="pnl">PnL</th>
        <th class="num" data-sort="rr_result">R</th>
        <th data-sort="entry_time">Entrada</th>
        <th data-sort="session">Sesión</th>
      </tr></thead>
      <tbody></tbody></table></div>
    <p class="muted small" style="margin-top:10px">Pulsa una fila para ver sus métricas y notas.</p>
  </section>

  <footer>
    Generado con Trading Journal · Vista de solo lectura
  </footer>
</div>

<script>
(function () {
  var SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
  var ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
  // El informe va en el fragmento de la URL. El fragmento no se envía al servidor que aloja la
  // página, así que el identificador no queda registrado en los logs de ese alojamiento.
  var TOKEN = (location.hash || '').replace(/^#/, '').trim();

  // Identificador de dispositivo: aleatorio y guardado en el navegador. Es lo que permite
  // limitar cuántos dispositivos distintos abren el enlace.
  function deviceId() {
    var k = 'tj_device_id';
    var v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (!v) {
      v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
      try { localStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  }

  var ERRORS = {
    NOT_FOUND: 'Este enlace no existe o ha sido revocado.',
    BAD_PASSWORD: 'Contraseña incorrecta.',
    DEVICE_LIMIT: 'Se ha alcanzado el número máximo de dispositivos que pueden abrir este enlace.',
    NO_DEVICE: 'No se ha podido identificar el dispositivo.'
  };

  var gate = document.getElementById('gate');
  var pwd = document.getElementById('pwd');
  var btn = document.getElementById('enter');
  var err = document.getElementById('gateError');

  function open() {
    var value = pwd.value.trim();
    if (!value) { err.textContent = 'Escribe la contraseña.'; return; }
    btn.disabled = true;
    err.textContent = 'Comprobando...';

    fetch(SUPABASE_URL + '/rest/v1/rpc/open_backtest_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
      body: JSON.stringify({ p_token: TOKEN, p_password: value, p_device: deviceId() })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (!data || data.ok !== true) {
          err.textContent = (data && ERRORS[data.error]) || 'No se ha podido abrir el informe.';
          return;
        }
        err.textContent = '';
        PASSWORD = value;
        gate.style.display = 'none';
        document.getElementById('app').style.display = 'block';
        render(data);
      })
      .catch(function () {
        btn.disabled = false;
        err.textContent = 'No hay conexión con el servidor. Inténtalo de nuevo.';
      });
  }

  if (!TOKEN) {
    err.textContent = 'Este enlace está incompleto: falta el identificador del informe.';
    btn.disabled = true;
    pwd.disabled = true;
  } else {
    btn.addEventListener('click', open);
    pwd.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    pwd.focus();
  }

  /* --------- Simulador de challenges ---------
   * Se inserta el codigo fuente de la MISMA funcion que usa la app (toString), para que el
   * enlace compartido y la aplicacion no puedan dar numeros distintos.
   */
  ${computeResultStreaks.toString()}
  ${simulateChallenge.toString()}
  ${compareChallengeAccounts.toString()}
  ${tradesPerTradingDay.toString()}

  function renderChallenge(payload) {
    var cfg = payload.challenge && payload.challenge.phases;
    var card = document.getElementById('challengeCard');
    if (!card || !cfg || !cfg.length) return;

    var rs = TRADES.map(function (t) { return Number(t.rr_result); }).filter(function (v) { return isFinite(v); });
    if (rs.length < 5) return;

    var accounts = Math.max(1, Math.min(6, Number(payload.challenge.accounts) || 1));
    var perDay = tradesPerTradingDay(TRADES);
    // El bloque principal responde siempre a "paso UN challenge"; comprar varios es otra
    // pregunta y tiene su propio apartado debajo.
    var continueOnStop = payload.challenge.continue_on_consistency_stop !== false;
    var sim = simulateChallenge(rs, cfg, {
      runs: 3000, tradesPerDay: perDay, continueOnConsistencyStop: continueOnStop
    });
    if (!sim) return;
    CHALLENGE_CTX = {
      rs: rs, cfg: cfg, perDay: perDay, picked: accounts, pct: pct, tone: tone,
      continueOnStop: continueOnStop,
    };

    var toDays = function (n) { return (n == null || !perDay) ? null : Math.ceil(n / perDay); };
    var pct = function (v) { return v == null ? '—' : v.toFixed(1) + '%'; };
    var tone = function (v) { return v == null ? '' : v >= 70 ? 'pos' : v >= 40 ? '' : 'neg'; };
    var days = sim.medianDaysTotal == null ? toDays(sim.medianTradesTotal) : sim.medianDaysTotal;
    var daysBad = sim.p90DaysTotal == null ? toDays(sim.p90TradesTotal) : sim.p90DaysTotal;
    var consistency = 0;
    for (var ci = 0; ci < cfg.length; ci += 1) {
      if (Number(cfg[ci].consistency) > consistency) consistency = Number(cfg[ci].consistency);
    }

    document.getElementById('challengeIntro').textContent =
      'Con estos resultados, probabilidad de superar un challenge de ' + cfg.length +
      (cfg.length === 1 ? ' fase' : ' fases') + ' (' +
      cfg.map(function (p) { return p.target + '%'; }).join(' + ') + ', riesgo ' +
      cfg.map(function (p) { return p.risk + '%'; }).join('/') + ' por operación' +
      (consistency > 0 ? ', consistencia ' + consistency + '%' : '') + ').';

    var warn = '';
    if (sim.consistencyIssues && sim.consistencyIssues.length) {
      warn = '<div class="warn">' + sim.consistencyIssues.map(function (w) {
        return 'Fase ' + w.index + ': una sola operación ganadora (' + w.maxWin.toFixed(2) +
          '% de la cuenta) ya supera el tope diario de consistencia (' + w.cap.toFixed(2) +
          '%). Con este riesgo la prop no validaría el challenge.';
      }).join('<br>') + '</div>';
    }

    document.getElementById('challengeBody').innerHTML = warn +
      '<div class="kpis" style="margin-bottom:14px">' +
        '<div class="kpi"><span>Probabilidad total</span><strong class="' + tone(sim.overallPassRate) + '">' + pct(sim.overallPassRate) + '</strong></div>' +
        '<div class="kpi"><span>Operaciones · caso normal</span><strong>' + (sim.medianTradesTotal == null ? '—' : sim.medianTradesTotal) + '</strong></div>' +
        '<div class="kpi"><span>Días · caso normal</span><strong>' + (days == null ? '—' : days) + '</strong></div>' +
        '<div class="kpi"><span>Días · si va mal</span><strong>' + (daysBad == null ? '—' : daysBad) + '</strong></div>' +
        (consistency > 0 && sim.avgConsistencyStops >= 0.05 ? '<div class="kpi"><span>Días que paras por consistencia</span><strong>' + sim.avgConsistencyStops.toFixed(1) + '</strong></div>' : '') +
      '</div>' +
      '<div class="table-scroll"><table><thead><tr><th class="no-sort">Fase</th><th class="no-sort">Objetivo</th>' +
      '<th class="num no-sort">Probabilidad</th><th class="num no-sort">Ops · normal</th><th class="num no-sort">Días</th></tr></thead><tbody>' +
      sim.phases.map(function (p, i) {
        return '<tr><td>Fase ' + p.index + '</td><td>' + cfg[i].target + '%</td>' +
          '<td class="num ' + tone(p.passRate) + '">' + pct(p.passRate) + '</td>' +
          '<td class="num">' + (p.medianTrades == null ? '—' : p.medianTrades) + '</td>' +
          '<td class="num">' + (toDays(p.medianTrades) == null ? '—' : toDays(p.medianTrades)) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<h3 class="rot-title">¿Y si compro varios challenges?</h3>' +
      '<p class="muted small">Escribe cuántos y compara las dos formas de gestionarlos. Se opera una ' +
      'cuenta cada vez, así que el ritmo diario es el mismo: lo único que cambia es cuándo se salta ' +
      'de una cuenta a otra.</p>' +
      '<div class="count-picker"><label for="challengeCount">Compro</label>' +
      '<input type="number" id="challengeCount" min="1" max="10" step="1" value="' + accounts + '" />' +
      '<span class="muted small">challenges</span></div>' +
      '<div id="challengeRotation"></div>';

    // La cabecera con el campo no se regenera al recalcular: si no, se perderia el foco al teclear.
    document.getElementById('challengeCount').addEventListener('input', function (e) {
      pickChallengeCount(e.target.value);
    });
    renderRotationBlock();

    document.getElementById('challengeCaveat').innerHTML =
      '<strong>Caso normal</strong> = la mitad de las veces harían falta menos operaciones, y la otra mitad más. ' +
      '<strong>Si va mal</strong> = el 10% de los casos peores.<br>' +
      (consistency > 0
        ? 'La <strong>consistencia</strong> actúa como tope de beneficio del día: con un ' + consistency +
          '% ningún día puede aportar más de esa parte del objetivo, así que hay que parar aunque el sistema siga dando señales.<br>'
        : '') +
      'Calculado repartiendo al azar 3.000 veces las ' + sim.sampleSize + ' operaciones de este backtest, ' +
      'sin respetar el orden en que ocurrieron. ' +
      'Da por hecho que las próximas se parecerán a estas. No incluye el límite de pérdida diaria ' +
      'ni el mínimo de días operados que exija cada prop.';

    card.style.display = 'block';
  }

  /* "Y si compro varios challenges": se escribe cuantos y se listan uno a uno hasta esa cifra.
     Los dos modos usan el nombre del argot de props: riesgo rotativo (cambias de cuenta al
     primer SL) y sin riesgo rotativo (agotas una antes de abrir la siguiente). */
  var CHALLENGE_CTX = null;

  function pickChallengeCount(n) {
    if (!CHALLENGE_CTX) return;
    CHALLENGE_CTX.picked = Math.max(1, Math.min(10, Math.round(Number(n)) || 1));
    renderRotationBlock();
  }

  function renderRotationBlock() {
    var host = document.getElementById('challengeRotation');
    if (!host || !CHALLENGE_CTX) return;
    var ctx = CHALLENGE_CTX;
    var pct = ctx.pct, tone = ctx.tone, picked = ctx.picked;
    var rows = compareChallengeAccounts(
      ctx.rs, ctx.cfg,
      { runs: 600, tradesPerDay: ctx.perDay, continueOnConsistencyStop: ctx.continueOnStop },
      picked
    );
    if (!rows.length) { host.innerHTML = ''; return; }

    var current = rows[rows.length - 1];
    // Se decide por "los pasas todos" y, si empatan, por "al menos uno": son las dos cifras que
    // se ven, asi que el veredicto no puede apoyarse en otra cosa.
    var gapAll = current.rotating.passAllRate - current.sequential.passAllRate;
    var gapAny = current.rotating.anyPassRate - current.sequential.anyPassRate;
    var decisive = Math.abs(gapAll) >= 1 ? gapAll : (Math.abs(gapAny) >= 1 ? gapAny : 0);
    var rotWins = decisive > 0;
    var seqWins = decisive < 0;

    function modeCard(title, subtitle, data, isBest) {
      return '<div class="mode-card' + (isBest ? ' is-best' : '') + '">' +
        '<div class="mode-head"><h4>' + title + '</h4>' +
        (isBest ? '<span class="mode-flag">Mejor opción</span>' : '') + '</div>' +
        '<p class="muted small">' + subtitle + '</p>' +
        '<div class="mode-rows">' +
          '<div><span>Pasas al menos uno</span><strong class="' + tone(data.anyPassRate) + '">' + pct(data.anyPassRate) + '</strong></div>' +
          '<div><span>Los pasas los ' + picked + '</span><strong class="' + tone(data.passAllRate) + '">' + pct(data.passAllRate) + '</strong></div>' +
          '<div><span>Lo más habitual</span><strong>' + data.mostLikelyPassed + ' de ' + picked + '</strong></div>' +
          '<div><span>Días hasta pasar el primero</span><strong>' + (data.medianDays == null ? '—' : data.medianDays) + '</strong></div>' +
        '</div>' +
        '<p class="muted small dist">' + data.passedDistribution.map(function (d) {
          return '<span>' + d.passed + ': <strong>' + d.pct.toFixed(0) + '%</strong></span>';
        }).join(' · ') + '</p></div>';
    }

    host.innerHTML =
      (picked === 1
        ? '<p class="muted small">Con un solo challenge no hay nada que rotar: la probabilidad de pasarlo es ' +
          pct(rows[0].rotating.anyPassRate) + '. Escribe 2 o más para comparar las dos formas de gestionarlos.</p>'
        : '<div class="modes">' +
            modeCard('Riesgo rotativo',
              'Se opera una cuenta y, en cuanto salta un SL, se pasa a la siguiente. Los SL se reparten entre todas y ninguna se acerca tanto a su pérdida máxima.',
              current.rotating, rotWins) +
            modeCard('Sin riesgo rotativo',
              'Se opera la misma cuenta hasta pasarla o quemarla. Solo entonces se empieza la siguiente, que sigue intacta.',
              current.sequential, seqWins) +
          '</div>' +
          '<p class="muted small">' +
          (rotWins
            ? 'Con ' + picked + ' cuentas compensa el riesgo rotativo: se pasan todos el ' +
              pct(current.rotating.passAllRate) + ' de las veces, frente al ' + pct(current.sequential.passAllRate) + '.'
            : seqWins
              ? 'Con ' + picked + ' cuentas sale mejor sin riesgo rotativo: se pasan todos el ' +
                pct(current.sequential.passAllRate) + ' de las veces, frente al ' + pct(current.rotating.passAllRate) + '.'
              : 'Con ' + picked + ' cuentas da igual cómo se gestionen: los dos caminos acaban practicamente en lo mismo.') +
          ' La fila de abajo de cada tarjeta es el reparto completo: de cada 100 intentos, cuántas ' +
          'veces se acabaría con 0 challenges pasados, con 1, con 2… Ahí no hay medias: o se pasa o no.</p>') +
      '<div class="table-scroll"><table><thead><tr>' +
      '<th class="no-sort">Compro</th>' +
      '<th class="num no-sort">Rotativo · pasas ≥1</th><th class="num no-sort">Rotativo · todos</th>' +
      '<th class="num no-sort">Sin rotativo · pasas ≥1</th><th class="num no-sort">Sin rotativo · todos</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr' + (r.accounts === picked ? ' class="is-current"' : '') + '><td>' + r.accounts + '</td>' +
          '<td class="num ' + tone(r.rotating.anyPassRate) + '">' + pct(r.rotating.anyPassRate) + '</td>' +
          '<td class="num">' + pct(r.rotating.passAllRate) + '</td>' +
          '<td class="num ' + tone(r.sequential.anyPassRate) + '">' + pct(r.sequential.anyPassRate) + '</td>' +
          '<td class="num">' + pct(r.sequential.passAllRate) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* ------------------------------ Render ------------------------------ */

  var TRADES = [], SESSIONS = {}, sortKey = 'date', sortDir = 1;
  var PASSWORD = '';

  /**
   * Las capturas viven en el bucket publico 'backtest-report-images', bajo la carpeta del
   * informe. Solo se copian ahi las de las operaciones compartidas; el resto siguen privadas.
   */
  function imageUrl(path) {
    var name = String(path || '').trim();
    if (!name) return '';
    if (/^https?:/i.test(name)) return name;
    // Se guarda la ruta original (local o storage:...); aqui solo interesa el nombre de archivo.
    var file = name.split(/[\\\\/]/).pop();
    if (!file) return '';
    return SUPABASE_URL + '/storage/v1/object/public/backtest-report-images/' + TOKEN + '/' + encodeURIComponent(file);
  }

  var money = function (v) { return (v >= 0 ? '+' : '') + Number(v || 0).toFixed(2) + '\\u20AC'; };
  var esDate = function (v) {
    var m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(v || ''));
    return m ? m[3] + '-' + m[2] + '-' + m[1] : (v || '');
  };
  var tone = function (v) { return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; };
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  function render(data) {
    var p = data.payload || {};
    TRADES = (p.trades || []).slice();
    (p.sessions || []).forEach(function (s) { SESSIONS[String(s.id)] = s.name; });

    document.getElementById('title').textContent = data.title || 'Resultados de backtesting';
    var sub = [];
    if (p.range) sub.push(p.range);
    sub.push(TRADES.length + (TRADES.length === 1 ? ' operación' : ' operaciones'));
    if (data.created_at) sub.push('Generado el ' + esDate(data.created_at));
    document.getElementById('subtitle').textContent = sub.join('  ·  ');

    fillSelect('fSession', (p.sessions || []).map(function (s) { return { v: String(s.id), t: s.name }; }));
    fillSelect('fAsset', uniq(TRADES.map(function (t) { return t.asset; })).map(function (a) { return { v: a, t: a }; }));

    renderKpis(TRADES, p);
    renderEquity(TRADES);
    renderResultChart(TRADES);
    renderPairs(TRADES);
    renderHours(TRADES);
    renderMetrics(TRADES, p.metrics || []);
    renderBe(TRADES);
    renderDailyStop(TRADES);
    renderChallenge(p);
    renderTrades();

    ['fSession', 'fAsset', 'fResult', 'fDirection'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', renderTrades);
    });
    document.getElementById('fSearch').addEventListener('input', renderTrades);

    var refresh = document.getElementById('refresh');
    if (refresh && data.live) {
      // Solo tiene sentido en informes en vivo: en los congelados el contenido no cambia nunca.
      refresh.hidden = false;
      refresh.onclick = function () {
        refresh.disabled = true;
        refresh.textContent = 'Actualizando...';
        fetch(SUPABASE_URL + '/rest/v1/rpc/open_backtest_report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
          body: JSON.stringify({ p_token: TOKEN, p_password: PASSWORD, p_device: deviceId() })
        })
          .then(function (r) { return r.json(); })
          .then(function (fresh) {
            refresh.disabled = false;
            refresh.textContent = 'Actualizar';
            // Se recarga la página con los datos nuevos: rehacer las gráficas en caliente
            // obligaría a destruirlas una a una y es más frágil que empezar de cero.
            if (fresh && fresh.ok === true) location.reload();
          })
          .catch(function () {
            refresh.disabled = false;
            refresh.textContent = 'Actualizar';
          });
      };
    }

    document.querySelectorAll('#tradesTable th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var k = th.getAttribute('data-sort');
        sortDir = sortKey === k ? -sortDir : 1;
        sortKey = k;
        renderTrades();
      });
    });
  }

  function uniq(list) {
    var out = [], seen = {};
    list.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort();
  }

  function fillSelect(id, items) {
    var sel = document.getElementById(id);
    items.forEach(function (it) {
      var o = document.createElement('option');
      o.value = it.v; o.textContent = it.t;
      sel.appendChild(o);
    });
  }

  function summarize(list) {
    var wins = 0, losses = 0, be = 0, profit = 0, loss = 0, rSum = 0;
    list.forEach(function (t) {
      var pnl = Number(t.pnl || 0);
      rSum += Number(t.rr_result || 0);
      if (t.result === 'TP') { wins++; profit += pnl; }
      else if (t.result === 'SL') { losses++; loss += Math.abs(pnl); }
      else { be++; if (pnl > 0) profit += pnl; if (pnl < 0) loss += Math.abs(pnl); }
    });
    var n = list.length;
    return {
      n: n, wins: wins, losses: losses, be: be, rSum: rSum,
      pnl: profit - loss,
      winrate: n ? (wins / n) * 100 : 0,
      pf: loss > 0 ? profit / loss : null
    };
  }

  function maxDrawdown(list) {
    var peak = 0, equity = 0, dd = 0;
    ordered(list).forEach(function (t) {
      equity += Number(t.pnl || 0);
      if (equity > peak) peak = equity;
      dd = Math.min(dd, equity - peak);
    });
    return dd;
  }

  /* Orden cronologico: fecha y, dentro del dia, hora de entrada. Mismo criterio que la
     aplicacion; si aqui se ordenara solo por fecha, la curva de capital del enlace podria
     dibujar el mismo dia en distinto orden que la del ordenador. */
  function ordered(list) {
    var key = function (t) {
      return String(t.date || '').slice(0, 10) + ' ' + String(t.entry_time || '99:99').slice(0, 5);
    };
    return list.slice().sort(function (a, b) {
      return key(a).localeCompare(key(b)) || Number(a.id || 0) - Number(b.id || 0);
    });
  }

  /* Una caja de cifra, con el mismo marcado que el Resumen: las tarjetas nuevas se ven igual que
     las de arriba sin repetir el HTML en cada sitio. */
  function kpi(etiqueta, valor, clase) {
    return '<div class="kpi"><span>' + esc(etiqueta) + '</span><strong class="' + (clase || '') +
      '">' + esc(valor) + '</strong></div>';
  }

  function renderKpis(list, p) {
    var s = summarize(list);
    // Rachas en orden cronologico; los BE no cortan (misma funcion que usa la aplicacion).
    var streaks = computeResultStreaks(list);
    var items = [
      ['Operaciones', String(s.n), ''],
      ['Ratio de aciertos', s.n ? s.winrate.toFixed(1) + '%' : '—', ''],
      ['PnL total', money(s.pnl), tone(s.pnl)],
      ['R acumulada', (s.rSum >= 0 ? '+' : '') + s.rSum.toFixed(2), tone(s.rSum)],
      ['Factor de beneficio', s.pf == null ? '—' : s.pf.toFixed(2), ''],
      ['TP / SL / BE', s.wins + ' / ' + s.losses + ' / ' + s.be, ''],
      ['TP seguidos · máximo', String(streaks.maxTp), 'pos'],
      ['SL seguidos · máximo', String(streaks.maxSl), 'neg'],
      ['Max drawdown', money(maxDrawdown(list)), 'neg']
    ];
    if (p.capital) {
      items.push(['Rentabilidad', ((s.pnl / p.capital) * 100).toFixed(2) + '%', tone(s.pnl)]);
    }
    document.getElementById('kpis').innerHTML = items.map(function (i) {
      return kpi(i[0], i[1], i[2]);
    }).join('');
  }

  function renderEquity(list) {
    var rows = ordered(list), equity = 0;
    var labels = [], values = [];
    rows.forEach(function (t) {
      equity += Number(t.pnl || 0);
      labels.push(esDate(t.date));
      values.push(Number(equity.toFixed(2)));
    });
    new Chart(document.getElementById('equityChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: values, borderColor: '#38bdf8', borderWidth: 2, pointRadius: 0,
          fill: true, backgroundColor: 'rgba(56,189,248,.12)', tension: .25
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', maxTicksLimit: 8 }, grid: { color: 'rgba(148,163,184,.08)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,.08)' } }
        }
      }
    });
  }

  function renderResultChart(list) {
    var s = summarize(list);
    new Chart(document.getElementById('resultChart'), {
      type: 'doughnut',
      data: {
        labels: ['TP', 'SL', 'BE'],
        datasets: [{ data: [s.wins, s.losses, s.be], backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'], borderWidth: 0 }]
      },
      options: { responsive: true, plugins: { legend: { labels: { color: '#e2e8f0' } } } }
    });
  }

  function renderPairs(list) {
    var map = {};
    list.forEach(function (t) {
      var k = t.asset || '—';
      if (!map[k]) map[k] = { n: 0, wins: 0, pnl: 0 };
      map[k].n++; map[k].pnl += Number(t.pnl || 0);
      if (t.result === 'TP') map[k].wins++;
    });
    var rows = Object.keys(map).map(function (k) {
      var v = map[k];
      return '<tr><td>' + esc(k) + '</td><td class="num">' + v.n + '</td><td class="num">' +
        (v.n ? ((v.wins / v.n) * 100).toFixed(1) + '%' : '—') + '</td><td class="num ' + tone(v.pnl) + '">' +
        money(v.pnl) + '</td></tr>';
    });
    document.querySelector('#pairTable tbody').innerHTML = rows.join('') ||
      '<tr><td colspan="4" class="muted">Sin datos</td></tr>';
  }

  function renderHours(list) {
    var hours = {};
    list.forEach(function (t) {
      var m = /^(\\d{1,2}):/.exec(String(t.entry_time || ''));
      if (!m) return;
      var h = Number(m[1]);
      if (!hours[h]) hours[h] = { tp: 0, sl: 0 };
      if (t.result === 'TP') hours[h].tp++;
      else if (t.result === 'SL') hours[h].sl++;
    });
    var keys = Object.keys(hours).map(Number).sort(function (a, b) { return a - b; })
      .filter(function (h) { return hours[h].tp + hours[h].sl > 0; });
    if (!keys.length) { document.getElementById('hoursCard').style.display = 'none'; return; }
    var max = Math.max.apply(null, keys.map(function (h) { return hours[h].tp + hours[h].sl; }));
    // Alturas en PIXELES y no en porcentaje: el porcentaje se calcula sobre la altura del padre,
    // que aqui no esta definida (es un item flexible), asi que resolvia a 0 y no se veia nada.
    var MAX_BAR = 104;
    document.getElementById('hours').innerHTML = keys.map(function (h) {
      var v = hours[h], total = v.tp + v.sl;
      var barH = Math.max(8, Math.round((total / max) * MAX_BAR));
      var tpH = Math.round((v.tp / total) * barH);
      return '<div class="hour" title="' + h + ':00 · ' + v.tp + ' TP · ' + v.sl + ' SL">' +
        '<span class="hour-count">' + total + '</span>' +
        '<div class="hour-stack" style="height:' + barH + 'px">' +
        '<div class="hour-tp" style="height:' + tpH + 'px"></div>' +
        '<div class="hour-sl" style="height:' + (barH - tpH) + 'px"></div></div>' +
        '<span class="hour-label">' + (h < 10 ? '0' + h : h) + '</span></div>';
    }).join('');
  }

  function renderMetrics(list, names) {
    if (!names.length) { document.getElementById('metricsCard').style.display = 'none'; return; }
    var rows = names.map(function (name) {
      var yes = [], no = [];
      list.forEach(function (t) {
        var v = (t.custom_metrics || {})[name];
        if (v === true) yes.push(t); else if (v === false) no.push(t);
      });
      var a = summarize(yes), b = summarize(no);
      var cell = function (s) {
        return s.n
          ? '<strong class="' + tone(s.pnl) + '">' + money(s.pnl) + '</strong><br><span class="muted small">' +
            s.n + ' ops · ' + s.winrate.toFixed(1) + '%</span>'
          : '<span class="muted">—</span>';
      };
      var verdict = '<span class="muted">Sin datos todavía</span>';
      if (a.n && b.n) {
        var diff = a.pnl - b.pnl;
        verdict = diff > 0
          ? '<span class="pos">Mejor cumpliéndola (' + money(diff) + ')</span>'
          : diff < 0 ? '<span class="neg">Peor cumpliéndola (' + money(diff) + ')</span>'
          : '<span class="muted">Sin diferencia</span>';
      } else if (a.n) verdict = '<span class="muted">Siempre se cumple</span>';
      else if (b.n) verdict = '<span class="muted">Nunca se cumple</span>';
      return '<tr><td>' + esc(name) + '</td><td class="num">' + cell(a) + '</td><td class="num">' +
        cell(b) + '</td><td>' + verdict + '</td></tr>';
    });
    document.querySelector('#metricsTable tbody').innerHTML = rows.join('');
  }

  // Mismas reglas que en la aplicación (services/dailyStopAnalysis.js): orden real dentro del
  // día, la operación que hace saltar el stop cuenta, y el tope de filas es el mayor número de SL
  // que se han juntado en un día.
  function renderDailyStop(list) {
    var card = document.getElementById('dailyStopCard');
    var porDia = {};
    list.forEach(function (t) {
      var d = String(t.date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      (porDia[d] = porDia[d] || []).push(t);
    });
    var dias = Object.keys(porDia).sort().map(function (d) {
      return porDia[d].slice().sort(function (a, b) {
        var ha = hhmm(a.entry_time), hb = hhmm(b.entry_time);
        if (ha !== hb) return ha < hb ? -1 : 1;
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });
    });
    if (!dias.length) { card.style.display = 'none'; return; }

    var real = 0, maxSl = 0;
    dias.forEach(function (ops) {
      ops.forEach(function (t) { real += Number(t.pnl) || 0; });
      var sl = ops.filter(esSL).length;
      if (sl > maxSl) maxSl = sl;
    });
    if (!maxSl) { card.style.display = 'none'; return; }

    var filas = [], mejor = null;
    for (var n = 1; n <= Math.min(maxSl, 10); n++) {
      var pnl = 0, diasParados = 0, evitadas = 0, desglose = { SL: 0, TP: 0, BE: 0 };
      dias.forEach(function (ops) {
        var corte = -1, cuenta = 0;
        for (var i = 0; i < ops.length; i++) {
          if (esSL(ops[i])) { cuenta++; if (cuenta >= n) { corte = i + 1; break; } }
        }
        var operadas = corte === -1 ? ops : ops.slice(0, corte);
        var fuera = corte === -1 ? [] : ops.slice(corte);
        if (fuera.length) diasParados++;
        evitadas += fuera.length;
        operadas.forEach(function (t) { pnl += Number(t.pnl) || 0; });
        fuera.forEach(function (t) {
          var r = String(t.result || '').toUpperCase();
          if (desglose[r] !== undefined) desglose[r]++;
        });
      });
      var dif = pnl - real;
      if (dif > 0 && (!mejor || dif > mejor.dif)) mejor = { n: n, dif: dif };
      filas.push({ n: n, pnl: pnl, dif: dif, dias: diasParados, evitadas: evitadas, desglose: desglose });
    }

    document.getElementById('dailyStopSummary').innerHTML = mejor
      ? 'Parar tras <strong>' + mejor.n + ' SL</strong> habría dejado <strong class="pos">' + money(mejor.dif) + '</strong> más.'
      : 'Ningún umbral habría mejorado el resultado: seguir operando salió a cuenta.';
    document.getElementById('dailyStopContext').textContent =
      dias.length + (dias.length === 1 ? ' día con operaciones' : ' días con operaciones') +
      ' · máximo de ' + maxSl + ' SL en un mismo día';

    document.querySelector('#dailyStopTable tbody').innerHTML = filas.map(function (f) {
      var partes = [];
      ['SL', 'TP', 'BE'].forEach(function (k) { if (f.desglose[k]) partes.push(f.desglose[k] + ' ' + k); });
      var pocos = f.dias > 0 && f.dias < 5;
      var veredicto = Math.abs(f.dif) < 0.005
        ? '<span class="muted">No habría cambiado nada</span>'
        : (f.dif > 0 ? '<span class="pos">Mejor parar' : '<span class="neg">Mejor seguir') +
          (pocos ? ' · pocos días aún' : '') + '</span>';
      return '<tr><td>' + f.n + ' SL' + (mejor && mejor.n === f.n ? ' <span class="pos small">(mejor)</span>' : '') +
        '</td><td class="num"><strong class="' + tone(f.pnl) + '">' + money(f.pnl) + '</strong></td>' +
        '<td class="num"><strong class="' + tone(f.dif) + '">' + money(f.dif) + '</strong></td>' +
        '<td class="num">' + f.dias + '<br><span class="muted small">' + f.evitadas +
        (f.evitadas === 1 ? ' operación evitada' : ' operaciones evitadas') +
        (partes.length ? ' · ' + partes.join(' · ') : '') + '</span></td>' +
        '<td>' + veredicto + '</td></tr>';
    }).join('');
    card.style.display = '';
  }

  function esSL(t) { return String(t.result || '').toUpperCase() === 'SL'; }

  function hhmm(v) {
    var m = /^(\d{1,2}):(\d{2})/.exec(String(v == null ? '' : v).trim());
    return m ? (m[1].length === 1 ? '0' + m[1] : m[1]) + ':' + m[2] : '99:99';
  }

  // Análisis de BE. Los enlaces generados antes de que el informe incluyera «qué pasó después
  // del BE» no traen ese dato: en ese caso la tarjeta no se enseña, en vez de dar por hecho que
  // ninguna se resolvió y presentar ceros como si fueran un resultado.
  function renderBe(list) {
    var card = document.getElementById('beCard');
    var be = list.filter(function (t) { return String(t.result || '').toUpperCase() === 'BE'; });
    var tieneCampo = list.some(function (t) { return t.be_after_result !== undefined; });
    if (!be.length || !tieneCampo) { card.style.display = 'none'; return; }

    var despues = function (t) { return String(t.be_after_result || '').toUpperCase(); };
    var tp = be.filter(function (t) { return despues(t) === 'TP'; }).length;
    var sl = be.filter(function (t) { return despues(t) === 'SL'; }).length;
    var sinResolver = be.length - tp - sl;
    var resueltas = tp + sl;
    var hipotetico = be.reduce(function (acc, t) {
      var mov = Math.abs(Number(t.pnl) || 0);
      if (despues(t) === 'TP') return acc + mov;
      if (despues(t) === 'SL') return acc - mov;
      return acc;
    }, 0);

    document.getElementById('beKpis').innerHTML = [
      kpi('Operaciones en BE', String(be.length), ''),
      kpi('BE → TP', String(tp), 'neg'),
      kpi('BE → SL', String(sl), 'pos'),
      kpi('BE útil', resueltas ? (sl / resueltas * 100).toFixed(1) + '%' : '—', 'pos'),
      kpi('Sin resolver', String(sinResolver), ''),
      kpi('PnL hipotético sin BE', money(hipotetico), tone(hipotetico)),
    ].join('');
    card.style.display = '';
  }

  function filtered() {
    var se = document.getElementById('fSession').value;
    var as = document.getElementById('fAsset').value;
    var re = document.getElementById('fResult').value;
    var di = document.getElementById('fDirection').value;
    var q = document.getElementById('fSearch').value.trim().toLowerCase();
    return TRADES.filter(function (t) {
      if (se && String(t.session_id) !== se) return false;
      if (as && t.asset !== as) return false;
      if (re && t.result !== re) return false;
      if (di && String(t.direction || '').toUpperCase() !== di) return false;
      if (q && String(t.notes || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderTrades() {
    var list = filtered().slice().sort(function (a, b) {
      var x = a[sortKey], y = b[sortKey];
      if (typeof x === 'number' || typeof y === 'number') return (Number(x || 0) - Number(y || 0)) * sortDir;
      return String(x || '').localeCompare(String(y || '')) * sortDir;
    });

    var s = summarize(list);
    document.getElementById('tradesCount').innerHTML =
      list.length + ' operaciones · PnL <span class="' + tone(s.pnl) + '">' + money(s.pnl) + '</span> · ' +
      s.winrate.toFixed(1) + '% de acierto';

    var body = document.querySelector('#tradesTable tbody');
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="8" class="muted">No hay operaciones con estos filtros.</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (t, i) {
      var res = String(t.result || 'BE').toUpperCase();
      var cls = res === 'TP' ? 'tp' : res === 'SL' ? 'sl' : 'be';
      var dir = String(t.direction || '').toUpperCase() === 'SHORT' ? 'Venta' : 'Compra';
      var metrics = Object.keys(t.custom_metrics || {}).filter(function (k) { return k !== 'risk_eur'; });
      // Las capturas se sirven desde el bucket publico de informes, en la carpeta del token.
      var shots = [t.image_before, t.image_after].map(imageUrl).filter(Boolean);
      var detail = '';
      if (metrics.length || t.notes || shots.length) {
        detail = '<tr class="row-detail" id="d' + i + '" style="display:none"><td colspan="8">' +
          (metrics.length
            ? '<div class="chips" style="margin-bottom:8px">' + metrics.map(function (m) {
                var on = t.custom_metrics[m] === true;
                return '<span class="chip ' + (on ? 'ok' : '') + '">' + (on ? '\\u2713 ' : '\\u2715 ') + esc(m) + '</span>';
              }).join('') + '</div>'
            : '') +
          (t.notes ? '<div class="muted small">' + esc(t.notes) + '</div>' : '') +
          (shots.length
            ? '<div class="shots">' + shots.map(function (src, k) {
                return '<figure><figcaption>' + (k === 0 && shots.length > 1 ? 'Antes' : shots.length > 1 ? 'Despues' : 'Captura') +
                  '</figcaption><img loading="lazy" src="' + esc(src) + '" alt="Captura de la operacion" /></figure>';
              }).join('') + '</div>'
            : '') +
          '</td></tr>';
      }
      return '<tr class="row-main" data-detail="d' + i + '">' +
        '<td>' + esDate(t.date) + '</td>' +
        '<td>' + esc(t.asset || '—') + '</td>' +
        '<td>' + dir + '</td>' +
        '<td><span class="badge ' + cls + '">' + res + '</span></td>' +
        '<td class="num ' + tone(Number(t.pnl)) + '">' + money(t.pnl) + '</td>' +
        '<td class="num ' + tone(Number(t.rr_result)) + '">' + Number(t.rr_result || 0).toFixed(2) + '</td>' +
        '<td>' + esc(t.entry_time || '—') + '</td>' +
        '<td>' + esc(SESSIONS[String(t.session_id)] || '—') + '</td>' +
        '</tr>' + detail;
    }).join('');

    body.querySelectorAll('tr.row-main').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var d = document.getElementById(tr.getAttribute('data-detail'));
        if (d) d.style.display = d.style.display === 'none' ? 'table-row' : 'none';
      });
    });
  }
})();
</script>
</body>
</html>`;
}

module.exports = { buildViewerHtml };
