/**
 * Catálogo de activos que se pueden operar.
 *
 * Es la MISMA lista que el desplegable "Activo" del formulario de trades del ordenador
 * (`<select id="asset">` en dashboard.html). Vive aquí porque la versión móvil la necesita, y
 * `scripts/build-mobile.js` comprueba en cada generación que las dos siguen coincidiendo: si
 * alguien añade un activo en dashboard.html y se olvida de este archivo, la generación falla en
 * vez de publicar una versión móvil con menos activos que la de escritorio.
 *
 * Que la lista sea cerrada es deliberado: el activo es la clave con la que se agrupan las
 * estadísticas ("mejor par", rendimiento por par...). Si se pudiera escribir libre, un "Nas100"
 * y un "NAS100" serían dos activos distintos y las estadísticas quedarían partidas sin que se
 * note.
 */

const ASSET_CATALOG = [
  {
    group: "Forex",
    assets: [
      { value: "EURUSD", label: "EURUSD" },
      { value: "GBPUSD", label: "GBPUSD" },
      { value: "USDJPY", label: "USDJPY" },
      { value: "USDCHF", label: "USDCHF" },
      { value: "AUDUSD", label: "AUDUSD" },
      { value: "USDCAD", label: "USDCAD" },
      { value: "NZDUSD", label: "NZDUSD" },
      { value: "EURGBP", label: "EURGBP" },
      { value: "EURJPY", label: "EURJPY" },
      { value: "EURCHF", label: "EURCHF" },
      { value: "EURAUD", label: "EURAUD" },
      { value: "EURCAD", label: "EURCAD" },
      { value: "EURNZD", label: "EURNZD" },
      { value: "GBPJPY", label: "GBPJPY" },
      { value: "GBPCHF", label: "GBPCHF" },
      { value: "GBPAUD", label: "GBPAUD" },
      { value: "GBPCAD", label: "GBPCAD" },
      { value: "GBPNZD", label: "GBPNZD" },
      { value: "AUDJPY", label: "AUDJPY" },
      { value: "AUDCHF", label: "AUDCHF" },
      { value: "AUDCAD", label: "AUDCAD" },
      { value: "AUDNZD", label: "AUDNZD" },
      { value: "CADJPY", label: "CADJPY" },
      { value: "CADCHF", label: "CADCHF" },
      { value: "NZDJPY", label: "NZDJPY" },
      { value: "NZDCHF", label: "NZDCHF" },
    ],
  },
  {
    group: "Índices",
    assets: [
      { value: "NAS100", label: "NAS100" },
      { value: "SPX500", label: "SPX500" },
      { value: "US30", label: "US30" },
      { value: "DAX40", label: "DAX40" },
      { value: "FTSE100", label: "FTSE100" },
      { value: "CAC40", label: "CAC40" },
      { value: "IBEX35", label: "IBEX35" },
      { value: "NIKKEI225", label: "NIKKEI225" },
    ],
  },
  {
    group: "Commodities",
    assets: [
      { value: "XAUUSD", label: "XAUUSD (Gold)" },
      { value: "XAGUSD", label: "XAGUSD (Silver)" },
      { value: "WTI", label: "WTI" },
      { value: "BRENT", label: "BRENT" },
      { value: "NATGAS", label: "NATGAS" },
    ],
  },
];

/** Lista plana de los códigos, para validar. */
function assetValues() {
  const out = [];
  ASSET_CATALOG.forEach((group) => {
    group.assets.forEach((a) => out.push(a.value));
  });
  return out;
}

function isKnownAsset(value) {
  return assetValues().indexOf(String(value || '').trim().toUpperCase()) >= 0;
}

module.exports = { ASSET_CATALOG, assetValues, isKnownAsset };
