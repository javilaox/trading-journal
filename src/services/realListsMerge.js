/**
 * Merge, dedupe y recuperación de cuentas/estrategias reales desde múltiples fuentes.
 * Identidad estable: client_uuid > remote_id > id > name (solo fallback).
 */

function isHiddenSyncRow(row) {
  const deletedAt = row?.deleted_at;
  if (deletedAt != null && String(deletedAt).trim() !== '') return true;
  const sync = String(row?.sync_status || '').toLowerCase();
  return sync === 'pending_delete' || sync === 'deleted';
}

function pickDefined(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

function mergePreviousNames(prev = [], next = []) {
  const set = new Set();
  for (const n of [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(next) ? next : [])]) {
    const s = String(n || '').trim();
    if (s) set.add(s);
  }
  return [...set];
}

function normalizeAccountMerge(row = {}) {
  if (typeof row === 'string') {
    return {
      name: row.trim(),
      capital: 0,
      commissionPerLot: 0,
      freeSwap: false,
      client_uuid: null,
      remote_id: null,
      id: null,
      previous_names: [],
    };
  }
  const name = String(row?.name || '').trim();
  if (!name) return null;
  return {
    name,
    capital: Number(row?.capital ?? row?.balance ?? 0) || 0,
    commissionPerLot: Number(row?.commissionPerLot ?? row?.commission_per_lot ?? 0) || 0,
    freeSwap: Boolean(row?.freeSwap ?? row?.free_swap),
    client_uuid: row?.client_uuid ? String(row.client_uuid) : null,
    remote_id: row?.remote_id != null && row.remote_id !== '' ? String(row.remote_id) : null,
    id: row?.id != null && row.id !== '' ? row.id : null,
    previous_names: Array.isArray(row?.previous_names) ? row.previous_names.map(String) : [],
  };
}

function normalizeStrategyMerge(row = {}) {
  if (typeof row === 'string') {
    const name = row.trim();
    if (!name) return null;
    return {
      name,
      description: '',
      schedule_enabled: false,
      operating_hours: [],
      client_uuid: null,
      remote_id: null,
      id: null,
      previous_names: [],
    };
  }
  const name = String(row?.name || '').trim();
  if (!name) return null;
  let operating_hours = row?.operating_hours;
  if (typeof operating_hours === 'string') {
    try {
      operating_hours = JSON.parse(operating_hours);
    } catch {
      operating_hours = [];
    }
  }
  if (!Array.isArray(operating_hours)) operating_hours = [];
  return {
    name,
    description: row?.description != null ? String(row.description) : '',
    schedule_enabled: Boolean(row?.schedule_enabled),
    operating_hours,
    client_uuid: row?.client_uuid ? String(row.client_uuid) : null,
    remote_id: row?.remote_id != null && row.remote_id !== '' ? String(row.remote_id) : null,
    id: row?.id != null && row.id !== '' ? row.id : null,
    previous_names: Array.isArray(row?.previous_names) ? row.previous_names.map(String) : [],
  };
}

function accountMergeKeys(account) {
  const keys = [];
  if (account?.client_uuid) keys.push(`uuid:${account.client_uuid}`);
  if (account?.remote_id) keys.push(`remote:${account.remote_id}`);
  if (account?.id != null && account.id !== '') keys.push(`id:${account.id}`);
  if (account?.name) keys.push(`name:${String(account.name).toLowerCase()}`);
  if (Array.isArray(account?.previous_names)) {
    for (const alias of account.previous_names) {
      if (alias) keys.push(`name:${String(alias).toLowerCase()}`);
    }
  }
  return keys;
}

function strategyMergeKeys(strategy) {
  const keys = [];
  if (strategy?.client_uuid) keys.push(`uuid:${strategy.client_uuid}`);
  if (strategy?.remote_id) keys.push(`remote:${strategy.remote_id}`);
  if (strategy?.id != null && strategy.id !== '') keys.push(`id:${strategy.id}`);
  if (strategy?.name) keys.push(`name:${String(strategy.name).toLowerCase()}`);
  if (Array.isArray(strategy?.previous_names)) {
    for (const alias of strategy.previous_names) {
      if (alias) keys.push(`name:${String(alias).toLowerCase()}`);
    }
  }
  return keys;
}

