/**
 * Navegación entre entry points de Electron Forge (dev: localhost, prod: file://).
 * Usa MAIN_WINDOW_WEBPACK_ENTRY y STATS_WEBPACK_ENTRY inyectados por @electron-forge/plugin-webpack.
 */

function resolveMainWindowUrl(hash) {
  if (typeof MAIN_WINDOW_WEBPACK_ENTRY === 'undefined') {
    return null;
  }
  const base = String(MAIN_WINDOW_WEBPACK_ENTRY).split('#')[0];
  if (!hash) return base;
  return `${base}#${hash}`;
}

function navigateTo(page) {
  const target = String(page || '').toLowerCase();
  if (!target) return;

  try {
    if (target === 'stats' && typeof window.showView === 'function') {
      window.showView('stats');
      return;
    }
    if (target === 'withdrawals' && typeof window.showView === 'function') {
      window.showView('withdrawals');
      return;
    }

    if (typeof MAIN_WINDOW_WEBPACK_ENTRY !== 'undefined') {
      if (target === 'dashboard') {
        window.location.href = resolveMainWindowUrl('');
        return;
      }
      if (
        target === 'trade' ||
        target === 'withdrawals' ||
        target === 'config' ||
        target === 'backtesting' ||
        target === 'backtestingconfig'
      ) {
        const fragment = target === 'backtestingconfig' ? 'backtestingconfig' : target;
        window.location.href = resolveMainWindowUrl(fragment);
        return;
      }
    }
  } catch (err) {
    console.error('[navigateTo] error:', err);
  }

  // Fallback legacy (sin Forge webpack)
  const isFileProtocol = window.location.protocol === 'file:';
  if (isFileProtocol) {
    if (target === 'stats') {
      window.location.href = '../stats/index.html';
      return;
    }
    if (target === 'dashboard') {
      window.location.href = '../main_window/index.html';
      return;
    }
    window.location.href = `../main_window/index.html#${target}`;
    return;
  }

  if (target === 'stats') {
    window.location.href = `${window.location.origin}/stats`;
    return;
  }
  if (target === 'dashboard') {
    window.location.href = `${window.location.origin}/main_window`;
    return;
  }
  if (
    target === 'trade' ||
    target === 'withdrawals' ||
    target === 'config' ||
    target === 'backtesting' ||
    target === 'backtestingconfig'
  ) {
    const fragment = target === 'backtestingconfig' ? 'backtestingconfig' : target;
    window.location.href = `${window.location.origin}/main_window#${fragment}`;
    return;
  }

  window.location.href = `${window.location.origin}/${target}`;
}

module.exports = { navigateTo };
