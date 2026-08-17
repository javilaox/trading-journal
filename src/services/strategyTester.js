/**
 * Probador de estrategia: qué cabe esperar de una forma de operar, antes de operarla.
 *
 * Aquí solo está la matemática. No toca la interfaz ni la base de datos, de modo que cada
 * cálculo se puede comprobar por separado contra un número hecho a mano.
 *
 * Lo que NO es: una predicción. Todo lo que se calcula sale de suponer que cada operación es
 * independiente y que el acierto y el RR se mantienen. En la realidad ni una cosa ni la otra son
 * exactas, así que estos números sirven para comparar planteamientos entre sí («¿me renta más
 * RR 2 con 50% de acierto o RR 4 con 35%?»), no para saber cuánto se va a ganar.
 */

/* ------------------------------------------------------------------ entradas de la posición */

/**
 * Una posición puede construirse con varias entradas, cada una con su peso (qué parte del riesgo
 * se le asigna) y su RR objetivo. El RR de la posición entera es la media de los RR ponderada por
 * esos pesos: si la mitad del riesgo va a RR 2 y la otra mitad a RR 4, la posición se comporta
 * como una sola entrada a RR 3.
 *
 * Los pesos se normalizan, así que da igual escribirlos como 50 y 50, como 1 y 1, o como 30 y 30.
 * Lo único que importa es la proporción entre ellos.
 */
function combineEntries(entries) {
  const list = (Array.isArray(entries) ? entries : [])
    .map((e, i) => ({
      weight: Math.max(0, Number(e?.weight) || 0),
      rr: Math.max(0, Number(e?.rr) || 0),
      // Con qué frecuencia se llega a activar esa entrada. La primera es la que abre la
      // operación: si no se activa no hay trade, así que dentro de las operaciones que se
      // toman siempre está. Las siguientes son las que a veces no llegan a entrar porque el
      // precio no vuelve a buscarlas.
      fillRate: i === 0 ? 1 : clampRate(e?.fillRate === undefined ? 100 : e.fillRate),
    }))
    .filter((e) => e.weight > 0);

  if (!list.length) {
    return { rr: 0, entries: [], totalWeight: 0, deployed: 0, nominalRr: 0 };
  }

  const totalWeight = list.reduce((sum, e) => sum + e.weight, 0);

  // Parte del riesgo previsto que de media se llega a poner sobre la mesa. Si la segunda entrada
  // pesa la mitad y solo se activa el 60% de las veces, de media se arriesga 0,5 + 0,5×0,6 = 0,8
  // de lo previsto, no 1. Ignorar esto hincha tanto las ganancias como las pérdidas.
  const deployed = list.reduce((sum, e) => sum + (e.weight / totalWeight) * e.fillRate, 0);

  // RR de la posición contando solo lo que de verdad entra. Si la entrada buena (la de RR alto)
  // es justo la que muchas veces no se activa, el RR real es bastante peor que el previsto, y
  // eso es lo que hay que ver.
  const rewardShare = list.reduce(
    (sum, e) => sum + (e.weight / totalWeight) * e.fillRate * e.rr,
    0
  );
  const rr = deployed > 0 ? rewardShare / deployed : 0;

  // El RR que saldría si se activaran todas, para poder comparar con el de arriba.
  const nominalRr = list.reduce((sum, e) => sum + (e.weight / totalWeight) * e.rr, 0);

  return {
    rr,
    nominalRr,
    deployed,
    totalWeight,
    entries: list.map((e) => ({ ...e, share: e.weight / totalWeight })),
  };
}

/* --------------------------------------------------------------------------- por operación */

/**
 * Resultado medio de UNA operación, en múltiplos del riesgo (R).
 *
 *   esperanza = acierto × RR − (1 − acierto − empates) × 1
 *
 * Los empates (BE) no suman ni restan, pero sí ocupan sitio: si de cada 10 operaciones 2 acaban
 * en BE, esas 2 no son ni ganadas ni perdidas, y contarlas como perdidas falsearía el número.
 *
 * La comisión se resta aparte, porque se paga se gane o se pierda.
 */