function buildAliasNameSet(entities, keyFn) {
  const aliases = new Set();
  for (const entity of entities) {
    if (!entity) continue;
    if (entity.name) aliases.add(String(entity.name).toLowerCase());
    if (Array.isArray(entity.previous_names)) {
      for (const alias of entity.previous_names) {
        if (alias) aliases.add(String(alias).toLowerCase());
      }
    }
    keyFn(entity);
  }
  return aliases;
}

function mergeEntityFields(prev, norm) {
  return {
    ...prev,
    ...pickDefined(norm),
    client_uuid: norm.client_uuid || prev.client_uuid || null,
    remote_id: norm.remote_id || prev.remote_id || null,
    id: norm.id != null && norm.id !== '' ? norm.id : prev.id ?? null,
    name: norm.name || prev.name,
    previous_names: mergePreviousNames(prev.previous_names, norm.previous_names),
    capital: Number.isFinite(norm.capital) ? norm.capital : prev.capital,
    commissionPerLot: Number.isFinite(norm.commissionPerLot) ? norm.commissionPerLot : prev.commissionPerLot,
    freeSwap: norm.freeSwap !== undefined ? norm.freeSwap : prev.freeSwap,
    description: norm.description !== undefined ? norm.description : prev.description,
    schedule_enabled: norm.schedule_enabled !== undefined ? norm.schedule_enabled : prev.schedule_enabled,
    operating_hours:
      Array.isArray(norm.operating_hours) && norm.operating_hours.length
        ? norm.operating_hours
        : prev.operating_hours,
  };
}

function mergeEntityList(incomingLists, { normalize, keyFn, logPrefix }) {
  const keyToIndex = new Map();
  const merged = [];

  const upsert = (raw) => {
    const norm = normalize(raw);
    if (!norm) return;
    if (isHiddenSyncRow(raw)) return;

    let hitIndex = -1;
    for (const k of keyFn(norm)) {
      if (keyToIndex.has(k)) {
        hitIndex = keyToIndex.get(k);
        break;
      }
    }

    if (hitIndex >= 0) {
      const prev = merged[hitIndex];
      const next = mergeEntityFields(prev, norm);
      merged[hitIndex] = next;
      keyFn(next).forEach((k) => keyToIndex.set(k, hitIndex));
    } else {
      const idx = merged.length;
      merged.push(norm);
      keyFn(norm).forEach((k) => keyToIndex.set(k, idx));
    }
  };

  const before = merged.length;
  for (const list of incomingLists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) upsert(item);
  }
  if (logPrefix) {
    console.log(`[${logPrefix}] before merge count: ${before}, after merge count: ${merged.length}`);
  }
  return merged;
}

function dedupeEntityList(list, { normalize, keyFn, logPrefix }) {
  const before = Array.isArray(list) ? list.length : 0;
  const deduped = mergeEntityList([list], { normalize, keyFn, logPrefix: null });
  if (logPrefix) {
    console.log(`[${logPrefix}] dedupe before: ${before}, after: ${deduped.length}`);
  }
  return deduped;
}

function mergeRealAccounts(existingAccounts, incomingAccounts) {
  const existing = Array.isArray(existingAccounts) ? existingAccounts : [];
  const incoming = Array.isArray(incomingAccounts) ? incomingAccounts : [];
  return mergeEntityList([existing, incoming], {
    normalize: normalizeAccountMerge,
    keyFn: accountMergeKeys,
    logPrefix: null,
  });
}

function mergeRealStrategies(existingStrategies, incomingStrategies) {
  const existing = Array.isArray(existingStrategies) ? existingStrategies : [];
  const incoming = Array.isArray(incomingStrategies) ? incomingStrategies : [];
  return mergeEntityList([existing, incoming], {
    normalize: normalizeStrategyMerge,
    keyFn: strategyMergeKeys,
    logPrefix: null,
  });
}

