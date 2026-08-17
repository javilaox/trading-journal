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

/**
 * Escenarios posibles de una operación, según hasta dónde se llegue a construir la posición.
 *
 * Las entradas se activan en orden: la segunda solo tiene sentido si ya estás dentro, y la
 * tercera solo si entró la segunda. Así que los casos son «solo la primera», «primera y
 * segunda», «las tres»... cada uno con su probabilidad.
 *
 * El acierto es el mismo en todos los escenarios: la estrategia es la misma, y que el precio
 * pasara antes por la segunda entrada no cambia el criterio con el que se abrió la operación.
 * Lo que sí cambia entre escenarios es cuánto riesgo se llegó a poner y con qué RR, y eso es lo
 * que se calcula aquí.
 */
function buildScenarios(entries, { winRate, beRate }) {
  const list = (Array.isArray(entries) ? entries : [])
    .map((e, i) => ({
      weight: Math.max(0, Number(e?.weight) || 0),
      rr: Math.max(0, Number(e?.rr) || 0),
      fillRate: i === 0 ? 1 : clampRate(e?.fillRate === undefined ? 100 : e.fillRate),
    }))
    .filter((e) => e.weight > 0);

  if (!list.length) return [];

  const totalWeight = list.reduce((sum, e) => sum + e.weight, 0);
  const win = clampRate(winRate);
  const be = clampRate(beRate);
  const beAjustado = Math.min(be, Math.max(0, 1 - win));
  const loss = Math.max(0, 1 - win - beAjustado);

  const escenarios = [];
  let probAcumulada = 1; // probabilidad de haber llegado hasta la entrada k

  for (let k = 0; k < list.length; k += 1) {
    if (k > 0) probAcumulada *= list[k].fillRate;
    // Probabilidad de quedarse EXACTAMENTE en esta entrada: haber llegado hasta aquí y que la
    // siguiente no se active.
    const siguiente = k + 1 < list.length ? list[k + 1].fillRate : 0;
    const prob = probAcumulada * (1 - siguiente);
    if (prob <= 0) continue;

    const usadas = list.slice(0, k + 1);
    const peso = usadas.reduce((sum, e) => sum + e.weight, 0) / totalWeight;
    const rr = peso > 0
      ? usadas.reduce((sum, e) => sum + (e.weight / totalWeight) * e.rr, 0) / peso
      : 0;

    escenarios.push({
      entriesFilled: k + 1,
      averaged: k > 0,
      prob,
      deployedShare: peso,
      rr,
      winRate: win,
      beRate: beAjustado,
      lossRate: loss,
    });
  }

  return escenarios;
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
  const escenarios = buildScenarios(config.entries, {
    winRate: config.winRate,
    beRate: config.beRate,
  });

  const tradesPerWeek = Math.max(0, Number(config.tradesPerWeek) || 0);
  const weeks = Math.max(0, Number(config.weeks) || 0);
  const totalTrades = Math.round(tradesPerWeek * weeks);

  const commission = Math.max(0, Number(config.commissionR) || 0);
  const riskPercent = Math.max(0, Number(config.riskPercent) || 0);
  const startingCapital = Math.max(0, Number(config.startingCapital) || 0);

  let expectancyR;
  let deployed;
  let rr;
  let winRate;
  let beRate;
  let lossRate;

  if (escenarios.length) {
    // Cada escenario aporta lo suyo, ponderado por lo probable que sea. El riesgo de cada uno se
    // escala por la parte de la posición que llegó a montarse.
    expectancyR =
      escenarios.reduce(
        (sum, e) => sum + e.prob * e.deployedShare * (e.winRate * e.rr - e.lossRate),
        0
      ) - commission;

    deployed = escenarios.reduce((sum, e) => sum + e.prob * e.deployedShare, 0);

    // RR medio de lo que de verdad se arriesga, para poder enseñarlo.
    const recompensa = escenarios.reduce((sum, e) => sum + e.prob * e.deployedShare * e.rr, 0);
    rr = deployed > 0 ? recompensa / deployed : 0;

    // Estas tres se ponderan por probabilidad del escenario (no por riesgo): lo que miden es
    // cada cuántas operaciones se gana o se pierde, que es lo que necesita la racha.
    winRate = escenarios.reduce((sum, e) => sum + e.prob * e.winRate, 0);
    beRate = escenarios.reduce((sum, e) => sum + e.prob * e.beRate, 0);
    lossRate = escenarios.reduce((sum, e) => sum + e.prob * e.lossRate, 0);
  } else {
    // Sin entradas detalladas: una posición normal con el RR suelto.
    rr = Math.max(0, Number(config.rr) || 0);
    deployed = 1;
    const perTrade = expectancyPerTrade({
      winRate: config.winRate,
      rr,
      beRate: config.beRate,
      commissionR: 0,
    });
    expectancyR = perTrade.expectancyR - commission;
    winRate = perTrade.winRate;
    beRate = perTrade.beRate;
    lossRate = perTrade.lossRate;
  }

  const projection = projectCompound({
    startingCapital,
    riskPercent,
    expectancyR,
    trades: totalTrades,
    // Como mucho 120 puntos en la curva: de sobra para verla y sin cargar la gráfica.
    pointEvery: Math.max(1, Math.ceil(totalTrades / 120)),
  });

  const streak = expectedLosingStreak({ winRate, beRate, trades: totalTrades });

  return {
    rr,
    // RR que saldría si se activaran todas las entradas, para poder compararlo con el de arriba.
    nominalRr: entries.entries.length ? entries.nominalRr : rr,
    deployed,
    entries: entries.entries,
    escenarios,
    // Con cuánta frecuencia la posición acaba promediada.
    averagedRate: escenarios.filter((e) => e.averaged).reduce((sum, e) => sum + e.prob, 0),
    totalTrades,
    tradesPerWeek,
    weeks,
    riskPercent,
    // Lo que deja de media una operación, en R y en dinero sobre el capital de partida.
    expectancyR,
    expectancyMoney: startingCapital * (riskPercent / 100) * expectancyR,
    winRate,
    beRate,
    lossRate,
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
  buildScenarios,
  expectancyPerTrade,
  breakEvenWinRate,
  projectCompound,
  expectedLosingStreak,
  estimatedDrawdownPct,
  runStrategyTest,
  clampRate,
};