function expectancyPerTrade({ winRate, rr, beRate = 0, commissionR = 0 }) {
  const win = clampRate(winRate);
  const be = clampRate(beRate);
  // Si acierto + empates pasa de 1, se recorta el empate: lo que el usuario ha escrito no cabe.
  const beAdjusted = Math.min(be, Math.max(0, 1 - win));
  const loss = Math.max(0, 1 - win - beAdjusted);
  const ratio = Math.max(0, Number(rr) || 0);
  const commission = Math.max(0, Number(commissionR) || 0);

  return {
    expectancyR: win * ratio - loss + -commission,
    winRate: win,
    beRate: beAdjusted,
    lossRate: loss,
    rr: ratio,
  };
}

/** Acierto mínimo para no perder dinero con ese RR (sin contar empates ni comisiones). */
function breakEvenWinRate(rr) {
  const ratio = Number(rr) || 0;
  if (ratio <= 0) return 1;
  return 1 / (1 + ratio);
}

/* ------------------------------------------------------------------------------ proyección */

/**
 * Proyección con interés compuesto: el riesgo es un % del capital, así que al crecer la cuenta
 * cada operación arriesga (y gana) más. Se aplica operación a operación el resultado medio:
 *
 *   capital = capital × (1 + riesgo% × esperanzaR)
 *
 * Es una proyección "suave", sin altibajos: enseña la tendencia, no un recorrido posible. Los
 * altibajos reales los cubren la racha de pérdidas y la caída máxima que se calculan aparte.
 *
 * `points` guarda el capital cada `pointEvery` operaciones para poder dibujar la curva sin
 * generar miles de puntos.
 */
function projectCompound({ startingCapital, riskPercent, expectancyR, trades, pointEvery = 1 }) {
  const capital0 = Math.max(0, Number(startingCapital) || 0);
  const risk = Math.max(0, Number(riskPercent) || 0) / 100;
  const n = Math.max(0, Math.floor(Number(trades) || 0));
  const step = Math.max(1, Math.floor(Number(pointEvery) || 1));

  const growth = 1 + risk * Number(expectancyR || 0);
  const points = [{ trade: 0, capital: capital0 }];

  let capital = capital0;
  let ruined = false;

  for (let i = 1; i <= n; i += 1) {
    capital *= growth;
    // Una cuenta no baja de cero. Si el planteamiento pierde dinero, esto evita enseñar
    // capitales negativos, que no significan nada.
    if (capital <= 0) {
      capital = 0;
      ruined = true;
    }
    if (i % step === 0 || i === n) points.push({ trade: i, capital });
    if (ruined) break;
  }

  const profit = capital - capital0;
  return {
    startingCapital: capital0,
    finalCapital: capital,
    profit,
    profitPct: capital0 > 0 ? (profit / capital0) * 100 : 0,
    growthPerTrade: growth,
    trades: n,
    points,
    ruined,
  };
}

/* ------------------------------------------------------------- rachas y caída esperables */

/**
 * Racha de pérdidas más larga que cabe esperar en `n` operaciones con ese acierto.
 *
 * Se usa la aproximación habitual: la racha esperada crece con el logaritmo del número de
 * operaciones. Con un 50% de acierto y 100 operaciones salen unas 6-7 seguidas; con un 35%, más
 * de 10. Es el número que de verdad decide si un plan es aguantable: mucha gente abandona en una
 * racha perfectamente normal para su estrategia porque no esperaba que pudiera ser tan larga.
 */
function expectedLosingStreak({ winRate, beRate = 0, trades }) {
  const win = clampRate(winRate);
  const be = Math.min(clampRate(beRate), Math.max(0, 1 - win));
  const loss = Math.max(0, 1 - win - be);
  const n = Math.max(0, Math.floor(Number(trades) || 0));

  if (n <= 0 || loss <= 0) return 0;
  if (loss >= 1) return n;

  const streak = Math.log(n) / Math.log(1 / loss);
  return Math.max(1, streak);
}

