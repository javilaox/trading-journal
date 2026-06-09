/**
 * Sidebar unificado para Dashboard (SPA) y Estadísticas (página Forge separada).
 */
const { navigateTo } = require('./navigation.js');

const SPA_VIEWS = new Set(['dashboard', 'trade', 'stats', 'withdrawals', 'config', 'backtesting', 'backtestingConfig']);

const NAV_ITEMS = [
  { id: 'btnDashboard', view: 'dashboard', icon: 'layout-dashboard', i18n: 'dashboard', label: 'Dashboard' },
  { id: 'btnTrade', view: 'trade', icon: 'plus-circle', i18n: 'new_trade', label: 'Nuevo trade' },
  { id: 'btnStats', view: 'stats', icon: 'bar-chart-3', i18n: 'stats', label: 'Estadísticas' },
  { id: 'btnWithdrawals', view: 'withdrawals', icon: 'banknote', i18n: 'withdrawals_nav', label: 'Retiros' },
  { id: 'btnConfig', view: 'config', icon: 'settings', i18n: 'settings', label: 'Configuración' },
  { id: 'btnBacktesting', view: 'backtesting', icon: 'flask-conical', i18n: '', label: 'Backtesting' },
  {
    id: 'btnBacktestingConfig',
    view: 'backtestingConfig',
    icon: 'sliders-horizontal',
    i18n: '',
    label: 'Config. Backtesting'
  }
];

function buildNavButton({ id, view, icon, i18n, label }, activeView) {
  const active = activeView === view ? ' active' : '';
  const i18nAttr = i18n ? ` data-i18n="${i18n}"` : '';
  return `<button id="${id}" type="button" class="sidebar-btn sidebar-item nav-btn${active}" data-sidebar-view="${view}">
    <i data-lucide="${icon}" class="sidebar-icon" aria-hidden="true"></i>
    <span class="sidebar-item-label"${i18nAttr}>${label}</span>
  </button>`;
}

function buildSidebarInnerHtml(activeView) {
  const realButtons = NAV_ITEMS.slice(0, 5).map((item) => buildNavButton(item, activeView)).join('\n');
  const backtestButtons = NAV_ITEMS.slice(5).map((item) => buildNavButton(item, activeView)).join('\n');

  return `
    <div class="sidebar-header">
      <div class="logo"><span class="logo-text">Trading Journal</span></div>
      <button id="toggleSidebar" class="sidebar-toggle" type="button" data-i18n-title="sidebar_toggle_tooltip" data-i18n-aria-label="sidebar_toggle_tooltip">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
      </button>
    </div>
    <div class="sidebar-section" data-sidebar-section="REAL">
      <div class="sidebar-title">REAL</div>
      ${realButtons}
    </div>
    <div class="sidebar-section" data-sidebar-section="BACKTEST">
      <div class="sidebar-title">BACKTEST</div>
      ${backtestButtons}
    </div>
    <div class="sidebar-section" data-sidebar-section="SISTEMA">
      <div class="sidebar-title">SISTEMA</div>
    </div>
    <div class="sidebar-footer">
      <div class="theme-toggle">
        <label class="theme-toggle-content" for="themeToggle">
          <span id="themeIcon" class="theme-icon-slot"><i data-lucide="moon" aria-hidden="true"></i></span>
          <span class="theme-label" data-i18n="theme_light">Tema claro</span>
        </label>
        <label class="switch" for="themeToggle">
          <input type="checkbox" id="themeToggle" />
          <span class="slider"></span>
        </label>
      </div>
      <div class="lang-switch">
        <button class="lang-btn" data-lang="es" type="button">ES</button>
        <button class="lang-btn" data-lang="en" type="button">EN</button>
      </div>
    </div>
    <div id="user-section">
      <div id="user-email">Cargando...</div>
      <div class="user-actions">
        <button id="profile-btn" type="button">
          <i data-lucide="user" aria-hidden="true"></i>
          <span>Perfil</span>
        </button>
        <button id="logout-btn" type="button">
          <i data-lucide="log-out" aria-hidden="true"></i>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  `;
}

function getSidebarRoot() {
  return document.getElementById('sidebar');
}

function getSidebarActionButton(target) {
  const normalized = String(target || '').toLowerCase();
  if (!normalized) return null;
  const idMap = {
    dashboard: 'btnDashboard',
    trade: 'btnTrade',
    stats: 'btnStats',
    withdrawals: 'btnWithdrawals',
    config: 'btnConfig',
    backtesting: 'btnBacktesting',
    backtestingconfig: 'btnBacktestingConfig'
  };
  const id = idMap[normalized];
  if (id) return document.getElementById(id);
  return document.querySelector(`[data-sidebar-view="${normalized}"]`);
}

function getSidebarSectionByLabel(label) {
  const expected = String(label || '').trim().toUpperCase();
  if (!expected) return null;
  const byData = document.querySelector(`#sidebar [data-sidebar-section="${expected}"]`);
  if (byData) return byData;
  const sections = Array.from(document.querySelectorAll('#sidebar .sidebar-section'));
  return (
    sections.find((section) => {
      const title = section.querySelector('.sidebar-title, .sidebar-label, h2, h3');
      return String(title?.textContent || '').trim().toUpperCase() === expected;
    }) || null
  );
}

