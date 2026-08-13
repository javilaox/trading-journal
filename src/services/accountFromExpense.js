/**
 * Cuenta creada a partir de la compra de un challenge.
 *
 * Comprar un challenge es, en la práctica, dos apuntes: el gasto y la cuenta nueva. Tenerlos que
 * meter por separado obligaba a ir a Configuración justo después, con el riesgo de olvidarlo y
 * quedarse con el gasto registrado y la cuenta sin dar de alta.
 *
 * El nombre se compone como prop + tamaño + los últimos dígitos de la cuenta ("Lucid Trading 50K
 * 4821"). Sin número queda "Lucid Trading 50K", y como se pueden comprar dos iguales el mismo
 * día, si ese nombre ya existe se numera: "Lucid Trading 50K (2)".
 */

/** "50K" -> 50000. Lo que se guarda como capital de la cuenta. */
function accountSizeToCapital(size) {
  const raw = String(size || '').trim().toUpperCase().replace(/\s/g, '').replace(',', '.');
  const match = /^([\d.]+)\s*([KM]?)$/.exec(raw);
  if (!match) return 0;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;
  if (match[2] === 'K') return Math.round(value * 1000);
  if (match[2] === 'M') return Math.round(value * 1000000);
  return Math.round(value);
}

function buildAccountNameFromExpense({ prop, size, accountNumber, existingNames = [] }) {
  const partes = [String(prop || '').trim(), String(size || '').trim(), String(accountNumber || '').trim()]
    .filter(Boolean);
  const base = partes.join(' ').trim();
  if (!base) return '';

  const taken = new Set(existingNames.map((n) => String(n || '').trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;

  // Con número de cuenta el nombre ya es único; sin él, dos compras iguales chocarían.
  for (let i = 2; i < 100; i += 1) {
    const candidato = `${base} (${i})`;
    if (!taken.has(candidato.toLowerCase())) return candidato;
  }
  return `${base} (${Date.now()})`;
}

/** Categorías que suelen significar "he comprado una cuenta". Solo se usa para proponer. */
function looksLikeAccountPurchase(category) {
  const c = String(category || '').trim().toLowerCase();
  if (!c) return false;
  return ['evaluaci', 'activaci', 'challenge', 'reset', 'cuenta'].some((k) => c.includes(k));
}

module.exports = { accountSizeToCapital, buildAccountNameFromExpense, looksLikeAccountPurchase };