/**
 * Caída máxima estimada, en % del capital: lo que costaría encadenar esa racha de pérdidas
 * arriesgando un % fijo del capital en cada una.
 *
 *   caída = 1 − (1 − riesgo%)^racha
 *
 * Se compone porque al perder, el capital baja y la siguiente operación arriesga menos: no es
 * simplemente riesgo × racha.
 */
function estimatedDrawdownPct({ riskPercent, streak }) {
  const risk = Math.max(0, Number(riskPercent) || 0) / 100;
  const n = Math.max(0, Number(streak) || 0);
  if (risk <= 0 || n <= 0) return 0;
  if (risk >= 1) return 100;
  return (1 - Math.pow(1 - risk, n)) * 100;
}

/* ------------------------------------------------------------------------------ conjunto */

/**
 * Ejecuta el probador entero para una configuración y devuelve todo lo que la pantalla enseña.
 *
 * `tradesPerWeek` y `weeks` son la forma natural de pensarlo («opero 5 veces por semana durante
 * un año»); el total de operaciones sale de ahí.
 */
function runStrategyTest(config = {}) {
  const entries = combineEntries(config.entries);
  // Si no se detalla la posición por entradas, se usa el RR suelto.
  const rr = entries.entries.length ? entries.rr : Math.max(0, Number(config.rr) || 0);
  // Proporción del riesgo previsto que de media se llega a arriesgar.
  const deployed = entries.entries.length ? entries.deployed : 1;

  const tradesPerWeek = Math.max(0, Number(config.tradesPerWeek) || 0);
  const weeks = Math.max(0, Number(config.weeks) || 0);
  const totalTrades = Math.round(tradesPerWeek * weeks);

  const perTrade = expectancyPerTrade({
    winRate: config.winRate,
    rr,
    beRate: config.beRate,
    // La comisión se descuenta después, sobre el resultado ya escalado: se paga entera aunque
    // la posición se haya montado a medias.
    commissionR: 0,
  });

  // El resultado se escala por lo que de verdad se arriesga. Con media posición puesta, tanto la
  // ganancia como la pérdida son la mitad.
  const commission = Math.max(0, Number(config.commissionR) || 0);
  const expectancyR = perTrade.expectancyR * deployed - commission;

  const riskPercent = Math.max(0, Number(config.riskPercent) || 0);
  const startingCapital = Math.max(0, Number(config.startingCapital) || 0);

  const projection = projectCompound({
    startingCapital,
    riskPercent,
    expectancyR,
    trades: totalTrades,
    // Como mucho 120 puntos en la curva: de sobra para verla y sin cargar la gráfica.
    pointEvery: Math.max(1, Math.ceil(totalTrades / 120)),
  });

  const streak = expectedLosingStreak({
    winRate: perTrade.winRate,
    beRate: perTrade.beRate,
    trades: totalTrades,
  });

  return {
    rr,
    // RR que saldría si se activaran todas las entradas, para poder compararlo con el de arriba.
    nominalRr: entries.entries.length ? entries.nominalRr : rr,
    deployed,
    entries: entries.entries,
    totalTrades,
    tradesPerWeek,
    weeks,
    riskPercent,
    // Lo que deja de media una operación, en R y en dinero sobre el capital de partida.
    expectancyR,
    expectancyMoney: startingCapital * (riskPercent / 100) * expectancyR,
    winRate: perTrade.winRate,
    beRate: perTrade.beRate,
    lossRate: perTrade.lossRate,
    breakEvenWinRate: breakEvenWinRate(rr),
    profitable: expectancyR > 0,
    projection,
    expectedLosingStreak: streak,
    estimatedDrawdownPct: estimatedDrawdownPct({ riskPercent: riskPercent * deployed, streak }),
  };
}

/* -------------------------------------------------------------------------------- utilidad */

/** Acepta el acierto como 0-1 o como 0-100, y lo deja siempre entre 0 y 1. */
function clampRate(value) {
  let n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 1) n /= 100;
  return Math.min(1, n);
}

module.exports = {
  combineEntries,
  expectancyPerTrade,
  breakEvenWinRate,
  projectCompound,
  expectedLosingStreak,
  estimatedDrawdownPct,
  runStrategyTest,
  clampRate,
};