function normalizeSidebarStructure(activeView = '') {
  const sidebar = getSidebarRoot();
  if (!sidebar) return;

  const realSection = getSidebarSectionByLabel('REAL');
  if (!realSection) return;

  const realOrder = ['dashboard', 'trade', 'stats', 'withdrawals', 'config'];
  const wrapperSelector = 'li, .sidebar-item, .nav-item, .menu-item, .item';

  realOrder.forEach((view) => {
    const btn = getSidebarActionButton(view);
    if (!btn) return;
    if (!btn.id) {
      const idMap = {
        dashboard: 'btnDashboard',
        trade: 'btnTrade',
        stats: 'btnStats',
        withdrawals: 'btnWithdrawals',
        config: 'btnConfig',
      };
      btn.id = idMap[view] || '';
    }
    const node = btn.closest(wrapperSelector) || btn;
    if (node.parentElement !== realSection) {
      realSection.appendChild(node);
    } else {
      realSection.appendChild(node);
    }
  });

  const systemSection = getSidebarSectionByLabel('SISTEMA');
  const btnConfig = getSidebarActionButton('config');
  const configNode = btnConfig?.closest(wrapperSelector) || btnConfig;
  if (systemSection && configNode && configNode.parentElement === systemSection && realSection) {
    realSection.appendChild(configNode);
  }

  console.log('Sidebar normalized for view:', activeView || '(none)');
}

function setSidebarActiveView(activeView) {
  const normalized =
    activeView === 'backtestingconfig' ? 'backtestingConfig' : String(activeView || 'dashboard');
  NAV_ITEMS.forEach(({ id, view }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const isActive = view === normalized;
    btn.classList.toggle('active', isActive);
  });
  console.log('Sidebar active view:', normalized);
}

function markAppShellLayoutReady() {
  document.querySelector('.app-shell')?.classList.add('layout-ready');
}

function renderSidebar(activeView = 'dashboard') {
  const root = getSidebarRoot();
  if (!root) return;

  if (root.querySelector('#btnDashboard')) {
    setSidebarActiveView(activeView);
    normalizeSidebarStructure(activeView);
    markAppShellLayoutReady();
    return;
  }

  const wasCollapsed = root.classList.contains('collapsed') || root.classList.contains('closed');
  root.className = 'sidebar open';
  if (wasCollapsed) {
    root.classList.add('collapsed', 'closed');
  }

  root.innerHTML = buildSidebarInnerHtml(activeView);
  normalizeSidebarStructure(activeView);
  setSidebarActiveView(activeView);
  markAppShellLayoutReady();
}

function toggleSidebarCollapse() {
  const sidebar = getSidebarRoot();
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  sidebar.classList.toggle('closed');
}

async function updateSidebarUserEmail(getUserEmail) {
  const el = document.getElementById('user-email');
  if (!el) return;
  try {
    if (typeof getUserEmail === 'function') {
      const email = await getUserEmail();
      if (email) {
        el.textContent = email;
        return;
      }
    }
  } catch (err) {
    console.warn('Sidebar user email error:', err);
  }
  if (!el.textContent || el.textContent === 'Cargando...') {
    el.textContent = 'No autenticado';
  }
}

function initSidebar({
  activeView = 'dashboard',
  mode = 'spa',
  onSpaView,
  onThemeChange,
  refreshIcons,
  getUserEmail,
  onProfile,
  onLogout
} = {}) {
  renderSidebar(activeView);

  const sidebar = getSidebarRoot();
  if (!sidebar) return;

  if (sidebar.dataset.sidebarBound === '1') {
    setSidebarActiveView(activeView);
    void updateSidebarUserEmail(getUserEmail);
    markAppShellLayoutReady();
    return;
  }
  sidebar.dataset.sidebarBound = '1';

  document.getElementById('toggleSidebar')?.addEventListener('click', () => {
    toggleSidebarCollapse();
    if (typeof refreshIcons === 'function') refreshIcons();
  });

  NAV_ITEMS.forEach(({ id, view }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (mode === 'spa' && typeof onSpaView === 'function') {
        if (view === 'stats' || SPA_VIEWS.has(view)) {
          onSpaView(view === 'backtestingConfig' ? 'backtestingConfig' : view);
          setSidebarActiveView(view);
          return;
        }
      }
      if (view === 'stats') {
        if (typeof window.showView === 'function') {
          window.showView('stats');
          return;
        }
        navigateTo('stats');
        return;
      }
      navigateTo(view === 'backtestingConfig' ? 'backtestingconfig' : view);
    });
  });

  const themeToggle = document.getElementById('themeToggle');
  themeToggle?.addEventListener('change', () => {
    const nextTheme = themeToggle.checked ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    document.body.classList.toggle('light', nextTheme === 'light');
    if (typeof onThemeChange === 'function') onThemeChange(nextTheme);
    if (typeof refreshIcons === 'function') refreshIcons();
  });

  const savedTheme = localStorage.getItem('theme');
  if (themeToggle) {
    themeToggle.checked = savedTheme === 'light';
    document.body.classList.toggle('light', savedTheme === 'light');
  }

  document.getElementById('profile-btn')?.addEventListener('click', () => {
    if (typeof onProfile === 'function') {
      onProfile();
      return;
    }
    if (mode === 'spa' && typeof onSpaView === 'function') {
      onSpaView('config');
      setSidebarActiveView('config');
      return;
    }
    navigateTo('config');
  });

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (typeof onLogout === 'function') {
      void onLogout();
    }
  });

  void updateSidebarUserEmail(getUserEmail);
  if (typeof refreshIcons === 'function') refreshIcons();
}

module.exports = {
  renderSidebar,
  initSidebar,
  normalizeSidebarStructure,
  setSidebarActiveView,
  toggleSidebarCollapse,
  updateSidebarUserEmail,
  getSidebarActionButton
};