function dedupeRealAccounts(accounts) {
  return dedupeEntityList(accounts, {
    normalize: normalizeAccountMerge,
    keyFn: accountMergeKeys,
    logPrefix: 'accounts',
  });
}

function dedupeRealStrategies(strategies) {
  return dedupeEntityList(strategies, {
    normalize: normalizeStrategyMerge,
    keyFn: strategyMergeKeys,
    logPrefix: 'strategies',
  });
}

function filterTradeRecoveryAccounts(fromTrades, knownAccounts, logPrefix = 'accounts') {
  const aliasNames = buildAliasNameSet(knownAccounts, accountMergeKeys);
  const skipped = [];
  const filtered = (Array.isArray(fromTrades) ? fromTrades : []).filter((item) => {
    const name = String(item?.name || '').trim();
    if (!name) return false;
    const key = name.toLowerCase();
    if (aliasNames.has(key)) {
      skipped.push(name);
      return false;
    }
    return true;
  });
  if (skipped.length && logPrefix) {
    console.log(`[${logPrefix}] recovered from trades skipped old alias:`, skipped);
  }
  return { accounts: filtered, skipped };
}

function filterTradeRecoveryStrategies(fromTrades, knownStrategies, logPrefix = 'strategies') {
  const aliasNames = buildAliasNameSet(knownStrategies, strategyMergeKeys);
  const skipped = [];
  const filtered = (Array.isArray(fromTrades) ? fromTrades : []).filter((item) => {
    const name = String(item?.name || '').trim();
    if (!name) return false;
    const key = name.toLowerCase();
    if (aliasNames.has(key)) {
      skipped.push(name);
      return false;
    }
    return true;
  });
  if (skipped.length && logPrefix) {
    console.log(`[${logPrefix}] recovered from trades skipped old alias:`, skipped);
  }
  return { accounts: filtered, skipped };
}

function extractAccountsFromTrades(trades = []) {
  const names = new Set();
  for (const t of Array.isArray(trades) ? trades : []) {
    const name = String(t?.account ?? t?.cuenta ?? '').trim();
    if (name) names.add(name);
  }
  return [...names].map((name) => ({ name, capital: 0, commissionPerLot: 0, freeSwap: false }));
}

function extractStrategiesFromTrades(trades = []) {
  const names = new Set();
  for (const t of Array.isArray(trades) ? trades : []) {
    const name = String(t?.strategy ?? t?.estrategia ?? '').trim();
    if (name) names.add(name);
  }
  return [...names].map((name) => ({
    name,
    description: '',
    schedule_enabled: false,
    operating_hours: [],
  }));
}

function mapSqliteAccountRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => !isHiddenSyncRow(r))
    .map((r) =>
      normalizeAccountMerge({
        id: r?.id,
        name: r?.name,
        balance: r?.balance,
        commission_per_lot: r?.commission_per_lot,
        free_swap: r?.free_swap,
        client_uuid: r?.client_uuid,
        remote_id: r?.remote_id,
      })
    )
    .filter(Boolean);
}

function mapSqliteStrategyRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => !isHiddenSyncRow(r))
    .map((r) =>
      normalizeStrategyMerge({
        id: r?.id,
        name: r?.name,
        description: r?.description,
        schedule_enabled: r?.schedule_enabled,
        operating_hours: r?.operating_hours,
        client_uuid: r?.client_uuid,
        remote_id: r?.remote_id,
      })
    )
    .filter(Boolean);
}

module.exports = {
  mergeRealAccounts,
  mergeRealStrategies,
  dedupeRealAccounts,
  dedupeRealStrategies,
  filterTradeRecoveryAccounts,
  filterTradeRecoveryStrategies,
  extractAccountsFromTrades,
  extractStrategiesFromTrades,
  mapSqliteAccountRows,
  mapSqliteStrategyRows,
  normalizeAccountMerge,
  normalizeStrategyMerge,
  isHiddenSyncRow,
  mergePreviousNames,
};
