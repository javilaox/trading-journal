import { supabase } from './supabase.js';
import { login, register, logout } from './auth.js';
import {
  saveOfflineUserSession,
  getOfflineUsers,
  getLastOfflineUser,
  canUseOfflineLogin,
  loginOffline,
  isOnline,
  setOfflineMode,
  isOfflineModeActive,
  getCurrentAppEnv as getOfflineAppEnv,
  checkInternetConnection
} from './services/offlineAuth.js';
import { validateTrade } from './services/validators.js';
/** Fechas visibles DD-MM-YYYY — implementación en `./dateDisplay.js`. */
import { formatDateEs, formatDateRangeEs } from './dateDisplay.js';
import { navigateTo } from './navigation.js';
import {
  buildManagementReport,
  buildTradesReport,
  buildBacktestingReport,
} from './services/exportReports.js';
import './sidebar.css';
import './stats-page.css';
import {
  initSidebar,
  normalizeSidebarStructure,
  setSidebarActiveView,
  toggleSidebarCollapse,
  updateSidebarUserEmail
} from './sidebar.js';

const { mountStatsView, unmountStatsView, applyFilters: applyStatsFilters } = require('./stats.js');
const { calculateWithdrawalMetrics } = require('./services/realAccountWithdrawals');
const { calculateExpenseMetrics } = require('./services/realAccountExpenses');
const {
  getCurrentUserSafe,
  clearAuthUserCache,
  setCachedUserId
} = require('./services/supabaseAuth.js');

function injectBacktestingProStyles() {
  if (document.getElementById('backtesting-pro-styles')) return;
  const style = document.createElement('style');
  style.id = 'backtesting-pro-styles';
  style.textContent = `
#backtestingView,#backtestingConfigView{
  max-width:100%;
  overflow-x:hidden;
  box-sizing:border-box;
}
#backtestingView *,#backtestingConfigView *{box-sizing:border-box}
#backtestingView .pro-backtesting-shell,#backtestingConfigView .pro-config-shell{
  border-radius:18px;
}
#backtestingView .pro-panel,#backtestingConfigView .pro-panel{
  padding:0 0 4px;
  margin-bottom:4px;
}
#backtestingView .pro-section{
  margin-top:clamp(22px,2.6vw,32px);
}
#backtestingView .dashboard-container>.pro-backtesting-shell>.bt-section:first-child,
#backtestingView .pro-section:first-of-type{margin-top:0}
#backtestingView>.dashboard-container{
  padding:clamp(12px,2vw,20px) clamp(16px,2.5vw,28px);
}
#backtestingView>.dashboard-container>.section.card.pro-backtesting-shell{
  gap:clamp(22px,2.8vw,36px);
  padding:clamp(18px,2.2vw,28px);
}
#backtestingView .pro-card,#backtestingConfigView .pro-card{
  background:var(--card-bg,rgba(15,23,42,.55));
  border:1px solid var(--border,rgba(148,163,184,.18));
  border-radius:16px;
  padding:clamp(16px,2vw,22px);
  box-shadow:0 4px 24px rgba(0,0,0,.12);
  max-width:100%;
}
#backtestingView .pro-card--compact{padding:14px 18px}
#backtestingView .pro-card--flush{padding:0;border:none;background:transparent;box-shadow:none}
#backtestingView .pro-section-title,#backtestingConfigView .pro-section-title{
  margin:0 0 12px;
  font-size:clamp(15px,1.05vw,17px);
  font-weight:800;
  letter-spacing:-.02em;
  color:var(--text,#e2e8f0);
}
#backtestingView .pro-section-sub,#backtestingConfigView .pro-section-sub{
  margin:4px 0 0;
  font-size:13px;
  color:var(--text-muted,var(--muted,#94a3b8));
  line-height:1.45;
}
#backtestingView .pro-section-head,#backtestingConfigView .pro-section-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  margin-bottom:14px;
  flex-wrap:wrap;
}
#backtestingView .pro-grid,#backtestingConfigView .pro-grid{
  display:grid;
  gap:16px;
  grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));
}
#backtestingView .kpi-row.cards-grid{
  grid-template-columns:repeat(4,minmax(0,1fr));
}
@media(max-width:1200px){
  #backtestingView .kpi-row.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:700px){
  #backtestingView .kpi-row.cards-grid{grid-template-columns:1fr}
}
#backtestingView .pro-kpi-card,#backtestingView .kpi-card.pro-kpi-card{
  min-height:104px;
  border-radius:14px;
  padding:14px 16px;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:6px;
  background:var(--card-bg,rgba(15,23,42,.45));
  border:1px solid var(--border,rgba(148,163,184,.14));
  box-shadow:0 2px 12px rgba(0,0,0,.08);
}
#backtestingView .pro-kpi-card .kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.85}
#backtestingView .pro-kpi-card .kpi-value{font-size:clamp(18px,2vw,22px);font-weight:800;font-variant-numeric:tabular-nums}
#backtestingView .pro-kpi-val--pos{color:var(--green,#22c55e)!important}
#backtestingView .pro-kpi-val--neg{color:var(--red,#ef4444)!important}
#backtestingView .pro-kpi-val--neutral{color:var(--text,#e2e8f0)}
#backtestingView .backtesting-dist-grid .card.backtesting-dist-card{
  border-radius:12px;
  padding:12px 14px;
  font-weight:700;
}
#backtestingView .grid-2.bt-workspace,
#backtestingView .bt-work-grid{
  display:grid;
  grid-template-columns:minmax(0,1.55fr) minmax(360px,0.95fr);
  gap:20px;
  align-items:start;
  width:100%;
  max-width:100%;
  overflow:hidden;
  min-width:0;
}
#backtestingView .bt-workspace-left.bt-work-left,
#backtestingView .bt-work-left{display:flex;flex-direction:column;gap:16px;min-width:0}
#backtestingView .bt-workspace-right.bt-work-right,
#backtestingView .bt-work-right{display:flex;flex-direction:column;gap:18px;min-width:0}
#backtestingView .bt-day-trades-card{width:100%;margin-top:0}
@media(max-width:1250px){
  #backtestingView .grid-2.bt-workspace,
  #backtestingView .bt-work-grid{grid-template-columns:1fr}
  #backtestingView .bt-workspace-right,#backtestingView .bt-work-right{order:2}
  #backtestingView .bt-workspace-left,#backtestingView .bt-work-left{order:1}
}
#backtestingView .calendar-card.card.backtesting-calendar-card,#backtestingView .bt-calendar-card{
  min-width:0;
  overflow:visible;
  border-radius:16px;
  padding:clamp(14px,1.8vw,20px);
  border:1px solid var(--border,rgba(148,163,184,.16));
  background:var(--card-bg,rgba(15,23,42,.42));
  box-shadow:0 4px 20px rgba(0,0,0,.1);
}
#backtestingView .calendar-toolbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:12px;
}
#backtestingView .calendar-title-block{text-align:center;flex:1;min-width:0}
#backtestingView .calendar-month-label{font-weight:800;font-size:1rem}
/* Misma rejilla Semana+Lun-Vie que el Dashboard; tercera fila opcional solo Backtesting para agregados R */
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell:not(.day-empty) .day-r{
  font-size:11px;
  opacity:.88;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell:not(.day-empty).selected:not(.day-today){
  box-shadow:inset 0 0 0 2px rgba(59,130,246,.55);
}
#backtestingView #backtestingCalendarGrid.calendar-grid .day-neutral .day-r{
  color:#94a3b8;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.day-profit:not(.bt-date-locked){
  background:rgba(34,197,94,.13)!important;
  border-color:rgba(34,197,94,.35)!important;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.day-loss:not(.bt-date-locked){
  background:rgba(239,68,68,.11)!important;
  border-color:rgba(239,68,68,.30)!important;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .day-cell.day-profit:not(.bt-date-locked) .day-pnl,
#backtestingView #backtestingCalendarGrid.calendar-grid .day-cell.day-profit:not(.bt-date-locked) .trade-count,
#backtestingView #backtestingCalendarGrid.calendar-grid .day-cell.day-profit:not(.bt-date-locked) .day-r{
  color:#4ade80;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .day-cell.day-loss:not(.bt-date-locked) .day-pnl,
#backtestingView #backtestingCalendarGrid.calendar-grid .day-cell.day-loss:not(.bt-date-locked) .trade-count,
#backtestingView #backtestingCalendarGrid.calendar-grid .day-cell.day-loss:not(.bt-date-locked) .day-r{
  color:#f87171;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked{
  position:relative;
  opacity:.55;
  background:rgba(15,23,42,.16)!important;
  border:1px dashed rgba(148,163,184,.12);
  cursor:not-allowed;
  overflow:hidden;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked::after{
  content:'';
  position:absolute;
  inset:0;
  background:repeating-linear-gradient(
    -35deg,
    rgba(148,163,184,.035) 0px,
    rgba(148,163,184,.035) 6px,
    transparent 6px,
    transparent 16px
  );
  pointer-events:none;
  z-index:0;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked.day-profit,
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked.day-loss,
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked.positive,
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked.negative{
  background:rgba(15,23,42,.16)!important;
  border-color:rgba(148,163,184,.12)!important;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked:hover{
  transform:none!important;
  box-shadow:none!important;
}
#backtestingView .bt-locked-watermark{
  position:absolute;
  right:10px;
  bottom:8px;
  transform:none;
  color:rgba(148,163,184,.28);
  font-size:9px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.06em;
  pointer-events:none;
  z-index:1;
}
#backtestingView #backtestingCalendarGrid.calendar-grid .calendar-row .day-cell.bt-date-locked > .day-number{
  position:relative;
  z-index:1;
}
#backtestingView > .dashboard-container > .section.card.pro-backtesting-shell{
  background:transparent;
  border:none;
  box-shadow:none;
  padding-left:0;
  padding-right:0;
}
#backtestingView .bt-operation-card.new-backtest-operation-card{
  border-radius:16px;
  padding:clamp(14px,1.8vw,20px);
}
#backtestingView .bt-operation-form-section{
  border-top:1px solid rgba(148,163,184,.12);
}
#backtestingView .bt-form-section-heading{
  font-size:11px!important;
  text-transform:uppercase;
  letter-spacing:.08em;
  font-weight:700!important;
  color:var(--text-muted,#94a3b8)!important;
}
#backtestingView label.bt-direction-label,
#backtestingView .bt-direction-label{
  display:flex;
  flex-direction:column;
  gap:6px;
  font-size:var(--font-sm,13px);
  font-weight:var(--fw-medium,500);
  color:var(--text-muted,var(--muted,#94a3b8));
  margin-bottom:0;
}
#backtestingView .bt-direction-toggle{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  width:100%;
  max-width:100%;
}
#backtestingView .bt-dir-btn{
  height:42px;
  border-radius:12px;
  border:1px solid var(--border,rgba(148,163,184,.2));
  background:rgba(148,163,184,.08);
  color:var(--text-muted,#94a3b8);
  font-weight:800;
  cursor:pointer;
  transition:background .18s ease,border-color .18s ease,color .18s ease;
}
#backtestingView .bt-dir-btn.active{
  background:rgba(34,197,94,.16);
  border-color:rgba(34,197,94,.55);
  color:var(--green,#22c55e);
}
#backtestingView .bt-dir-btn[data-value="SHORT"].active{
  background:rgba(239,68,68,.14);
  border-color:rgba(239,68,68,.45);
  color:#ef4444;
}
#backtestingView .bt-input-with-mode{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:8px;
  align-items:center;
}
#backtestingView .bt-mode-toggle{
  display:inline-flex;
  padding:3px;
  border-radius:12px;
  border:1px solid var(--border,rgba(148,163,184,.18));
  background:rgba(15,23,42,.25);
}
#backtestingView .bt-mode-toggle button{
  height:32px;
  min-width:58px;
  border:0;
  border-radius:9px;
  background:transparent;
  color:var(--text-muted,#94a3b8);
  font-weight:800;
  cursor:pointer;
}
#backtestingView .bt-mode-toggle button.active{
  background:rgba(34,197,94,.18);
  color:var(--green,#22c55e);
}
#backtestingView .bt-converted-hint{
  margin-top:6px;
  font-size:12px;
  color:var(--text-muted,#94a3b8);
}
#backtestingView .bt-form-accordion{
  border-top:1px solid rgba(148,163,184,.14);
  margin-top:14px;
  padding-top:12px;
}
#backtestingView .bt-form-accordion-header{
  width:100%;
  height:38px;
  border:0;
  background:transparent;
  color:var(--text,#e2e8f0);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0;
  font-family:inherit;
  font-size:12px;
  font-weight:900;
  letter-spacing:.04em;
  text-transform:uppercase;
  cursor:pointer;
}
#backtestingView .bt-form-accordion-header svg{
  width:16px;
  height:16px;
  flex-shrink:0;
  transition:transform .18s ease;
}
#backtestingView .bt-form-accordion.open .bt-form-accordion-header svg{
  transform:rotate(180deg);
}
#backtestingView .bt-form-accordion-body{
  display:none;
  margin-top:10px;
}
#backtestingView .bt-form-accordion.open .bt-form-accordion-body{
  display:block;
}
@media(max-width:900px){
  #backtestingView .bt-form-accordion-body .bt-operation-form-grid,
  #backtestingView .bt-form-accordion-body .backtesting-form-grid{
    grid-template-columns:1fr!important;
  }
}
#backtestingView .form-grid,#backtestingView .bt-operation-form-grid,#backtestingView .backtesting-form-grid{
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px 14px;
}
@media(max-width:900px){
  #backtestingView .bt-operation-form-grid,#backtestingView .backtesting-form-grid{grid-template-columns:1fr}
}
#backtestingView input.input,#backtestingView select.input,#backtestingView textarea.input{
  min-height:42px;
  border-radius:10px;
}
#backtestingView .bt-custom-metric-row{
  border-radius:12px;
}
#backtestingView .bt-analysis-grid .bt-analysis-card,#backtestingView .bt-analysis-card.card{
  border-radius:16px;
  padding:18px;
  border:1px solid var(--border,rgba(148,163,184,.14));
  background:var(--card-bg,rgba(15,23,42,.4));
  box-shadow:0 2px 14px rgba(0,0,0,.08);
}
#backtestingView .bt-session-card.card.pro-session-card{
  border-radius:16px;
  padding:18px;
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
}
#backtestingView .bt-session-card.is-active-session{
  border-color:rgba(34,197,94,.45)!important;
  box-shadow:0 0 0 1px rgba(34,197,94,.18),0 8px 28px rgba(34,197,94,.08);
  background:rgba(34,197,94,.06);
}
#backtestingView .pro-session-top{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
}
#backtestingView .pro-badge,#backtestingConfigView .pro-badge{
  font-size:11px;
  font-weight:700;
  padding:5px 10px;
  border-radius:999px;
  border:1px solid var(--border,rgba(148,163,184,.2));
  background:rgba(148,163,184,.1);
  color:var(--text-muted,#94a3b8);
  white-space:nowrap;
}
#backtestingView .bt-session-actions{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
@media(max-width:520px){
  #backtestingView .bt-session-actions .btn{flex:1 1 100%}
}
#backtestingView .bt-progress-bar span.pro-progress-fill{
  width:var(--bt-w,0%);
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#22c55e,#16a34a);
}
#backtestingConfigView .pro-config-shell .bt-config-section.pro-section-card{
  margin-bottom:22px;
}
#backtestingConfigView .bt-strategy-card.pro-strategy-card,#backtestingConfigView .bt-metric-card.pro-metric-card{
  border-radius:16px;
  padding:16px;
  border:1px solid var(--border,rgba(148,163,184,.16));
  background:var(--card-bg,rgba(15,23,42,.42));
  box-shadow:0 2px 14px rgba(0,0,0,.08);
}
#backtestingConfigView .bt-strategy-meta .pro-badge,#backtestingConfigView .bt-metric-badge.pro-badge{
  font-size:11px;
}
#backtestingConfigView .pro-badge.pro-badge--ok{
  border-color:rgba(34,197,94,.35);
  background:rgba(34,197,94,.12);
  color:var(--green,#22c55e);
}
#backtestingConfigView .bt-strategy-card-top .bt-strategy-name{
  font-weight:800;
  font-size:15px;
  color:var(--text,#e2e8f0);
}
#backtestingView .pro-actions,#backtestingConfigView .pro-actions{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:12px;
}
#btSessionModalOverlay #btSessionModal.pro-modal-session{
  max-width:min(560px,94vw);
  width:100%;
  max-height:min(88vh,820px);
  display:flex;
  flex-direction:column;
  padding:0;
  overflow:hidden;
  border-radius:16px;
}
#btStrategyModalOverlay .bt-strategy-modal.backtesting-strategy-modal.pro-modal-strategy{
  max-width:min(520px,94vw);
  width:100%;
  max-height:min(88vh,820px);
  display:flex;
  flex-direction:column;
  padding:0;
  overflow:hidden;
  border-radius:16px;
}
#btSessionModalOverlay #btSessionModal .modal-header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  flex-shrink:0;
  gap:16px;
  padding:20px 24px 16px 24px;
  border-bottom:1px solid rgba(255,255,255,.05);
}
#btSessionModalOverlay #btSessionModal .modal-header h2{
  margin:0;
  font-size:18px;
  font-weight:500;
  color:rgba(255,255,255,.9);
  letter-spacing:-.01em;
  line-height:1.25;
}
#btSessionModalOverlay #btSessionModal .modal-close{
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.06);
  border-radius:6px;
  padding:6px 10px;
  font-size:12px;
  font-weight:500;
  color:rgba(255,255,255,.6);
  cursor:pointer;
  transition:background .2s ease,color .2s ease,border-color .2s ease;
  flex-shrink:0;
}
#btSessionModalOverlay #btSessionModal .modal-close:hover{
  background:rgba(255,255,255,.08);
  color:rgba(255,255,255,.85);
}
body.light #btSessionModalOverlay #btSessionModal .modal-header{
  border-bottom-color:rgba(15,23,42,.08);
}
body.light #btSessionModalOverlay #btSessionModal .modal-header h2{
  color:rgba(15,23,42,.88);
}
body.light #btSessionModalOverlay #btSessionModal .modal-close{
  background:rgba(15,23,42,.04);
  border-color:rgba(15,23,42,.08);
  color:rgba(15,23,42,.55);
}
body.light #btSessionModalOverlay #btSessionModal .modal-close:hover{
  background:rgba(15,23,42,.07);
  color:rgba(15,23,42,.8);
}
#btSessionModalOverlay .pro-modal-scroll{
  flex:1;
  min-height:0;
  overflow-y:auto;
  overflow-x:hidden;
  padding:20px 24px;
  -webkit-overflow-scrolling:touch;
  scrollbar-color:rgba(148,163,184,.35) transparent;
}
#btSessionModalOverlay .pro-modal-footer{
  flex-shrink:0;
  padding:16px 24px 20px 24px;
  border-top:1px solid var(--border,rgba(148,163,184,.14));
  background:var(--card-bg,rgba(15,23,42,.65));
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  justify-content:flex-end;
}
body.light #backtestingView .pro-card,body.light #backtestingConfigView .pro-card{
  background:#fff;
  box-shadow:0 2px 16px rgba(15,23,42,.06);
}
#backtestingView .bt-analysis-grid.bt-analysis-grid--two{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:16px;
}
@media(max-width:900px){
  #backtestingView .bt-analysis-grid.bt-analysis-grid--two{grid-template-columns:1fr}
}
#backtestingConfigView .pro-section-sub--flush{margin-top:0}
#backtestingView .backtesting-dist-grid .card.backtesting-dist-card.pro-kpi-card strong{
  font-size:clamp(18px,2.2vw,24px);
  font-weight:800;
  font-variant-numeric:tabular-nums;
}
#btSessionModalOverlay .backtesting-session-actions.pro-modal-footer{
  justify-content:flex-end;
}
body.light #backtestingView .bt-session-card.is-active-session{
  background:rgba(34,197,94,.08);
}
#backtestingView .bt-kpi-section.pro-card{padding:0}
#backtestingView .bt-kpi-section{padding:0;overflow:hidden}
#backtestingView .bt-section-toggle{
  width:100%;
  border:0;
  background:transparent;
  color:var(--text,#e2e8f0);
  padding:18px 22px 12px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:16px;
  cursor:pointer;
  text-align:left;
}
#backtestingView .bt-section-toggle h3{
  margin:0;
  font-size:18px;
  font-weight:850;
  letter-spacing:-0.02em;
}
#backtestingView .bt-section-toggle p{
  margin:4px 0 0;
  color:var(--text-muted,#94a3b8);
  font-size:12px;
}
#backtestingView .bt-toggle-icon{
  width:30px;
  height:30px;
  border-radius:10px;
  border:1px solid var(--border,rgba(148,163,184,.22));
  display:grid;
  place-items:center;
  color:var(--text-muted,#94a3b8);
  opacity:.85;
  transition:transform .18s ease;
  flex-shrink:0;
}
#backtestingView .bt-kpi-section:not(.open) .bt-toggle-icon{transform:rotate(-90deg)}
#backtestingView .bt-kpi-section-body{padding:0 22px 20px;display:none}
#backtestingView .bt-kpi-section.open .bt-kpi-section-body{display:block}
#backtestingView .bt-kpi-toolbar{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  justify-content:flex-start;
  gap:14px 20px;
  margin-bottom:18px;
}
#backtestingView .bt-kpi-hero-row{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:18px;
  margin-bottom:18px;
}
#backtestingView .bt-kpi-mini-row{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:16px;
  margin-bottom:16px;
}
#backtestingView #btScheduleStatsSection.schedule-discipline-card{
  padding:clamp(20px,2.4vw,28px);
  margin-top:clamp(20px,2.5vw,32px);
}
/* Este bloque ya no son tarjetas en rejilla, sino una tabla comparativa seguida del pie con
   los totales y el acceso al simulador: tiene que fluir en bloque. Con la rejilla, el pie se
   colocaba como una columna mas y se solapaba con la tabla. */
#backtestingView #btScheduleStatsSection .schedule-discipline-metrics{
  display:block!important;
  margin-top:16px;
  width:100%;
}
#backtestingView #btScheduleStatsSection .schedule-discipline-metrics .advanced-item{
  min-width:0;
  padding:16px 18px;
}
#backtestingView .bt-kpi-card{
  border:1px solid rgba(148,163,184,.14);
  border-radius:16px;
  background:rgba(15,23,42,.20);
  padding:14px 16px;
  min-height:82px;
  box-shadow:none;
}
#backtestingView .bt-kpi-card.feature:not(.bt-pnl-card){
  min-height:96px;
  background:linear-gradient(180deg,rgba(34,197,94,.075),rgba(15,23,42,.20));
  border-color:rgba(34,197,94,.18);
}
#backtestingView .bt-kpi-card.feature.bt-pnl-card{
  min-height:auto;
  background:linear-gradient(180deg,rgba(34,197,94,.075),rgba(15,23,42,.20));
  border-color:rgba(34,197,94,.18);
}
#backtestingView .bt-kpi-hero-row .bt-kpi-card:not(.feature){
  min-height:88px;
  background:rgba(15,23,42,.24);
}
#backtestingView .bt-kpi-mini-row .bt-kpi-card{
  min-height:74px;
  padding:11px 12px;
}
#backtestingView .bt-kpi-label{
  color:var(--text-muted,#94a3b8);
  font-size:10px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  margin-bottom:8px;
  opacity:.9;
}
#backtestingView .bt-kpi-mini-row .bt-kpi-label{font-size:9px;margin-bottom:6px}
#backtestingView .bt-kpi-value{
  font-size:20px;
  font-weight:800;
  line-height:1.1;
  letter-spacing:-0.02em;
  font-variant-numeric:tabular-nums;
}
#backtestingView .bt-kpi-card.feature .bt-kpi-value{font-size:26px;font-weight:850}
#backtestingView .bt-kpi-hero-row .bt-kpi-card:not(.feature) .bt-kpi-value{font-size:21px;font-weight:800}
#backtestingView .bt-kpi-mini-row .bt-kpi-value{font-size:16px;font-weight:800}
#backtestingView .bt-kpi-value.positive{color:var(--green,#22c55e)}
#backtestingView .bt-kpi-value.negative{color:#ef4444}
#backtestingView .bt-result-pill-row{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
  gap:14px;
  margin-top:4px;
}
#backtestingView .bt-kpi-result-card{
  min-height:42px;
  border:1px solid rgba(148,163,184,.12);
  border-radius:13px;
  background:rgba(15,23,42,.16);
  padding:10px 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
}
#backtestingView .bt-kpi-result-card span,
#backtestingView .bt-kpi-result-card .bt-kpi-label{
  margin:0;
  font-size:11px;
  color:var(--text-muted,#94a3b8);
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.06em;
}
#backtestingView .bt-kpi-result-card strong{
  font-size:18px;
  font-weight:850;
  color:var(--text,#e2e8f0);
  font-variant-numeric:tabular-nums;
}
#backtestingView .bt-be-toggle{
  min-height:38px;
  padding:8px 12px;
  border-radius:12px;
  font-size:12px;
  background:rgba(15,23,42,.18);
  border:1px solid var(--border,rgba(148,163,184,.2));
  color:var(--text-muted,#94a3b8);
  font-weight:700;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:8px;
}
#backtestingView .bt-be-toggle input{accent-color:var(--green,#22c55e)}
@media(max-width:700px){
  #backtestingView .bt-kpi-toolbar{flex-direction:column;align-items:flex-start}
}
#backtestingView .bt-session-filter-wrap{position:relative;width:min(420px,100%)}
#backtestingView .bt-session-filter-wrap>label{display:block;margin-bottom:8px;color:var(--text-muted);font-size:13px;font-weight:700}
#backtestingView .bt-session-filter-btn{width:min(420px,100%);min-height:54px;border:1px solid var(--border);border-radius:16px;background:rgba(15,23,42,.34);color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 16px;cursor:pointer;font-weight:900;transition:all .16s ease}
#backtestingView .bt-session-filter-btn:hover{border-color:rgba(34,197,94,.35);background:rgba(15,23,42,.48)}
#backtestingView .bt-session-filter-btn svg{width:18px;height:18px;color:var(--text-muted)}
#backtestingView .bt-session-filter-dropdown{display:none;position:absolute;top:calc(100% + 10px);left:0;width:min(420px,100%);z-index:100;padding:10px;border-radius:18px;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.96);box-shadow:0 24px 70px rgba(0,0,0,.45);backdrop-filter:blur(14px)}
#backtestingView .bt-session-filter-dropdown.open{display:grid;gap:8px}
#backtestingView #btSessionFilterOptions{display:contents}
#backtestingView .bt-session-filter-option{position:relative;display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:12px;padding:12px;border-radius:14px;border:1px solid transparent;background:rgba(30,41,59,.45);cursor:pointer;transition:all .16s ease}
#backtestingView .bt-session-filter-option:hover{background:rgba(51,65,85,.65);border-color:rgba(148,163,184,.18)}
#backtestingView .bt-session-filter-option input{position:absolute;opacity:0;pointer-events:none}
#backtestingView .bt-session-checkmark{width:20px;height:20px;border-radius:7px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.65);display:grid;place-items:center}
#backtestingView .bt-session-filter-option input:checked + .bt-session-checkmark{background:rgba(34,197,94,.22);border-color:rgba(34,197,94,.7)}
#backtestingView .bt-session-filter-option input:checked + .bt-session-checkmark::after{content:"✓";color:var(--green);font-size:14px;font-weight:900}
#backtestingView .bt-session-filter-option:has(input:checked){border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.10)}
#backtestingView .bt-session-option-content{min-width:0;display:flex;flex-direction:column;gap:3px}
#backtestingView .bt-session-option-content strong{color:var(--text);font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#backtestingView .bt-session-option-content small{color:var(--text-muted);font-size:12px;line-height:1.3}
#backtestingView .bt-day-trades-list{display:grid;gap:10px;margin-top:12px}
#backtestingView .bt-day-trade-card{border:1px solid var(--border);background:rgba(15,23,42,.22);border-radius:14px;padding:12px;cursor:pointer;transition:border-color .15s ease,background .15s ease}
#backtestingView .bt-day-trade-card:hover{border-color:var(--green,#22c55e);background:rgba(34,197,94,.06)}
/* Los challenges van en su propia seccion, separados del resto de estadisticas: no son
   resultados del backtest sino una proyeccion. El acento morado y el margen extra son la
   senal visual de "esto es otra cosa", sin llegar a parecer una pagina distinta. */
#backtestingView .bt-challenge-section .pro-card{border-color:rgba(139,92,246,.32);
  background:linear-gradient(180deg,rgba(139,92,246,.07),rgba(139,92,246,.02) 120px)}
#backtestingView .bt-challenge-section .bt-section-title h3{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.bt-challenge-badge{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700;
  padding:3px 8px;border-radius:999px;color:#c4b5fd;background:rgba(139,92,246,.16);
  border:1px solid rgba(139,92,246,.38)}
/* Filtro de sesion integrado al pie de la tarjeta de Sesiones: separado por una linea, con el
   texto a la izquierda y el control (mas los botones de exportar) a la derecha. */
#backtestingView .bt-sessions-filter{display:flex;align-items:flex-end;justify-content:space-between;
  gap:18px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--border)}
#backtestingView .bt-sessions-filter-text{min-width:0}
#backtestingView .bt-sessions-filter-text h4{margin:0;font-size:.95rem}
#backtestingView .bt-sessions-filter-text p{margin:2px 0 0;color:var(--text-muted);font-size:.82rem}
#backtestingView .bt-sessions-filter .backtesting-filter-bar{display:flex;align-items:flex-end;
  gap:14px;flex-wrap:wrap;margin:0}
#backtestingView .bt-sessions-filter .export-group{width:auto;margin-top:0;padding-top:0;
  border-top:none;margin-left:0}
/* Rachas de TP/SL: mismas pastillas que la distribucion de resultados, con el color del
   resultado al que se refieren para poder leerlas de un vistazo. */
#backtestingView .bt-streak-row{margin-top:10px}
#backtestingView .bt-streak-row .streak-tp strong{color:var(--green,#22c55e)}
#backtestingView .bt-streak-row .streak-sl strong{color:#ef4444}
#backtestingView .bt-streak-note{margin:8px 0 0}
/* Las clases .positive/.negative solo tienen color dentro de .kpi-value, y aqui el valor es un
   <strong> de la pastilla, asi que se le da color explicitamente. */
#backtestingView .bt-streak-row strong.positive{color:var(--green,#22c55e)}
#backtestingView .bt-streak-row strong.negative{color:#ef4444}
/* Curva de capital. La altura es fija: Chart.js con maintainAspectRatio:false necesita que el
   contenedor la defina, si no crece indefinidamente en cada redibujado. */
#backtestingView .bt-equity-chart-wrap{position:relative;height:300px;margin-top:14px}
#backtestingView .bt-equity-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
#backtestingView .bt-equity-kpis .advanced-item{background:rgba(255,255,255,.03);border:1px solid var(--border);
  border-radius:10px;padding:10px 12px;min-width:0}
#backtestingView .bt-equity-kpis .advanced-item span{display:block;font-size:.64rem;text-transform:uppercase;
  letter-spacing:.04em;color:var(--text-muted)}
#backtestingView .bt-equity-kpis .advanced-item h2{margin:2px 0 0;font-size:1.05rem;font-variant-numeric:tabular-nums}
@media(max-width:760px){#backtestingView .bt-equity-chart-wrap{height:230px}}
/* Challenges: configuracion de fases y resultado de la simulacion. */
.challenge-table thead th small{display:block;font-weight:400;text-transform:none;letter-spacing:0}
.challenge-subtitle{margin:26px 0 4px;font-size:1rem;padding-top:18px;border-top:1px solid var(--border)}
/* Cuantos challenges se compran: campo numerico, porque el usuario quiere escribir su numero
   y ver la lista completa hasta ahi, no elegir de un menu cerrado. */
.challenge-count-picker{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 18px}
.challenge-count-picker label,.challenge-count-picker span{color:var(--text-muted);font-size:.85rem}
.challenge-count-input{width:72px;flex:0 0 72px;text-align:center;font-variant-numeric:tabular-nums;
  padding:8px 10px;border-radius:10px;border:1px solid var(--border);background:var(--card-bg);
  color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color .15s ease}
.challenge-count-input:hover,.challenge-count-input:focus{border-color:rgba(139,92,246,.6)}
.challenge-modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:12px}
.challenge-mode-card{border:1px solid var(--border);border-radius:14px;padding:14px 16px;
  background:rgba(255,255,255,.02)}
.challenge-mode-card.is-best{border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.05)}
.challenge-mode-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.challenge-mode-card h5{margin:0;font-size:.95rem}
.challenge-mode-flag{font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;font-weight:700;
  color:var(--green,#22c55e);background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.35);
  border-radius:999px;padding:2px 8px;white-space:nowrap}
.challenge-mode-card p{margin:6px 0 12px}
.challenge-mode-rows{display:grid;gap:8px}
.challenge-mode-rows>div{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
  padding-bottom:6px;border-bottom:1px solid var(--border)}
.challenge-mode-rows>div:last-child{border-bottom:none;padding-bottom:0}
.challenge-mode-rows span{color:var(--text-muted);font-size:.82rem}
.challenge-mode-rows strong{font-size:1.05rem;font-variant-numeric:tabular-nums}
.challenge-verdict{margin-bottom:14px}
.challenge-dist{display:flex;flex-wrap:wrap;gap:4px 12px;margin:12px 0 0;padding-top:10px;
  border-top:1px solid var(--border)}
.challenge-dist strong{color:var(--text)}
.challenge-mode-rows small{color:var(--text-muted);font-weight:400;font-size:.78rem}
.challenge-details{margin-top:6px}
.challenge-details summary{cursor:pointer;color:var(--text-muted);font-size:.82rem;padding:6px 0}
.challenge-details summary:hover{color:var(--text)}
.challenge-warning{margin:0 0 12px;padding:10px 12px;border-radius:10px;font-size:.85rem;
  color:#fcd34d;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.35)}
.challenge-table--rotation th,.challenge-table--rotation td{text-align:center}
.challenge-table--rotation tbody th,.challenge-table--rotation thead th:first-child{text-align:left}
.challenge-table--rotation thead tr:first-child th+th{border-left:1px solid var(--border)}
.challenge-table--rotation tbody tr.is-current{background:rgba(139,92,246,.10)}
.challenge-config{margin:14px 0 18px}
.challenge-phases-field{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.challenge-phases-field span{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)}
.challenge-phases-field .input{width:auto;min-width:120px}
.challenge-table{width:100%;border-collapse:collapse;font-size:var(--font-sm)}
.challenge-table th,.challenge-table td{padding:8px 12px;border-bottom:1px solid var(--border);text-align:left;white-space:nowrap}
.challenge-table thead th{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);font-weight:600}
.challenge-table tbody th{font-weight:600;color:var(--text-muted)}
.challenge-table tbody tr:last-child th,.challenge-table tbody tr:last-child td{border-bottom:none}
.challenge-input{display:inline-flex;align-items:center;gap:6px}
.challenge-input .input{width:88px;padding:6px 8px;font-size:.85rem;text-align:right}
.challenge-input span{color:var(--text-muted);font-size:.8rem}
.challenge-headline{font-size:1rem;margin:4px 0 14px;padding:12px 14px;border-radius:12px;
  border:1px solid var(--border);background:rgba(255,255,255,.03)}
.challenge-headline strong{font-size:1.25rem}
.challenge-headline.positive{border-color:rgba(34,197,94,.4);background:rgba(34,197,94,.08)}
.challenge-headline.negative{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.08)}
#backtestingView .challenge-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:14px}
#backtestingView .challenge-kpis .advanced-item{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:8px 10px;min-width:0}
#backtestingView .challenge-kpis .advanced-item span{display:block;font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted)}
#backtestingView .challenge-kpis .advanced-item h2{margin:2px 0 0;font-size:1.05rem;font-variant-numeric:tabular-nums}
/* Explorador de metricas: filtros de tres estados para cruzar metricas con resultados.
   Se prioriza la densidad: filtros en una linea, KPIs en tira horizontal y listado con scroll,
   para que toda la herramienta quepa de un vistazo sin desplazarse. */
#backtestingView .bt-analysis-card--full{grid-column:1/-1}
#backtestingView #btMetricExplorerSection .subsection-title{margin-bottom:2px}
#backtestingView #btMetricExplorerSection > p.muted{margin-bottom:10px}

.bt-explorer-filters{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin-bottom:10px}
.bt-explorer-group{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.bt-explorer-label{font-size:.66rem;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);white-space:nowrap}
.bt-explorer-filters .chips{gap:6px}
.bt-explorer-chip{border:1px solid var(--border);background:transparent;color:var(--text-muted);
  border-radius:999px;padding:4px 11px;font-size:.78rem;line-height:1.3;cursor:pointer;font-family:inherit;
  transition:border-color .15s ease,color .15s ease,background .15s ease}
.bt-explorer-chip:hover{color:var(--text)}
/* Tres estados: exigido (verde), excluido (rojo) e ignorado (neutro). El simbolo del texto
   acompana al color para no depender solo de el. */
.bt-explorer-chip.chip-on{color:var(--green,#22c55e);border-color:rgba(34,197,94,.45);background:rgba(34,197,94,.08)}
.bt-explorer-chip.chip-off{color:var(--red,#ef4444);border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.08)}
#btExplorerReset{padding:4px 12px;font-size:.78rem;margin-left:auto}

.bt-explorer-query{margin:0 0 10px;font-size:.82rem;color:var(--text);font-weight:600}

/* .stats-grid solo define rejilla dentro de #statsView, asi que aqui hay que darsela: sin esto
   los KPI se apilaban uno debajo de otro y la tarjeta se volvia larguisima. */
#backtestingView .bt-explorer-kpis{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(110px,1fr));
  gap:8px;
  margin-bottom:12px;
}
#backtestingView .bt-explorer-kpis .advanced-item{
  background:rgba(255,255,255,.03);
  border:1px solid var(--border);
  border-radius:10px;
  padding:8px 10px;
  min-width:0;
}
#backtestingView .bt-explorer-kpis .advanced-item span{
  display:block;font-size:.64rem;text-transform:uppercase;letter-spacing:.04em;
  color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
#backtestingView .bt-explorer-kpis .advanced-item h2{
  margin:2px 0 0;font-size:1.05rem;font-variant-numeric:tabular-nums;white-space:nowrap;
}

.bt-explorer-table-wrap{max-height:260px;overflow:auto}
#btExplorerTable th,#btExplorerTable td{padding:6px 10px;font-size:.8rem;white-space:nowrap}
#btExplorerTable th{position:sticky;top:0;background:var(--card-bg,#131f37);z-index:1}

@media(max-width:900px){
  #btExplorerReset{margin-left:0}
  .bt-explorer-group{width:100%}
}

/* Listado de operaciones fuera de horario. */
.bt-schedule-outside-btn{padding:4px 12px;font-size:.78rem;margin-left:auto}
#btOutsideScheduleOverlay .bt-outside-modal{max-width:min(940px,95vw);width:100%;max-height:min(88vh,900px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:16px}
#btOutsideScheduleOverlay .modal-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px 12px;flex-shrink:0}
#btOutsideScheduleOverlay .modal-header h2{margin:0;font-size:1.05rem}
#btOutsideScheduleOverlay .modal-close{background:transparent;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:8px}
#btOutsideScheduleOverlay .modal-close:hover{color:var(--text);background:var(--hover-soft,rgba(148,163,184,.14))}
#btOutsideScheduleOverlay .pro-modal-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 24px 20px;scrollbar-color:rgba(148,163,184,.35) transparent}
#btOutsideScheduleOverlay .pro-modal-footer{flex-shrink:0;padding:14px 24px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end}
#btOutsideTable th,#btOutsideTable td{padding:7px 10px;font-size:.82rem;white-space:nowrap}
#btOutsideTable th{position:sticky;top:0;background:var(--card-bg,#131f37);z-index:1}
.bt-outside-row{cursor:pointer}
.bt-outside-row:hover td{background:rgba(255,255,255,.03)}
/* Modal de recalculo de PnL: vista previa de los cambios antes de aplicarlos. */
#btRecalcOverlay .bt-recalc-modal{max-width:min(900px,95vw);width:100%;max-height:min(88vh,900px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:16px}
#btRecalcOverlay .modal-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px 12px;flex-shrink:0}
#btRecalcOverlay .modal-header h2{margin:0;font-size:1.05rem}
#btRecalcOverlay .modal-close{background:transparent;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:8px}
#btRecalcOverlay .modal-close:hover{color:var(--text);background:var(--hover-soft,rgba(148,163,184,.14))}
#btRecalcOverlay .pro-modal-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 24px 20px;scrollbar-color:rgba(148,163,184,.35) transparent}
#btRecalcOverlay .pro-modal-footer{flex-shrink:0;padding:14px 24px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end}
#btRecalcTable th,#btRecalcTable td{padding:7px 10px;font-size:.82rem;white-space:nowrap}
#btRecalcTable th{position:sticky;top:0;background:var(--card-bg,#131f37);z-index:1}
#btRecalcOverlay .button:disabled{opacity:.5;cursor:default}
/* Modal de compartir resultados por enlace. */
#btShareOverlay .bt-share-modal{max-width:min(620px,94vw);width:100%;max-height:min(88vh,900px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:16px}
#btShareOverlay .modal-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px 12px;flex-shrink:0}
#btShareOverlay .modal-header h2{margin:0;font-size:1.05rem}
#btShareOverlay .modal-close{background:transparent;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:8px}
#btShareOverlay .modal-close:hover{color:var(--text);background:var(--hover-soft,rgba(148,163,184,.14))}
#btShareOverlay .pro-modal-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 24px 20px;scrollbar-color:rgba(148,163,184,.35) transparent}
#btShareOverlay .pro-modal-footer{flex-shrink:0;padding:14px 24px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end}
.bt-share-field{margin-top:16px}
.bt-share-field label{display:block;color:var(--text-muted);font-size:.75rem;margin-bottom:4px}
.bt-share-copy{display:flex;gap:8px}
.bt-share-copy input{flex:1;min-width:0;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text);font-size:.85rem;font-family:inherit}
.bt-share-password{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;font-size:1rem!important;text-align:center}
.bt-share-setup{margin-top:14px;padding:14px;border:1px dashed var(--border);border-radius:12px;background:rgba(255,255,255,.02)}
.bt-share-setup h4{margin:0 0 6px;font-size:.85rem}
.bt-share-setup input{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text);font-size:.85rem;font-family:inherit}
.bt-share-links{margin-top:24px;padding-top:16px;border-top:1px solid var(--border)}
.bt-share-links h4{margin:0 0 10px;font-size:.85rem}
.bt-share-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap}
.bt-share-item-actions{display:flex;gap:8px}
.bt-share-item-actions .button{padding:5px 10px;font-size:.78rem}
/* Ficha de solo lectura de una operacion de backtesting (se abre pulsando la tarjeta). */
#btTradeDetailOverlay .bt-detail-modal{max-width:min(720px,94vw);width:100%;max-height:min(88vh,900px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:16px}
#btTradeDetailOverlay .modal-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px 16px;flex-shrink:0}
#btTradeDetailOverlay .modal-header h2{margin:0;font-size:1.05rem}
#btTradeDetailOverlay .modal-close{background:transparent;border:none;color:var(--text-muted);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:8px}
#btTradeDetailOverlay .modal-close:hover{color:var(--text);background:var(--hover-soft,rgba(148,163,184,.14))}
#btTradeDetailOverlay .pro-modal-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 24px 20px;scrollbar-color:rgba(148,163,184,.35) transparent}
#btTradeDetailOverlay .pro-modal-footer{flex-shrink:0;padding:16px 24px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end}
.bt-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:16px}
.bt-detail-asset{font-size:1.15rem;font-weight:700;display:flex;align-items:center;gap:8px}
.bt-detail-sub{color:var(--text-muted);font-size:.8rem;margin-top:2px}
.bt-detail-pnl{font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.bt-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0}
.bt-detail-grid dt{color:var(--text-muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.03em}
.bt-detail-grid dd{margin:2px 0 0;font-weight:600;font-variant-numeric:tabular-nums}
.bt-detail-block{margin-top:20px}
.bt-detail-block h4{margin:0 0 8px;font-size:.85rem}
.bt-detail-metrics{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.bt-detail-metrics li{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:999px;padding:4px 10px;font-size:.78rem}
.bt-detail-metrics li.ok{color:var(--green,#22c55e);border-color:rgba(34,197,94,.4)}
.bt-detail-metrics li.no{color:var(--text-muted)}
.bt-detail-notes{margin:0;color:var(--text-muted);font-size:.85rem;white-space:pre-wrap}
.bt-detail-images-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.bt-detail-images-grid figure{margin:0}
.bt-detail-images-grid figcaption{color:var(--text-muted);font-size:.72rem;margin-bottom:4px}
.bt-detail-images-grid img{width:100%;border-radius:10px;border:1px solid var(--border);cursor:zoom-in;display:block}
#backtestingView .bt-day-trade-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
#backtestingView .bt-day-trade-title{display:flex;align-items:center;gap:8px;color:var(--text);font-size:14px;font-weight:900}
#backtestingView .bt-day-trade-meta{margin-top:4px;color:var(--text-muted);font-size:12px}
#backtestingView .bt-day-trade-pnl{font-size:14px;font-weight:900;color:var(--text);white-space:nowrap}
#backtestingView .bt-day-trade-pnl.positive{color:var(--green)}
#backtestingView .bt-day-trade-pnl.negative{color:#ef4444}
#backtestingView .bt-result-badge{border-radius:999px;padding:3px 7px;font-size:10px;font-weight:900;border:1px solid var(--border);color:var(--text-muted)}
#backtestingView .bt-result-badge.tp{color:var(--green);background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.28)}
#backtestingView .bt-result-badge.sl{color:#ef4444;background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.28)}
#backtestingView .bt-result-badge.be{color:var(--text-muted);background:rgba(148,163,184,.12);border-color:rgba(148,163,184,.24)}
#backtestingView .bt-day-trade-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
#backtestingView .bt-day-trade-edit{height:32px;padding:0 12px;border-radius:10px;border:1px solid rgba(34,197,94,.28);background:rgba(34,197,94,.10);color:var(--green);font-weight:800;cursor:pointer}
#backtestingView .bt-day-trade-delete{height:32px;padding:0 12px;border-radius:10px;border:1px solid rgba(239,68,68,.28);background:rgba(239,68,68,.10);color:#ef4444;font-weight:800;cursor:pointer}
#backtestingView .bt-day-trade-delete:hover{background:rgba(239,68,68,.18)}
`;
  document.head.appendChild(style);
}

function getTradeRealPnl(trade) {
  const pnlNet = Number(trade?.pnl_net ?? trade?.pnlNet);
  if (Number.isFinite(pnlNet)) return pnlNet;

  const pnl = Number(trade?.pnl ?? 0) || 0;
  const commission = Number(trade?.commission ?? 0) || 0;

  return pnl - commission;
}

async function ensureUserReady() {
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    console.error('❌ No user_id');
    showLoginModal();
    return false;
  }

  if (window.electronAPI?.setUserId) {
    await window.electronAPI.setUserId(userId);
  }

  await syncSupabaseSessionWithMain();

  return true;
}

let isAppAuthenticated = false;

let isSyncing = false;

let tradesRealtimeChannel = null;
let realtimeTimeout = null;
// Estado del canal en vivo y momento de la última recarga: los usa la red de seguridad de abajo
// para no depender solo de que el websocket esté sano.
let realtimeConnected = false;
let realtimeRetryTimeout = null;
let lastRemoteRefreshAt = 0;

let lastInsertedIds = new Set();

let tradeToDelete = null;
let tradeToDeleteRow = null;

function rememberOwnInsertedTradeId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return;
  lastInsertedIds.add(n);
  setTimeout(() => lastInsertedIds.delete(n), 15000);
}

function triggerRealtimeUpdate() {
  clearTimeout(realtimeTimeout);
  realtimeTimeout = setTimeout(() => {
    console.log('🔄 Realtime aplicado');
    lastRemoteRefreshAt = Date.now();

    if (typeof loadTrades === 'function') loadTrades();
    if (typeof loadStats === 'function') loadStats();
  }, 300);
}

function subscribeToTradesRealtime() {
  const uid = localStorage.getItem('user_id');
  if (!uid) return null;

  if (tradesRealtimeChannel) {
    supabase.removeChannel(tradesRealtimeChannel);
    tradesRealtimeChannel = null;
  }

  tradesRealtimeChannel = supabase
    .channel(`trades-changes-${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `user_id=eq.${uid}`
      },
      (payload) => {
        console.log('🔄 Realtime update recibido:', payload);

        if (deletingTradeInProgress) {
          console.log('⏭️ Realtime ignorado (delete en curso)');
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new && payload.new.id != null) {
          const nid = Number(payload.new.id);
          if (lastInsertedIds.has(nid)) {
            console.log('⏭️ Ignorado (propio)');
            lastInsertedIds.delete(nid);
            return;
          }
          if (Array.isArray(cachedTrades) && cachedTrades.some((t) => Number(t.id) === nid)) {
            console.log('⏭️ Ignorado (ya en memoria)');
            return;
          }
        }

        triggerRealtimeUpdate();
      }
    )
    .subscribe((status) => {
      // Saber si el canal está vivo importa: si no lo está, la red de seguridad de abajo pasa a
      // consultar cada minuto en vez de quedarse esperando un aviso que no va a llegar.
      realtimeConnected = status === 'SUBSCRIBED';
      console.log('📡 Canal de trades en vivo:', status);

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(realtimeRetryTimeout);
        realtimeRetryTimeout = setTimeout(() => {
          if (localStorage.getItem('user_id')) subscribeToTradesRealtime();
        }, 8000);
      }
    });

  return tradesRealtimeChannel;
}

/**
 * Red de seguridad de la sincronización.
 *
 * El canal en vivo es lo primero que trae un trade metido desde el móvil, pero es un websocket:
 * se cae con el portátil suspendido, con un cambio de red o si Realtime no está habilitado para
 * la tabla. Sin esto, la app se quedaría mostrando datos viejos sin avisar de nada.
 *
 *   - Al volver a la ventana (o al desbloquear el equipo) se recarga si hace más de 15 s de la
 *     última vez. Es el momento en el que el usuario va a mirar, así que es cuando más vale.
 *   - Mientras la ventana está a la vista, se consulta cada minuto solo si el canal NO está
 *     conectado. Con el canal sano no se pide nada: sería gasto sin beneficio.
 */
function startRemoteRefreshSafetyNet() {
  const refreshIfStale = (minAgeMs) => {
    if (!isAppAuthenticated) return;
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastRemoteRefreshAt < minAgeMs) return;
    triggerRealtimeUpdate();
  };

  document.addEventListener('visibilitychange', () => refreshIfStale(15000));
  window.addEventListener('focus', () => refreshIfStale(15000));
  setInterval(() => {
    if (!realtimeConnected) refreshIfStale(45000);
  }, 60000);
}

function unsubscribeTradesRealtime() {
  clearTimeout(realtimeTimeout);
  clearTimeout(realtimeRetryTimeout);
  realtimeTimeout = null;
  realtimeRetryTimeout = null;
  realtimeConnected = false;
  if (tradesRealtimeChannel) {
    supabase.removeChannel(tradesRealtimeChannel);
    tradesRealtimeChannel = null;
  }
}

async function loadUserInfo() {
  let email = '';
  try {
    if (isOnline() && !isOfflineModeActive()) {
      const user = await getCurrentUserSafe();
      email = user?.email || '';
    }
  } catch (err) {
    console.warn('loadUserInfo supabase falló:', err);
  }

  if (!email) {
    email =
      window.currentUser?.email ||
      getLastOfflineUser()?.email ||
      'No autenticado';
  }

  await updateSidebarUserEmail(async () => email);
}

async function showProfileModal() {
  if (document.getElementById('profile-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'profile-modal';

  modal.innerHTML = `
  <div class="profile-modal-card">
    <div class="profile-modal-header">
      <div>
        <h2>Perfil</h2>
        <p id="profileEmail" class="profile-email">Cargando usuario...</p>
        <p class="profile-status-line">Estado: <span class="profile-status-active">Cuenta activa</span></p>
      </div>
      <button type="button" id="close-profile" class="profile-close-btn">Cerrar</button>
    </div>

    <div class="profile-section">
      <h3>Datos personales</h3>

      <div class="profile-grid">
        <label>
          Nombre
          <input type="text" id="profileName" placeholder="Tu nombre" />
        </label>

        <label>
          Apellidos
          <input type="text" id="profileSurname" placeholder="Tus apellidos" />
        </label>

        <label class="profile-grid-full">
          Teléfono
          <input type="text" id="profilePhone" placeholder="Ej: +34 600 000 000" />
        </label>
      </div>

      <button type="button" id="saveProfileData" class="primary">Guardar datos</button>
    </div>

    <div class="profile-section">
      <h3>Seguridad</h3>

      <div class="profile-grid">
        <label>
          Contraseña actual
          <input type="password" id="current-password" placeholder="Contraseña actual" autocomplete="current-password" />
        </label>

        <label>
          Nueva contraseña
          <input type="password" id="new-password" placeholder="Nueva contraseña" autocomplete="new-password" />
        </label>

        <label class="profile-grid-full">
          Repetir nueva contraseña
          <input type="password" id="confirm-new-password" placeholder="Repite la nueva contraseña" autocomplete="new-password" />
        </label>
      </div>

      <button type="button" id="change-password" class="primary">Cambiar contraseña</button>
    </div>

    <div class="profile-section billing-section">
      <div>
        <h3>Facturación</h3>
        <p>Próximamente podrás gestionar tu plan, facturas y métodos de pago desde aquí.</p>
      </div>
      <button type="button" class="secondary" disabled>Billing próximamente</button>
    </div>

    <div id="profile-msg" class="profile-msg"></div>
  </div>
`;

  document.body.appendChild(modal);

  let user = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    user = sessionData?.session?.user || null;
  } catch (err) {
    console.warn('showProfileModal getSession:', err);
  }
  if (!user) user = await getCurrentUserSafe();

  document.getElementById('profileEmail').textContent = user?.email || 'Usuario';

  const metadata = user?.user_metadata || {};

  document.getElementById('profileName').value = metadata.name || '';
  document.getElementById('profileSurname').value = metadata.surname || '';
  document.getElementById('profilePhone').value = metadata.phone || '';

  document.getElementById('close-profile').onclick = () => modal.remove();

  document.getElementById('saveProfileData').onclick = async () => {
    const name = document.getElementById('profileName').value.trim();
    const surname = document.getElementById('profileSurname').value.trim();
    const phone = document.getElementById('profilePhone').value.trim();

    const { error } = await supabase.auth.updateUser({
      data: {
        name,
        surname,
        phone
      }
    });

    if (error) {
      document.getElementById('profile-msg').textContent = error.message;
      document.getElementById('profile-msg').className = 'profile-msg error';
      return;
    }

    document.getElementById('profile-msg').textContent = 'Datos guardados correctamente';
    document.getElementById('profile-msg').className = 'profile-msg success';
  };

  document.getElementById('change-password').onclick = async () => {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;
    const msg = document.getElementById('profile-msg');

    msg.textContent = '';
    msg.className = 'profile-msg';

    const authUser = await getCurrentUserSafe();
    const email = authUser?.email || window.currentUser?.email;

    if (!email) {
      msg.textContent = 'No se pudo obtener el email del usuario';
      msg.className = 'profile-msg error';
      return;
    }

    if (!currentPassword) {
      msg.textContent = 'Introduce tu contraseña actual';
      msg.className = 'profile-msg error';
      return;
    }

    if (newPassword.length < 6) {
      msg.textContent = 'La nueva contraseña debe tener mínimo 6 caracteres';
      msg.className = 'profile-msg error';
      return;
    }

    if (newPassword !== confirmPassword) {
      msg.textContent = 'Las contraseñas nuevas no coinciden';
      msg.className = 'profile-msg error';
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });

    if (loginError) {
      msg.textContent = 'La contraseña actual no es correcta';
      msg.className = 'profile-msg error';
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      msg.textContent = error.message;
      msg.className = 'profile-msg error';
      return;
    }

    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';

    msg.textContent = 'Contraseña actualizada correctamente';
    msg.className = 'profile-msg success';
  };
}

function injectLoginModalStyles() {
  if (document.getElementById('login-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'login-modal-styles';
  style.textContent = `
#login-modal {
  position: fixed;
  inset: 0;
  background: #020617;
  z-index: 9999;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.auth-offline-section {
  margin-top: 18px;
  padding-top: 16px;
}
.auth-offline-divider {
  position: relative;
  text-align: center;
  margin-bottom: 12px;
}
.auth-offline-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(148, 163, 184, 0.18);
}
.auth-offline-divider span {
  position: relative;
  background: var(--card-bg, #0f172a);
  padding: 0 10px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.85);
  letter-spacing: 0.04em;
}
.auth-offline-hint {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.85);
  margin: 0 0 10px;
}
.auth-offline-select {
  margin-bottom: 10px;
}
.auth-offline-btn {
  background: rgba(34, 197, 94, 0.10) !important;
  border: 1px solid rgba(34, 197, 94, 0.35) !important;
  color: #22c55e !important;
}
.auth-offline-btn:hover {
  background: rgba(34, 197, 94, 0.16) !important;
}
.auth-offline-empty {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.75);
  text-align: center;
}
.app-offline-banner {
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.35);
  color: #facc15;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
}

.auth-page {
  min-height: 100vh;
  display: block;
  padding: 0;
  background:
    radial-gradient(circle at 18% 32%, rgba(37, 99, 235, 0.20), transparent 38%),
    radial-gradient(circle at 68% 22%, rgba(34, 197, 94, 0.10), transparent 34%),
    linear-gradient(135deg, #07111f 0%, #020617 58%, #030712 100%);
}

.auth-shell {
  display: grid;
  grid-template-columns: minmax(620px, 1.15fr) minmax(390px, 0.85fr);
  gap: 54px;
  min-height: 100vh;
  align-items: center;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible;
  overflow: visible !important;
}

.auth-left {
  position: relative;
  padding: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: visible !important;
}

.auth-left-content {
  position: relative;
  z-index: 2;
}

.auth-market-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.22;
  pointer-events: none;
  overflow: hidden;
}

.auth-chart-line {
  position: absolute;
  left: 6%;
  right: 8%;
  height: 120px;
  border-radius: 999px;
  background:
    linear-gradient(90deg,
      transparent 0%,
      rgba(34, 197, 94, 0) 15%,
      rgba(34, 197, 94, 0.22) 35%,
      rgba(59, 130, 246, 0.22) 55%,
      rgba(34, 197, 94, 0.18) 78%,
      transparent 100%);
  filter: blur(22px);
  transform: skewY(-8deg);
  animation: authChartFloat 8s ease-in-out infinite;
}

.auth-chart-line-a {
  top: 16%;
}

.auth-chart-line-b {
  bottom: 18%;
  opacity: 0.7;
  transform: skewY(7deg);
  animation-delay: -3s;
}

.auth-left::before {
  display: none !important;
}

.auth-left::after,
.auth-right::before,
.auth-right::after {
  display: none !important;
}

.auth-left-content {
  position: relative;
  z-index: 2;
  max-width: 760px;
}

.auth-left h1 {
  margin: 0 0 14px;
  color: #f8fafc;
  font-size: clamp(44px, 5.4vw, 64px);
  line-height: 0.96;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.auth-left p {
  margin-top: 16px;
  color: rgba(226, 232, 240, 0.85);
  font-size: 18px;
  line-height: 1.55;
}

.auth-claim {
  margin-top: 24px;
  font-size: 15px;
  color: rgba(148, 163, 184, 0.9);
}

.auth-claim::before {
  content: "";
  display: block;
  width: 40px;
  height: 2px;
  margin-bottom: 10px;
  background: #22c55e;
}

.auth-badges {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.auth-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.84);
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.15);
  font-weight: 500;
}

.auth-device-showcase {
  margin-top: 44px;
  width: min(780px, 94%);
  margin-right: 32px;
  position: relative;
  perspective: 1200px;
  opacity: 1;
  background: transparent !important;
  box-shadow: none !important;
  overflow: visible !important;
}

.laptop-mockup {
  position: relative;
  width: 100%;
  max-width: 760px;
  transform:
    perspective(1500px)
    rotateX(4deg)
    rotateY(-4deg)
    rotateZ(-1deg) !important;
  transform-origin: center bottom;
  filter:
    drop-shadow(0 50px 80px rgba(0,0,0,.55))
    drop-shadow(0 16px 26px rgba(15,23,42,.55));
  animation: laptopFloat 6s ease-in-out infinite;
}

.laptop-mockup::before {
  content: "";
  position: absolute;
  left: 5%;
  right: 5%;
  top: 4px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,.22),
    transparent
  );
  z-index: 9;
}

.laptop-screen {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 24px 24px 18px 18px;
  padding: 14px;
  overflow: hidden;
  background:
    linear-gradient(145deg,
      rgba(226,232,240,.35) 0%,
      rgba(71,85,105,.34) 8%,
      rgba(15,23,42,.98) 18%,
      rgba(2,6,23,.99) 100%
    );
  border: 1px solid rgba(226,232,240,.24);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.22),
    inset 0 -1px 0 rgba(0,0,0,.75),
    inset 0 0 0 7px rgba(2,6,23,.72),
    0 34px 80px rgba(0,0,0,.48);
  overflow: hidden;
  opacity: 1;
}

.laptop-screen::before {
  content: "";
  position: absolute;
  inset: 12px;
  z-index: 0;
  border-radius: 16px;
  background:
    radial-gradient(circle at 72% 18%, rgba(34,197,94,.13), transparent 34%),
    radial-gradient(circle at 20% 90%, rgba(59,130,246,.10), transparent 40%),
    linear-gradient(180deg, #0f172a 0%, #020617 100%);
  box-shadow:
    inset 0 0 0 1px rgba(148,163,184,.10),
    inset 0 30px 80px rgba(255,255,255,.025);
}

.laptop-screen::after {
  content: "";
  position: absolute;
  inset: 12px;
  z-index: 6;
  border-radius: 14px;
  pointer-events: none;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.035) 18%, transparent 38%);
  background:
    linear-gradient(
      118deg,
      rgba(255,255,255,.18) 0%,
      rgba(255,255,255,.055) 16%,
      transparent 36%
    ),
    linear-gradient(
      252deg,
      rgba(255,255,255,.045) 0%,
      transparent 26%
    );
  mix-blend-mode: screen;
  opacity: .62;
}

.laptop-screen .laptop-camera {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 6px;
  height: 6px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #020617;
  box-shadow:
    0 0 0 1px rgba(148,163,184,.25),
    inset 0 1px 2px rgba(255,255,255,.12);
  z-index: 8;
}

.fake-app-topbar,
.fake-dashboard {
  position: relative;
  z-index: 2;
}

.laptop-base {
  position: relative;
  width: 108% !important;
  height: 42px;
  margin-left: -4% !important;
  margin-top: -2px;
  border-radius: 0 0 60px 60px;
  background:
    linear-gradient(180deg,
      rgba(226,232,240,.78) 0%,
      rgba(148,163,184,.62) 12%,
      rgba(71,85,105,.70) 38%,
      rgba(30,41,59,.92) 72%,
      rgba(2,6,23,.98) 100%
    );
  border: 1px solid rgba(226,232,240,.18);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.35),
    inset 0 -8px 18px rgba(0,0,0,.45),
    0 24px 54px rgba(0,0,0,.50);
}

.laptop-base::before {
  content: "";
  position: absolute;
  top: 7px;
  left: 50%;
  width: 150px;
  height: 7px;
  transform: translateX(-50%);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(15,23,42,.68), rgba(2,6,23,.95));
  box-shadow:
    inset 0 1px 2px rgba(0,0,0,.8),
    0 1px 0 rgba(255,255,255,.08);
}

.laptop-base::after {
  content: "";
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: -18px;
  height: 26px;
  border-radius: 999px;
  background: rgba(0,0,0,.48);
  filter: blur(22px);
}

.fake-app-topbar {
  height: 34px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border-radius: 13px;
  background: rgba(2,6,23,.62);
  border: 1px solid rgba(148,163,184,.12);
}

.fake-app-topbar span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.fake-app-topbar strong {
  margin-left: 8px;
  font-size: 11px;
  color: rgba(226, 232, 240, 0.75);
}

.fake-dashboard {
  margin-top: 10px;
  height: calc(100% - 44px);
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 10px;
  background: radial-gradient(circle at 82% 18%, rgba(34, 197, 94, 0.06), transparent 28%), linear-gradient(180deg, #0f172a, #020617);
  border-radius: 15px;
  overflow: hidden;
  opacity: 1;
}

.fake-sidebar {
  border-radius: 14px;
  background: rgba(15,23,42,.72);
  border: 1px solid rgba(148,163,184,.11);
  padding: 12px 10px;
}

.fake-logo {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(59, 130, 246, 0.65));
  margin-bottom: 18px;
}

.fake-sidebar span {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  margin-bottom: 12px;
}

.fake-sidebar span:nth-child(3) {
  background: rgba(34, 197, 94, 0.28);
}

.fake-content {
  min-width: 0;
}

.fake-kpi-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.fake-kpi {
  min-height: 58px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(15,23,42,.72);
  border: 1px solid rgba(148,163,184,.11);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025), 0 10px 24px rgba(0, 0, 0, 0.18);
}

.fake-kpi small {
  display: block;
  font-size: 9px;
  color: rgba(148, 163, 184, 0.85);
  margin-bottom: 6px;
}

.fake-kpi strong {
  font-size: 15px;
  color: rgba(241, 245, 249, 0.94);
}

.fake-kpi.positive strong {
  color: rgba(74, 222, 128, 0.9);
}

.fake-main-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1.35fr 0.9fr;
  gap: 10px;
}

.fake-chart-card,
.fake-calendar-card {
  min-height: 178px;
  border-radius: 16px;
  background: rgba(15,23,42,.72);
  border: 1px solid rgba(148,163,184,.11);
  padding: 12px;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025), 0 10px 24px rgba(0, 0, 0, 0.18);
}

.fake-card-title {
  font-size: 10px;
  color: rgba(148, 163, 184, 0.88);
  margin-bottom: 10px;
}

.fake-line-chart {
  width: 100%;
  height: 138px;
}

.fake-grid-line {
  stroke: rgba(148, 163, 184, 0.1);
  stroke-width: 1;
}

.fake-equity-fill {
  fill: rgba(34,197,94,.115);
}

.fake-equity-line {
  fill: none;
  stroke: rgba(74,222,128,.96);
  stroke-width: 2.8;
  filter: drop-shadow(0 0 7px rgba(34,197,94,.32));
  stroke-dasharray: 900;
  stroke-dashoffset: 900;
  animation: drawEquity 2.2s ease forwards;
}

.fake-calendar-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.fake-calendar-grid span {
  aspect-ratio: 1.2 / 1;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.06);
}

.fake-calendar-grid span.win {
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.18);
}

.fake-calendar-grid span.loss {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.14);
}

.auth-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: transparent !important;
}

.auth-mini-badge {
  margin-bottom: 16px;
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.18);
  background: rgba(34, 197, 94, 0.07);
  color: rgba(187, 247, 208, 0.86);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.auth-mini-badge::before {
  content: "";
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 14px rgba(34,197,94,.7);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 32px;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.34);
  animation: fadeIn 0.4s ease;
  transition: all 0.2s ease;
}

.auth-card:hover {
  transform: translateY(-2px);
}

.auth-card .login-title {
  text-align: left;
  margin: 0;
  color: #f8fafc;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.auth-card .subtitle {
  text-align: left;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.8);
  margin: 0 0 16px;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 5px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.14);
  margin-bottom: 22px;
}

.auth-tab {
  height: 42px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgba(203, 213, 225, 0.72);
  font-weight: 700;
  cursor: pointer;
}

.auth-tab.active {
  background: rgba(2, 6, 23, 0.72);
  color: #f8fafc;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.input-group {
  position: relative;
}

.input-group svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 17px;
  height: 17px;
  opacity: 0.6;
  color: rgba(148, 163, 184, 0.9);
  pointer-events: none;
}

.input-group:focus-within svg {
  color: rgba(34, 197, 94, 0.9);
  opacity: 0.95;
}

.auth-card input {
  width: 100%;
  height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.13);
  background: rgba(2, 6, 23, 0.28);
  color: rgba(241, 245, 249, 0.96);
  font-size: 13px;
  outline: none;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  padding-right: 14px;
  padding-left: 40px;
}

.auth-card input:hover {
  border-color: rgba(148, 163, 184, 0.24);
}

.auth-card input:focus {
  border-color: rgba(34, 197, 94, 0.48);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.08);
}

.auth-card .btn-primary {
  width: 100%;
  height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(34, 197, 94, 0.28);
  background: linear-gradient(180deg, #22c55e, #16a34a);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: none !important;
}

.auth-card .btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(34, 197, 94, 0.1) !important;
}

.btn-primary:active {
  transform: scale(0.99);
  box-shadow: none;
}

.auth-remember {
  margin: 2px 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: rgba(203, 213, 225, 0.78);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.auth-remember input {
  display: none;
}

.auth-remember-box {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(2, 6, 23, 0.38);
  position: relative;
  transition: all 0.18s ease;
}

.auth-remember input:checked + .auth-remember-box {
  background: rgba(34, 197, 94, 0.9);
  border-color: rgba(34, 197, 94, 0.9);
}

.auth-remember input:checked + .auth-remember-box::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid #052e16;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  width: 100%;
  margin-top: 10px;
  background: transparent;
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: #22c55e;
  color: #22c55e;
}

.divider {
  margin: 16px 0;
  height: 1px;
  background: rgba(255,255,255,0.05);
}

.login-footer {
  margin-top: 14px;
  font-size: 12px;
  text-align: center;
  color: rgba(255,255,255,0.4);
}

.error {
  color: #ef4444;
  font-size: 12px;
  text-align: center;
  min-height: 14px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes drawEquity {
  to { stroke-dashoffset: 0; }
}

@keyframes laptopFloat {
  0%, 100% {
    transform:
      perspective(1500px)
      rotateX(4deg)
      rotateY(-7deg)
      rotateZ(-1deg)
      translateY(0);
  }
  50% {
    transform:
      perspective(1500px)
      rotateX(4deg)
      rotateY(-7deg)
      rotateZ(-1deg)
      translateY(-3px);
  }
}

@keyframes authChartFloat {
  0%, 100% { transform: translateY(0) skewY(-8deg); opacity: 0.7; }
  50% { transform: translateY(-18px) skewY(-5deg); opacity: 1; }
}

@media (max-width: 768px) {
  .auth-page {
    padding: 0;
  }
}

@media (max-width: 1050px) {
  .auth-shell {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .auth-left {
    padding: 48px 32px 26px;
    text-align: center;
    align-items: center;
  }

  .auth-claim {
    margin-left: auto;
    margin-right: auto;
  }

  .auth-claim::before {
    margin-left: auto;
    margin-right: auto;
  }

  .auth-device-showcase {
    display: none;
  }

  .auth-left-content {
    text-align: center;
    margin: 0 auto;
  }

  .auth-right {
    padding: 24px 20px 40px;
    background: transparent;
    justify-content: center;
  }
}

@media (max-width: 560px) {
  .auth-left h1 {
    font-size: 42px;
  }

  .auth-card {
    padding: 26px 22px;
  }
}

.auth-card .btn-primary,
#loginBtn {
  box-shadow: none !important;
}

.auth-card .btn-primary:hover,
#loginBtn:hover {
  box-shadow: 0 8px 18px rgba(34, 197, 94, 0.1) !important;
}
`;
  document.head.appendChild(style);
}

function showLoginModal() {
  injectLoginModalStyles();
  if (document.getElementById('login-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'login-modal';

  modal.innerHTML = `
  <div class="auth-page">
    <div class="auth-shell">
      <aside class="auth-left">
        <div class="auth-market-bg" aria-hidden="true">
          <div class="auth-chart-line auth-chart-line-a"></div>
          <div class="auth-chart-line auth-chart-line-b"></div>
        </div>
        <div class="auth-left-content">
          <h1>Trading Journal</h1>
          <p>Controla, analiza y escala tu trading como un profesional</p>
          <p class="auth-claim">Lo que no se puede medir, no se puede mejorar.</p>
          <div class="auth-badges">
            <span class="auth-badge">Backtesting avanzado</span>
            <span class="auth-badge">Métricas profesionales</span>
            <span class="auth-badge">Control de riesgo</span>
          </div>
          <div class="auth-device-showcase" aria-hidden="true">
            <div class="laptop-mockup">
              <div class="laptop-screen">
                <div class="laptop-camera"></div>
                <div class="fake-app-topbar">
                  <span></span><span></span><span></span>
                  <strong>Trading Journal</strong>
                </div>
                <div class="fake-dashboard">
                  <aside class="fake-sidebar">
                    <div class="fake-logo"></div>
                    <span></span><span></span><span></span>
                  </aside>
                  <main class="fake-content">
                    <div class="fake-kpi-row">
                      <div class="fake-kpi positive">
                        <small>Winrate</small>
                        <strong>64.8%</strong>
                      </div>
                      <div class="fake-kpi positive">
                        <small>PnL</small>
                        <strong>+1,284€</strong>
                      </div>
                      <div class="fake-kpi">
                        <small>R:R medio</small>
                        <strong>1.72</strong>
                      </div>
                    </div>
                    <div class="fake-main-grid">
                      <div class="fake-chart-card">
                        <div class="fake-card-title">Equity curve</div>
                        <svg class="fake-line-chart" viewBox="0 0 420 150" preserveAspectRatio="none">
                          <path class="fake-grid-line" d="M0 35H420 M0 75H420 M0 115H420" />
                          <path class="fake-equity-fill" d="M0 120 C40 105 70 110 105 90 C145 62 175 82 210 64 C260 35 300 54 340 28 C380 14 400 22 420 12 L420 150 L0 150 Z" />
                          <path class="fake-equity-line" d="M0 120 C40 105 70 110 105 90 C145 62 175 82 210 64 C260 35 300 54 340 28 C380 14 400 22 420 12" />
                        </svg>
                      </div>
                      <div class="fake-calendar-card">
                        <div class="fake-card-title">Calendario</div>
                        <div class="fake-calendar-grid">
                          <span></span><span class="win"></span><span></span><span class="loss"></span><span class="win"></span>
                          <span class="win"></span><span></span><span class="loss"></span><span></span><span class="win"></span>
                          <span></span><span class="win"></span><span></span><span></span><span class="loss"></span>
                        </div>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
              <div class="laptop-base"></div>
            </div>
          </div>
        </div>
      </aside>
      <section class="auth-right">
        <div class="auth-card">
          <div class="auth-mini-badge">${t('auth_private_workspace', 'Private trading workspace')}</div>
          <div class="auth-tabs">
            <button type="button" class="auth-tab active" id="authLoginTab">Iniciar sesión</button>
            <button type="button" class="auth-tab" id="authRegisterTab">Crear cuenta</button>
          </div>
          <h2 class="login-title">Bienvenido de nuevo</h2>
          <p class="subtitle">Inicia sesión para continuar</p>

          <div class="input-group">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6.5h16v11H4v-11Z" stroke="currentColor" stroke-width="1.7" />
              <path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" stroke-width="1.7" />
            </svg>
            <input class="login-input" type="email" id="login-email" placeholder="Correo electrónico" />
          </div>
          <div class="input-group">
            <svg class="auth-input-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" stroke-width="1.7" />
              <path d="M6 10h12v10H6V10Z" stroke="currentColor" stroke-width="1.7" />
            </svg>
            <input class="login-input" type="password" id="login-password" placeholder="Contraseña (mínimo 6 caracteres)" />
          </div>
          <label class="auth-remember">
            <input id="rememberEmail" type="checkbox" />
            <span class="auth-remember-box"></span>
            <span>${t('auth_remember_me', 'Recordarme')}</span>
          </label>

          <button id="login-btn" type="button" class="btn-primary">Entrar</button>
          <p class="login-footer">Accede a tus datos de forma segura</p>

          <p id="login-error" class="error"></p>

          <div id="offline-login-section" class="auth-offline-section" hidden>
            <div class="auth-offline-divider"><span>Modo offline disponible</span></div>
            <p class="auth-offline-hint" id="offline-hint">Sin conexión. Puedes entrar con un usuario que ya inició sesión en este equipo.</p>
            <select id="offline-user-select" class="login-input auth-offline-select" hidden></select>
            <button id="offline-login-btn" type="button" class="btn-primary auth-offline-btn">Entrar sin conexión</button>
            <p id="offline-no-users" class="auth-offline-empty" hidden>Necesitas iniciar sesión con internet al menos una vez en este equipo.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
`;

  document.body.appendChild(modal);

  const rememberKey = 'auth_remember_email';
  const emailInputEl = document.getElementById('login-email');
  const rememberInputEl = document.getElementById('rememberEmail');
  const rememberedEmail = localStorage.getItem(rememberKey);
  if (rememberedEmail && emailInputEl) {
    emailInputEl.value = rememberedEmail;
    if (rememberInputEl) rememberInputEl.checked = true;
  }

  const loginErrorEl = () => document.getElementById('login-error');
  let authMode = 'login';
  const loginBtnEl = document.getElementById('login-btn');
  const loginTabEl = document.getElementById('authLoginTab');
  const registerTabEl = document.getElementById('authRegisterTab');
  const loginTitleEl = modal.querySelector('.login-title');
  const subtitleEl = modal.querySelector('.subtitle');

  function updateAuthModeUI() {
    const isLogin = authMode === 'login';
    if (loginTabEl) loginTabEl.classList.toggle('active', isLogin);
    if (registerTabEl) registerTabEl.classList.toggle('active', !isLogin);
    if (loginTitleEl) loginTitleEl.textContent = isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta';
    if (subtitleEl) subtitleEl.textContent = isLogin
      ? 'Inicia sesión para continuar'
      : 'Empieza a medir y mejorar tus resultados';
    if (loginBtnEl) loginBtnEl.textContent = isLogin ? 'Entrar' : 'Crear cuenta';
  }

  if (loginTabEl) {
    loginTabEl.onclick = () => {
      authMode = 'login';
      loginErrorEl().textContent = '';
      updateAuthModeUI();
    };
  }

  if (registerTabEl) {
    registerTabEl.onclick = () => {
      authMode = 'register';
      loginErrorEl().textContent = '';
      updateAuthModeUI();
    };
  }

  updateAuthModeUI();

  // ---- Sección offline -----------------------------------------------------
  const offlineSection = document.getElementById('offline-login-section');
  const offlineSelect = document.getElementById('offline-user-select');
  const offlineBtn = document.getElementById('offline-login-btn');
  const offlineEmpty = document.getElementById('offline-no-users');
  const offlineHint = document.getElementById('offline-hint');

  function refreshOfflineUI() {
    if (!offlineSection) return;
    const users = getOfflineUsers();
    const online = isOnline();

    // Siempre mostramos la sección cuando hay usuarios autorizados, para que
    // sirva como fallback si el login online falla por red. Si no hay
    // usuarios y estamos online, no hace falta enseñar nada.
    if (users.length === 0 && online) {
      offlineSection.hidden = true;
      return;
    }

    offlineSection.hidden = false;

    if (users.length === 0) {
      if (offlineEmpty) offlineEmpty.hidden = false;
      if (offlineSelect) offlineSelect.hidden = true;
      if (offlineBtn) offlineBtn.disabled = true;
      if (offlineHint)
        offlineHint.textContent =
          'Sin conexión. No hay usuarios autorizados aún en este equipo.';
      return;
    }

    if (offlineEmpty) offlineEmpty.hidden = true;
    if (offlineBtn) offlineBtn.disabled = false;

    if (users.length === 1) {
      if (offlineSelect) offlineSelect.hidden = true;
      if (offlineHint) {
        offlineHint.textContent = online
          ? `También puedes entrar sin conexión como ${users[0].email}.`
          : `Sin conexión. Puedes entrar como ${users[0].email}.`;
      }
    } else if (offlineSelect) {
      offlineSelect.hidden = false;
      offlineSelect.innerHTML = '';
      users.forEach((u) => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.email;
        offlineSelect.appendChild(opt);
      });
      if (offlineHint) {
        offlineHint.textContent = online
          ? 'También puedes entrar sin conexión seleccionando un usuario autorizado.'
          : 'Sin conexión. Selecciona un usuario autorizado para entrar.';
      }
    }
  }

  function refreshOnlineInputsUI() {
    const online = isOnline();
    // No deshabilitamos el botón Entrar: la propia función login() detecta
    // online/offline con un fetch real y decide. Solo damos hint visual.
    if (loginBtnEl) {
      if (!online) {
        loginBtnEl.title = 'Sin conexión detectada por el SO. Si tu email ya inició sesión aquí, podrás entrar igualmente.';
      } else {
        loginBtnEl.removeAttribute('title');
      }
    }
    if (registerTabEl) {
      registerTabEl.disabled = !online;
    }
  }

  refreshOfflineUI();
  refreshOnlineInputsUI();

  const onConnChange = () => {
    refreshOfflineUI();
    refreshOnlineInputsUI();
  };
  window.addEventListener('online', onConnChange);
  window.addEventListener('offline', onConnChange);

  async function finishLoginUI(user, { offlineMode = false } = {}) {
    window.currentUser = { id: user.id, email: user.email };
    setCachedUserId(user.id);

    await syncRealListsFromStorage();

    if (!offlineMode) {
      await syncSupabaseSessionWithMain();
    } else if (window.electronAPI?.setUserId) {
      await window.electronAPI.setUserId(user.id);
    }

    isAppAuthenticated = true;
    setOfflineMode(offlineMode);
    updateOfflineBanner();

    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.95)';

    setTimeout(() => {
      modal.remove();
      window.removeEventListener('online', onConnChange);
      window.removeEventListener('offline', onConnChange);

      loadUserInfo().catch((err) => console.error('loadUserInfo', err));

      void (async () => {
        await loadStrategies();
        await loadAccounts();

        if (typeof loadTrades === 'function') loadTrades();
        if (typeof loadStats === 'function') loadStats();
      })();

      if (!offlineMode) {
        subscribeToTradesRealtime();
      }

      console.log(offlineMode ? '🚀 App lista (modo offline)' : '🚀 App lista tras login');
    }, 200);
  }

  if (offlineBtn) {
    offlineBtn.onclick = async () => {
      const users = getOfflineUsers();
      if (users.length === 0) return;

      const targetId = users.length === 1 ? users[0].id : (offlineSelect?.value || users[0].id);
      const offlineUser = loginOffline(targetId);
      if (!offlineUser) {
        loginErrorEl().textContent = 'No se pudo entrar en modo offline.';
        return;
      }

      await finishLoginUI(offlineUser, { offlineMode: true });
    };
  }
  // -------------------------------------------------------------------------

  document.getElementById('login-btn').onclick = async () => {
    loginErrorEl().textContent = '';
    const loginBtn = document.getElementById('login-btn');
    const authTabs = modal.querySelectorAll('.auth-tab');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = t('loading', 'Cargando...');
    }
    authTabs.forEach((tab) => { tab.disabled = true; });
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const trimmedEmail = email.trim();
    const shouldRemember = Boolean(rememberInputEl?.checked);
    if (shouldRemember && trimmedEmail) {
      localStorage.setItem(rememberKey, trimmedEmail);
    } else {
      localStorage.removeItem(rememberKey);
    }

    const restoreLoginButtons = () => {
      if (loginBtn) loginBtn.disabled = false;
      authTabs.forEach((tab) => { tab.disabled = false; });
      updateAuthModeUI();
      refreshOnlineInputsUI();
    };

    if (authMode === 'register') {
      const onlineForRegister = await checkInternetConnection();
      if (!onlineForRegister) {
        loginErrorEl().textContent = 'Necesitas internet para crear una cuenta nueva.';
        restoreLoginButtons();
        return;
      }
      const user = await register(email, password);
      if (!user) {
        loginErrorEl().textContent = 'Error al crear cuenta (mín 6 caracteres)';
        restoreLoginButtons();
        return;
      }
      loginErrorEl().textContent = 'Cuenta creada. Ahora puedes iniciar sesión.';
      authMode = 'login';
      restoreLoginButtons();
      return;
    }

    // login() ya hace checkInternetConnection internamente y decide.
    const result = await login(email, password);

    switch (result?.status) {
      case 'online':
        await finishLoginUI(
          { id: result.user.id, email: result.user.email },
          { offlineMode: false }
        );
        return;

      case 'offline':
        loginErrorEl().textContent = '';
        await finishLoginUI(
          { id: result.user.id, email: result.user.email },
          { offlineMode: true }
        );
        return;

      case 'no_offline_user':
        loginErrorEl().textContent =
          'Necesitas iniciar sesión con internet al menos una vez.';
        refreshOfflineUI();
        restoreLoginButtons();
        return;

      case 'network':
        loginErrorEl().textContent =
          'Sin conexión con Supabase. Si ya iniciaste sesión aquí antes, prueba "Entrar sin conexión".';
        refreshOfflineUI();
        restoreLoginButtons();
        return;

      case 'invalid_credentials':
        loginErrorEl().textContent = 'Credenciales incorrectas';
        restoreLoginButtons();
        return;

      default:
        loginErrorEl().textContent = 'No se pudo iniciar sesión. Inténtalo de nuevo.';
        restoreLoginButtons();
        return;
    }
  };
}

function updateOfflineBanner() {
  let banner = document.getElementById('app-offline-banner');
  const offlineActive = isOfflineModeActive() || !isOnline();
  const userBar = document.querySelector('.user-bar') || document.getElementById('user-email')?.parentElement;

  if (!offlineActive) {
    if (banner) banner.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement('span');
    banner.id = 'app-offline-banner';
    banner.className = 'app-offline-banner';
    banner.title = 'Sin conexión. Datos cargados desde la cache local.';
    banner.textContent = 'Offline';
    if (userBar) {
      userBar.appendChild(banner);
    } else {
      document.body.appendChild(banner);
      banner.style.position = 'fixed';
      banner.style.top = '12px';
      banner.style.right = '12px';
      banner.style.zIndex = '9998';
    }
  }

  // Añade contador de pendientes si el backend lo expone (no bloquear UI).
  (async () => {
    try {
      const backend = getBackendApi();
      if (!backend?.getSyncPendingCount) return;
      const count = Number(await backend.getSyncPendingCount()) || 0;
      banner.textContent = `Offline · ${count} pendientes`;
    } catch {
      // silencioso
    }
  })();
}

function setSyncBannerText(text) {
  const banner = document.getElementById('app-offline-banner');
  if (!banner) return;
  banner.textContent = String(text || '').trim() || banner.textContent;
}

function ensureSyncBannerHost() {
  // Reutilizamos el banner existente como host de estado (offline/online/sync).
  if (!document.getElementById('app-offline-banner')) {
    const userBar = document.querySelector('.user-bar') || document.getElementById('user-email')?.parentElement;
    const banner = document.createElement('span');
    banner.id = 'app-offline-banner';
    banner.className = 'app-offline-banner';
    banner.title = 'Estado de conexión y sincronización';
    banner.textContent = 'Online';
    if (userBar) userBar.appendChild(banner);
    else document.body.appendChild(banner);
  }
}

// --- Indicador de salud de sincronización -----------------------------------------------
// Motivo: tras el bug de trades.db (ruta relativa perdida en cada actualización), quedó claro
// que un fallo de sincronización silencioso puede acabar en pérdida de datos sin que el usuario
// se entere. Este indicador es SIEMPRE visible (esquina inferior izquierda) mientras haya algo
// pendiente de sincronizar o con error, e independiente del resto de banners de la app.
let lastSyncHealthState = null;

const SYNC_HEALTH_LABELS = {
  syncing: () => 'Sincronizando...',
  needs_session: () => 'Restableciendo sesión...',
  online_up_to_date: () => '',
  online_pending: (pending) => `${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de sincronizar`,
  online_error: (pending, failed) => `${failed} elemento${failed === 1 ? '' : 's'} sin sincronizar (toca para reintentar)`,
  offline: (pending) => `Sin conexión · ${pending} pendiente${pending === 1 ? '' : 's'}`,
};

function initSyncHealthIndicator() {
  const el = document.getElementById('syncHealthIndicator');
  if (!el || el.dataset.wired) return;
  el.dataset.wired = '1';
  el.addEventListener('click', async () => {
    const backend = getBackendApi();
    if (!backend) return;
    // Reintento pedido a mano: se borra el freno de los intentos automáticos.
    resetSessionRecoveryAttempts();

    // Antes de reintentar, mostramos el error real devuelto por Supabase: un "N sin sincronizar"
    // a secas no permite ni al usuario ni a soporte saber qué hay que arreglar.
    try {
      if (backend.getSyncFailedDetails) {
        const details = await backend.getSyncFailedDetails();
        if (Array.isArray(details) && details.length) {
          const first = details[0];
          const detailMsg = String(first?.error_message || '').trim();
          if (detailMsg) {
            console.warn('[sync] elementos fallidos:', details);
            showToast?.(`Motivo (${first.entity_type}/${first.action}): ${detailMsg}`, 'warning');
          }
        }
      }
    } catch (err) {
      console.warn('No se pudo leer el detalle de sincronización:', err);
    }

    if (backend.syncPendingChanges) {
      setSyncHealthIndicatorVisual('syncing', { pending: 0, failed: 0 });
      backend.syncPendingChanges().catch(() => {});
    }
  });
}

function setSyncHealthIndicatorVisual(state, { pending = 0, failed = 0 } = {}) {
  const el = document.getElementById('syncHealthIndicator');
  const textEl = document.getElementById('syncHealthIndicatorText');
  if (!el || !textEl) return;

  el.classList.remove('state-syncing', 'state-pending', 'state-error', 'state-offline');

  if (state === 'online_up_to_date' || !state) {
    el.classList.remove('is-visible');
    return;
  }

  const labelFn = SYNC_HEALTH_LABELS[state];
  const label = labelFn ? labelFn(pending, failed) : '';
  if (!label) {
    el.classList.remove('is-visible');
    return;
  }
  textEl.textContent = label;
  const variant =
    state === 'syncing' || state === 'needs_session'
      ? 'syncing'
      : state === 'offline'
        ? 'offline'
        : state === 'online_error'
          ? 'error'
          : 'pending';
  el.classList.add('is-visible', `state-${variant}`);
}

// Evita que el aviso se repita en cada reintento automático (cada 3 min) mientras el problema
// siga sin resolverse: solo se muestra una vez por incidencia, hasta que vuelva a estar al día.
let syncErrorToastShown = false;

// Si main avisa de que no tiene sesión de Supabase, se la reenviamos desde el renderer (que sí
// la tiene) y reintentamos. Sin esto, auth.uid() es NULL en main y todo insert choca contra RLS.
//
// El bucle que hay que evitar: main emite `needs_session` en CADA intento de sincronizar, y ese
// aviso es justamente lo que dispara este reintento. Si por lo que sea la sesión no llega a
// asentarse, cada intento genera otro aviso que genera otro intento, y la app se queda con el
// "Restableciendo sesión..." puesto para siempre, consumiendo CPU y sin decir qué pasa. Por eso
// hay una espera mínima entre intentos y un tope: al tercer fallo se para y se muestra el
// problema, que es más útil que seguir girando en silencio.
const SESSION_RECOVERY_COOLDOWN_MS = 15000;
const SESSION_RECOVERY_MAX_ATTEMPTS = 3;
let recoveringSyncSession = false;
let lastSessionRecoveryAt = 0;
let sessionRecoveryAttempts = 0;

function resetSessionRecoveryAttempts() {
  sessionRecoveryAttempts = 0;
  lastSessionRecoveryAt = 0;
}

async function recoverSyncSessionAndRetry() {
  if (recoveringSyncSession) return;
  if (Date.now() - lastSessionRecoveryAt < SESSION_RECOVERY_COOLDOWN_MS) return;

  if (sessionRecoveryAttempts >= SESSION_RECOVERY_MAX_ATTEMPTS) {
    console.warn('[sync] la sesión no se ha podido restablecer tras varios intentos; se deja de reintentar solo');
    showToast?.(
      'No se ha podido restablecer la sesión para sincronizar. Cierra sesión y vuelve a entrar, o toca el indicador de sincronización para reintentar.',
      'warning'
    );
    sessionRecoveryAttempts = 0;
    lastSessionRecoveryAt = Date.now() + 60000; // un minuto de tregua antes de volver a intentarlo
    return;
  }

  recoveringSyncSession = true;
  lastSessionRecoveryAt = Date.now();
  sessionRecoveryAttempts += 1;
  try {
    const ok = await syncSupabaseSessionWithMain();
    if (ok) {
      const backend = getBackendApi();
      if (backend?.syncPendingChanges) await backend.syncPendingChanges();
    } else {
      showToast?.('Tu sesión ha caducado. Vuelve a iniciar sesión para sincronizar tus datos.', 'warning');
    }
  } catch (err) {
    console.warn('No se pudo restablecer la sesión para sincronizar:', err);
  } finally {
    recoveringSyncSession = false;
  }
}

/**
 * Cada vez que la ventana renueva el token, se lo pasa al proceso principal.
 *
 * La ventana es la única que refresca la sesión (el cliente de main tiene el refresco
 * desactivado justamente para que no compitan). Sin este aviso, el token de main caducaría a la
 * hora y solo se arreglaría cuando algo fallara y pidiera la sesión; con él, main siempre tiene
 * uno válido y ese aviso deja de hacer falta.
 */
function watchSupabaseTokenRefresh() {
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event !== 'TOKEN_REFRESHED' && event !== 'SIGNED_IN') return;
      console.log('[auth] token renovado en la ventana; se envía al proceso de datos');
      resetSessionRecoveryAttempts();
      void syncSupabaseSessionWithMain();
    });
  } catch (err) {
    console.warn('No se pudo escuchar la renovación de sesión:', err);
  }
}

function applySyncHealthState(state, { pending = 0, failed = 0 } = {}) {
  setSyncHealthIndicatorVisual(state, { pending, failed });

  if (state === 'needs_session') {
    void recoverSyncSessionAndRetry();
    lastSyncHealthState = state;
    return;
  }

  // Cualquier estado distinto de "necesito sesión" significa que main ya está operando con la
  // sesión puesta: se olvida lo intentado hasta ahora.
  resetSessionRecoveryAttempts();

  if (state === 'online_up_to_date') {
    syncErrorToastShown = false;
  } else if (state === 'online_error' && failed > 0 && !syncErrorToastShown) {
    syncErrorToastShown = true;
    showToast?.(
      `${failed} elemento${failed === 1 ? '' : 's'} pendiente${failed === 1 ? '' : 's'} de sincronizar. Se reintentará automáticamente (icono abajo a la izquierda).`,
      'info'
    );
  }
  lastSyncHealthState = state;
}

let syncHealthAutoRetryStarted = false;
function startSyncHealthAutoRetry() {
  if (syncHealthAutoRetryStarted) return;
  syncHealthAutoRetryStarted = true;
  // Reintento periódico: para que los cambios pendientes/fallidos no se queden esperando
  // indefinidamente a que el usuario dispare una acción cualquiera o reinicie la app.
  setInterval(() => {
    if (!isAppAuthenticated) return;
    if (!isOnline() || isOfflineModeActive()) return;
    const backend = getBackendApi();
    if (backend?.syncPendingChanges) backend.syncPendingChanges().catch(() => {});
  }, 3 * 60 * 1000);
}

async function checkAuth() {
  let onlineSession = null;
  let reallyOnline = false;
  try {
    reallyOnline = await checkInternetConnection();
  } catch (err) {
    reallyOnline = false;
  }

  try {
    if (reallyOnline) {
      onlineSession = await getCurrentUserSafe();
    }
  } catch (err) {
    console.warn('⚠️ getCurrentUserSafe falló (offline?):', err);
  }

  if (onlineSession) {
    console.log('🔓 Usuario autenticado:', onlineSession.email);
    window.currentUser = { id: onlineSession.id, email: onlineSession.email };
    setCachedUserId(onlineSession.id);
    if (onlineSession.id) {
      localStorage.setItem('user_id', onlineSession.id);
      console.log('✅ user_id sincronizado con sesión:', onlineSession.id);
      try {
        saveOfflineUserSession(
          { id: onlineSession.id, email: onlineSession.email },
          getOfflineAppEnv()
        );
      } catch (err) {
        console.warn('⚠️ No se pudo refrescar offline user:', err);
      }
    }
    await syncRealListsFromStorage();
    isAppAuthenticated = true;
    setOfflineMode(false);
    updateOfflineBanner();
    await syncSupabaseSessionWithMain();

    // Pull remoto → SQLite (trades + cuentas + estrategias) en background y refresco UI.
    setTimeout(() => {
      const backend = getBackendApi();
      if (backend?.pullRemoteData) {
        backend.pullRemoteData()
          .catch((e) => console.warn('pullRemoteData error:', e))
          .finally(() => {
            refreshRealAccountsAndStrategies().then(() => {
              void loadAccounts();
              void loadStrategies();
            });
          });
      }
      if (backend?.syncPendingChanges) {
        backend.syncPendingChanges().catch(() => {});
      }
    }, 0);
    return true;
  }

  // Sin sesión online válida: probar reanudación offline si hay UN solo usuario autorizado.
  if (!reallyOnline) {
    const offlineUsers = getOfflineUsers();
    if (offlineUsers.length === 1) {
      const only = offlineUsers[0];
      console.log('📴 Modo offline auto (único usuario):', only.email);
      const offlineUser = loginOffline(only.id);
      if (offlineUser) {
        window.currentUser = offlineUser;
        setCachedUserId(offlineUser.id);
        await syncRealListsFromStorage();
        isAppAuthenticated = true;
        setOfflineMode(true);
        if (window.electronAPI?.setUserId) {
          await window.electronAPI.setUserId(offlineUser.id);
        }
        updateOfflineBanner();
        return true;
      }
    }
    // Si hay varios o ninguno, mostramos el modal con la sección offline.
    console.log('📴 Sin sesión online; modal con sección offline (', offlineUsers.length, 'usuarios)');
  }

  console.log('🔒 Usuario no autenticado');
  window.currentUser = null;
  isAppAuthenticated = false;
  showLoginModal();
  return false;
}

console.log('Renderer cargado');
const { Chart: ChartJS, registerables } = require('chart.js');
const {
  loadLanguage,
  t,
  detectUserLanguage,
  initLanguageSwitcher,
  applyTranslations
} = require('./i18n');
const {
  parseOperatingHours,
  validateOperatingHoursList,
  isEntryWithinOperatingHours,
  computeDurationMinutes,
  parseTimeToMinutes,
  buildStrategyByNameMap,
  formatOperatingHoursSummary,
  getTradeScheduleStatus,
  formatMinutesAsHm,
  simulateScheduleRanges,
} = require('./services/scheduleUtils');
const { planBacktestRecalc } = require('./services/backtestRecalc');
const { computeResultStreaks } = require('./services/backtestStreaks');
const {
  accountSizeToCapital,
  buildAccountNameFromExpense,
  looksLikeAccountPurchase,
} = require('./services/accountFromExpense');
const { buildEquityCurve } = require('./services/backtestEquityCurve');
const {
  simulateChallenge,
  compareChallengeAccounts,
  tradesPerTradingDay,
  defaultChallengeConfig,
  normalizeChallengeConfig,
} = require('./services/challengeSimulator');
const {
  parsePositionLegs,
  validatePositionLegs,
  sumLegsPnl,
  sumLegsLotSize,
  isCompositePositionFlag,
  createEmptyPositionLeg,
  applyCompositeToTradeFields,
  formatPositionLegsSummary,
  hydrateTradeCompositeFields,
} = require('./services/positionLegsUtils');
const {
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
  mergePreviousNames,
} = require('./services/realListsMerge');
const { calculateTradeCommission, resolveAccountCommissionPerLot } = require('./services/tradeCommission');

const TRADE_COMPOSITE_FORMS = {
  create: {
    enabled: 'tradeCompositeEnabled',
    section: 'tradeCompositeSection',
    list: 'tradePositionLegsList',
    addBtn: 'tradeAddPositionLeg',
    empty: 'tradeCompositeEmptyHint',
    summary: 'tradeCompositeSummary',
    pnl: 'pnl',
    pnlPresets: 'pnlPresetRow',
    result: 'result',
  },
  edit: {
    enabled: 'editTradeCompositeEnabled',
    section: 'editTradeCompositeSection',
    list: 'editTradePositionLegsList',
    addBtn: 'editTradeAddPositionLeg',
    empty: 'editTradeCompositeEmptyHint',
    summary: 'editTradeCompositeSummary',
    pnl: 'editPnl',
    pnlPresets: null,
    result: 'editResult',
  },
};

function getTradeCompositeFormConfig(form = 'create') {
  return TRADE_COMPOSITE_FORMS[form] || TRADE_COMPOSITE_FORMS.create;
}

function isTradeCompositeEnabled(form = 'create') {
  // El switch "Construir posición" se ha eliminado: la sección de entradas está siempre activa.
  // La flag is_composite_position se calcula en backend/normalización según el número de legs (2+).
  return true;
}

function syncTradeCompositeSectionVisibility(form = 'create') {
  const cfg = getTradeCompositeFormConfig(form);
  const enabled = isTradeCompositeEnabled(form);
  const section = document.getElementById(cfg.section);
  const pnlEl = document.getElementById(cfg.pnl);
  const presets = cfg.pnlPresets ? document.getElementById(cfg.pnlPresets) : null;
  if (section) section.hidden = !enabled;
  if (pnlEl) {
    pnlEl.readOnly = enabled;
    pnlEl.classList.toggle('pnl-readonly-composite', enabled);
    if (enabled) pnlEl.setAttribute('aria-readonly', 'true');
    else pnlEl.removeAttribute('aria-readonly');
  }
  if (presets) presets.style.display = enabled ? 'none' : '';
  updateTradeCompositeEmptyHint(form);
  if (enabled) recalculateTradeCompositeTotals(form);
}

function updateTradeCompositeEmptyHint(form = 'create') {
  const cfg = getTradeCompositeFormConfig(form);
  const hint = document.getElementById(cfg.empty);
  const section = document.getElementById(cfg.section);
  if (!hint) return;
  if (!section || section.hidden) {
    hint.hidden = true;
    return;
  }
  hint.hidden = collectTradePositionLegsFromDom(form).length > 0;
}

function renderTradePositionLegsList(form = 'create', legs = []) {
  const cfg = getTradeCompositeFormConfig(form);
  const list = document.getElementById(cfg.list);
  if (!list) return;
  const ranges = parsePositionLegs(legs);
  list.innerHTML = '';
  ranges.forEach((leg, idx) => {
    const card = document.createElement('div');
    card.className = 'trade-position-leg-card';
    card.dataset.legId = leg.id;
    const lotVal = leg.lot_size != null && Number.isFinite(Number(leg.lot_size)) ? String(leg.lot_size) : '';
    const pnlVal = Number.isFinite(Number(leg.pnl)) ? String(leg.pnl) : '';
    card.innerHTML = `
      <div class="trade-position-leg-card-head">
        <strong>${leg.label || `Entrada ${idx + 1}`}</strong>
        <button type="button" class="button button-delete trade-position-leg-remove" data-leg-id="${leg.id}" aria-label="Eliminar entrada">×</button>
      </div>
      <div class="trade-position-leg-fields">
        <label>Lotaje
          <input type="number" class="input trade-leg-lot" step="0.01" min="0" value="${lotVal}" placeholder="Opcional" />
        </label>
        <label>PnL
          <input type="number" class="input trade-leg-pnl" step="0.01" value="${pnlVal}" placeholder="0.00" />
        </label>
        <label class="field-full" style="grid-column:1/-1">Comentario
          <input type="text" class="input trade-leg-comment" value="${String(leg.comment || '').replace(/"/g, '&quot;')}" placeholder="Opcional" />
        </label>
      </div>
    `;
    list.appendChild(card);
  });
  list.querySelectorAll('.trade-position-leg-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const legId = btn.dataset.legId;
      const next = collectTradePositionLegsFromDom(form).filter((l) => String(l.id) !== String(legId));
      renderTradePositionLegsList(form, next);
      recalculateTradeCompositeTotals(form);
    });
  });
  list.querySelectorAll('.trade-leg-pnl, .trade-leg-lot').forEach((input) => {
    input.addEventListener('input', () => recalculateTradeCompositeTotals(form));
    input.addEventListener('change', () => recalculateTradeCompositeTotals(form));
  });
  // El signo se ajusta al salir del campo, no mientras se escribe: si no, teclear "5" en un SL
  // lo convertiría en "-5" y el siguiente dígito daría "-52" en vez de "-5.2". Antes el signo
  // solo se aplicaba al cambiar el Resultado, así que editar el PnL después lo dejaba positivo
  // aunque el trade fuera SL, y había que volver a marcar SL para corregirlo.
  list.querySelectorAll('.trade-leg-pnl').forEach((input) => {
    input.addEventListener('blur', () => {
      applyCompositeLegPnlSign(form);
      recalculateTradeCompositeTotals(form);
    });
  });
  updateTradeCompositeEmptyHint(form);
}

function collectTradePositionLegsFromDom(form = 'create') {
  const cfg = getTradeCompositeFormConfig(form);
  const list = document.getElementById(cfg.list);
  if (!list) return [];
  const out = [];
  list.querySelectorAll('.trade-position-leg-card').forEach((card, idx) => {
    const lotRaw = card.querySelector('.trade-leg-lot')?.value;
    const pnlRaw = card.querySelector('.trade-leg-pnl')?.value;
    const comment = String(card.querySelector('.trade-leg-comment')?.value || '').trim();
    const pnl =
      pnlRaw === '' || pnlRaw === null || pnlRaw === undefined
        ? null
        : parseMoneyInput(pnlRaw);
    if (pnl === null || !Number.isFinite(pnl)) return;
    let lot_size = null;
    if (lotRaw !== '' && lotRaw != null) {
      const lotNum = parseFloat(String(lotRaw).replace(',', '.'));
      if (Number.isFinite(lotNum)) lot_size = lotNum;
    }
    out.push({
      id: card.dataset.legId || createEmptyPositionLeg(idx + 1).id,
      label: `Entrada ${idx + 1}`,
      lot_size,
      pnl,
      comment,
    });
  });
  return out;
}

function applyCompositeLegPnlSign(form = 'create') {
  const cfg = getTradeCompositeFormConfig(form);
  if (!isTradeCompositeEnabled(form)) return;
  const result = document.getElementById(cfg.result)?.value;
  const list = document.getElementById(cfg.list);
  if (!list || !result) return;
  list.querySelectorAll('.trade-leg-pnl').forEach((input) => {
    const raw = input.value;
    if (raw === '' || raw === '-' || raw === '+' || raw.endsWith(',') || raw.endsWith('.')) return;
    const value = Math.abs(parseMoneyInput(raw));
    if (result === 'SL') input.value = String(-value);
    else if (result === 'TP') input.value = String(value);
  });
}

function recalculateTradeCompositeTotals(form = 'create') {
  const cfg = getTradeCompositeFormConfig(form);
  if (!isTradeCompositeEnabled(form)) return;
  const legs = collectTradePositionLegsFromDom(form);
  const totalPnl = sumLegsPnl(legs);
  const totalLot = sumLegsLotSize(legs);
  const fee = getTradeCommissionCalc({ lotSize: totalLot, grossPnl: totalPnl, form });

  const badgeId = form === 'create' ? 'tradeCompositeBadge' : 'editTradeCompositeBadge';
  const badgeEl = document.getElementById(badgeId);
  if (badgeEl) {
    if (legs.length >= 2) {
      badgeEl.textContent = 'Posición construida';
      badgeEl.hidden = false;
    } else if (legs.length === 1) {
      badgeEl.textContent = 'Entrada única';
      badgeEl.hidden = false;
    } else {
      badgeEl.hidden = true;
      badgeEl.textContent = '';
    }
  }

  const pnlEl = document.getElementById(cfg.pnl);
  if (pnlEl) pnlEl.value = legs.length ? String(Number(totalPnl.toFixed(2))) : '';

  if (form === 'create') {
    const lotEl = document.getElementById('lotSize') || document.getElementById('lotaje');
    if (lotEl) lotEl.value = String(totalLot);
    const pnlNetInput = document.getElementById('pnlNet');
    const commissionInput = document.getElementById('commissionValue');
    if (pnlNetInput) {
      pnlNetInput.value = `${fee.netPnl.toFixed(2)}€`;
      pnlNetInput.classList.remove('trade-profit', 'trade-loss', 'trade-be');
      pnlNetInput.classList.add(
        fee.netPnl > 0 ? 'trade-profit' : fee.netPnl < 0 ? 'trade-loss' : 'trade-be'
      );
    }
    if (commissionInput) commissionInput.value = `${fee.commission.toFixed(2)}€`;
    updateTradeRiskDisplay();
  } else {
    const lotEl = document.getElementById('editLotSize');
    if (lotEl) lotEl.value = String(totalLot);
    const editCommission = document.getElementById('editCommission');
    const editAccountCapital = document.getElementById('editAccountCapital');
    const account = getSelectedAccount('editAccount');
    const accountCapital = account ? Number(account.capital) || 0 : 0;
    if (editCommission) editCommission.value = fee.commission.toFixed(2);
    if (editAccountCapital) editAccountCapital.value = accountCapital.toFixed(2);
  }

  updateCompositeSummaryDom(form, totalPnl, totalLot, fee);
  updateTradeCompositeEmptyHint(form);
}

function updateCompositeSummaryDom(form, totalPnl, totalLot, feePrecomputed = null) {
  const cfg = getTradeCompositeFormConfig(form);
  const summary = document.getElementById(cfg.summary);
  if (!summary) return;
  const fee =
    feePrecomputed ??
    getTradeCommissionCalc({
      lotSize: totalLot,
      grossPnl: totalPnl,
      form,
    });
  const lotTxt = totalLot > 0 ? String(totalLot) : '—';
  const grossTxt = `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}€`;
  const commTxt = `${fee.commission.toFixed(2)}€`;
  const netTxt = `${fee.netPnl >= 0 ? '+' : ''}${fee.netPnl.toFixed(2)}€`;
  summary.textContent = `Lotaje total: ${lotTxt} · PnL bruto: ${grossTxt} · Comisión: ${commTxt} · PnL neto: ${netTxt}`;
}

function appendCompositeFieldsToTradePayload(trade, form = 'create') {
  const composite = isTradeCompositeEnabled(form);
  if (!composite) {
    return { ...trade, is_composite_position: false, position_legs: [] };
  }
  const legs = collectTradePositionLegsFromDom(form);
  console.log('[composite] collected legs', form, legs);
  const validation = validatePositionLegs(legs, { requireAtLeastOne: true });
  if (!validation.valid) return { error: validation.error, trade: null };
  // La comisión y los totales se calculan SOLO con el lotaje de las entradas.
  const totalLot = Number(validation.totalLot ?? 0) || 0;
  const fee = getTradeCommissionCalc({
    lotSize: totalLot,
    grossPnl: validation.totalPnl,
    trade,
    form,
  });
  console.log('[composite] totals before save', {
    form,
    legs: validation.legs.length,
    totalLot,
    grossPnl: validation.totalPnl,
    commission: fee.commission,
    netPnl: fee.netPnl,
  });
  return applyCompositeToTradeFields({
    ...trade,
    is_composite_position: true,
    position_legs: validation.legs,
    pnl: validation.totalPnl,
    lotaje: totalLot,
    lotSize: totalLot,
    commission: fee.commission,
    pnl_net: fee.netPnl,
  });
}

function resetTradeCompositeForm(form = 'create') {
  const cfg = getTradeCompositeFormConfig(form);
  const enabledEl = document.getElementById(cfg.enabled);
  if (enabledEl) enabledEl.checked = false;
  // Por defecto: crear 1 entrada visual.
  renderTradePositionLegsList(form, [createEmptyPositionLeg(1)]);
  syncTradeCompositeSectionVisibility(form);
  recalculateTradeCompositeTotals(form);
}

function ensureTradeCompositeFormListeners() {
  ['create', 'edit'].forEach((form) => {
    const cfg = getTradeCompositeFormConfig(form);
    const enabledEl = document.getElementById(cfg.enabled);
    if (enabledEl && enabledEl.dataset.bound !== 'true') {
      enabledEl.dataset.bound = 'true';
      enabledEl.addEventListener('change', () => syncTradeCompositeSectionVisibility(form));
    }
    const addBtn = document.getElementById(cfg.addBtn);
    if (addBtn && addBtn.dataset.bound !== 'true') {
      addBtn.dataset.bound = 'true';
      addBtn.addEventListener('click', () => {
        const next = [
          ...collectTradePositionLegsFromDom(form),
          createEmptyPositionLeg(collectTradePositionLegsFromDom(form).length + 1),
        ];
        renderTradePositionLegsList(form, next);
        recalculateTradeCompositeTotals(form);
      });
    }
    const resultEl = document.getElementById(cfg.result);
    if (resultEl && resultEl.dataset.compositeBound !== 'true') {
      resultEl.dataset.compositeBound = 'true';
      resultEl.addEventListener('change', () => {
        if (isTradeCompositeEnabled(form)) {
          applyCompositeLegPnlSign(form);
          recalculateTradeCompositeTotals(form);
        } else if (form === 'create') normalizePnlByResult();
        else normalizeEditPnlByResult();
      });
    }
    const accountSelectId = form === 'edit' ? 'editAccount' : 'account';
    const accountEl = document.getElementById(accountSelectId);
    if (accountEl && accountEl.dataset.compositeBound !== 'true') {
      accountEl.dataset.compositeBound = 'true';
      accountEl.addEventListener('change', () => {
        if (form === 'create') updateCreateDerivedFields();
        if (isTradeCompositeEnabled(form)) recalculateTradeCompositeTotals(form);
        else if (form === 'create') recalculateCreateNetPnl();
        else recalculateEditNetPnl();
      });
    }
  });
}

function renderTradeCompositeDetailHtml(trade) {
  const legs = parsePositionLegs(trade.position_legs ?? trade.positionLegs ?? []);
  if (!legs.length) return '';
  const badgeText = legs.length >= 2 ? 'Posición construida' : 'Entrada única';
  const rows = legs
    .map(
      (leg) =>
        `<li><strong>${leg.label}</strong> · Lote: ${leg.lot_size != null ? leg.lot_size : '—'} · PnL: ${leg.pnl >= 0 ? '+' : ''}${Number(leg.pnl).toFixed(2)}€${leg.comment ? ` · ${leg.comment}` : ''}</li>`
    )
    .join('');
  return `<div class="trade-composite-detail"><span class="trade-composite-badge">${badgeText}</span><ul class="trade-composite-legs-detail">${rows}</ul><p class="trade-composite-summary">${formatPositionLegsSummary(legs)}</p></div>`;
}
const {
  calculateBacktestingScheduleDiscipline,
  filterBacktestingTradesForMetrics,
  buildBacktestingStrategyByNameMap,
  getBacktestingReferenceStrategyName,
  classifyBacktestingTrade,
  normalizeTimeField: normalizeBtTimeField,
} = require('./services/backtestingScheduleStats');

ChartJS.register(...registerables);
if (typeof window.Chart === 'undefined') {
  window.Chart = ChartJS;
}
console.log('Chart disponible:', typeof window.Chart);

/** Caché en memoria de listas reales (sincronizada desde localStorage scoped por usuario). */
let realAccountsCache = [];
let realStrategiesCache = [];
let migrateRealDataPromise = null;
let syncRealListsPromise = null;
let loadStrategiesPromise = null;
/** @type {Map<string, { name: string, description: string, schedule_enabled: boolean, operating_hours: object[], client_uuid?: string }>} */
let realStrategiesByName = new Map();

async function getTradesForListRecovery() {
  if (Array.isArray(cachedTrades) && cachedTrades.length) return cachedTrades;
  const backend = getBackendApi();
  if (backend?.getTradesLocal) {
    try {
      const local = await backend.getTradesLocal();
      if (Array.isArray(local) && local.length) return local;
    } catch (err) {
      console.warn('[real-lists] trade recovery load failed:', err);
    }
  }
  return [];
}

function makeClientUuidLocal() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fuente unificada: SQLite + localStorage scoped + nombres en trades → merge sin pérdidas.
 */
async function refreshRealAccountsAndStrategies(userIdArg = null) {
  const userId = userIdArg || (await getCurrentUserIdSafe());
  console.log('Current user id for real lists:', userId);
  if (!userId) {
    realAccountsCache = [];
    realStrategiesCache = [];
    realStrategiesByName = new Map();
    console.log('Refreshing real selects: sin userId');
    return { accounts: [], strategies: [] };
  }

  const backend = getBackendApi();
  const ak = `real_accounts_${userId}`;
  const sk = `real_strategies_${userId}`;

  let sqliteAccounts = [];
  let sqliteStrategies = [];
  if (backend?.getRealAccountsLocal) {
    try {
      const rows = await backend.getRealAccountsLocal();
      sqliteAccounts = mapSqliteAccountRows(rows);
      console.log('Real accounts loaded from SQLite:', sqliteAccounts.length);
    } catch (err) {
      console.warn('Real accounts SQLite load failed:', err);
    }
  }
  if (backend?.getRealStrategiesLocal) {
    try {
      const rows = await backend.getRealStrategiesLocal();
      sqliteStrategies = mapSqliteStrategyRows(rows);
      console.log('Real strategies loaded from SQLite:', sqliteStrategies.length);
    } catch (err) {
      console.warn('Real strategies SQLite load failed:', err);
    }
  }

  let lsAccounts = [];
  let lsStrategies = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ak) || '[]');
    lsAccounts = (Array.isArray(parsed) ? parsed : [])
      .map((row) => normalizeAccount(row))
      .filter((a) => a.name);
  } catch {
    lsAccounts = [];
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(sk) || '[]');
    const arr = Array.isArray(parsed) ? parsed : [];
    lsStrategies = arr
      .map((s) => (typeof s === 'string' ? { name: s } : s))
      .filter((s) => String(s?.name || '').trim());
  } catch {
    lsStrategies = [];
  }

  const trades = await getTradesForListRecovery();
  const deletedAccountsRegistry = await loadDeletedAccountsRegistry();
  const deletedStrategiesRegistry = await loadDeletedStrategiesRegistry();

  console.log('[accounts] before merge count:', realAccountsCache.length);
  let accounts = mergeRealAccounts([], sqliteAccounts);
  accounts = mergeRealAccounts(accounts, lsAccounts);
  accounts = filterActiveAccounts(accounts, deletedAccountsRegistry);
  const rawTradeAccounts = filterRecoverySkipDeleted(
    extractAccountsFromTrades(trades),
    deletedAccountsRegistry
  );
  const { accounts: fromTradesAccounts } = filterTradeRecoveryAccounts(rawTradeAccounts, accounts);
  console.log('[accounts] recovered from trades count:', fromTradesAccounts.length);
  accounts = mergeRealAccounts(accounts, fromTradesAccounts);
  accounts = dedupeRealAccounts(accounts);
  accounts = filterActiveAccounts(accounts, deletedAccountsRegistry);
  console.log('[accounts] after merge count:', accounts.length);

  console.log('[strategies] before merge count:', realStrategiesCache.length);
  let strategyRecords = mergeRealStrategies([], sqliteStrategies);
  strategyRecords = mergeRealStrategies(strategyRecords, lsStrategies);
  strategyRecords = filterActiveStrategies(strategyRecords, deletedStrategiesRegistry);
  const rawTradeStrategies = filterRecoverySkipDeleted(
    extractStrategiesFromTrades(trades),
    deletedStrategiesRegistry
  );
  const { accounts: fromTradesStrategies } = filterTradeRecoveryStrategies(rawTradeStrategies, strategyRecords);
  console.log('[strategies] recovered from trades count:', fromTradesStrategies.length);
  strategyRecords = mergeRealStrategies(strategyRecords, fromTradesStrategies);
  strategyRecords = dedupeRealStrategies(strategyRecords);
  strategyRecords = filterActiveStrategies(strategyRecords, deletedStrategiesRegistry);
  console.log('[strategies] after merge count:', strategyRecords.length);

  realStrategiesByName = buildStrategyByNameMap(strategyRecords);
  const strategies = strategyRecords.map((s) => String(s.name)).filter(Boolean);

  try {
    localStorage.setItem(ak, JSON.stringify(accounts));
    localStorage.setItem(sk, JSON.stringify(strategyRecords));
    console.log('Real accounts saved locally:', accounts.length);
  } catch (err) {
    console.warn('No se pudo guardar real lists en localStorage:', err);
  }

  realAccountsCache = accounts;
  realStrategiesCache = strategies;

  console.log('Refreshing real selects:', { accounts: accounts.length, strategies: strategies.length });
  return { accounts, strategies };
}

async function getCurrentUserIdSafe() {
  if (window.currentUser?.id) return window.currentUser.id;
  if (isOfflineModeActive()) {
    return localStorage.getItem('user_id') || null;
  }
  try {
    const user = await getCurrentUserSafe();
    return user?.id || localStorage.getItem('user_id') || null;
  } catch (err) {
    console.warn('getCurrentUserIdSafe falló, usando localStorage user_id:', err);
    return localStorage.getItem('user_id') || null;
  }
}

/**
 * Clave localStorage para datos privados del usuario.
 * Sin sesión devuelve null (no se usa clave compartida ni "_anonymous" para datos privados).
 */
async function getUserScopedStorageKey(baseKey) {
  const userId = await getCurrentUserIdSafe();
  if (!userId) return null;
  return `${baseKey}_${userId}`;
}

/**
 * Migra claves globales antiguas a claves scoped por usuario.
 * Solo permitido para el propietario histórico; luego limpia claves globales.
 */
async function migrateGlobalRealDataToUserScopedStorage() {
  if (migrateRealDataPromise) return migrateRealDataPromise;

  migrateRealDataPromise = (async () => {
    const user = await getCurrentUserSafe();
    if (!user?.id) return;

    const allowedEmail = 'javilaox@gmail.com';
    if (user.email !== allowedEmail) {
      return;
    }

    const migrationFlag = `real_data_migrated_${user.id}`;
    if (localStorage.getItem(migrationFlag) === 'true') return;

    const pairs = [
      ['accounts', 'real_accounts'],
      ['trading_accounts', 'real_accounts'],
      ['real_accounts', 'real_accounts'],
      ['strategies', 'real_strategies'],
      ['trading_strategies', 'real_strategies'],
      ['real_strategies', 'real_strategies']
    ];

    for (const [oldKey, newBaseKey] of pairs) {
      const oldValue = localStorage.getItem(oldKey);
      if (!oldValue) continue;

      const newKey = `${newBaseKey}_${user.id}`;

      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, oldValue);
      }
    }

    localStorage.removeItem('accounts');
    localStorage.removeItem('trading_accounts');
    localStorage.removeItem('real_accounts');
    localStorage.removeItem('strategies');
    localStorage.removeItem('trading_strategies');
    localStorage.removeItem('real_strategies');

    localStorage.setItem(migrationFlag, 'true');
  })().finally(() => {
    migrateRealDataPromise = null;
  });

  return migrateRealDataPromise;
}

/** Lee localStorage scoped y actualiza realAccountsCache / realStrategiesCache. */
async function syncRealListsFromStorage() {
  if (syncRealListsPromise) {
    console.log('[real-lists] already loading, skip');
    return syncRealListsPromise;
  }

  syncRealListsPromise = (async () => {
    await migrateGlobalRealDataToUserScopedStorage();
    return refreshRealAccountsAndStrategies();
  })().finally(() => {
    syncRealListsPromise = null;
  });

  return syncRealListsPromise;
}

const MODE_KEY = 'mode';

const RECENT_PAIRS_KEY = 'recentPairs';
const MAX_RECENT_PAIRS = 5;
const RECENT_BT_PAIRS_KEY = 'trading_journal_recent_bt_pairs_v1';

/** @type {{ closePanel: () => void; refresh: () => void } | null} */
let assetComboboxState = null;
/** @type {{ closePanel: () => void; refresh: () => void } | null} */
let backtestingAssetComboboxState = null;

console.log('api:', window.api, 'electronAPI:', window.electronAPI);

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedYear = currentYear;
let showWeekend = false;
let currentView = 'dashboard';
let cachedTrades = [];
let cachedBacktestingTrades = [];
let cachedBacktestingSessions = [];
let activeBacktestingSessionId = null;
/** Filtro multisesión vistas Backtesting (`'all'` o ids en string). */
let selectedBacktestingSessionIds = ['all'];
let cachedBacktestingMetrics = [];
let backtestingCurrentMonth = new Date().getMonth();
let backtestingCurrentYear = new Date().getFullYear();
let selectedBacktestingDate = '';
let editingBacktestingTradeId = null;
let btManagementCollapsed = true;
let btResultCollapsed = false;
/** Unidad de riesgo en el modal Nueva/Editar estrategia (`'eur'` | `'percent'`). */
let btStrategyRiskUnit = 'eur';
const BT_EXCLUDE_SCHEDULE_KEY_PREFIX = 'bt_exclude_out_of_schedule';

/**
 * Ajustes de backtesting (estrategias, cuentas, pares y sesiones).
 *
 * OJO: arranca con las listas vacías, así que guardar ANTES de haberlos cargado escribiría
 * listas vacías en Supabase y borraría las estrategias del usuario. Por eso existe la bandera
 * de abajo: mientras no se hayan cargado con éxito, no se permite guardar.
 */
/** Estado inicial de la configuración de backtesting; también es a lo que se vuelve al salir. */
function emptyBacktestingSettings() {
  return {
    challenge_config: null,
    accounts: [],
    strategies: [],
    assets: [],
    sessions: [],
    default_account: '',
    default_strategy: '',
    default_asset: '',
    default_risk: 100,
    default_rr: 2,
  };
}

let backtestingSettingsLoaded = false;
let backtestingSettings = emptyBacktestingSettings();

/** Filtros dashboard multiselect (solo vista; datos completos en cachedTrades). */
let selectedDashboardAccounts = new Set(['ALL']);
let selectedDashboardStrategies = new Set(['ALL']);
// Filtro por tipo de cuenta (Challenge / Fondeada / Capital propio). Se guardan los valores
// internos ('challenge', 'funded', 'own_capital') y se muestran sus etiquetas traducidas.
let selectedDashboardAccountTypes = new Set(['ALL']);

/** @type {{ client_uuid: string|null, remote_id: string|null, id: string|number|null, originalName: string|null } | null} */
let accountModalIdentity = null;
/** @type {{ client_uuid: string|null, remote_id: string|null, id: string|number|null, originalName: string|null } | null} */
let strategyModalIdentity = null;
/** @type {number | null} */
let editingBtMetricId = null;
let kpiExpandedChartInstance = null;
let activeKPIType = null;
let createBeforeImagePath = '';
let createAfterImagePath = '';
let editBeforeImagePath = '';
let editAfterImagePath = '';
// Capturas del trade de backtesting en edición/creación (mismo patrón que los trades reales).
let btBeforeImagePath = '';
let btAfterImagePath = '';
let tradeDatepickerRoot = null;
// Todas las instancias del datepicker personalizado (Nuevo trade, Retiro, Gasto...). Antes solo
// se guardaba la última en tradeDatepickerRoot, así que al montar varias no se podían cerrar bien.
const customDatepickerRoots = new Set();
let activeDayModalIsoDate = '';
let deletingTradeInProgress = false;
let activeTradePanelDate = '';
let lastDeletedTrade = null;
let undoToastTimer = null;
const NEW_TRADE_DATE_KEY = 'newTradeDate';

const MONTH_I18N_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];

const WEEKDAY_ORDER_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DOW_INITIAL_KEYS = ['dow_mon', 'dow_tue', 'dow_wed', 'dow_thu', 'dow_fri', 'dow_sat', 'dow_sun'];

function getDashboardFilteredTrades() {
  const source = Array.isArray(window.cachedTrades) ? window.cachedTrades : cachedTrades;
  if (!Array.isArray(source)) return [];

  const allAccounts = selectedDashboardAccounts.has('ALL') || selectedDashboardAccounts.size === 0;
  const allStrategies = selectedDashboardStrategies.has('ALL') || selectedDashboardStrategies.size === 0;
  const allTypes = selectedDashboardAccountTypes.has('ALL') || selectedDashboardAccountTypes.size === 0;

  // Nombres de cuenta que cumplen el filtro de tipo (los trades guardan el nombre, no el tipo).
  const namesMatchingType = allTypes
    ? null
    : new Set(
        (typeof getAccounts === 'function' ? getAccounts() : [])
          .filter((acc) => selectedDashboardAccountTypes.has(String(acc.account_type || '')))
          .map((acc) => acc.name)
      );

  return source.filter((trade) => {
    const accountValue = trade.account || '';
    const strategyValue = trade.strategy || '';

    const accountOk = allAccounts || selectedDashboardAccounts.has(accountValue);
    const strategyOk = allStrategies || selectedDashboardStrategies.has(strategyValue);
    const typeOk = allTypes || namesMatchingType.has(accountValue);

    return accountOk && strategyOk && typeOk;
  });
}

function escapeHtmlChipText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttrChip(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function pruneDashboardFilterSelections(accounts, strategies) {
  if (selectedDashboardAccounts.has('ALL')) {
    selectedDashboardAccounts = new Set(['ALL']);
  } else {
    const filtered = [...selectedDashboardAccounts].filter((x) => accounts.includes(x));
    selectedDashboardAccounts = filtered.length ? new Set(filtered) : new Set(['ALL']);
  }
  if (selectedDashboardStrategies.has('ALL')) {
    selectedDashboardStrategies = new Set(['ALL']);
  } else {
    const filtered = [...selectedDashboardStrategies].filter((x) => strategies.includes(x));
    selectedDashboardStrategies = filtered.length ? new Set(filtered) : new Set(['ALL']);
  }
}

function createDashboardMultiSelect(containerId, options, selectedSet, allLabel, onChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.classList.add('dashboard-multiselect');

  // Las opciones pueden ser strings (valor = etiqueta) o {value,label}, necesario para el filtro
  // por tipo de cuenta, donde el valor interno ('funded') no es lo que se muestra ('Fondeada').
  const items = (options || []).map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : { value: opt.value, label: opt.label }
  );

  const isAll = selectedSet.has('ALL') || selectedSet.size === 0;

  const selectedLabels = isAll
    ? escapeHtmlChipText(allLabel)
    : items
        .filter((opt) => selectedSet.has(opt.value))
        .map((opt) => escapeHtmlChipText(opt.label))
        .join(', ');

  container.innerHTML = `
    <button type="button" class="dashboard-multiselect-trigger">
      <span>${selectedLabels || escapeHtmlChipText(allLabel)}</span>
      <span class="dashboard-multiselect-arrow">▾</span>
    </button>
    <div class="dashboard-multiselect-menu">
      <label class="dashboard-multiselect-option">
        <input type="checkbox" value="ALL" ${isAll ? 'checked' : ''}>
        <span>${escapeHtmlChipText(allLabel)}</span>
      </label>
      ${items
        .map(
          (opt) => `
      <label class="dashboard-multiselect-option">
        <input type="checkbox" value="${escapeAttrChip(opt.value)}" ${!isAll && selectedSet.has(opt.value) ? 'checked' : ''}>
        <span>${escapeHtmlChipText(opt.label)}</span>
      </label>`
        )
        .join('')}
    </div>
  `;

  const trigger = container.querySelector('.dashboard-multiselect-trigger');
  const menu = container.querySelector('.dashboard-multiselect-menu');

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();

    document.querySelectorAll('.dashboard-multiselect.open').forEach((el) => {
      if (el !== container) el.classList.remove('open');
    });

    container.classList.toggle('open');
  });

  menu?.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const value = checkbox.value;

      if (value === 'ALL') {
        if (checkbox.checked) {
          selectedSet.clear();
          selectedSet.add('ALL');
        } else {
          selectedSet.delete('ALL');
          if (selectedSet.size === 0) {
            selectedSet.add('ALL');
          }
        }
      } else {
        selectedSet.delete('ALL');

        if (checkbox.checked) {
          selectedSet.add(value);
        } else {
          selectedSet.delete(value);
        }

        if (selectedSet.size === 0) {
          selectedSet.add('ALL');
        }
      }

      onChange?.();
    });
  });
}

async function renderDashboardFilters(trades = cachedTrades) {
  const accountMulti = document.getElementById('dashboardAccountMulti');
  const strategyMulti = document.getElementById('dashboardStrategyMulti');

  if (!accountMulti || !strategyMulti) return;

  await syncRealListsFromStorage();

  // Solo cuentas/estrategias configuradas por el usuario actual (localStorage scoped).
  const allAccountObjects = typeof getAccounts === 'function' ? getAccounts() : [];

  // El filtro por tipo acota la lista de cuentas: si eliges "Fondeada", el desplegable de
  // Cuenta solo ofrece las fondeadas, para no poder combinar filtros que no devuelven nada.
  const allTypes = selectedDashboardAccountTypes.has('ALL') || selectedDashboardAccountTypes.size === 0;
  const accountsMatchingType = allAccountObjects.filter(
    (acc) => allTypes || selectedDashboardAccountTypes.has(String(acc.account_type || ''))
  );

  const configuredAccounts = accountsMatchingType.map((acc) => acc.name).filter(Boolean);
  const accounts = [...new Set(configuredAccounts)].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );

  const configuredStrategies = realStrategiesCache.filter(Boolean);
  const strategies = [...new Set(configuredStrategies)].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );

  pruneDashboardFilterSelections(accounts, strategies);

  // Solo se ofrecen los tipos que el usuario realmente usa en sus cuentas.
  const usedTypes = ['challenge', 'funded', 'own_capital'].filter((type) =>
    allAccountObjects.some((acc) => String(acc.account_type || '') === type)
  );
  createDashboardMultiSelect(
    'dashboardAccountTypeMulti',
    usedTypes.map((value) => ({ value, label: getAccountTypeLabel(value) })),
    selectedDashboardAccountTypes,
    t('filter_all_account_types', 'Todos los tipos'),
    () => {
      void renderDashboardFilters(cachedTrades).then(() => renderDashboardWithFilters());
    }
  );

  createDashboardMultiSelect(
    'dashboardAccountMulti',
    accounts,
    selectedDashboardAccounts,
    t('filter_all_accounts', 'Todas las cuentas'),
    () => {
      void renderDashboardFilters(cachedTrades).then(() => renderDashboardWithFilters());
    }
  );

  createDashboardMultiSelect(
    'dashboardStrategyMulti',
    strategies,
    selectedDashboardStrategies,
    t('filter_all_strategies', 'Todas las estrategias'),
    () => {
      void renderDashboardFilters(cachedTrades).then(() => renderDashboardWithFilters());
    }
  );
}

function renderDashboardWithFilters(options = {}) {
  const skipCalendar = options.skipCalendar === true;
  const filteredTrades = getDashboardFilteredTrades();

  updateDashboardMetrics(filteredTrades, { withKpi: false });
  updateKpiCards(filteredTrades, currentMonth, currentYear);
  renderTradeList(filteredTrades);

  if (!skipCalendar) {
    renderCalendar(currentYear, currentMonth, true, filteredTrades).catch((err) => console.error(err));
  }

  if (activeKPIType) {
    renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, filteredTrades);
  }

  initDashboardReturnModeControl();
}

function renderDashboardAccountFilter(trades = cachedTrades) {
  void renderDashboardFilters(trades);
}

function renderDashboardWithAccountFilter(options = {}) {
  renderDashboardWithFilters(options);
}

function renderTradeList(trades) {
  const list = document.getElementById('tradeList');
  if (!list) return;
  list.innerHTML = '';

  const safe = Array.isArray(trades) ? trades : [];
  safe.forEach((trade) => {
    const li = document.createElement('li');
    li.className = 'trade-item trade-clickable';
    li.dataset.id = String(trade.id);

    const date = document.createElement('span');
    date.className = 'pill trade-date';
    date.textContent = formatDateToDisplay((trade.date || '').slice(0, 10));

    const asset = document.createElement('span');
    asset.className = 'pill trade-asset';
    asset.textContent = trade.asset || '-';

    const pnl = document.createElement('span');
    const pnlValue = getTradeRealPnl(trade);
    pnl.className = `pill trade-pnl ${pnlValue > 0 ? 'trade-profit' : pnlValue < 0 ? 'trade-loss' : 'trade-be'}`;
    pnl.textContent = `${pnlValue > 0 ? '+' : ''}${pnlValue.toFixed(2)}€`;

    const result = document.createElement('span');
    const resultValue = trade.result || 'BE';
    const resultClass = resultValue === 'TP' ? 'trade-profit' : resultValue === 'SL' ? 'trade-loss' : 'trade-be';
    result.className = `pill ${resultClass}`;
    result.textContent = resultValue;

    li.appendChild(date);
    li.appendChild(asset);
    li.appendChild(pnl);
    li.appendChild(result);

    if (isCompositePositionFlag(trade.is_composite_position)) {
      const badge = document.createElement('span');
      badge.className = 'trade-composite-badge';
      badge.textContent = 'Posición construida';
      li.appendChild(badge);
    }

    if (Number(trade.commission) > 0) {
      const meta = document.createElement('span');
      meta.className = 'meta-line';
      meta.textContent = `${t('commission_line')}: ${Number(trade.commission).toFixed(2)}€`;
      li.appendChild(meta);
    }

    if (isCompositePositionFlag(trade.is_composite_position)) {
      const legsMeta = document.createElement('span');
      legsMeta.className = 'meta-line';
      legsMeta.textContent = formatPositionLegsSummary(trade.position_legs);
      li.appendChild(legsMeta);
    }

    li.addEventListener('click', () => openTradeForEdit(trade.id));
    list.appendChild(li);
  });
}

function formatMonthYear(year, monthIndex) {
  const key = MONTH_I18N_KEYS[monthIndex];
  return key ? `${t(key)} ${year}` : `${year}`;
}

function getCalendarWeekdayLabels(includeWeekend) {
  const base = WEEKDAY_ORDER_KEYS.map((k) => t(k));
  return includeWeekend ? base : base.slice(0, 5);
}

function formatDateToDisplay(dateStr) {
  return formatDateEs(dateStr);
}

/** Clave de mes 'AAAA-MM' → 'MM-AAAA', coherente con el formato DD-MM-AAAA del resto de la app. */
function formatMonthKeyDisplay(monthKey) {
  const s = String(monthKey || '').trim();
  const match = /^(\d{4})-(\d{2})$/.exec(s);
  return match ? `${match[2]}-${match[1]}` : s;
}

function formatDateToISO(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) return dateStr;
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`;
}

/** Display DD-MM-YYYY; vacío → '' (p. ej. ejes de gráficos). */
function formatDate(dateInput) {
  if (!dateInput) return '';
  const s = formatDateEs(dateInput);
  return s === '—' ? '' : s;
}

function toInputDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) return dateStr;
  const [day, month, year] = dateStr.split('-');
  if (day && month && year) return `${year}-${month}-${day}`;
  return '';
}

function getBackendApi() {
  return window.api || window.electronAPI;
}

/** Id de usuario alineado con RLS (JWT en main vía IPC). */
async function getCurrentSupabaseUser() {
  const id = await getCurrentUserId();
  return id ? { id } : null;
}

async function getCurrentUserId() {
  const api = getBackendApi();
  if (api && typeof api.getCurrentUserId === 'function') {
    const id = await api.getCurrentUserId();
    if (id) return id;
  }
  return localStorage.getItem('user_id') || null;
}

async function syncSupabaseSessionWithMain() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session) {
    console.warn('⚠️ No hay sesión Supabase para sincronizar con main');
    return false;
  }

  const api = getBackendApi();

  if (api?.setSupabaseSession) {
    const result = await api.setSupabaseSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

    if (!result?.success) {
      console.error('❌ No se pudo sincronizar sesión Supabase con main:', result);
      return false;
    }
  }

  if (session.user?.id && window.electronAPI?.setUserId) {
    await window.electronAPI.setUserId(session.user.id);
  }

  return true;
}

function getCurrentTheme() {
  return document.body.classList.contains('light') ? 'light' : 'dark';
}

function getChartGridColor() {
  return getCurrentTheme() === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
}

function updateThemeIcon() {
  const host = document.getElementById('themeIcon');
  if (!host) return;
  const isLight = document.body.classList.contains('light');
  const iconName = isLight ? 'sun' : 'moon';
  host.innerHTML = `<i data-lucide="${iconName}" aria-hidden="true"></i>`;
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/* ============================ Exportar a Excel / PDF ============================ */

/**
 * Monta el par de botones «Excel» / «PDF» dentro de un contenedor.
 *
 * `buildReport` se llama en el momento de exportar (no al montar) para que el informe salga
 * siempre con los filtros que hay puestos en ese instante.
 */
function mountExportButtons(container, id, buildReport) {
  if (!container || document.getElementById(id)) return;

  const group = document.createElement('div');
  group.className = 'export-group';
  group.id = id;
  group.innerHTML = `
    <span class="export-group-label">${t('export_label', 'Exportar')}</span>
    <button type="button" class="button button-cancel export-btn" data-format="xlsx">
      <i data-lucide="sheet"></i><span>Excel</span>
    </button>
    <button type="button" class="button button-cancel export-btn" data-format="pdf">
      <i data-lucide="file-text"></i><span>PDF</span>
    </button>`;

  group.querySelectorAll('.export-btn').forEach((btn) => {
    btn.addEventListener('click', () => runExport(buildReport, btn.dataset.format, group));
  });

  container.appendChild(group);
  void refreshLucideIcons();
}

async function runExport(buildReport, format, group) {
  const backend = getBackendApi();
  if (!backend?.exportReport) {
    showToast(t('export_unavailable', 'La exportación no está disponible'), 'error');
    return;
  }

  let report;
  try {
    report = await buildReport();
  } catch (err) {
    console.error('❌ Error construyendo el informe:', err);
    showToast(t('export_error', 'No se pudo generar el informe'), 'error');
    return;
  }

  const totalRows = (report?.sheets || []).reduce((n, s) => n + (s.rows?.length || 0), 0);
  if (!totalRows) {
    showToast(t('export_empty', 'No hay datos que exportar con los filtros actuales'), 'warning');
    return;
  }

  group?.classList.add('is-busy');
  try {
    const result = await backend.exportReport(report, format);
    if (result?.cancelled) return;
    if (!result?.success) {
      console.error('❌ Error exportando:', result?.error);
      showToast(t('export_error', 'No se pudo generar el informe'), 'error');
      return;
    }
    showToast(t('export_done', 'Informe guardado'), 'success');
    // Abrirlo directamente ahorra ir a buscarlo a la carpeta.
    await backend.openExportedFile?.(result.path);
  } finally {
    group?.classList.remove('is-busy');
  }
}

/** Etiqueta legible de un multiselect del dashboard (Sets con 'ALL' = sin filtrar). */
function describeSelection(set, allLabel) {
  if (!set || set.has('ALL') || set.size === 0) return allLabel;
  return [...set].join(', ');
}

function buildManagementExportReport() {
  return buildManagementReport({
    withdrawals: getFilteredWithdrawalsList(),
    expenses: getFilteredExpensesList(),
    filters: {
      'Prop (retiros)': document.getElementById('withdrawalFilterAccount')?.value || 'Todas',
      'Prop (gastos)': document.getElementById('expenseFilterAccount')?.value || 'Todas',
      Desde: formatDateEs(document.getElementById('withdrawalFilterFrom')?.value || ''),
      Hasta: formatDateEs(document.getElementById('withdrawalFilterTo')?.value || ''),
    },
  });
}

function buildTradesExportReport() {
  return buildTradesReport({
    trades: getDashboardFilteredTrades(),
    filters: {
      'Tipo de cuenta': describeSelection(selectedDashboardAccountTypes, 'Todos'),
      Cuenta: describeSelection(selectedDashboardAccounts, 'Todas'),
      Estrategia: describeSelection(selectedDashboardStrategies, 'Todas'),
    },
  });
}

function buildBacktestingExportReport() {
  const trades = getFilteredBacktestingTrades();
  const visibleSessionIds = new Set(trades.map((t) => String(t.session_id)));
  const sessions = (cachedBacktestingSessions || []).filter(
    (s) => selectedBacktestingSessionIds.includes('all') || visibleSessionIds.has(String(s.id))
  );
  const sessionLabel = selectedBacktestingSessionIds.includes('all')
    ? 'Todas'
    : sessions.map((s) => s.name).join(', ') || 'Ninguna';

  return buildBacktestingReport({
    trades,
    sessions,
    filters: { Sesión: sessionLabel },
  });
}

/**
 * Barra de título integrada en el tema (solo Windows).
 *
 * El proceso principal oculta la barra nativa blanca (`titleBarStyle: 'hidden'`) pero mantiene
 * los botones minimizar/maximizar/cerrar, que Windows dibuja encima del contenido en la esquina
 * superior derecha. A cambio, la web ocupa también esos primeros píxeles, así que aquí hay que:
 *   1) crear una franja superior que sea la zona de arrastre de la ventana, y
 *   2) bajar el contenido esa misma altura para que nada quede debajo.
 *
 * Se hace por JS y no en cada HTML porque la app tiene varias páginas (login, dashboard,
 * estadísticas...) y así hay una sola implementación en vez de copiar el CSS en cada una.
 */
const APP_TITLEBAR_HEIGHT = 32;

/* --- Color de los botones de la ventana ---------------------------------------------------
 * Windows pinta minimizar/maximizar/cerrar sobre un rectángulo del color que le indiquemos.
 * Si ese color no coincide con lo que hay debajo, se ve un recuadro. Y no basta con fijarlo
 * una vez: al abrir un modal, el fondo se oscurece con una capa translúcida y el rectángulo
 * pasa a cantar. Por eso se recalcula el color real cada vez que cambia el estado de la
 * interfaz, mezclando el fondo de la app con la capa del modal si la hay.
 */

const OVERLAY_SELECTORS = '.modal-overlay, .app-modal-overlay, .image-viewer-overlay';

function parseCssColor(value) {
  const raw = String(value || '').trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(raw);
  if (rgb) {
    const parts = rgb[1].split(',').map((p) => Number(p.trim()));
    if (parts.length >= 3 && parts.every((p) => Number.isFinite(p))) {
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] == null ? 1 : parts[3] };
    }
  }
  return null;
}

const toHexColor = ({ r, g, b }) =>
  `#${[r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`;

/** Mezcla `top` (con alfa) sobre `base`. */
const blendColors = (top, base) => ({
  r: top.r * top.a + base.r * (1 - top.a),
  g: top.g * top.a + base.g * (1 - top.a),
  b: top.b * top.a + base.b * (1 - top.a),
  a: 1,
});

/** Luminancia relativa aproximada, para decidir si los iconos van claros u oscuros. */
const isLightColor = ({ r, g, b }) => (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;

function findVisibleOverlay() {
  return (
    [...document.querySelectorAll(OVERLAY_SELECTORS)].find((el) => {
      if (el.hidden || el.classList.contains('hidden')) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) > 0.05;
    }) || null
  );
}

function syncTitleBarOverlayColor() {
  if (!document.body.classList.contains('overlay-titlebar')) return;

  const styles = getComputedStyle(document.body);
  const base =
    parseCssColor(styles.getPropertyValue('--bg')) ||
    (document.body.classList.contains('light')
      ? { r: 246, g: 248, b: 251, a: 1 }
      : { r: 15, g: 23, b: 42, a: 1 });

  let color = base;
  const overlay = findVisibleOverlay();
  if (overlay) {
    const layer = parseCssColor(getComputedStyle(overlay).backgroundColor);
    if (layer && layer.a > 0) color = blendColors(layer, base);
  }

  try {
    getBackendApi()?.setTitleBarTheme?.({
      color: toHexColor(color),
      symbolColor: isLightColor(color) ? '#0f172a' : '#e2e8f0',
    });
  } catch (_err) {
    /* Fuera de Windows no existe: no es crítico. */
  }
}

/**
 * Vigila los cambios de la interfaz para recolorear la barra. Se agrupan con requestAnimationFrame
 * porque abrir un modal dispara muchas mutaciones seguidas y no hace falta llamar al proceso
 * principal en cada una.
 */
function watchTitleBarOverlayColor() {
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      syncTitleBarOverlayColor();
    });
  };

  new MutationObserver(schedule).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });

  schedule();
}

function setupIntegratedTitleBar() {
  // Se detecta por user agent y no por el preload: el preload va empaquetado por webpack y
  // `process.platform` puede no llegar al renderer, con lo que esto no se activaría nunca.
  if (!/Windows/i.test(navigator.userAgent)) return;
  if (document.body.classList.contains('overlay-titlebar')) return;
  document.body.classList.add('overlay-titlebar');

  if (!document.getElementById('appTitlebarStyles')) {
    const style = document.createElement('style');
    style.id = 'appTitlebarStyles';
    style.textContent = `
      body.overlay-titlebar { --titlebar-h: ${APP_TITLEBAR_HEIGHT}px; }
      /* Transparente a propósito: así la barra lateral conserva su color a la izquierda y el
         contenido el suyo a la derecha, sin una banda de un tercer color cruzando la ventana. */
      body.overlay-titlebar .app-titlebar-drag {
        position: fixed; top: 0; left: 0; right: 0;
        height: var(--titlebar-h);
        z-index: 40;
        background: transparent;
        -webkit-app-region: drag;
      }
      /* Hueco sin arrastre donde Windows pinta los botones de la ventana, para no comerse sus clics. */
      body.overlay-titlebar .app-titlebar-drag::after {
        content: ''; position: absolute; top: 0; right: 0;
        width: 150px; height: 100%;
        -webkit-app-region: no-drag;
      }
      body.overlay-titlebar .sidebar { padding-top: calc(12px + var(--titlebar-h)); }
      body.overlay-titlebar .sidebar.closed,
      body.overlay-titlebar .sidebar.collapsed { padding-top: calc(14px + var(--titlebar-h)); }
      body.overlay-titlebar .main-content { padding-top: calc(var(--page-padding-y, 24px) + var(--titlebar-h)); }
      /* Paneles laterales anclados arriba a la derecha (p. ej. «Trades del día»): arrancan por
         debajo de la franja en vez de meterse bajo los botones de la ventana. Así detrás de los
         botones queda siempre el fondo de la app, que es justo el color del overlay, y no el
         panel, que tiene otro color y hacía que los botones se vieran recortados encima. */
      body.overlay-titlebar .trade-panel {
        top: var(--titlebar-h);
        height: calc(100% - var(--titlebar-h));
      }
      /* Páginas sin .main-content (p. ej. el login): basta con separar el contenido de la franja. */
      body.overlay-titlebar > *:not(.app-titlebar-drag):not(.sidebar):not(.main-content):first-of-type {
        margin-top: var(--titlebar-h);
      }
    `;
    document.head.appendChild(style);
  }

  if (!document.querySelector('.app-titlebar-drag')) {
    const strip = document.createElement('div');
    strip.className = 'app-titlebar-drag';
    strip.setAttribute('aria-hidden', 'true');
    document.body.prepend(strip);
  }

  watchTitleBarOverlayColor();
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light', isLight);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.checked = isLight;
  updateThemeIcon();
  // La barra de título de Windows está integrada en el tema: hay que recolorearla también,
  // porque el proceso principal la pinta y no ve las clases CSS del renderer.
  syncTitleBarOverlayColor();
}

function toggleTheme() {
  const nextTheme = getCurrentTheme() === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', nextTheme);
  applyTheme(nextTheme);
  if (activeKPIType) renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, getDashboardFilteredTrades());
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
  const iconByType = { success: '✓', error: '✕', warning: '!', info: 'i' };
  const titleByType = {
    success: t('toast_ok', 'OK'),
    error: t('toast_error', 'ERROR'),
    warning: t('warning', 'WARNING'),
    info: t('info', 'INFO')
  };

  while (container.children.length >= 3) {
    container.firstElementChild?.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${safeType}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${iconByType[safeType]}</span>
    <span class="toast-title">${titleByType[safeType]}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Diálogo de confirmación con el estilo global de modales (sustituye confirm()).
 * @returns {Promise<boolean>}
 */
function showConfirmModal({
  title = 'Confirmar acción',
  message = '',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-modal-overlay active';
    overlay.style.zIndex = '10050';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'modal app-modal app-confirm-modal';

    const header = document.createElement('div');
    header.className = 'modal-header app-modal-header';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close app-modal-close';
    closeBtn.setAttribute('data-cancel', '');
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '×';
    header.append(h2, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body app-modal-body';
    const p = document.createElement('p');
    p.className = 'confirm-message';
    p.textContent = message;
    body.appendChild(p);

    const footer = document.createElement('div');
    footer.className = 'modal-footer app-modal-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.setAttribute('data-cancel', '');
    cancelBtn.textContent = cancelText;
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = danger ? 'btn-danger' : 'btn-primary';
    confirmBtn.setAttribute('data-confirm', '');
    confirmBtn.textContent = confirmText;
    footer.append(cancelBtn, confirmBtn);

    modal.append(header, body, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => finish(false));
    });
    overlay.querySelector('[data-confirm]')?.addEventListener('click', () => finish(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });
  });
}

/** Variante de showConfirmModal con más de dos salidas posibles (p. ej. al borrar una Prop que
 * ya tiene retiros/gastos asignados: "borrar también sus movimientos" / "mantener movimientos
 * (desvincular)" / cancelar). Cada choice = { value, label, danger? }; resuelve con choice.value
 * o null si se cancela/cierra. */
function showChoiceModal({ title = 'Elige una opción', message = '', choices = [], cancelText = 'Cancelar' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-modal-overlay active';
    overlay.style.zIndex = '10050';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'modal app-modal app-confirm-modal';

    const header = document.createElement('div');
    header.className = 'modal-header app-modal-header';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close app-modal-close';
    closeBtn.setAttribute('data-cancel', '');
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '×';
    header.append(h2, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body app-modal-body';
    if (message) {
      const p = document.createElement('p');
      p.className = 'confirm-message';
      p.textContent = message;
      body.appendChild(p);
    }

    const footer = document.createElement('div');
    footer.className = 'modal-footer app-modal-footer';
    footer.style.flexWrap = 'wrap';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.setAttribute('data-cancel', '');
    cancelBtn.textContent = cancelText;
    footer.appendChild(cancelBtn);
    choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = choice.danger ? 'btn-danger' : 'btn-primary';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => finish(choice.value));
      footer.appendChild(btn);
    });

    modal.append(header, body, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => finish(null));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(null);
    });
  });
}

/**
 * Confirmación simple para eliminar cuenta/estrategia (checkbox).
 * @returns {Promise<boolean>}
 */
function showSecureDeleteModal({
  title = 'Confirmar eliminación',
  entityName = '',
  mainText = '',
  statsLines = [],
  hasAssociatedData = false,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-modal-overlay active';
    overlay.style.zIndex = '10060';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'modal app-modal app-confirm-modal';

    const header = document.createElement('div');
    header.className = 'modal-header app-modal-header';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close app-modal-close';
    closeBtn.setAttribute('data-cancel', '');
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '×';
    header.append(h2, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body app-modal-body';
    const intro = document.createElement('p');
    intro.className = 'confirm-message';
    intro.textContent = mainText;
    body.appendChild(intro);

    if (entityName || statsLines.length) {
      const stats = document.createElement('div');
      stats.className = 'secure-delete-stats';
      if (entityName) {
        const nameLine = document.createElement('div');
        nameLine.innerHTML = `Nombre: <strong>${escapeHtmlChipText(entityName)}</strong>`;
        stats.appendChild(nameLine);
      }
      statsLines.forEach((line) => {
        const row = document.createElement('div');
        row.innerHTML = line;
        stats.appendChild(row);
      });
      body.appendChild(stats);
    }

    if (hasAssociatedData) {
      const hint = document.createElement('p');
      hint.className = 'secure-delete-hint';
      hint.textContent = t(
        'confirm_delete_has_data_hint',
        'Tiene datos asociados. Los trades históricos se conservan.'
      );
      body.appendChild(hint);
    }

    const secureField = document.createElement('div');
    secureField.className = 'secure-delete-field';
    const checkLabel = document.createElement('label');
    checkLabel.className = 'secure-delete-ack';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'secure-delete-ack-input';
    const checkText = document.createElement('span');
    checkText.className = 'secure-delete-ack-text';
    checkText.textContent = t(
      'confirm_delete_understand_card',
      'Entiendo que esta acción ocultará este elemento, pero no borrará los trades históricos.'
    );
    checkLabel.append(check, checkText);
    secureField.appendChild(checkLabel);
    body.appendChild(secureField);

    const footer = document.createElement('div');
    footer.className = 'modal-footer app-modal-footer';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.setAttribute('data-cancel', '');
    cancelBtn.textContent = cancelText;
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn-danger';
    confirmBtn.setAttribute('data-confirm', '');
    confirmBtn.textContent = confirmText;
    confirmBtn.disabled = true;
    footer.append(cancelBtn, confirmBtn);

    check.addEventListener('change', () => {
      confirmBtn.disabled = !check.checked;
    });

    modal.append(header, body, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => finish(false));
    });
    confirmBtn.addEventListener('click', () => {
      if (!confirmBtn.disabled) finish(true);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(false);
    });
  });
}

function showEntityModalOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.add('active');
  overlay.removeAttribute('hidden');
}

function hideEntityModalOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.remove('active');
}

function refreshLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function closeAllCustomSelects(exceptElement = null) {
  document.querySelectorAll('.custom-select.open').forEach((select) => {
    if (!exceptElement || select !== exceptElement) {
      select.classList.remove('open');
    }
  });
}

function closeTradeDatepicker() {
  if (tradeDatepickerRoot) {
    tradeDatepickerRoot.classList.remove('open');
  }
  customDatepickerRoots.forEach((root) => {
    root.classList.remove('open');
    // Mientras está abierto, el popup vive colgado del <body> (ver openPopup): al cerrar hay
    // que devolverlo a su contenedor.
    root.restoreDatepickerPopup?.();
  });
}

/** Refresca la etiqueta del datepicker asociado a un input tras asignarle .value por JS. */
function syncCustomDatepicker(inputId) {
  const input = document.getElementById(inputId);
  const custom = input?.nextElementSibling;
  if (custom?.classList?.contains('custom-datepicker')) {
    custom.syncDatepickerFromNative?.();
  }
}

function formatIsoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIsoDate(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month: month - 1, day };
}

// Acepta un id o directamente el elemento (mismo motivo que en initTradeTimepicker).
function initTradeDatepicker(inputIdOrEl = 'date') {
  const nativeInput =
    typeof inputIdOrEl === 'string' ? document.getElementById(inputIdOrEl) : inputIdOrEl;
  if (!nativeInput || nativeInput.dataset.customDatepickerBound === 'true') return;

  nativeInput.dataset.customDatepickerBound = 'true';
  nativeInput.classList.add('native-date-hidden');

  const custom = document.createElement('div');
  custom.className = 'custom-datepicker';
  custom.innerHTML = `
    <div class="datepicker-trigger">
      <input type="text" class="datepicker-trigger-input" inputmode="numeric" autocomplete="off"
             placeholder="DD-MM-AAAA" maxlength="10" />
      <span class="datepicker-trigger-arrow">v</span>
    </div>
    <div class="datepicker-popup">
      <div class="datepicker-header">
        <button type="button" class="datepicker-nav-btn prev-month"><</button>
        <span class="datepicker-month-label"></span>
        <button type="button" class="datepicker-nav-btn next-month">></button>
      </div>
      <div class="datepicker-weekdays"></div>
      <div class="datepicker-days"></div>
      <div class="datepicker-actions">
        <button type="button" class="datepicker-action-btn today-btn"></button>
        <button type="button" class="datepicker-action-btn clear-btn"></button>
      </div>
    </div>
  `;
  nativeInput.insertAdjacentElement('afterend', custom);
  tradeDatepickerRoot = custom;
  customDatepickerRoots.add(custom);

  const trigger = custom.querySelector('.datepicker-trigger');
  const triggerInput = custom.querySelector('.datepicker-trigger-input');
  const popup = custom.querySelector('.datepicker-popup');
  const monthLabel = custom.querySelector('.datepicker-month-label');
  const weekdaysRow = custom.querySelector('.datepicker-weekdays');
  const daysGrid = custom.querySelector('.datepicker-days');
  const prevBtn = custom.querySelector('.prev-month');
  const nextBtn = custom.querySelector('.next-month');
  const todayBtn = custom.querySelector('.today-btn');
  const clearBtn = custom.querySelector('.clear-btn');

  const weekdayNames = DOW_INITIAL_KEYS.map((k) => t(k));
  weekdaysRow.innerHTML = weekdayNames.map((name) => `<span>${name}</span>`).join('');

  const today = new Date();
  const state = {
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth()
  };

  const syncLabel = () => {
    const value = nativeInput.value || '';
    // No pisar lo que el usuario está tecleando: solo refrescamos si no tiene el foco.
    if (document.activeElement !== triggerInput) {
      triggerInput.value = value ? formatDateToDisplay(value) : '';
    }
    triggerInput.placeholder = t('date_format_placeholder', 'DD-MM-AAAA');
    custom.classList.toggle('has-value', Boolean(value));
  };

  /**
   * Interpreta lo tecleado como DD-MM-AAAA (también admite DD/MM/AAAA y sin separadores) y
   * devuelve la fecha en ISO, o '' si no es una fecha válida real (valida días por mes y bisiestos).
   */
  const parseTypedDate = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length !== 8) return '';
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    if (!day || !month || !year || month > 12) return '';
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return '';
    return formatIsoDate(year, month - 1, day);
  };

  const selectDate = (isoDate) => {
    nativeInput.value = isoDate;
    nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
    syncLabel();
    closeTradeDatepicker();
  };

  const renderDays = () => {
    const selected = parseIsoDate(nativeInput.value);
    const firstDay = new Date(state.viewYear, state.viewMonth, 1);
    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(state.viewYear, state.viewMonth, 0).getDate();
    const offset = (firstDay.getDay() + 6) % 7;
    monthLabel.textContent = formatMonthYear(state.viewYear, state.viewMonth);
    daysGrid.innerHTML = '';

    for (let i = offset - 1; i >= 0; i -= 1) {
      const day = prevMonthDays - i;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'datepicker-day outside';
      cell.textContent = String(day);
      cell.dataset.year = String(state.viewMonth === 0 ? state.viewYear - 1 : state.viewYear);
      cell.dataset.month = String(state.viewMonth === 0 ? 11 : state.viewMonth - 1);
      cell.dataset.day = String(day);
      daysGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'datepicker-day';
      cell.textContent = String(day);
      cell.dataset.year = String(state.viewYear);
      cell.dataset.month = String(state.viewMonth);
      cell.dataset.day = String(day);

      if (selected && selected.year === state.viewYear && selected.month === state.viewMonth && selected.day === day) {
        cell.classList.add('selected');
      }

      const now = new Date();
      if (day === now.getDate() && state.viewMonth === now.getMonth() && state.viewYear === now.getFullYear()) {
        cell.classList.add('today');
      }

      daysGrid.appendChild(cell);
    }

    const totalCells = daysGrid.children.length;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= trailing; day += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'datepicker-day outside';
      cell.textContent = String(day);
      cell.dataset.year = String(state.viewMonth === 11 ? state.viewYear + 1 : state.viewYear);
      cell.dataset.month = String(state.viewMonth === 11 ? 0 : state.viewMonth + 1);
      cell.dataset.day = String(day);
      daysGrid.appendChild(cell);
    }
  };

  const syncViewWithValue = () => {
    const parsed = parseIsoDate(nativeInput.value);
    if (parsed) {
      state.viewYear = parsed.year;
      state.viewMonth = parsed.month;
    } else {
      state.viewYear = today.getFullYear();
      state.viewMonth = today.getMonth();
    }
  };

  // Dentro de los modales de Retiro/Gasto el popup es position:fixed (ver CSS), así que hay que
  // colocarlo a mano con las coordenadas reales del trigger en pantalla, volteándolo hacia arriba
  // si no cabe por debajo.
  // Mientras está abierto el popup vive en el <body> con position:fixed, así que sus
  // coordenadas se calculan siempre a partir del getBoundingClientRect() del trigger.
  const repositionPopup = () => {
    if (!popup || !popup.classList.contains('is-portaled')) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(260, Math.round(rect.width));
    popup.style.width = `${width}px`;
    const popupHeight = popup.offsetHeight || 320;
    const fitsBelow = rect.bottom + 8 + popupHeight <= window.innerHeight;
    popup.style.left = `${Math.round(Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)))}px`;
    popup.style.top = fitsBelow
      ? `${Math.round(rect.bottom + 8)}px`
      : `${Math.round(Math.max(12, rect.top - popupHeight - 8))}px`;
    popup.style.bottom = '';
  };

  const openPopup = () => {
    closeAllCustomSelects();
    closeTradeDatepicker();
    syncViewWithValue();
    renderDays();
    // El popup se mueve al <body> mientras está abierto. Motivo: dentro de un modal, el
    // `backdrop-filter` del overlay convierte a ese overlay en bloque contenedor de los
    // elementos position:fixed, así que el popup dejaba de escapar del contenedor con scroll
    // (.pro-modal-scroll) y quedaba recortado o invisible. Colgándolo del body no hay ningún
    // ancestro que lo recorte, en ningún formulario de la app.
    if (popup.parentElement !== document.body) document.body.appendChild(popup);
    custom.classList.add('open');
    popup.classList.add('is-portaled');
    repositionPopup();
    popup?.scrollTo?.(0, 0);
  };

  // Devuelve el popup a su sitio en el DOM al cerrarse, para que el marcado quede como estaba.
  custom.restoreDatepickerPopup = () => {
    if (popup.parentElement === document.body) {
      custom.appendChild(popup);
      popup.classList.remove('is-portaled');
      popup.style.top = '';
      popup.style.left = '';
      popup.style.width = '';
    }
  };

  // Todo el recuadro abre el calendario, no solo la flecha: acertar en una flecha de 10 px es
  // incómodo y daba sensación de que "no se abre". Se sigue pudiendo escribir la fecha a mano
  // porque el input mantiene el foco (el calendario no lo roba).
  const arrow = custom.querySelector('.datepicker-trigger-arrow');
  const toggleFromPointer = (event) => {
    event.stopPropagation();
    if (custom.classList.contains('open')) {
      closeTradeDatepicker();
      return;
    }
    openPopup();
  };

  arrow?.addEventListener('mousedown', (event) => {
    // mousedown (no click) para adelantarse al blur del input y no reabrirlo justo tras cerrarlo.
    event.preventDefault();
    toggleFromPointer(event);
  });

  // En el input no se hace preventDefault: hay que dejar que reciba el foco para poder teclear.
  triggerInput?.addEventListener('mousedown', (event) => {
    if (custom.classList.contains('open')) return;
    event.stopPropagation();
    openPopup();
  });

  // Auto-formato mientras se escribe: 27072026 → 27-07-2026 (solo dígitos, guiones automáticos).
  triggerInput?.addEventListener('input', () => {
    const digits = triggerInput.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    triggerInput.value = formatted;

    const iso = parseTypedDate(digits);
    if (iso) {
      nativeInput.value = iso;
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      custom.classList.add('has-value');
      custom.classList.remove('is-invalid');
      syncViewWithValue();
      if (custom.classList.contains('open')) renderDays();
    } else {
      custom.classList.toggle('is-invalid', digits.length === 8);
    }
  });

  // Al salir del campo: si lo escrito no es una fecha válida, se revierte al valor guardado.
  triggerInput?.addEventListener('blur', () => {
    const iso = parseTypedDate(triggerInput.value);
    if (!iso && triggerInput.value.trim()) {
      triggerInput.value = nativeInput.value ? formatDateToDisplay(nativeInput.value) : '';
    } else if (!triggerInput.value.trim()) {
      nativeInput.value = '';
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      custom.classList.remove('has-value');
    }
    custom.classList.remove('is-invalid');
  });

  triggerInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      closeTradeDatepicker();
      triggerInput.blur();
    }
    if (event.key === 'Escape') closeTradeDatepicker();
  });

  window.addEventListener('resize', () => {
    if (custom.classList.contains('open')) repositionPopup();
  });
  window.addEventListener(
    'scroll',
    (event) => {
      if (!custom.classList.contains('open')) return;
      if (event.target && typeof event.target.closest === 'function' && event.target.closest('.datepicker-popup')) return;
      // Igual que en el panel de sugerencias: reposicionar en vez de cerrar, para no cerrarlo por
      // el scroll automático del propio formulario. Solo se cierra si el campo sale de la vista.
      const rect = trigger.getBoundingClientRect();
      const scroller = event.target && event.target.getBoundingClientRect ? event.target.getBoundingClientRect() : null;
      const outOfView = scroller
        ? rect.bottom < scroller.top || rect.top > scroller.bottom
        : rect.bottom < 0 || rect.top > window.innerHeight;
      if (outOfView) {
        closeTradeDatepicker();
        return;
      }
      repositionPopup();
    },
    true
  );

  prevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    state.viewMonth -= 1;
    if (state.viewMonth < 0) {
      state.viewMonth = 11;
      state.viewYear -= 1;
    }
    renderDays();
    // El nº de filas puede cambiar (5/6 semanas) y con ello la altura: recolocar si es fixed.
    repositionPopup();
  });

  nextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    state.viewMonth += 1;
    if (state.viewMonth > 11) {
      state.viewMonth = 0;
      state.viewYear += 1;
    }
    renderDays();
    repositionPopup();
  });

  daysGrid?.addEventListener('click', (event) => {
    event.stopPropagation();
    const button = event.target instanceof Element ? event.target.closest('.datepicker-day') : null;
    if (!button) return;
    const year = Number(button.dataset.year);
    const month = Number(button.dataset.month);
    const day = Number(button.dataset.day);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return;
    selectDate(formatIsoDate(year, month, day));
  });

  todayBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    const now = new Date();
    selectDate(formatIsoDate(now.getFullYear(), now.getMonth(), now.getDate()));
  });

  clearBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    nativeInput.value = '';
    nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
    syncLabel();
    closeTradeDatepicker();
  });

  nativeInput.addEventListener('change', () => {
    syncLabel();
    if (custom.classList.contains('open')) {
      syncViewWithValue();
      renderDays();
    }
  });

  const refreshDatepickerI18n = () => {
    const letters = DOW_INITIAL_KEYS.map((key) => t(key));
    weekdaysRow.innerHTML = letters.map((name) => `<span>${name}</span>`).join('');
    if (todayBtn) todayBtn.textContent = t('today');
    if (clearBtn) clearBtn.textContent = t('clear');
    syncLabel();
    if (custom.classList.contains('open')) {
      renderDays();
    }
  };
  custom.refreshDatepickerI18n = refreshDatepickerI18n;
  // Los modales asignan la fecha con .value = ... (sin evento change), así que hace falta poder
  // resincronizar la etiqueta visible del selector desde fuera al abrirlos.
  custom.syncDatepickerFromNative = () => {
    syncViewWithValue();
    syncLabel();
  };
  nativeInput.dataset.customDatepickerId = nativeInput.id || '';
  // Además, escuchar 'change' del input nativo: así basta con hacer
  // input.dispatchEvent(new Event('change')) tras asignar .value por código (mismo patrón que ya
  // usa el timepicker) y la etiqueta visible se actualiza sola en cualquier formulario.
  nativeInput.addEventListener('change', () => {
    syncViewWithValue();
    syncLabel();
  });

  syncViewWithValue();
  syncLabel();
  if (todayBtn) todayBtn.textContent = t('today');
  if (clearBtn) clearBtn.textContent = t('clear');
}

let tradeTimepickerRoots = [];

function closeTradeTimepickers(exceptElement = null) {
  tradeTimepickerRoots.forEach((root) => {
    if (!exceptElement || root !== exceptElement) {
      root.classList.remove('open');
    }
  });
}

/** Selector de hora propio (mismo patrón que initTradeDatepicker): sustituye el picker nativo
 * del navegador por columnas de horas/minutos con el estilo de la app. El <input type="time">
 * original se mantiene oculto como fuente de verdad del valor (formato HH:MM) para no romper
 * el resto de lógica (validaciones de horario, cálculos de duración, etc.) que ya lee/escribe
 * ese input directamente. */
// Acepta un id o directamente el elemento, para poder montarlo también sobre inputs creados
// dinámicamente (p. ej. las filas de horarios operativos, que no tienen id).
function initTradeTimepicker(inputIdOrEl) {
  const nativeInput =
    typeof inputIdOrEl === 'string' ? document.getElementById(inputIdOrEl) : inputIdOrEl;
  if (!nativeInput || nativeInput.dataset.customTimepickerBound === 'true') return;

  nativeInput.dataset.customTimepickerBound = 'true';
  nativeInput.classList.add('native-time-hidden');

  const custom = document.createElement('div');
  custom.className = 'custom-timepicker';
  custom.innerHTML = `
    <div class="timepicker-trigger">
      <input type="text" class="timepicker-trigger-input" inputmode="numeric" autocomplete="off"
             placeholder="HH:MM" maxlength="5" />
      <span class="timepicker-trigger-icon"><i data-lucide="clock"></i></span>
    </div>
    <div class="timepicker-popup">
      <div class="timepicker-columns">
        <div class="timepicker-col timepicker-col-hours"></div>
        <div class="timepicker-col timepicker-col-minutes"></div>
      </div>
      <div class="timepicker-actions">
        <button type="button" class="timepicker-action-btn now-btn"></button>
        <button type="button" class="timepicker-action-btn clear-btn"></button>
      </div>
    </div>
  `;
  nativeInput.insertAdjacentElement('afterend', custom);
  tradeTimepickerRoots.push(custom);

  const trigger = custom.querySelector('.timepicker-trigger');
  const triggerInput = custom.querySelector('.timepicker-trigger-input');
  const popup = custom.querySelector('.timepicker-popup');
  const hoursCol = custom.querySelector('.timepicker-col-hours');
  const minutesCol = custom.querySelector('.timepicker-col-minutes');
  const nowBtn = custom.querySelector('.now-btn');
  const clearBtn = custom.querySelector('.clear-btn');

  // El popup usa position:fixed (ver comentario en el CSS de .timepicker-popup), así que hay
  // que posicionarlo a mano con las coordenadas reales del trigger en pantalla.
  const positionPopup = () => {
    if (!popup) return;
    const rect = trigger.getBoundingClientRect();
    const popupWidth = 190;
    const estimatedPopupHeight = 260;
    const left = Math.min(rect.left, window.innerWidth - popupWidth - 12);
    const fitsBelow = rect.bottom + 8 + estimatedPopupHeight <= window.innerHeight;
    const top = fitsBelow ? rect.bottom + 8 : Math.max(8, rect.top - estimatedPopupHeight - 8);
    popup.style.top = `${top}px`;
    popup.style.left = `${Math.max(8, left)}px`;
  };

  const parseValue = () => {
    const m = /^(\d{2}):(\d{2})$/.exec(String(nativeInput.value || ''));
    return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
  };

  const syncLabel = () => {
    const value = nativeInput.value || '';
    // No pisar lo que el usuario esté tecleando: solo se refresca si el campo no tiene el foco.
    if (document.activeElement !== triggerInput) triggerInput.value = value;
    triggerInput.placeholder = t('time_format_placeholder', 'HH:MM');
    custom.classList.toggle('has-value', Boolean(value));
  };

  /** Interpreta lo tecleado como HH:MM (admite «930», «9:30», «0930») y valida rangos reales. */
  const parseTypedTime = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length !== 3 && digits.length !== 4) return '';
    const h = Number(digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2));
    const m = Number(digits.slice(-2));
    if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const renderColumns = () => {
    const parsed = parseValue();
    hoursCol.innerHTML = '';
    for (let h = 0; h < 24; h += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'timepicker-option';
      btn.textContent = String(h).padStart(2, '0');
      if (parsed && parsed.h === h) btn.classList.add('selected');
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const current = parseValue();
        selectTime(h, current ? current.m : 0);
      });
      hoursCol.appendChild(btn);
    }
    minutesCol.innerHTML = '';
    for (let m = 0; m < 60; m += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'timepicker-option';
      btn.textContent = String(m).padStart(2, '0');
      if (parsed && parsed.m === m) btn.classList.add('selected');
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const current = parseValue();
        selectTime(current ? current.h : 0, m);
      });
      minutesCol.appendChild(btn);
    }
  };

  function selectTime(h, m) {
    nativeInput.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
    syncLabel();
    renderColumns();
  }

  const scrollSelectedIntoView = () => {
    [hoursCol, minutesCol].forEach((col) => {
      const sel = col.querySelector('.timepicker-option.selected');
      if (sel) sel.scrollIntoView({ block: 'center' });
      else col.scrollTop = 0;
    });
  };

  // Solo el icono del reloj abre/cierra la lista; el resto del recuadro es un campo de texto
  // donde se puede escribir la hora directamente (HH:MM).
  const clockIcon = custom.querySelector('.timepicker-trigger-icon');
  clockIcon?.addEventListener('mousedown', (event) => {
    // mousedown (no click) para adelantarse al blur del input y no reabrirlo tras cerrarlo.
    event.preventDefault();
    event.stopPropagation();
    const willOpen = !custom.classList.contains('open');
    closeAllCustomSelects();
    closeTradeDatepicker();
    closeTradeTimepickers();
    if (!willOpen) return;
    renderColumns();
    positionPopup();
    custom.classList.add('open');
    scrollSelectedIntoView();
  });

  // Auto-formato al escribir: 930 → 09:30, 1745 → 17:45.
  triggerInput?.addEventListener('input', () => {
    const digits = triggerInput.value.replace(/\D/g, '').slice(0, 4);
    triggerInput.value = digits.length > 2 ? `${digits.slice(0, -2)}:${digits.slice(-2)}` : digits;

    const normalized = parseTypedTime(digits);
    if (normalized) {
      nativeInput.value = normalized;
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      custom.classList.add('has-value');
      custom.classList.remove('is-invalid');
      if (custom.classList.contains('open')) renderColumns();
    } else {
      custom.classList.toggle('is-invalid', digits.length >= 3);
    }
  });

  // Al salir del campo se normaliza (09:30) o se revierte si lo escrito no es una hora válida.
  triggerInput?.addEventListener('blur', () => {
    const normalized = parseTypedTime(triggerInput.value);
    if (normalized) {
      triggerInput.value = normalized;
    } else if (triggerInput.value.trim()) {
      triggerInput.value = nativeInput.value || '';
    } else {
      nativeInput.value = '';
      nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
      custom.classList.remove('has-value');
    }
    custom.classList.remove('is-invalid');
  });

  triggerInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      closeTradeTimepickers();
      triggerInput.blur();
    }
    if (event.key === 'Escape') closeTradeTimepickers();
  });

  // El popup es position:fixed y los modales tienen overflow-y:auto: si no se recoloca al hacer
  // scroll, se queda "flotando" separado de su campo. Se cierra solo si el campo sale de vista.
  window.addEventListener(
    'scroll',
    (event) => {
      if (!custom.classList.contains('open')) return;
      if (event.target && typeof event.target.closest === 'function' && event.target.closest('.timepicker-popup')) return;
      const rect = trigger.getBoundingClientRect();
      const scroller = event.target && event.target.getBoundingClientRect ? event.target.getBoundingClientRect() : null;
      const outOfView = scroller
        ? rect.bottom < scroller.top || rect.top > scroller.bottom
        : rect.bottom < 0 || rect.top > window.innerHeight;
      if (outOfView) {
        custom.classList.remove('open');
        return;
      }
      positionPopup();
    },
    true
  );
  window.addEventListener('resize', () => {
    if (custom.classList.contains('open')) positionPopup();
  });

  nowBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    const now = new Date();
    selectTime(now.getHours(), now.getMinutes());
    scrollSelectedIntoView();
  });

  clearBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    nativeInput.value = '';
    nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
    syncLabel();
    renderColumns();
    custom.classList.remove('open');
  });

  nativeInput.addEventListener('change', () => {
    syncLabel();
    if (custom.classList.contains('open')) renderColumns();
  });

  const refreshTimepickerI18n = () => {
    if (nowBtn) nowBtn.textContent = t('time_now', 'Ahora');
    if (clearBtn) clearBtn.textContent = t('clear');
    syncLabel();
  };
  custom.refreshTimepickerI18n = refreshTimepickerI18n;

  syncLabel();
  if (nowBtn) nowBtn.textContent = t('time_now', 'Ahora');
  if (clearBtn) clearBtn.textContent = t('clear');
  refreshLucideIcons();
}

function refreshCustomSelectForNative(nativeSelect) {
  if (!nativeSelect || nativeSelect.tagName !== 'SELECT') return;
  if (
    nativeSelect.id === 'asset' ||
    nativeSelect.id === 'btAsset' ||
    nativeSelect.id === 'btDirection' ||
    nativeSelect.id === 'btAccount'
  ) {
    return;
  }

  let custom = nativeSelect.nextElementSibling;
  if (!custom || !custom.classList.contains('custom-select')) {
    custom = document.createElement('div');
    custom.className = 'custom-select';
    custom.dataset.for = nativeSelect.id || '';
    custom.innerHTML = `
      <div class="select-selected"></div>
      <div class="select-options"></div>
    `;
    nativeSelect.insertAdjacentElement('afterend', custom);
  }

  nativeSelect.classList.add('native-select-hidden');

  const selected = custom.querySelector('.select-selected');
  const optionsContainer = custom.querySelector('.select-options');
  if (!selected || !optionsContainer) return;

  const currentOption = nativeSelect.options[nativeSelect.selectedIndex] || nativeSelect.options[0];
  selected.textContent = (currentOption?.textContent || '').trim();
  custom.dataset.value = nativeSelect.value || '';

  if (!nativeSelect.dataset.customSelectSyncBound) {
    nativeSelect.addEventListener('change', () => {
      const option = nativeSelect.options[nativeSelect.selectedIndex] || nativeSelect.options[0];
      selected.textContent = (option?.textContent || '').trim();
      custom.dataset.value = nativeSelect.value || '';
      custom.querySelectorAll('.select-option').forEach((node) => {
        node.classList.toggle('active', node.dataset.value === nativeSelect.value);
      });
    });
    nativeSelect.dataset.customSelectSyncBound = 'true';
  }

  optionsContainer.innerHTML = '';
  Array.from(nativeSelect.options).forEach((option) => {
    const optionElement = document.createElement('div');
    optionElement.className = 'select-option';
    optionElement.dataset.value = option.value;
    optionElement.textContent = (option.textContent || '').trim();
    if (option.value === nativeSelect.value) optionElement.classList.add('active');
    if (option.disabled) optionElement.classList.add('disabled');

    optionElement.addEventListener('click', (event) => {
      // preventDefault() además de stopPropagation(): en algunos formularios (p. ej. el modal
      // de sesión de backtesting) el <select> nativo está envuelto en un <label>, y el propio
      // <select> (aunque oculto por .native-select-hidden) sigue siendo su control asociado.
      // Sin preventDefault(), el navegador reenvía el click del label al <select> oculto
      // (comportamiento nativo de <label>), lo que puede "tragarse" el click y hacer que el
      // desplegable no llegue a abrirse o se cierre inmediatamente.
      event.preventDefault();
      event.stopPropagation();
      if (option.disabled) return;
      nativeSelect.value = option.value;
      nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      selected.textContent = optionElement.textContent;
      custom.dataset.value = option.value;
      optionsContainer.querySelectorAll('.select-option').forEach((node) => node.classList.remove('active'));
      optionElement.classList.add('active');
      custom.classList.remove('open');
    });
    optionsContainer.appendChild(optionElement);
  });

  selected.onclick = (event) => {
    // Ver comentario arriba: preventDefault() evita que un <label> ancestro reenvíe el click
    // al <select> nativo oculto.
    event.preventDefault();
    event.stopPropagation();
    const willOpen = !custom.classList.contains('open');
    closeAllCustomSelects(custom);
    custom.classList.toggle('open', willOpen);
  };
}

/** Refresca custom select en #backtestingView sin acumular duplicados. */
function refreshBacktestingCustomSelect(select) {
  if (!select || select.tagName !== 'SELECT') return;
  if (select.id === 'btAsset' || select.id === 'btDirection' || select.id === 'btAccount') return;
  if (!select.closest('#backtestingView')) return;

  let next = select.nextElementSibling;
  while (next?.classList?.contains('custom-select')) {
    const rm = next;
    next = next.nextElementSibling;
    rm.remove();
  }

  select.classList.remove('native-select-hidden');
  refreshCustomSelectForNative(select);
}

function initCustomSelects(root = document) {
  const selects = root.querySelectorAll('select');

  selects.forEach((select) => {
    if (
      select.id === 'asset' ||
      select.id === 'btAsset' ||
      select.id === 'btDirection' ||
      select.id === 'btAccount'
    ) {
      return;
    }
    if (select.closest('#backtestingView')) {
      refreshBacktestingCustomSelect(select);
      return;
    }
    refreshCustomSelectForNative(select);
  });

  document.querySelectorAll('#backtestingView .custom-select + .custom-select').forEach((el) => el.remove());
}

function getStoredList(key) {
  if (key == null) {
    return [];
  }
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Error leyendo ${key} desde localStorage`, error);
    return [];
  }
}

function saveStoredList(key, values) {
  if (key == null) {
    console.warn('saveStoredList: sin clave de usuario; no se guarda');
    return;
  }
  localStorage.setItem(key, JSON.stringify(values));
}

function getMode() {
  return localStorage.getItem(MODE_KEY) === 'pro' ? 'pro' : 'basic';
}

function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode === 'pro' ? 'pro' : 'basic');
  showToast(t('saved_changes'));
  if (currentView === 'config') {
    applyModeUI();
    void (async () => {
      await loadStrategies();
      await loadAccounts();
    })();
  }
}

const REAL_ACCOUNT_TYPES = new Set(['challenge', 'funded', 'own_capital']);
function normalizeAccountType(value) {
  const v = String(value || '').trim().toLowerCase();
  return REAL_ACCOUNT_TYPES.has(v) ? v : null;
}

function normalizeAccount(account) {
  if (typeof account === 'string') {
    return {
      name: account,
      capital: 0,
      commissionPerLot: 0,
      freeSwap: false,
      prop_name: null,
      account_type: null,
      account_number: null,
      challenge_passed: false,
      disabled_by_max_dd: false,
      client_uuid: null,
      remote_id: null,
      id: null,
      previous_names: [],
    };
  }
  const propName = String(account?.prop_name ?? '').trim();
  const accountNumber = String(account?.account_number ?? account?.accountNumber ?? '').trim();
  return {
    name: (account?.name || '').trim(),
    capital: Number(account?.capital ?? account?.balance) || 0,
    commissionPerLot: resolveAccountCommissionPerLot(account),
    freeSwap: Boolean(account?.freeSwap ?? account?.free_swap),
    prop_name: propName || null,
    account_type: normalizeAccountType(account?.account_type ?? account?.accountType),
    account_number: accountNumber || null,
    challenge_passed: Boolean(account?.challenge_passed ?? account?.challengePassed),
    disabled_by_max_dd: Boolean(account?.disabled_by_max_dd ?? account?.disabledByMaxDd),
    client_uuid: account?.client_uuid ? String(account.client_uuid) : null,
    remote_id: account?.remote_id != null && account.remote_id !== '' ? String(account.remote_id) : null,
    id: account?.id != null && account.id !== '' ? account.id : null,
    previous_names: Array.isArray(account?.previous_names) ? account.previous_names.map(String) : [],
  };
}

function emptyEntityIdentity() {
  return { client_uuid: null, remote_id: null, id: null, originalName: null };
}

function identityFromAccount(account) {
  if (!account) return emptyEntityIdentity();
  return {
    client_uuid: account.client_uuid || null,
    remote_id: account.remote_id || null,
    id: account.id ?? null,
    originalName: account.name || null,
  };
}

function identityFromStrategy(record) {
  if (!record) return emptyEntityIdentity();
  return {
    client_uuid: record.client_uuid || null,
    remote_id: record.remote_id || null,
    id: record.id ?? null,
    originalName: record.name || null,
  };
}

function hasStableIdentity(identity) {
  return Boolean(
    identity?.client_uuid || identity?.remote_id || identity?.id != null || identity?.originalName
  );
}

function findAccountByIdentity(identity, accounts = getAccounts()) {
  if (!identity) return null;
  if (identity.client_uuid) {
    const hit = accounts.find((a) => a.client_uuid === identity.client_uuid);
    if (hit) return hit;
  }
  if (identity.remote_id) {
    const hit = accounts.find((a) => a.remote_id === identity.remote_id);
    if (hit) return hit;
  }
  if (identity.id != null) {
    const hit = accounts.find((a) => a.id == identity.id);
    if (hit) return hit;
  }
  if (identity.originalName) {
    const hit = accounts.find((a) => a.name === identity.originalName);
    if (hit) return hit;
    const aliasHit = accounts.find(
      (a) => Array.isArray(a.previous_names) && a.previous_names.includes(identity.originalName)
    );
    if (aliasHit) return aliasHit;
  }
  return null;
}

function findStrategyByIdentity(identity) {
  if (!identity) return null;
  const records = [...realStrategiesByName.values()];
  if (identity.client_uuid) {
    const hit = records.find((r) => r?.client_uuid === identity.client_uuid);
    if (hit) return hit;
  }
  if (identity.remote_id) {
    const hit = records.find((r) => r?.remote_id === identity.remote_id);
    if (hit) return hit;
  }
  if (identity.id != null) {
    const hit = records.find((r) => r?.id == identity.id);
    if (hit) return hit;
  }
  if (identity.originalName) {
    const hit = getStrategyRecordByName(identity.originalName);
    if (hit) return hit;
    const aliasHit = records.find(
      (r) => Array.isArray(r?.previous_names) && r.previous_names.includes(identity.originalName)
    );
    if (aliasHit) return aliasHit;
  }
  return null;
}

function accountMatchesIdentity(account, identity) {
  if (!account || !identity) return false;
  if (identity.client_uuid && account.client_uuid === identity.client_uuid) return true;
  if (identity.remote_id && account.remote_id === identity.remote_id) return true;
  if (identity.id != null && account.id == identity.id) return true;
  if (identity.originalName && account.name === identity.originalName) return true;
  if (
    identity.originalName &&
    Array.isArray(account.previous_names) &&
    account.previous_names.includes(identity.originalName)
  ) {
    return true;
  }
  return false;
}

function strategyMatchesIdentity(record, identity) {
  if (!record || !identity) return false;
  if (identity.client_uuid && record.client_uuid === identity.client_uuid) return true;
  if (identity.remote_id && record.remote_id === identity.remote_id) return true;
  if (identity.id != null && record.id == identity.id) return true;
  if (identity.originalName && record.name === identity.originalName) return true;
  if (
    identity.originalName &&
    Array.isArray(record.previous_names) &&
    record.previous_names.includes(identity.originalName)
  ) {
    return true;
  }
  return false;
}

function identityFromCardDataset(card) {
  if (!card?.dataset) return emptyEntityIdentity();
  return {
    client_uuid: card.dataset.clientUuid || null,
    remote_id: card.dataset.remoteId || null,
    id: card.dataset.entityId || null,
    originalName: card.dataset.entityName || null,
  };
}

function entityRegistryNames(entity) {
  return mergePreviousNames([entity?.name], entity?.previous_names || []);
}

function entityMatchesDeletedRegistry(entity, registry) {
  if (!entity || !Array.isArray(registry) || !registry.length) return false;
  const names = entityRegistryNames(entity).map((n) => String(n).toLowerCase());
  for (const entry of registry) {
    if (entry?.client_uuid && entity.client_uuid && entry.client_uuid === entity.client_uuid) {
      return true;
    }
    const entryNames = mergePreviousNames(entry?.names || [], entry?.name ? [entry.name] : []);
    if (entryNames.some((n) => names.includes(String(n).toLowerCase()))) return true;
  }
  return false;
}

function filterActiveAccounts(accounts, registry) {
  return (Array.isArray(accounts) ? accounts : []).filter((a) => !entityMatchesDeletedRegistry(a, registry));
}

function filterActiveStrategies(strategies, registry) {
  return (Array.isArray(strategies) ? strategies : []).filter((s) => !entityMatchesDeletedRegistry(s, registry));
}

function filterRecoverySkipDeleted(items, registry) {
  if (!Array.isArray(registry) || !registry.length) return items;
  const skipped = [];
  const filtered = (Array.isArray(items) ? items : []).filter((item) => {
    if (entityMatchesDeletedRegistry(item, registry)) {
      skipped.push(item?.name);
      return false;
    }
    return true;
  });
  if (skipped.length) {
    console.log('[recovery] skipped deleted entity names:', skipped);
  }
  return filtered;
}

async function loadDeletedAccountsRegistry() {
  const key = await getUserScopedStorageKey('deleted_real_accounts');
  if (!key) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadDeletedStrategiesRegistry() {
  const key = await getUserScopedStorageKey('deleted_real_strategies');
  if (!key) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function markAccountDeletedInRegistry(account) {
  const key = await getUserScopedStorageKey('deleted_real_accounts');
  if (!key || !account) return;
  const registry = await loadDeletedAccountsRegistry();
  const names = entityRegistryNames(account);
  const entry = {
    client_uuid: account.client_uuid || null,
    names,
    deleted_at: new Date().toISOString(),
  };
  const next = registry.filter(
    (e) => !(entry.client_uuid && e.client_uuid === entry.client_uuid) && !names.includes(e.name)
  );
  next.push(entry);
  localStorage.setItem(key, JSON.stringify(next));
}

async function markStrategyDeletedInRegistry(record) {
  const key = await getUserScopedStorageKey('deleted_real_strategies');
  if (!key || !record) return;
  const registry = await loadDeletedStrategiesRegistry();
  const names = entityRegistryNames(record);
  const entry = {
    client_uuid: record.client_uuid || null,
    names,
    deleted_at: new Date().toISOString(),
  };
  const next = registry.filter(
    (e) => !(entry.client_uuid && e.client_uuid === entry.client_uuid) && !names.includes(e.name)
  );
  next.push(entry);
  localStorage.setItem(key, JSON.stringify(next));
}

function getCommissionPerLotFromAccountUi(account, form = 'create') {
  let perLot = resolveAccountCommissionPerLot(account);
  if (perLot > 0) return perLot;
  if (form !== 'edit') {
    const el = document.getElementById('commissionPerLot');
    const fromInput = Number(String(el?.value ?? '').replace(',', '.'));
    if (Number.isFinite(fromInput) && fromInput >= 0) return fromInput;
  }
  return perLot;
}

function getTradeCommissionCalc({ account = null, lotSize = 0, grossPnl = 0, trade = null, form = 'create' } = {}) {
  const accountKey = form === 'edit' ? 'editAccount' : 'account';
  let acc = account ?? getSelectedAccount(accountKey);
  if (!acc && trade?.account) {
    acc = getAccounts().find((a) => String(a.name) === String(trade.account)) || null;
  }
  const perLot = getCommissionPerLotFromAccountUi(acc, form);
  return calculateTradeCommission({
    account: acc,
    lotSize,
    grossPnl,
    trade,
    mode: getMode(),
    commissionPerLot: perLot,
  });
}

function getAccounts() {
  return realAccountsCache.map((a) => ({ ...a }));
}

async function saveAccounts(accounts) {
  const userId = await getCurrentUserIdSafe();
  if (!userId) return;

  const key = await getUserScopedStorageKey('real_accounts');
  if (!key) return;

  const norm = accounts.map(normalizeAccount).filter((account) => account.name);
  saveStoredList(key, norm);
  realAccountsCache = norm;
}

async function saveRealStrategiesList(strategies) {
  const userId = await getCurrentUserIdSafe();
  if (!userId) return;

  const key = await getUserScopedStorageKey('real_strategies');
  if (!key) return;

  const names = (Array.isArray(strategies) ? strategies : [])
    .map((s) => (typeof s === 'string' ? s : String(s?.name || '').trim()))
    .filter(Boolean);
  const records = names.map(
    (name) =>
      realStrategiesByName.get(name) || {
        name,
        description: '',
        schedule_enabled: false,
        operating_hours: [],
        previous_names: [],
      }
  );
  saveStoredList(key, records);
  realStrategiesCache = names;
  realStrategiesByName = buildStrategyByNameMap(records);
}

function getStrategyRecordByName(name) {
  const key = String(name || '').trim();
  if (!key) return null;
  if (realStrategiesByName.has(key)) return realStrategiesByName.get(key);
  for (const rec of realStrategiesByName.values()) {
    if (Array.isArray(rec?.previous_names) && rec.previous_names.includes(key)) return rec;
  }
  return null;
}

function renderStrategyHoursList(hours, listId = 'strategyModalHoursList') {
  const list = document.getElementById(listId);
  if (!list) return;
  const ranges = parseOperatingHours(hours);
  list.innerHTML = '';
  ranges.forEach((range, idx) => {
    const row = document.createElement('div');
    row.className = 'strategy-hour-row';
    row.dataset.index = String(idx);
    row.innerHTML = `
      <input type="time" class="input strategy-hour-start" value="${range.start || ''}" aria-label="Inicio" />
      <span class="strategy-hour-sep">—</span>
      <input type="time" class="input strategy-hour-end" value="${range.end || ''}" aria-label="Fin" />
      <button type="button" class="button button-delete strategy-hour-remove" data-index="${idx}" aria-label="Eliminar">×</button>
    `;
    list.appendChild(row);
  });
  // Selector de hora propio también aquí: el nativo de Chromium no se puede tematizar y
  // desentonaba con el resto de la app.
  list.querySelectorAll('input[type="time"]').forEach((input) => initTradeTimepicker(input));
  list.querySelectorAll('.strategy-hour-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      const next = parseOperatingHours(collectStrategyHoursFromDom(listId));
      next.splice(i, 1);
      renderStrategyHoursList(next, listId);
    });
  });
}

function collectStrategyHoursFromDom(listId = 'strategyModalHoursList') {
  const list = document.getElementById(listId);
  if (!list) return [];
  const out = [];
  list.querySelectorAll('.strategy-hour-row').forEach((row) => {
    const start = row.querySelector('.strategy-hour-start')?.value?.trim();
    const end = row.querySelector('.strategy-hour-end')?.value?.trim();
    if (start && end) out.push({ start, end });
  });
  return out;
}

/* ── Métricas personalizadas por estrategia ────────────────────────────────────────────────
 * Cada estrategia real guarda su propio checklist (array de nombres). Al elegir esa estrategia
 * en un trade se muestran esas casillas, y lo marcado se guarda en trade.custom_metrics.
 * Se eligió guardarlas dentro de la estrategia (y no como entidad aparte) porque son propias
 * de ella: así no hay que mantener una tabla nueva ni relaciones extra.
 */
function parseStrategyMetrics(value) {
  const raw = typeof value === 'string' ? safeJsonParse(value, []) : value;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => (typeof m === 'string' ? m : String(m?.name || '')))
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeJsonParse(text, fallback) {
  try {
    const parsed = JSON.parse(text);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/** Métricas definidas por la estrategia con ese nombre. */
function getStrategyMetricsByName(strategyName) {
  const record = getStrategyRecordByName(String(strategyName || '').trim());
  return parseStrategyMetrics(record?.custom_metrics);
}

function renderStrategyMetricsList(metrics) {
  const host = document.getElementById('strategyModalMetricsList');
  if (!host) return;
  // Aquí NO se puede usar parseStrategyMetrics: ese descarta los nombres vacíos, que es lo
  // correcto al leer de la base pero no al pintar el formulario. "Añadir métrica" añade
  // justamente una fila vacía para que el usuario escriba, y el filtro la borraba antes de
  // dibujarla: el botón parecía no hacer nada. Vaciar se sigue filtrando al guardar
  // (collectStrategyMetricsFromDom).
  const raw = typeof metrics === 'string' ? safeJsonParse(metrics, []) : metrics;
  const list = Array.isArray(raw)
    ? raw.map((m) => (typeof m === 'string' ? m : String(m?.name || '')).trim())
    : [];
  host.innerHTML = '';
  if (!list.length) {
    host.innerHTML = `<p class="muted" style="margin:0;font-size:0.84rem;">${escapeHtmlChipText(
      t('strategy_metrics_empty', 'Sin métricas. Pulsa «Añadir métrica».')
    )}</p>`;
    return;
  }
  list.forEach((name, idx) => {
    const row = document.createElement('div');
    row.className = 'strategy-metric-row';
    row.innerHTML = `
      <input type="text" class="input strategy-metric-name" value="${escapeAttrChip(name)}" placeholder="Ej: Siguió el plan" />
      <button type="button" class="button button-delete strategy-metric-remove" data-index="${idx}" aria-label="Eliminar">×</button>`;
    host.appendChild(row);
  });
  host.querySelectorAll('.strategy-metric-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = collectStrategyMetricsFromDom({ keepEmpty: true });
      next.splice(Number(btn.dataset.index), 1);
      renderStrategyMetricsList(next);
    });
  });
}

/**
 * Lee las métricas escritas en el formulario.
 *
 * `keepEmpty` existe porque hay dos lecturas distintas: al guardar hay que descartar las filas
 * en blanco (no son una métrica), pero al redibujar el formulario -añadir o quitar una fila- hay
 * que conservarlas o se le borraría al usuario la fila que acaba de crear y aún no ha escrito.
 */
function collectStrategyMetricsFromDom({ keepEmpty = false } = {}) {
  const host = document.getElementById('strategyModalMetricsList');
  if (!host) return [];
  const seen = new Set();
  const out = [];
  host.querySelectorAll('.strategy-metric-name').forEach((input) => {
    const name = String(input.value || '').trim();
    if (!name) {
      if (keepEmpty) out.push('');
      return;
    }
    // Los nombres son la clave en custom_metrics del trade: no puede haber duplicados.
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name);
  });
  return out;
}

/** Casillas del checklist en el formulario de trade (create | edit). */
function renderTradeCustomMetricFields(form, strategyName, values = {}) {
  const section = document.getElementById(form === 'edit' ? 'editCustomMetricsSection' : 'tradeCustomMetricsSection');
  const host = document.getElementById(form === 'edit' ? 'editCustomMetricsFields' : 'tradeCustomMetricsFields');
  if (!section || !host) return;

  const metrics = getStrategyMetricsByName(strategyName);
  host.innerHTML = '';
  if (!metrics.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  metrics.forEach((name) => {
    const label = document.createElement('label');
    label.className = 'trade-metric-check';
    const checked = values && values[name] === true ? 'checked' : '';
    label.innerHTML = `<input type="checkbox" data-metric-name="${escapeAttrChip(name)}" ${checked} /><span>${escapeHtmlChipText(name)}</span>`;
    host.appendChild(label);
  });
}

/** Valores marcados. Se guardan TODAS las métricas (true/false), no solo las marcadas: así el
 * análisis puede distinguir «no cumplida» de «el trade es anterior a la métrica». */
function collectTradeCustomMetrics(form) {
  const host = document.getElementById(form === 'edit' ? 'editCustomMetricsFields' : 'tradeCustomMetricsFields');
  if (!host) return {};
  const out = {};
  host.querySelectorAll('input[type="checkbox"][data-metric-name]').forEach((cb) => {
    out[cb.dataset.metricName] = Boolean(cb.checked);
  });
  return out;
}

function collectStrategyModalPayload() {
  const name = String(document.getElementById('strategyModalName')?.value || '').trim();
  const description = String(document.getElementById('strategyModalDescription')?.value || '').trim();
  const schedule_enabled = Boolean(document.getElementById('strategyModalScheduleEnabled')?.checked);
  let operating_hours = [];
  if (schedule_enabled) {
    operating_hours = collectStrategyHoursFromDom('strategyModalHoursList');
    const validation = validateOperatingHoursList(operating_hours);
    if (!validation.valid) return { error: validation.error };
    operating_hours = validation.hours;
  }
  const existing = findStrategyByIdentity(strategyModalIdentity) || getStrategyRecordByName(name);
  return {
    name,
    description,
    schedule_enabled,
    operating_hours,
    custom_metrics: collectStrategyMetricsFromDom(),
    client_uuid: existing?.client_uuid || strategyModalIdentity?.client_uuid || null,
    remote_id: existing?.remote_id || strategyModalIdentity?.remote_id || null,
    id: existing?.id ?? strategyModalIdentity?.id ?? null,
    previous_names: existing?.previous_names || [],
  };
}

function loadStrategyModalFromRecord(record) {
  const nameEl = document.getElementById('strategyModalName');
  const desc = document.getElementById('strategyModalDescription');
  const sched = document.getElementById('strategyModalScheduleEnabled');
  if (nameEl) nameEl.value = record?.name || '';
  if (desc) desc.value = record?.description || '';
  if (sched) sched.checked = Boolean(record?.schedule_enabled);
  renderStrategyHoursList(record?.operating_hours || [], 'strategyModalHoursList');
  renderStrategyMetricsList(record?.custom_metrics || []);
  syncStrategyModalHoursVisibility();
}

function clearStrategyModalFields() {
  const nameEl = document.getElementById('strategyModalName');
  const desc = document.getElementById('strategyModalDescription');
  const sched = document.getElementById('strategyModalScheduleEnabled');
  if (nameEl) nameEl.value = '';
  if (desc) desc.value = '';
  if (sched) sched.checked = false;
  renderStrategyHoursList([], 'strategyModalHoursList');
  renderStrategyMetricsList([]);
  syncStrategyModalHoursVisibility();
}

function syncStrategyModalHoursVisibility() {
  const enabled = Boolean(document.getElementById('strategyModalScheduleEnabled')?.checked);
  const section = document.getElementById('strategyModalHoursSection');
  if (section) section.hidden = !enabled;
}

async function createRealStrategy(payload) {
  const backend = getBackendApi();
  if (!backend?.addRealStrategyLocal || !payload?.name) return { success: false };
  console.log('[strategies] create requested', payload.name);
  const res = await backend.addRealStrategyLocal(payload);
  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  return res;
}

async function updateRealStrategy(payload, identity, { oldName = null } = {}) {
  const backend = getBackendApi();
  if (!backend?.updateRealStrategyLocal || !payload?.name) return { success: false };
  const id = identity || strategyModalIdentity;
  console.log('[strategies] update requested using identity', id);
  const res = await backend.updateRealStrategyLocal({
    ...payload,
    client_uuid: payload.client_uuid || id?.client_uuid || null,
    remote_id: payload.remote_id || id?.remote_id || null,
    id: payload.id ?? id?.id ?? null,
    oldName: oldName || id?.originalName || null,
    originalName: id?.originalName || oldName || null,
  });
  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  return res;
}

async function persistStrategyRecord(payload, identity, { isUpdate = false, oldName = null } = {}) {
  const backend = getBackendApi();
  if (!payload?.name) return { success: false };
  const id = identity || strategyModalIdentity;
  const existing = findStrategyByIdentity(id) || getStrategyRecordByName(oldName || id?.originalName || payload.name);
  const shouldUpdate = isUpdate || hasStableIdentity(id);
  const fullPayload = {
    ...payload,
    client_uuid: payload.client_uuid || existing?.client_uuid || id?.client_uuid || null,
    remote_id: payload.remote_id || existing?.remote_id || id?.remote_id || null,
    id: payload.id ?? existing?.id ?? id?.id ?? null,
    previous_names: payload.previous_names || existing?.previous_names || [],
    description: payload.description ?? existing?.description ?? '',
    schedule_enabled: payload.schedule_enabled ?? existing?.schedule_enabled ?? false,
    operating_hours: payload.operating_hours ?? existing?.operating_hours ?? [],
  };
  if (shouldUpdate && backend?.updateRealStrategyLocal) {
    return updateRealStrategy(fullPayload, id, { oldName: oldName || id?.originalName });
  }
  if (backend?.addRealStrategyLocal) {
    return createRealStrategy(fullPayload);
  }
  return { success: false };
}

async function createRealAccount(payload) {
  const backend = getBackendApi();
  if (!payload?.name) return { success: false };
  console.log('[accounts] create requested', payload.name);
  const clientUuid = payload.client_uuid || makeClientUuidLocal();
  const account = normalizeAccount({ ...payload, client_uuid: clientUuid });
  const accounts = getAccounts();
  if (accounts.some((a) => a.name === account.name)) {
    return { success: false, error: 'DUPLICATE' };
  }
  accounts.push(account);
  await saveAccounts(accounts);
  if (backend?.addRealAccountLocal) {
    await backend.addRealAccountLocal({
      ...account,
      client_uuid: clientUuid,
      capital: account.capital,
      commissionPerLot: account.commissionPerLot,
      freeSwap: account.freeSwap,
    });
  }
  if (backend?.syncPendingChanges) void backend.syncPendingChanges();
  return { success: true, client_uuid: clientUuid };
}

function formatAccountSaveError(res) {
  const code = res?.error;
  if (code === 'NOT_FOUND') return 'no encontrada en la base local';
  if (code === 'NO_USER_ID') return 'sesión no disponible';
  if (code === 'MISSING_IDENTITY') return 'identidad de cuenta no válida';
  if (code === 'MISSING_NAME') return 'nombre obligatorio';
  if (code === 'DUPLICATE') return 'ya existe una cuenta con ese nombre';
  if (typeof code === 'object' && code?.message) return String(code.message);
  if (typeof code === 'string' && code) return code;
  return 'error desconocido';
}

function parseNumericField(value, fallback = 0) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function clearAccountModalFeedback() {
  const err = document.getElementById('accountModalError');
  const ok = document.getElementById('accountModalSuccess');
  if (err) {
    err.hidden = true;
    err.textContent = '';
  }
  if (ok) {
    ok.hidden = true;
    ok.textContent = '';
  }
}

function setAccountModalError(message) {
  console.log('[accountModal] save failed', message);
  const err = document.getElementById('accountModalError');
  const ok = document.getElementById('accountModalSuccess');
  if (ok) ok.hidden = true;
  if (err) {
    err.hidden = false;
    err.textContent = `No se pudo guardar la cuenta: ${message}`;
    err.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function setAccountModalSuccess(message) {
  console.log('[accountModal] save success', message);
  const err = document.getElementById('accountModalError');
  const ok = document.getElementById('accountModalSuccess');
  if (err) err.hidden = true;
  if (ok) {
    ok.hidden = false;
    ok.textContent = message;
  }
}

function clearStrategyModalFeedback() {
  const err = document.getElementById('strategyModalError');
  const ok = document.getElementById('strategyModalSuccess');
  if (err) {
    err.hidden = true;
    err.textContent = '';
  }
  if (ok) {
    ok.hidden = true;
    ok.textContent = '';
  }
}

function setStrategyModalError(message) {
  const err = document.getElementById('strategyModalError');
  const ok = document.getElementById('strategyModalSuccess');
  if (ok) ok.hidden = true;
  if (err) {
    err.hidden = false;
    err.textContent = `No se pudo guardar la estrategia: ${message}`;
    err.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

async function updateRealAccount(payload, identity, { oldName = null } = {}) {
  const backend = getBackendApi();
  if (!payload?.name) return { success: false, error: 'MISSING_NAME' };
  const id = identity || accountModalIdentity;
  if (!hasStableIdentity(id)) return { success: false, error: 'MISSING_IDENTITY' };
  console.log('[accounts] update requested using identity', id);

  let resolvedUuid = payload.client_uuid || id.client_uuid || null;
  let sqliteRes = { success: true };

  if (backend?.updateRealAccountLocal) {
    sqliteRes = await backend.updateRealAccountLocal({
      ...payload,
      client_uuid: resolvedUuid,
      remote_id: payload.remote_id || id.remote_id,
      id: payload.id ?? id.id,
      oldName: oldName || id.originalName,
      originalName: id.originalName,
      capital: payload.capital,
      commissionPerLot: payload.commissionPerLot,
      freeSwap: payload.freeSwap,
    });

    if (sqliteRes?.success === false && sqliteRes?.error === 'NOT_FOUND' && backend?.addRealAccountLocal) {
      resolvedUuid = resolvedUuid || makeClientUuidLocal();
      sqliteRes = await backend.addRealAccountLocal({
        ...payload,
        client_uuid: resolvedUuid,
        capital: payload.capital,
        commissionPerLot: payload.commissionPerLot,
        freeSwap: payload.freeSwap,
      });
    }

    if (sqliteRes?.success === false) return sqliteRes;
    if (backend.syncPendingChanges) void backend.syncPendingChanges();
  }

  const finalUuid = resolvedUuid || sqliteRes?.client_uuid || null;
  const accounts = getAccounts().map((a) =>
    accountMatchesIdentity(a, id)
      ? normalizeAccount({
          ...a,
          ...payload,
          client_uuid: finalUuid || a.client_uuid || id.client_uuid,
          remote_id: payload.remote_id || a.remote_id || id.remote_id,
          id: payload.id ?? a.id ?? id.id,
          previous_names: payload.previous_names || a.previous_names || [],
        })
      : a
  );
  await saveAccounts(accounts);
  return { success: true, client_uuid: finalUuid };
}

function updateTradeScheduleHints({ strategyId = 'strategy', entryId = 'entryTime', exitId = 'exitTime', noticeId = 'tradeScheduleNotice', warnId = 'tradeScheduleWarning', dateId = 'date' } = {}) {
  const notice = document.getElementById(noticeId);
  const warn = document.getElementById(warnId);
  if (!notice || !warn) return;

  const strategyName = String(document.getElementById(strategyId)?.value || '').trim();
  const entryTime = document.getElementById(entryId)?.value || '';
  const exitTime = document.getElementById(exitId)?.value || '';
  const tradeDate = document.getElementById(dateId)?.value || '';
  const rec = getStrategyRecordByName(strategyName);

  notice.hidden = true;
  warn.hidden = true;
  notice.textContent = '';
  warn.textContent = '';

  if (entryTime && exitTime) {
    const exitM = parseTimeToMinutes(exitTime);
    const entryMin = parseTimeToMinutes(entryTime);
    if (exitM != null && entryMin != null && exitM < entryMin) {
      notice.hidden = false;
      notice.textContent = t('trade_duration_midnight_hint');
    }
  }

  if (!rec?.schedule_enabled) return;

  const summary = formatOperatingHoursSummary(rec.operating_hours);
  if (summary) {
    notice.hidden = false;
    notice.textContent = t('trade_schedule_notice', 'Horario operativo: {hours}').replace('{hours}', summary);
  }

  if (!entryTime) return;
  const within = isEntryWithinOperatingHours(entryTime, rec.operating_hours, tradeDate);
  if (within === false) {
    warn.hidden = false;
    warn.textContent = t('trade_outside_schedule_warning');
  }
}

function fillSelect(selectId, values, placeholderKey) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = t(placeholderKey);
  select.appendChild(defaultOption);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (values.includes(previousValue)) select.value = previousValue;
  refreshCustomSelectForNative(select);
}

function isPersistentImagePath(value) {
  const pathStr = String(value || '');
  if (!pathStr) return false;
  if (pathStr.startsWith('blob:')) return false;
  return true;
}

const STORAGE_IMAGE_PREFIX = 'storage:';

function isStorageImageRef(value) {
  return String(value || '').startsWith(STORAGE_IMAGE_PREFIX);
}

async function selectTradeImagePersistently() {
  const backend = getBackendApi();

  if (!backend?.selectAndCopyTradeImage) {
    showToast('Selector de imagen no disponible', 'error');
    return '';
  }

  const result = await backend.selectAndCopyTradeImage();

  if (result?.cancelled) return '';

  if (!result?.success || !result?.path) {
    console.error('❌ No se pudo seleccionar/copiar imagen:', result);
    showToast('No se pudo guardar la imagen', 'error');
    return '';
  }

  return uploadTradeImageOrKeepLocal(result.path);
}

/**
 * Sube a Supabase Storage una imagen ya copiada a userData/trade-images y devuelve la
 * referencia remota. La copia local se conserva como caché. Si la subida falla (sin conexión,
 * sesión caducada...), no se pierde nada: se devuelve la ruta local y seguirá viéndose aquí.
 */
async function uploadTradeImageOrKeepLocal(localPath) {
  if (!localPath) return '';
  const backend = getBackendApi();
  if (!backend?.uploadTradeImage) return localPath;

  try {
    const uploaded = await backend.uploadTradeImage(localPath);
    if (uploaded?.success && uploaded?.ref) return uploaded.ref;
    console.warn('⚠️ Imagen guardada solo en local (no se pudo subir):', uploaded?.error);
    showToast('Imagen guardada en este equipo; no se pudo subir a la nube', 'warning');
  } catch (err) {
    console.warn('⚠️ Error subiendo imagen a Storage:', err);
  }
  return localPath;
}

/** Extensión a partir del nombre o del MIME del archivo soltado. */
function guessImageExtension(file) {
  const name = String(file?.name || '');
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) return name.slice(dot).toLowerCase();
  const type = String(file?.type || '');
  if (type === 'image/jpeg') return '.jpg';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/gif') return '.gif';
  return '.png';
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('READ_FAILED'));
    reader.onload = () => {
      // dataURL -> solo la parte base64
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma > -1 ? result.slice(comma + 1) : '');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Persiste una imagen soltada sobre el formulario y devuelve la referencia a guardar en el
 * trade (igual que si se hubiera elegido con el botón).
 *
 * Hay dos caminos porque no todo lo que se arrastra es un archivo del disco: desde el
 * Explorador llega una ruta real y basta con copiarla; desde el navegador solo llegan los
 * bytes, y entonces hay que escribir el archivo a partir de su contenido.
 */
async function persistDroppedImageFile(file) {
  const backend = getBackendApi();
  if (!file) return '';

  if (!String(file.type || '').startsWith('image/')) {
    showToast('El archivo no es una imagen', 'error');
    return '';
  }

  const filePath = backend?.getPathForFile ? backend.getPathForFile(file) : '';

  if (filePath && backend?.copyTradeImage) {
    const copied = await backend.copyTradeImage(filePath);
    if (copied?.success && copied?.path) return uploadTradeImageOrKeepLocal(copied.path);
    console.warn('⚠️ No se pudo copiar la imagen arrastrada:', copied?.error);
  }

  if (!backend?.saveTradeImageData) {
    showToast('No se pudo guardar la imagen', 'error');
    return '';
  }

  try {
    const base64 = await readFileAsBase64(file);
    if (!base64) {
      showToast('No se pudo leer la imagen', 'error');
      return '';
    }
    const saved = await backend.saveTradeImageData(base64, guessImageExtension(file));
    if (saved?.success && saved?.path) return uploadTradeImageOrKeepLocal(saved.path);
    console.error('❌ No se pudo guardar la imagen arrastrada:', saved?.error);
  } catch (err) {
    console.error('❌ Error leyendo la imagen arrastrada:', err);
  }

  showToast('No se pudo guardar la imagen', 'error');
  return '';
}

/**
 * Convierte el campo de una imagen en zona de arrastre. El área activa es todo el `.field`
 * (etiqueta + botón + vista previa) para que sea fácil acertar sin apuntar a un recuadro fino.
 */
function initTradeImageDropZone(inputId, onImageReady) {
  const input = document.getElementById(inputId);
  const zone = input?.closest('.field');
  if (!zone || zone.dataset.dropBound === 'true') return;
  zone.dataset.dropBound = 'true';

  // Sin una pista visible nadie descubre que el campo acepta arrastrar y soltar.
  if (!zone.querySelector('.image-drop-hint')) {
    const hint = document.createElement('span');
    hint.className = 'image-drop-hint';
    hint.textContent = t('image_drop_hint', 'o arrastra la imagen aquí');
    input.insertAdjacentElement('afterend', hint);
  }

  const hasFiles = (event) =>
    Array.from(event.dataTransfer?.types || []).includes('Files');

  const setActive = (active) => zone.classList.toggle('image-drop-active', active);

  zone.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;
    // Sin preventDefault el navegador rechaza el drop y Electron abriría el archivo.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setActive(true);
  });

  // dragleave salta también al pasar por encima de los hijos: solo se apaga si el puntero
  // ha salido de verdad del recuadro.
  zone.addEventListener('dragleave', (event) => {
    if (!zone.contains(event.relatedTarget)) setActive(false);
  });

  zone.addEventListener('drop', async (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;

    zone.classList.add('image-drop-busy');
    try {
      const ref = await persistDroppedImageFile(file);
      if (ref) await onImageReady(ref);
    } finally {
      zone.classList.remove('image-drop-busy');
    }
  });
}

function normalizeImageSrc(imagePath) {
  if (!imagePath) return '';

  const value = String(imagePath);

  if (value.startsWith('blob:')) return '';

  if (
    value.startsWith('file://') ||
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value;
  }

  if (/^[a-zA-Z]:\\/.test(value)) {
    return `file:///${value.replace(/\\/g, '/')}`;
  }

  if (value.startsWith('/')) {
    return `file://${value}`;
  }

  return '';
}

// Caché en memoria de las imágenes de Storage ya resueltas, para no pedir una signed URL (o
// releer el archivo) cada vez que se repinta una lista de trades.
const storageImageSrcCache = new Map();

/**
 * Migración en segundo plano: sube a Supabase Storage las imágenes que aún están guardadas como
 * ruta local (de antes de que existiera la nube) y actualiza la referencia en la BD, para que
 * también se puedan ver desde otros ordenadores.
 *
 * Silenciosa y tolerante a fallos: si algo no se puede subir, se deja como está y se reintentará
 * en el siguiente arranque. Nunca borra el archivo local (sigue siendo la caché).
 */
let tradeImagesMigrationDone = false;

async function migrateLocalTradeImagesToStorage() {
  if (tradeImagesMigrationDone) return;
  tradeImagesMigrationDone = true;

  const backend = getBackendApi();
  if (!backend?.uploadTradeImage) return;
  if (!isOnline() || isOfflineModeActive()) return;

  const needsUpload = (v) => {
    const s = String(v || '').trim();
    return Boolean(s) && !isStorageImageRef(s) && !s.startsWith('http://') && !s.startsWith('https://');
  };

  let migrated = 0;

  // 1) Trades reales
  try {
    for (const trade of Array.isArray(cachedTrades) ? cachedTrades : []) {
      const before = trade.image_before || trade.beforeImage || '';
      const after = trade.image_after || trade.afterImage || '';
      if (!needsUpload(before) && !needsUpload(after)) continue;

      const patch = {};
      if (needsUpload(before)) {
        const up = await backend.uploadTradeImage(before);
        if (up?.success && up.ref) patch.image_before = up.ref;
      }
      if (needsUpload(after)) {
        const up = await backend.uploadTradeImage(after);
        if (up?.success && up.ref) patch.image_after = up.ref;
      }
      if (!Object.keys(patch).length) continue;

      const res = await backend.updateTrade({ ...trade, ...patch });
      if (res?.success) {
        Object.assign(trade, patch);
        migrated += 1;
      }
    }
  } catch (err) {
    console.warn('⚠️ Migración de imágenes (trades reales) interrumpida:', err);
  }

  // 2) Trades de backtesting
  try {
    if (backend.updateBacktestTrade) {
      for (const trade of Array.isArray(cachedBacktestingTrades) ? cachedBacktestingTrades : []) {
        const before = trade.image_before || '';
        const after = trade.image_after || '';
        if (!needsUpload(before) && !needsUpload(after)) continue;

        const patch = {};
        if (needsUpload(before)) {
          const up = await backend.uploadTradeImage(before);
          if (up?.success && up.ref) patch.image_before = up.ref;
        }
        if (needsUpload(after)) {
          const up = await backend.uploadTradeImage(after);
          if (up?.success && up.ref) patch.image_after = up.ref;
        }
        if (!Object.keys(patch).length) continue;

        const res = await backend.updateBacktestTrade({ ...trade, ...patch });
        if (res?.success) {
          Object.assign(trade, patch);
          migrated += 1;
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ Migración de imágenes (backtesting) interrumpida:', err);
  }

  if (migrated > 0) {
    console.log(`✅ Imágenes migradas a la nube: ${migrated} trade(s)`);
    showToast?.(`${migrated} trade${migrated === 1 ? '' : 's'} con imágenes subidas a la nube`, 'success');
  }
}

async function getDisplayImageSrc(imagePath) {
  if (!imagePath) return '';

  const value = String(imagePath);

  if (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value.startsWith('blob:') ? '' : value;
  }

  const backend = getBackendApi();

  // Imagen en la nube: primero se intenta la copia local (instantánea y funciona sin conexión);
  // si no está en este equipo, se descarga a la caché y, como último recurso, se muestra con una
  // signed URL temporal.
  if (isStorageImageRef(value)) {
    if (storageImageSrcCache.has(value)) return storageImageSrcCache.get(value);

    if (backend?.cacheTradeImageLocally && backend?.readTradeImage) {
      try {
        const cached = await backend.cacheTradeImageLocally(value);
        if (cached?.success && cached?.path) {
          const local = await backend.readTradeImage(cached.path);
          if (local?.success && local?.src) {
            storageImageSrcCache.set(value, local.src);
            return local.src;
          }
        }
      } catch (err) {
        console.warn('⚠️ No se pudo cachear la imagen en local:', err);
      }
    }

    if (backend?.getTradeImageUrl) {
      try {
        const signed = await backend.getTradeImageUrl(value);
        if (signed?.success && signed?.url) {
          storageImageSrcCache.set(value, signed.url);
          return signed.url;
        }
        console.warn('⚠️ No se pudo obtener la URL de la imagen:', signed?.error);
      } catch (err) {
        console.warn('⚠️ Error obteniendo URL firmada:', err);
      }
    }
    return '';
  }

  if (backend?.readTradeImage) {
    const result = await backend.readTradeImage(value);

    if (result?.success && result?.src) {
      return result.src;
    }

    console.warn('⚠️ No se pudo leer imagen local:', result);
    return '';
  }

  return normalizeImageSrc(value);
}

function imagePathToSrc(path) {
  return normalizeImageSrc(path);
}

function updatePreview(previewId, path) {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  if (!path) {
    preview.style.display = 'none';
    preview.removeAttribute('src');
    return;
  }
  preview.src = normalizeImageSrc(path);
  preview.style.display = 'block';
}

async function updateImagePreview(imgId, buttonId, imagePath) {
  const img = document.getElementById(imgId);
  const btn = document.getElementById(buttonId);

  if (!img || !btn) return;

  const src = await getDisplayImageSrc(imagePath);

  if (!src) {
    img.style.display = 'none';
    btn.style.display = 'none';
    img.removeAttribute('src');
    return;
  }

  img.src = src;
  img.style.display = 'block';
  btn.style.display = 'inline-flex';

  btn.onclick = () => {
    openImageViewer(src);
  };
}

function openImageViewer(imagePathOrSrc) {
  if (!imagePathOrSrc) return;

  const value = String(imagePathOrSrc);
  const src = value.startsWith('data:') ? value : normalizeImageSrc(value);

  if (!src) return;

  let overlay = document.getElementById('imageViewerOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'imageViewerOverlay';
    overlay.className = 'image-viewer-overlay';
    overlay.innerHTML = `
      <div class="image-viewer-modal">
        <button type="button" id="closeImageViewer" class="image-viewer-close">Cerrar</button>
        <img id="imageViewerImg" alt="Imagen del trade" />
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const img = document.getElementById('imageViewerImg');
  const closeBtn = document.getElementById('closeImageViewer');

  if (img) img.src = src;

  overlay.classList.add('open');

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      overlay.classList.remove('open');
    };
  }

  overlay.onclick = (event) => {
    if (event.target === overlay) {
      overlay.classList.remove('open');
    }
  };
}

async function loadStrategies() {
  if (loadStrategiesPromise) {
    console.log('[real-lists] already loading, skip');
    return loadStrategiesPromise;
  }

  loadStrategiesPromise = (async () => {
    await syncRealListsFromStorage();
    const strategies = realStrategiesCache;
    fillSelect('strategy', strategies, 'placeholder_select_strategy');
    fillSelect('editStrategy', strategies, 'placeholder_select_strategy');
    fillSelect('resetStrategySelect', strategies, 'placeholder_select_strategy');
    renderSettingsStrategiesList();
    if (currentView === 'dashboard') {
      await renderDashboardFilters(cachedTrades);
      renderDashboardWithFilters({ skipCalendar: true });
    }
  })().finally(() => {
    loadStrategiesPromise = null;
  });

  return loadStrategiesPromise;
}

let withdrawalsCache = [];
let editingWithdrawalId = null;

function formatWithdrawalEuro(value) {
  const n = Number(value) || 0;
  return `${n.toFixed(2)}€`;
}

// Los gastos se muestran siempre en negativo (salida de dinero), aunque internamente
// se guarden y sumen como valores positivos.
function formatNegativeEuro(value) {
  const n = Math.abs(Number(value) || 0);
  if (n === 0) return formatWithdrawalEuro(0);
  return `-${formatWithdrawalEuro(n)}`;
}

function tradeOperationalNet(trade) {
  const net = Number(trade?.pnl_net ?? trade?.pnlNet);
  if (Number.isFinite(net)) return net;
  return (Number(trade?.pnl ?? 0) || 0) - (Number(trade?.commission ?? 0) || 0);
}

async function loadWithdrawalsCache() {
  const backend = getBackendApi();
  if (!backend?.getWithdrawalsLocal) {
    withdrawalsCache = [];
    return;
  }
  try {
    withdrawalsCache = await backend.getWithdrawalsLocal();
  } catch (err) {
    console.warn('No se pudieron cargar retiros locales:', err);
    withdrawalsCache = [];
  }
}

// El filtro de Retiros funciona por PROP (compartida con Gastos); el select del formulario
// es un vínculo OPCIONAL a una cuenta real configurada (independiente de la prop escrita).
function fillWithdrawalAccountSelects() {
  const props = getKnownExpenseProps();
  const filterSel = document.getElementById('withdrawalFilterAccount');
  if (filterSel) {
    const prev = filterSel.value;
    filterSel.innerHTML = '';
    const base = document.createElement('option');
    base.value = '';
    base.textContent = t('withdrawals_all_props', 'Todas las props');
    filterSel.appendChild(base);
    props.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      filterSel.appendChild(opt);
    });
    if (prev && props.includes(prev)) filterSel.value = prev;
  }

  const names = getAccounts().map((account) => account.name);
  const formSel = document.getElementById('withdrawalFormAccount');
  if (formSel) {
    const prev = formSel.value;
    formSel.innerHTML = '';
    const base = document.createElement('option');
    base.value = '';
    base.textContent = t('withdrawals_account_optional_placeholder', 'Sin vincular a una cuenta');
    formSel.appendChild(base);
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      formSel.appendChild(opt);
    });
    if (prev && names.includes(prev)) formSel.value = prev;
  }

  // Estos selects reconstruyen su innerHTML aquí; sin refrescar el "custom-select" que los
  // envuelve, su etiqueta visible se queda desactualizada (options viejas o valor no reflejado)
  // aunque el <select> nativo subyacente sí tenga el valor correcto.
  refreshCustomSelectForNative(filterSel);
  refreshCustomSelectForNative(formSel);
}

function getFilteredWithdrawalsList() {
  const account = document.getElementById('withdrawalFilterAccount')?.value || '';
  const from = document.getElementById('withdrawalFilterFrom')?.value || '';
  const to = document.getElementById('withdrawalFilterTo')?.value || '';
  return withdrawalsCache.filter((w) => {
    if (account && String(w.account_name || w.accountName) !== account) return false;
    if (from && String(w.date) < from) return false;
    if (to && String(w.date) > to) return false;
    return true;
  });
}

// El filtro es una prop, no una cuenta real; el scope de trades se calcula a partir de las
// cuentas reales vinculadas a esa prop (por account.prop_name) o cuyo propio nombre coincida
// (compatibilidad con retiros antiguos, que usaban el nombre de cuenta como "prop").
function getWithdrawalTradeScope() {
  const propFilter = document.getElementById('withdrawalFilterAccount')?.value || '';
  if (!propFilter) return cachedTrades;
  const matchingAccountNames = getAccounts()
    .filter((acc) => acc.name === propFilter || String(acc.prop_name || '').trim() === propFilter)
    .map((acc) => acc.name);
  if (!matchingAccountNames.length) return [];
  return cachedTrades.filter((trade) => matchingAccountNames.includes(String(trade.account || '')));
}

function renderWithdrawalsSummary(list, globalMetrics) {
  const total = list.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const count = list.length;
  const avg = count > 0 ? total / count : 0;
  const last = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('withdrawalSummaryTotal', formatWithdrawalEuro(total));
  set('withdrawalSummaryCount', String(count));
  set('withdrawalSummaryAvg', formatWithdrawalEuro(avg));
  set('withdrawalSummaryLast', last ? `${formatWithdrawalEuro(last.amount)} · ${formatDateEs(last.date)}` : '—');
  // Nota: el balance global ahora se muestra en el banner compartido de #managementView
  // (ver renderManagementBalanceBanner), no aquí; globalMetrics se conserva por compatibilidad de firma.
  void globalMetrics;
}

function renderWithdrawalsAnalytics(filteredList, metrics) {
  const byAccountEl = document.getElementById('withdrawalAnalyticsByAccount');
  if (byAccountEl) {
    const entries = Object.entries(metrics?.byAccount || {}).sort((a, b) => b[1].total - a[1].total);
    byAccountEl.innerHTML = entries.length
      ? entries
          .map(
            ([name, data]) =>
              `<li><span>${escapeHtmlChipText(name)} (${data.count})</span><strong>${formatWithdrawalEuro(data.total)}</strong></li>`
          )
          .join('')
      : '<li>—</li>';
  }

  const byMonthEl = document.getElementById('withdrawalAnalyticsByMonth');
  if (byMonthEl) {
    const entries = Object.entries(metrics?.byMonth || {}).sort((a, b) => b[0].localeCompare(a[0]));
    byMonthEl.innerHTML = entries.length
      ? entries
          .map(
            ([month, total]) =>
              `<li><span>${escapeHtmlChipText(formatMonthKeyDisplay(month))}</span><strong>${formatWithdrawalEuro(total)}</strong></li>`
          )
          .join('')
      : '<li>—</li>';
  }

  const topAccountEl = document.getElementById('withdrawalAnalyticsTopAccount');
  if (topAccountEl) {
    const entries = Object.entries(metrics?.byAccount || {}).sort((a, b) => b[1].total - a[1].total);
    const top = entries[0];
    topAccountEl.textContent = top
      ? `${top[0]} · ${formatWithdrawalEuro(top[1].total)}`
      : '—';
  }

  // "Operativo vs retirado" se quitó de Gestión: mezclaba el PnL de los trades (que no se
  // introduce aquí) con los retiros, y confundía más que ayudaba. El total retirado ya se ve
  // en las tarjetas de arriba.
}

function updateWithdrawalsLayoutState(hasAnyWithdrawals) {
  const emptyEl = document.getElementById('withdrawalsEmptyState');
  const bodyGrid = document.getElementById('withdrawalsBodyGrid');
  const filterBar = document.querySelector('#managementTabWithdrawals .wd-filter-bar');
  if (emptyEl) emptyEl.hidden = Boolean(hasAnyWithdrawals);
  if (bodyGrid) bodyGrid.hidden = !hasAnyWithdrawals;
  if (filterBar) filterBar.hidden = !hasAnyWithdrawals;
}

/* ── Agrupación por fecha de retiros/gastos ────────────────────────────────────────────────
 * Una lista plana de decenas de movimientos es difícil de leer. Se agrupa por cercanía
 * (Hoy / Ayer / Esta semana / Este mes) y, más atrás, por mes, con cabeceras plegables que
 * muestran cuántos movimientos hay y cuánto suman.
 */
const collapsedMovementGroups = new Set();

function buildMovementDateGroups(list) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  // Inicio de la semana en lunes (convención europea).
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const groups = new Map();
  const push = (key, label, order, item) => {
    if (!groups.has(key)) groups.set(key, { key, label, order, items: [], total: 0 });
    const g = groups.get(key);
    g.items.push(item);
    g.total += Number(item.amount) || 0;
  };

  [...list]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .forEach((item) => {
      const parsed = parseIsoDate(String(item.date || '').slice(0, 10));
      if (!parsed) {
        push('unknown', t('mov_group_undated', 'Sin fecha'), 9e15, item);
        return;
      }
      const d = new Date(parsed.year, parsed.month, parsed.day);
      const time = d.getTime();
      if (time === today.getTime()) push('today', t('mov_group_today', 'Hoy'), 0, item);
      else if (time === yesterday.getTime()) push('yesterday', t('mov_group_yesterday', 'Ayer'), 1, item);
      else if (d >= weekStart) push('week', t('mov_group_week', 'Esta semana'), 2, item);
      else if (d >= monthStart) push('month', t('mov_group_month', 'Este mes'), 3, item);
      else {
        const key = `m-${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}`;
        const label = formatMonthYear(parsed.year, parsed.month);
        // Orden descendente por fecha para los meses anteriores.
        push(key, label.charAt(0).toUpperCase() + label.slice(1), 1e13 - time, item);
      }
    });

  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/** Pinta un grupo (cabecera plegable + filas) dentro de un tbody. */
function appendMovementGroup(tbody, group, colspan, formatTotal, renderRow, defaultOpen, totalClass = '') {
  const groupId = `${tbody.id}:${group.key}`;
  // Por defecto se abren los grupos más recientes; el resto llegan plegados para que la vista
  // quepa de un vistazo. Las preferencias del usuario se recuerdan durante la sesión.
  if (!collapsedMovementGroups.has(groupId) && !defaultOpen && !collapsedMovementGroups.has(`seen:${groupId}`)) {
    collapsedMovementGroups.add(groupId);
  }
  collapsedMovementGroups.add(`seen:${groupId}`);
  const isCollapsed = collapsedMovementGroups.has(groupId);

  const headerRow = document.createElement('tr');
  headerRow.className = `wd-group-row${isCollapsed ? ' is-collapsed' : ''}`;
  headerRow.innerHTML = `
    <td colspan="${colspan}">
      <button type="button" class="wd-group-toggle" aria-expanded="${!isCollapsed}">
        <span class="wd-group-caret" aria-hidden="true">▾</span>
        <span class="wd-group-label">${escapeHtmlChipText(group.label)}</span>
        <span class="wd-group-count">${group.items.length}</span>
        <span class="wd-group-total ${totalClass}">${formatTotal(group.total)}</span>
      </button>
    </td>`;
  tbody.appendChild(headerRow);

  const rows = group.items.map((item) => {
    const tr = renderRow(item);
    tr.classList.add('wd-group-item');
    if (isCollapsed) tr.hidden = true;
    tbody.appendChild(tr);
    return tr;
  });

  headerRow.querySelector('.wd-group-toggle')?.addEventListener('click', () => {
    const nowCollapsed = !collapsedMovementGroups.has(groupId);
    if (nowCollapsed) collapsedMovementGroups.add(groupId);
    else collapsedMovementGroups.delete(groupId);
    headerRow.classList.toggle('is-collapsed', nowCollapsed);
    headerRow.querySelector('.wd-group-toggle')?.setAttribute('aria-expanded', String(!nowCollapsed));
    rows.forEach((tr) => {
      tr.hidden = nowCollapsed;
    });
  });
}

function renderWithdrawalsTable(list) {
  const tbody = document.getElementById('withdrawalsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!list.length) {
    const msg =
      withdrawalsCache.length > 0
        ? t('withdrawals_no_filter_results', 'No hay retiros con estos filtros')
        : t('withdrawals_empty', 'Sin retiros');
    tbody.innerHTML = `<tr><td colspan="5" class="withdrawals-empty">${escapeHtmlChipText(msg)}</td></tr>`;
    return;
  }

  const renderRow = (w) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtmlChipText(formatDateEs(w.date))}</td>
      <td>${escapeHtmlChipText(w.account_name || w.accountName || '')}</td>
      <td class="wd-amount wd-amount-withdrawal">${formatWithdrawalEuro(w.amount)}</td>
      <td>${escapeHtmlChipText(w.note || '—')}</td>
      <td class="withdrawals-actions">
        <button type="button" class="withdrawals-action-btn" data-withdrawal-edit="${w.id}">${escapeHtmlChipText(t('withdrawals_edit_btn', 'Editar'))}</button>
        <button type="button" class="withdrawals-action-btn danger" data-withdrawal-delete="${w.id}">${escapeHtmlChipText(t('withdrawals_delete_btn', 'Eliminar'))}</button>
      </td>`;
    return tr;
  };

  buildMovementDateGroups(list).forEach((group, index) => {
    appendMovementGroup(tbody, group, 5, formatWithdrawalEuro, renderRow, index < 2, 'wd-amount-withdrawal');
  });

  tbody.querySelectorAll('[data-withdrawal-edit]').forEach((btn) => {
    btn.addEventListener('click', () => startEditWithdrawal(Number(btn.dataset.withdrawalEdit)));
  });
  tbody.querySelectorAll('[data-withdrawal-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteWithdrawalAction(Number(btn.dataset.withdrawalDelete)));
  });
}

async function refreshWithdrawalsUI() {
  if (!document.getElementById('managementView')) return;
  await Promise.all([loadWithdrawalsCache(), loadExpensePropsCache(), loadExpenseCategoriesCache()]);
  fillWithdrawalAccountSelects();
  const filtered = getFilteredWithdrawalsList();
  const accounts = getAccounts().map((account) => ({
    name: account.name,
    capital: Number(account.capital ?? 0) || 0,
    prop_name: account.prop_name || null,
  }));
  const globalMetrics = calculateWithdrawalMetrics(withdrawalsCache, cachedTrades, accounts);
  const filteredMetrics = calculateWithdrawalMetrics(filtered, getWithdrawalTradeScope(), accounts);
  const hasAnyWithdrawals = withdrawalsCache.length > 0;
  updateWithdrawalsLayoutState(hasAnyWithdrawals);
  renderWithdrawalsSummary(filtered, globalMetrics);
  renderWithdrawalsTable(filtered);
  if (hasAnyWithdrawals) {
    renderWithdrawalsAnalytics(filtered, filteredMetrics);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function clearWithdrawalFilters() {
  const account = document.getElementById('withdrawalFilterAccount');
  const from = document.getElementById('withdrawalFilterFrom');
  const to = document.getElementById('withdrawalFilterTo');
  if (account) account.value = '';
  // dispatch change: refresca la etiqueta del selector de fecha propio al limpiar.
  [from, to].forEach((el) => {
    if (!el) return;
    el.value = '';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function setWithdrawalModalTitle(isEdit) {
  const titleEl = document.getElementById('withdrawalModalTitle');
  if (!titleEl) return;
  titleEl.textContent = isEdit
    ? t('withdrawals_modal_title_edit', 'Editar retiro')
    : t('withdrawals_modal_title_new', 'Nuevo retiro');
}

// Resuelve el nombre de la cuenta real vinculada (opcional) a un retiro existente, a partir
// de account_client_uuid/account_id, para poder preseleccionarla al editar.
function findLinkedAccountNameForWithdrawal(w) {
  if (!w) return '';
  const accounts = getAccounts();
  if (w.account_client_uuid) {
    const hit = accounts.find((a) => a.client_uuid && a.client_uuid === w.account_client_uuid);
    if (hit) return hit.name;
  }
  if (w.account_id) {
    const hit = accounts.find((a) => a.remote_id && String(a.remote_id) === String(w.account_id));
    if (hit) return hit.name;
  }
  return '';
}

function openWithdrawalModal({ editId = null } = {}) {
  const overlay = document.getElementById('withdrawalModalOverlay');
  if (!overlay) return;
  fillWithdrawalAccountSelects();
  resetWithdrawalForm({ keepEditingId: false });
  if (editId != null) {
    const w = withdrawalsCache.find((row) => row.id === editId);
    if (!w) return;
    editingWithdrawalId = editId;
    const propInput = document.getElementById('withdrawalFormProp');
    const accountLinkSelect = document.getElementById('withdrawalFormAccount');
    const dateInput = document.getElementById('withdrawalFormDate');
    const amountInput = document.getElementById('withdrawalFormAmount');
    const noteInput = document.getElementById('withdrawalFormNote');
    if (propInput) propInput.value = w.account_name || w.accountName || '';
    if (accountLinkSelect) accountLinkSelect.value = findLinkedAccountNameForWithdrawal(w);
    if (dateInput) dateInput.value = w.date || '';
    if (amountInput) amountInput.value = String(w.amount ?? '');
    if (noteInput) noteInput.value = w.note || '';
    const saveBtn = document.getElementById('saveWithdrawalBtn');
    if (saveBtn) saveBtn.textContent = t('withdrawals_save_btn', 'Guardar cambios');
    setWithdrawalModalTitle(true);
  } else {
    setWithdrawalModalTitle(false);
    const saveBtn = document.getElementById('saveWithdrawalBtn');
    if (saveBtn) saveBtn.textContent = t('withdrawals_add_btn', 'Añadir retiro');
  }
  // El valor de "Cuenta (opcional)" se asigna arriba con .value = ... directamente (sin evento
  // change), así que el custom-select que lo envuelve no se entera solo: hay que refrescarlo.
  refreshCustomSelectForNative(document.getElementById('withdrawalFormAccount'));
  syncCustomDatepicker('withdrawalFormDate');
  overlay.classList.add('active');
  document.getElementById('withdrawalFormProp')?.focus();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeWithdrawalModal() {
  const overlay = document.getElementById('withdrawalModalOverlay');
  if (overlay) overlay.classList.remove('active');
  resetWithdrawalForm();
}

function resetWithdrawalForm({ keepEditingId = false } = {}) {
  if (!keepEditingId) editingWithdrawalId = null;
  const dateInput = document.getElementById('withdrawalFormDate');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  const amountInput = document.getElementById('withdrawalFormAmount');
  if (amountInput) amountInput.value = '';
  const noteInput = document.getElementById('withdrawalFormNote');
  if (noteInput) noteInput.value = '';
  const propInput = document.getElementById('withdrawalFormProp');
  if (propInput) propInput.value = '';
  const accountLinkSelect = document.getElementById('withdrawalFormAccount');
  if (accountLinkSelect) accountLinkSelect.value = '';
  const saveBtn = document.getElementById('saveWithdrawalBtn');
  if (saveBtn) saveBtn.textContent = t('withdrawals_add_btn', 'Añadir retiro');
  syncCustomDatepicker('withdrawalFormDate');
  setWithdrawalModalTitle(false);
}

function startEditWithdrawal(id) {
  openWithdrawalModal({ editId: id });
}

async function saveWithdrawalAction() {
  const prop = document.getElementById('withdrawalFormProp')?.value?.trim();
  const linkedAccountName = document.getElementById('withdrawalFormAccount')?.value?.trim() || '';
  const date = document.getElementById('withdrawalFormDate')?.value;
  const amount = Number(document.getElementById('withdrawalFormAmount')?.value);
  const note = document.getElementById('withdrawalFormNote')?.value?.trim() || '';
  if (!prop || !date || !Number.isFinite(amount) || amount <= 0) {
    showToast(t('withdrawals_validation_error', 'Completa la prop, fecha e importe válido'), 'error');
    return;
  }
  if (withdrawalFormPropSuggestHandle && !withdrawalFormPropSuggestHandle.isValid()) {
    showToast(
      t('prop_selector_invalid', 'Selecciona una Prop de la lista (o créala antes en Configuración > Props y categorías)'),
      'error'
    );
    return;
  }
  const backend = getBackendApi();
  if (!backend) return;
  const payload = { account_name: prop, linked_account_name: linkedAccountName, date, amount, note };
  let res;
  if (editingWithdrawalId) {
    const existing = withdrawalsCache.find((w) => w.id === editingWithdrawalId);
    res = await backend.updateWithdrawalLocal({
      id: editingWithdrawalId,
      client_uuid: existing?.client_uuid,
      ...payload,
    });
  } else {
    res = await backend.addWithdrawalLocal(payload);
  }
  if (!res?.success) {
    showToast(res?.error || 'Error al guardar retiro', 'error');
    return;
  }
  closeWithdrawalModal();
  await registerExpensePropIfNew(prop);
  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  await refreshWithdrawalsUI();
  renderManagementBalanceBanner();
  showToast(t('withdrawals_saved', 'Retiro guardado'), 'success');
}

async function deleteWithdrawalAction(id) {
  const w = withdrawalsCache.find((row) => row.id === id);
  if (!w) return;
  const ok = await showConfirmModal({
    title: t('withdrawals_delete_title', 'Eliminar retiro'),
    message: t('withdrawals_delete_confirm', '¿Eliminar este retiro?'),
    confirmText: t('withdrawals_delete_btn', 'Eliminar'),
    cancelText: t('cancel', 'Cancelar'),
    danger: true,
  });
  if (!ok) return;
  const backend = getBackendApi();
  if (!backend?.deleteWithdrawalLocal) return;
  await backend.deleteWithdrawalLocal(w.client_uuid || String(w.id));
  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  if (editingWithdrawalId === id) closeWithdrawalModal();
  await refreshWithdrawalsUI();
  renderManagementBalanceBanner();
  showToast(t('withdrawals_deleted', 'Retiro eliminado'));
}

let withdrawalFormPropSuggestHandle = null;

function initWithdrawalsUI() {
  if (!document.getElementById('managementView')) return;
  withdrawalFormPropSuggestHandle = attachSuggestDropdown(
    'withdrawalFormProp',
    'withdrawalFormPropSuggest',
    getKnownExpensePropsRecentFirst,
    { strict: true }
  );
  // Datepicker propio (el nativo de Chromium no se puede tematizar y desentona con el tema oscuro).
  initTradeDatepicker('withdrawalFormDate');
  const openModal = () => openWithdrawalModal();
  document.getElementById('openWithdrawalModalBtn')?.addEventListener('click', openModal);
  document.getElementById('withdrawalsEmptyCta')?.addEventListener('click', openModal);
  document.getElementById('saveWithdrawalBtn')?.addEventListener('click', () => {
    saveWithdrawalAction().catch(console.error);
  });
  document.getElementById('cancelWithdrawalEditBtn')?.addEventListener('click', closeWithdrawalModal);
  document.getElementById('closeWithdrawalModalBtn')?.addEventListener('click', closeWithdrawalModal);
  document.getElementById('withdrawalModalOverlay')?.addEventListener('click', (event) => {
    if (event.target?.id === 'withdrawalModalOverlay') closeWithdrawalModal();
  });
  document.getElementById('withdrawalClearFiltersBtn')?.addEventListener('click', () => {
    clearWithdrawalFilters();
    refreshWithdrawalsUI().catch(console.error);
  });
  document.getElementById('goToManagementBtn')?.addEventListener('click', () => {
    showView('management');
    switchManagementTab('withdrawals');
  });
  ['withdrawalFilterAccount', 'withdrawalFilterFrom', 'withdrawalFilterTo'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      refreshWithdrawalsUI().catch(console.error);
    });
  });
  updateWithdrawalsLayoutState(false);
  resetWithdrawalForm();
}

// ------------------------ Gastos (mirror de Retiros) ------------------------

let expensesCache = [];
let expensePropsCache = [];
let editingExpenseId = null;

const EXPENSE_CATEGORY_SUGGESTIONS = ['Suscripción', 'Evaluación', 'Reset', 'Comisión externa', 'Otro'];

function formatExpenseEuro(value) {
  return formatNegativeEuro(value);
}

async function loadExpensesCache() {
  const backend = getBackendApi();
  if (!backend?.getExpensesLocal) {
    expensesCache = [];
    return;
  }
  try {
    expensesCache = await backend.getExpensesLocal();
  } catch (err) {
    console.warn('No se pudieron cargar gastos locales:', err);
    expensesCache = [];
  }
}

// Lista persistida de props (sobrevive aunque se borren todos los gastos que las usan).
async function loadExpensePropsCache() {
  const backend = getBackendApi();
  if (!backend?.getExpensePropsLocal) {
    expensePropsCache = [];
    return;
  }
  try {
    expensePropsCache = await backend.getExpensePropsLocal();
  } catch (err) {
    console.warn('No se pudieron cargar las props de gastos:', err);
    expensePropsCache = [];
  }
}

// Registra la prop (si es nueva) en la lista persistida para que quede disponible
// la próxima vez, aunque este gasto concreto se borre o edite después.
async function registerExpensePropIfNew(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const backend = getBackendApi();
  if (!backend?.addExpensePropLocal) return;
  try {
    await backend.addExpensePropLocal({ name: trimmed });
    await loadExpensePropsCache();
  } catch (err) {
    console.warn('No se pudo registrar la prop:', err);
  }
}

// Las props no dependen de las cuentas reales configuradas: el usuario las escribe libremente
// en el campo "Prop" (compartido entre Gastos y Retiros). Se sugieren a partir de la lista
// persistida, más el histórico de gastos y retiros ya guardados (por si hay datos previos a la
// existencia de la lista persistida, o retiros antiguos que usaban el nombre de una cuenta real).
function getKnownExpenseProps() {
  const names = new Set();
  expensePropsCache.forEach((p) => {
    const name = String(p?.name || '').trim();
    if (name) names.add(name);
  });
  expensesCache.forEach((e) => {
    const name = String(e.account_name || e.accountName || '').trim();
    if (name) names.add(name);
  });
  withdrawalsCache.forEach((w) => {
    const name = String(w.account_name || w.accountName || '').trim();
    if (name) names.add(name);
  });
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// Mismo listado que getKnownExpenseProps(), pero con la usada más recientemente arriba del
// todo (por fecha de gasto/retiro más reciente que la use), y alfabético para las que aún no
// se hayan usado nunca. Se usa en los selectores estrictos de Prop de Gastos/Retiros.
function getKnownExpensePropsRecentFirst() {
  const names = getKnownExpenseProps();
  const lastUsed = new Map();
  const consider = (rawName, rawDate) => {
    const name = String(rawName || '').trim();
    if (!name) return;
    const time = Date.parse(rawDate || '') || 0;
    const key = name.toLowerCase();
    const prev = lastUsed.get(key);
    if (!prev || time > prev) lastUsed.set(key, time);
  };
  expensesCache.forEach((e) => consider(e.account_name || e.accountName, e.created_at || e.date));
  withdrawalsCache.forEach((w) => consider(w.account_name || w.accountName, w.created_at || w.date));
  return names.sort((a, b) => {
    const ta = lastUsed.get(a.toLowerCase()) || 0;
    const tb = lastUsed.get(b.toLowerCase()) || 0;
    if (ta !== tb) return tb - ta;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
}

/* ───────────────────────── Categorías de gasto ─────────────────────────
 * Antes vivían solo en el localStorage de este equipo. Eso significaba que no viajaban a otro
 * ordenador ni al móvil, y como el móvil no podía ofrecerlas había que escribirlas a mano: así
 * es como aparecen "Reset" y "reset" como dos categorías distintas.
 *
 * Ahora se guardan como las props: tabla propia sincronizada (expense_categories), con la misma
 * cola offline. La lista antigua del navegador NO se borra y se usa para sembrar la tabla la
 * primera vez, de modo que quien ya tuviera categorías las conserva tal cual.
 *
 * Lo que NO cambia: la categoría de cada gasto sigue guardada en el propio gasto. Tocar esta
 * lista no altera ni un solo movimiento ya registrado.
 */
let customExpenseCategoriesCache = null;
let expenseCategoryIdsByName = new Map();

function normalizeCategoryNames(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach((raw) => {
    const name = String(raw || '').trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    out.push(name);
  });
  return out;
}

/** Categorías que el usuario ya tenía guardadas en este equipo, para la siembra inicial. */
async function getLegacyLocalCategories() {
  const key = await getUserScopedStorageKey('expense_categories');
  if (!key) return [];
  const stored = getStoredList(key);
  return Array.isArray(stored) ? normalizeCategoryNames(stored) : [];
}

async function loadExpenseCategoriesCache() {
  const backend = getBackendApi();
  if (!backend?.getExpenseCategoriesLocal) {
    // Sin el IPC nuevo (build antigua): se sigue con la lista local de siempre.
    customExpenseCategoriesCache = normalizeCategoryNames(
      (await getLegacyLocalCategories()).concat(EXPENSE_CATEGORY_SUGGESTIONS)
    );
    return;
  }

  let rows = [];
  try {
    rows = (await backend.getExpenseCategoriesLocal()) || [];
  } catch (err) {
    console.warn('No se pudieron leer las categorías guardadas:', err);
  }

  // Siembra: la primera vez la tabla está vacía, así que se rellena con lo que hubiera en este
  // equipo (o con las sugerencias por defecto si no había nada). Solo ocurre una vez porque
  // después la tabla ya no está vacía.
  if (!rows.length) {
    const legacy = await getLegacyLocalCategories();
    const seed = legacy.length ? legacy : EXPENSE_CATEGORY_SUGGESTIONS;
    for (const name of seed) {
      try {
        await backend.addExpenseCategoryLocal({ name });
      } catch (err) {
        console.warn('No se pudo migrar la categoría', name, err);
      }
    }
    if (backend.syncPendingChanges) void backend.syncPendingChanges();
    try {
      rows = (await backend.getExpenseCategoriesLocal()) || [];
    } catch {
      rows = seed.map((name) => ({ name, client_uuid: null }));
    }
  }

  expenseCategoryIdsByName = new Map();
  rows.forEach((row) => {
    const name = String(row?.name || '').trim();
    if (!name) return;
    expenseCategoryIdsByName.set(name.toLowerCase(), row.client_uuid || row.id);
  });
  customExpenseCategoriesCache = normalizeCategoryNames(rows.map((r) => r.name));
}

/**
 * Guarda la lista completa aplicando solo las diferencias.
 *
 * Las pantallas que la usan (renombrar, eliminar) piensan en términos de "esta es la lista que
 * debe quedar". Se comparan con la actual y se traducen a altas y bajas concretas, para no
 * borrar y recrear todo cada vez: eso rompería la identidad de cada categoría y llenaría la cola
 * de sincronización de ruido.
 */
async function saveCustomExpenseCategoriesList(list) {
  const next = normalizeCategoryNames(list);
  const backend = getBackendApi();

  if (!backend?.addExpenseCategoryLocal) {
    const key = await getUserScopedStorageKey('expense_categories');
    if (key) saveStoredList(key, next);
    customExpenseCategoriesCache = next;
    return;
  }

  const current = customExpenseCategoriesCache || [];
  const lower = (arr) => arr.map((c) => c.toLowerCase());
  const nextLower = lower(next);
  const currentLower = lower(current);

  for (const name of next) {
    if (!currentLower.includes(name.toLowerCase())) {
      await backend.addExpenseCategoryLocal({ name });
    }
  }
  for (const name of current) {
    if (!nextLower.includes(name.toLowerCase())) {
      const id = expenseCategoryIdsByName.get(name.toLowerCase());
      if (id != null) await backend.deleteExpenseCategoryLocal(String(id));
    }
  }

  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  await loadExpenseCategoriesCache();
}

/**
 * Categorías que se ofrecen al rellenar un gasto: exactamente las de la lista guardada.
 *
 * Antes se le sumaban las que aparecieran en gastos ya registrados. Parecía inofensivo, pero
 * resucitaba las que se habían borrado a propósito desde Configuración y hacía que el móvil y
 * el ordenador ofrecieran cosas distintas. Una categoría escrita al vuelo se añade sola a la
 * lista (registerExpenseCategoryIfNew), así que no se pierde nada por no mezclarlas aquí.
 *
 * Los gastos ya guardados conservan su categoría pase lo que pase: está escrita en la propia
 * fila del gasto, no depende de esta lista.
 */
function getKnownExpenseCategories() {
  const saved = customExpenseCategoriesCache;
  const source = saved && saved.length ? saved : EXPENSE_CATEGORY_SUGGESTIONS;
  const names = new Set();
  source.forEach((c) => {
    const name = String(c || '').trim();
    if (name) names.add(name);
  });
  return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

async function registerExpenseCategoryIfNew(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const list = customExpenseCategoriesCache || [];
  if (list.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;

  const backend = getBackendApi();
  if (backend?.addExpenseCategoryLocal) {
    await backend.addExpenseCategoryLocal({ name: trimmed });
    if (backend.syncPendingChanges) void backend.syncPendingChanges();
    await loadExpenseCategoriesCache();
    return;
  }
  await saveCustomExpenseCategoriesList([...list, trimmed]);
}

// ------------------------ Gestión: pestaña "Props y categorías" ------------------------

function matchesPropName(row, name) {
  const rowName = String(row?.account_name || row?.accountName || '').trim().toLowerCase();
  return rowName === name.trim().toLowerCase();
}

function getWithdrawalLinkedAccountName(w) {
  if (!w?.account_client_uuid) return '';
  const acc = realAccountsCache.find((a) => a.client_uuid === w.account_client_uuid);
  return acc?.name || '';
}

function renderMgmtConfigLists() {
  if (!document.getElementById('managementTabConfig')) return;
  renderMgmtConfigPropsList();
  renderMgmtConfigCategoriesList();
}

function renderMgmtConfigPropsList() {
  const host = document.getElementById('mgmtConfigPropsList');
  if (!host) return;
  const names = getKnownExpenseProps();
  if (!names.length) {
    host.innerHTML = `<li class="mgmt-config-empty">${escapeHtmlChipText(t('mgmt_config_no_props', 'Todavía no hay props guardadas.'))}</li>`;
    return;
  }
  host.innerHTML = names
    .map((name) => {
      const count =
        expensesCache.filter((e) => matchesPropName(e, name)).length +
        withdrawalsCache.filter((w) => matchesPropName(w, name)).length;
      const safeName = escapeAttrChip(name);
      return `
        <li class="mgmt-config-item" data-name="${safeName}">
          <div class="mgmt-config-item-name">
            <strong>${escapeHtmlChipText(name)}</strong>
            <span class="mgmt-config-item-count">${count} ${count === 1 ? t('mgmt_config_movement_singular', 'movimiento') : t('mgmt_config_movement_plural', 'movimientos')}</span>
          </div>
          <div class="mgmt-config-item-edit-row">
            <input type="text" class="input mgmt-config-edit-input" value="${safeName}" />
          </div>
          <div class="mgmt-config-item-actions">
            <button type="button" class="withdrawals-action-btn" data-prop-edit>${escapeHtmlChipText(t('mgmt_config_edit_btn', 'Editar'))}</button>
            <button type="button" class="withdrawals-action-btn" data-prop-save hidden>${escapeHtmlChipText(t('mgmt_config_save_btn', 'Guardar'))}</button>
            <button type="button" class="withdrawals-action-btn" data-prop-cancel hidden>${escapeHtmlChipText(t('cancel', 'Cancelar'))}</button>
            <button type="button" class="withdrawals-action-btn danger" data-prop-delete>${escapeHtmlChipText(t('mgmt_config_delete_btn', 'Eliminar'))}</button>
          </div>
        </li>`;
    })
    .join('');

  host.querySelectorAll('[data-prop-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.mgmt-config-item');
      li?.classList.add('editing');
      li?.querySelector('[data-prop-edit]')?.setAttribute('hidden', '');
      li?.querySelector('[data-prop-save]')?.removeAttribute('hidden');
      li?.querySelector('[data-prop-cancel]')?.removeAttribute('hidden');
      li?.querySelector('.mgmt-config-edit-input')?.focus();
    });
  });
  host.querySelectorAll('[data-prop-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => renderMgmtConfigPropsList());
  });
  host.querySelectorAll('[data-prop-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.mgmt-config-item');
      const oldName = li?.dataset.name || '';
      const newName = li?.querySelector('.mgmt-config-edit-input')?.value?.trim() || '';
      void renameMgmtProp(oldName, newName);
    });
  });
  host.querySelectorAll('[data-prop-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.mgmt-config-item');
      const name = li?.dataset.name || '';
      void deleteMgmtProp(name);
    });
  });
}

async function renameMgmtProp(oldName, newName) {
  if (!oldName || !newName || oldName === newName) {
    renderMgmtConfigLists();
    return;
  }
  const backend = getBackendApi();
  if (!backend) return;
  const prop = expensePropsCache.find((p) => String(p.name).toLowerCase() === oldName.toLowerCase());
  if (prop) {
    const res = await backend.updateExpensePropLocal({ id: prop.id, client_uuid: prop.client_uuid, name: newName });
    if (!res?.success) {
      showToast(res?.error === 'DUPLICATE_NAME' ? t('mgmt_config_duplicate_name', 'Ya existe una prop con ese nombre') : t('mgmt_config_error', 'No se pudo guardar'), 'error');
      return;
    }
  } else {
    // Prop derivada solo del histórico de gastos/retiros (nunca se registró en la lista
    // persistida): al renombrarla la damos de alta ya con el nombre nuevo.
    await registerExpensePropIfNew(newName);
  }

  const matchingExpenses = expensesCache.filter((e) => matchesPropName(e, oldName));
  const matchingWithdrawals = withdrawalsCache.filter((w) => matchesPropName(w, oldName));
  for (const e of matchingExpenses) {
    await backend.updateExpenseLocal({ id: e.id, client_uuid: e.client_uuid, account_name: newName });
  }
  for (const w of matchingWithdrawals) {
    await backend.updateWithdrawalLocal({
      id: w.id,
      client_uuid: w.client_uuid,
      account_name: newName,
      linked_account_name: getWithdrawalLinkedAccountName(w),
    });
  }

  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  await Promise.all([loadExpensesCache(), loadWithdrawalsCache(), loadExpensePropsCache()]);
  await refreshManagementUI();
  renderMgmtConfigLists();
  showToast(t('mgmt_config_prop_renamed', 'Prop renombrada'), 'success');
}

async function deleteMgmtProp(name) {
  if (!name) return;
  const backend = getBackendApi();
  if (!backend) return;

  const matchingExpenses = expensesCache.filter((e) => matchesPropName(e, name));
  const matchingWithdrawals = withdrawalsCache.filter((w) => matchesPropName(w, name));
  const totalLinked = matchingExpenses.length + matchingWithdrawals.length;

  let cascade = 'none';
  if (totalLinked > 0) {
    cascade = await showChoiceModal({
      title: t('mgmt_config_delete_prop_title', 'Eliminar prop'),
      message: t('mgmt_config_delete_prop_linked_msg', '"{name}" tiene {count} movimiento(s) (retiros/gastos) asignados. ¿Qué quieres hacer con ellos?')
        .replace('{name}', name)
        .replace('{count}', String(totalLinked)),
      choices: [
        { value: 'delete', label: t('mgmt_config_delete_prop_choice_delete', 'Borrar también sus movimientos'), danger: true },
        { value: 'unlink', label: t('mgmt_config_delete_prop_choice_unlink', 'Mantener movimientos (desvincular)') },
      ],
      cancelText: t('cancel', 'Cancelar'),
    });
    if (!cascade) return;
  } else {
    const ok = await showConfirmModal({
      title: t('mgmt_config_delete_prop_title', 'Eliminar prop'),
      message: t('mgmt_config_delete_prop_confirm', '¿Eliminar la prop "{name}"?').replace('{name}', name),
      confirmText: t('mgmt_config_delete_btn', 'Eliminar'),
      cancelText: t('cancel', 'Cancelar'),
      danger: true,
    });
    if (!ok) return;
  }

  if (cascade === 'delete') {
    for (const e of matchingExpenses) {
      await backend.deleteExpenseLocal(e.client_uuid || String(e.id));
    }
    for (const w of matchingWithdrawals) {
      await backend.deleteWithdrawalLocal(w.client_uuid || String(w.id));
    }
  } else if (cascade === 'unlink') {
    // account_name no puede quedar vacío (validación de retiros/gastos), así que se sustituye
    // por una etiqueta neutra: el movimiento se conserva íntegro, solo deja de estar asociado
    // al nombre de la prop que se acaba de eliminar.
    const placeholder = t('mgmt_config_unlinked_prop_label', 'Prop eliminada');
    for (const e of matchingExpenses) {
      await backend.updateExpenseLocal({ id: e.id, client_uuid: e.client_uuid, account_name: placeholder });
    }
    for (const w of matchingWithdrawals) {
      await backend.updateWithdrawalLocal({
        id: w.id,
        client_uuid: w.client_uuid,
        account_name: placeholder,
        linked_account_name: getWithdrawalLinkedAccountName(w),
      });
    }
  }

  const prop = expensePropsCache.find((p) => String(p.name).toLowerCase() === name.toLowerCase());
  if (prop && backend.deleteExpensePropLocal) {
    await backend.deleteExpensePropLocal(prop.client_uuid || prop.id);
  }

  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  await Promise.all([loadExpensesCache(), loadWithdrawalsCache(), loadExpensePropsCache()]);
  await refreshManagementUI();
  renderMgmtConfigLists();
  showToast(t('mgmt_config_prop_deleted', 'Prop eliminada'), 'success');
}

function renderMgmtConfigCategoriesList() {
  const host = document.getElementById('mgmtConfigCategoriesList');
  if (!host) return;
  const names = getKnownExpenseCategories();
  if (!names.length) {
    host.innerHTML = `<li class="mgmt-config-empty">${escapeHtmlChipText(t('mgmt_config_no_categories', 'Todavía no hay categorías guardadas.'))}</li>`;
    return;
  }
  host.innerHTML = names
    .map((name) => {
      const count = expensesCache.filter((e) => String(e.category || '').trim().toLowerCase() === name.toLowerCase()).length;
      const safeName = escapeAttrChip(name);
      return `
        <li class="mgmt-config-item" data-name="${safeName}">
          <div class="mgmt-config-item-name">
            <strong>${escapeHtmlChipText(name)}</strong>
            <span class="mgmt-config-item-count">${count} ${count === 1 ? t('expenses_nav_singular', 'gasto') : t('expenses_nav', 'gastos')}</span>
          </div>
          <div class="mgmt-config-item-edit-row">
            <input type="text" class="input mgmt-config-edit-input" value="${safeName}" />
          </div>
          <div class="mgmt-config-item-actions">
            <button type="button" class="withdrawals-action-btn" data-cat-edit>${escapeHtmlChipText(t('mgmt_config_edit_btn', 'Editar'))}</button>
            <button type="button" class="withdrawals-action-btn" data-cat-save hidden>${escapeHtmlChipText(t('mgmt_config_save_btn', 'Guardar'))}</button>
            <button type="button" class="withdrawals-action-btn" data-cat-cancel hidden>${escapeHtmlChipText(t('cancel', 'Cancelar'))}</button>
            <button type="button" class="withdrawals-action-btn danger" data-cat-delete>${escapeHtmlChipText(t('mgmt_config_delete_btn', 'Eliminar'))}</button>
          </div>
        </li>`;
    })
    .join('');

  host.querySelectorAll('[data-cat-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.mgmt-config-item');
      li?.classList.add('editing');
      li?.querySelector('[data-cat-edit]')?.setAttribute('hidden', '');
      li?.querySelector('[data-cat-save]')?.removeAttribute('hidden');
      li?.querySelector('[data-cat-cancel]')?.removeAttribute('hidden');
      li?.querySelector('.mgmt-config-edit-input')?.focus();
    });
  });
  host.querySelectorAll('[data-cat-cancel]').forEach((btn) => {
    btn.addEventListener('click', () => renderMgmtConfigCategoriesList());
  });
  host.querySelectorAll('[data-cat-save]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.mgmt-config-item');
      const oldName = li?.dataset.name || '';
      const newName = li?.querySelector('.mgmt-config-edit-input')?.value?.trim() || '';
      void renameMgmtCategory(oldName, newName);
    });
  });
  host.querySelectorAll('[data-cat-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const li = btn.closest('.mgmt-config-item');
      const name = li?.dataset.name || '';
      void deleteMgmtCategory(name);
    });
  });
}

async function renameMgmtCategory(oldName, newName) {
  if (!oldName || !newName || oldName === newName) {
    renderMgmtConfigLists();
    return;
  }
  if ((customExpenseCategoriesCache || []).some((c) => c.toLowerCase() === newName.toLowerCase())) {
    showToast(t('mgmt_config_duplicate_name', 'Ya existe una categoría con ese nombre'), 'error');
    return;
  }
  const list = (customExpenseCategoriesCache || []).map((c) => (c.toLowerCase() === oldName.toLowerCase() ? newName : c));
  await saveCustomExpenseCategoriesList(list);

  const backend = getBackendApi();
  const matchingExpenses = expensesCache.filter((e) => String(e.category || '').trim().toLowerCase() === oldName.toLowerCase());
  if (backend) {
    for (const e of matchingExpenses) {
      await backend.updateExpenseLocal({ id: e.id, client_uuid: e.client_uuid, category: newName });
    }
    if (backend.syncPendingChanges) void backend.syncPendingChanges();
  }

  await loadExpensesCache();
  await refreshManagementUI();
  renderMgmtConfigLists();
  showToast(t('mgmt_config_category_renamed', 'Categoría renombrada'), 'success');
}

async function deleteMgmtCategory(name) {
  if (!name) return;
  const count = expensesCache.filter((e) => String(e.category || '').trim().toLowerCase() === name.toLowerCase()).length;
  const ok = await showConfirmModal({
    title: t('mgmt_config_delete_category_title', 'Eliminar categoría'),
    message:
      count > 0
        ? t('mgmt_config_delete_category_linked_msg', '"{name}" se quita de la lista de sugerencias. Los {count} gasto(s) que ya la usan conservan su categoría tal cual.')
            .replace('{name}', name)
            .replace('{count}', String(count))
        : t('mgmt_config_delete_category_confirm', '¿Eliminar la categoría "{name}"?').replace('{name}', name),
    confirmText: t('mgmt_config_delete_btn', 'Eliminar'),
    cancelText: t('cancel', 'Cancelar'),
    danger: true,
  });
  if (!ok) return;

  const list = (customExpenseCategoriesCache || []).filter((c) => c.toLowerCase() !== name.toLowerCase());
  await saveCustomExpenseCategoriesList(list);
  renderMgmtConfigLists();
  showToast(t('mgmt_config_category_deleted', 'Categoría eliminada'), 'success');
}

function initMgmtConfigTab() {
  if (!document.getElementById('managementTabConfig')) return;
  document.getElementById('mgmtConfigAddPropBtn')?.addEventListener('click', () => {
    void (async () => {
      const input = document.getElementById('mgmtConfigNewPropInput');
      const name = input?.value?.trim() || '';
      if (!name) return;
      await registerExpensePropIfNew(name);
      if (input) input.value = '';
      renderMgmtConfigLists();
      showToast(t('mgmt_config_prop_added', 'Prop añadida'), 'success');
    })();
  });
  document.getElementById('mgmtConfigNewPropInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') document.getElementById('mgmtConfigAddPropBtn')?.click();
  });
  document.getElementById('mgmtConfigAddCategoryBtn')?.addEventListener('click', () => {
    void (async () => {
      const input = document.getElementById('mgmtConfigNewCategoryInput');
      const name = input?.value?.trim() || '';
      if (!name) return;
      await registerExpenseCategoryIfNew(name);
      if (input) input.value = '';
      renderMgmtConfigLists();
      showToast(t('mgmt_config_category_added', 'Categoría añadida'), 'success');
    })();
  });
  document.getElementById('mgmtConfigNewCategoryInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') document.getElementById('mgmtConfigAddCategoryBtn')?.click();
  });
}

function fillExpenseAccountSelects() {
  const names = getKnownExpenseProps();

  // Filtro (select): reconstruir opciones conservando el valor seleccionado si sigue existiendo.
  const filterSel = document.getElementById('expenseFilterAccount');
  if (filterSel) {
    const prev = filterSel.value;
    filterSel.innerHTML = '';
    const base = document.createElement('option');
    base.value = '';
    base.textContent = t('expenses_all_props', 'Todas las props');
    filterSel.appendChild(base);
    names.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      filterSel.appendChild(opt);
    });
    if (prev && names.includes(prev)) filterSel.value = prev;
  }
  // Igual que en fillWithdrawalAccountSelects: refrescamos el custom-select tras reconstruir
  // las opciones del <select> nativo para que la etiqueta visible no quede desactualizada.
  refreshCustomSelectForNative(filterSel);

  // El campo del formulario usa el panel de sugerencias propio (ver attachSuggestDropdown),
  // que lee getKnownExpenseProps() en caliente; no necesita repoblarse aquí.
}

function getFilteredExpensesList() {
  const account = document.getElementById('expenseFilterAccount')?.value || '';
  const from = document.getElementById('expenseFilterFrom')?.value || '';
  const to = document.getElementById('expenseFilterTo')?.value || '';
  return expensesCache.filter((e) => {
    if (account && String(e.account_name || e.accountName) !== account) return false;
    if (from && String(e.date) < from) return false;
    if (to && String(e.date) > to) return false;
    return true;
  });
}

function renderExpensesSummary(list) {
  const total = list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const count = list.length;
  const avg = count > 0 ? total / count : 0;
  const last = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('expenseSummaryTotal', formatExpenseEuro(total));
  set('expenseSummaryCount', String(count));
  set('expenseSummaryAvg', formatExpenseEuro(avg));
  set('expenseSummaryLast', last ? `${formatExpenseEuro(last.amount)} · ${formatDateEs(last.date)}` : '—');
}

function renderExpensesAnalytics(metrics) {
  const byAccountEl = document.getElementById('expenseAnalyticsByAccount');
  if (byAccountEl) {
    const entries = Object.entries(metrics?.byAccount || {}).sort((a, b) => b[1].total - a[1].total);
    byAccountEl.innerHTML = entries.length
      ? entries
          .map(
            ([name, data]) =>
              `<li><span>${escapeHtmlChipText(name)} (${data.count})</span><strong>${formatExpenseEuro(data.total)}</strong></li>`
          )
          .join('')
      : '<li>—</li>';
  }

  const byMonthEl = document.getElementById('expenseAnalyticsByMonth');
  if (byMonthEl) {
    const entries = Object.entries(metrics?.byMonth || {}).sort((a, b) => b[0].localeCompare(a[0]));
    byMonthEl.innerHTML = entries.length
      ? entries
          .map(
            ([month, total]) =>
              `<li><span>${escapeHtmlChipText(formatMonthKeyDisplay(month))}</span><strong>${formatExpenseEuro(total)}</strong></li>`
          )
          .join('')
      : '<li>—</li>';
  }

  const byCategoryEl = document.getElementById('expenseAnalyticsByCategory');
  if (byCategoryEl) {
    const entries = Object.entries(metrics?.byCategory || {}).sort((a, b) => b[1] - a[1]);
    byCategoryEl.innerHTML = entries.length
      ? entries
          .map(
            ([cat, total]) =>
              `<li><span>${escapeHtmlChipText(cat)}</span><strong>${formatExpenseEuro(total)}</strong></li>`
          )
          .join('')
      : '<li>—</li>';
  }
}

function updateExpensesLayoutState(hasAnyExpenses) {
  const emptyEl = document.getElementById('expensesEmptyState');
  const bodyGrid = document.getElementById('expensesBodyGrid');
  const filterBar = document.querySelector('#managementTabExpenses .wd-filter-bar');
  if (emptyEl) emptyEl.hidden = Boolean(hasAnyExpenses);
  if (bodyGrid) bodyGrid.hidden = !hasAnyExpenses;
  if (filterBar) filterBar.hidden = !hasAnyExpenses;
}

function renderExpensesTable(list) {
  const tbody = document.getElementById('expensesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!list.length) {
    const msg =
      expensesCache.length > 0
        ? t('expenses_no_filter_results', 'No hay gastos con estos filtros')
        : t('expenses_empty', 'Sin gastos');
    tbody.innerHTML = `<tr><td colspan="7" class="withdrawals-empty">${escapeHtmlChipText(msg)}</td></tr>`;
    return;
  }
  const renderRow = (e) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtmlChipText(formatDateEs(e.date))}</td>
      <td>${escapeHtmlChipText(e.account_name || e.accountName || '')}</td>
      <td>${escapeHtmlChipText(e.account_size || '—')}</td>
      <td>${escapeHtmlChipText(e.category || '—')}</td>
      <td class="wd-amount wd-amount-expense">${formatExpenseEuro(e.amount)}</td>
      <td>${escapeHtmlChipText(e.note || '—')}</td>
      <td class="withdrawals-actions">
        <button type="button" class="withdrawals-action-btn" data-expense-edit="${e.id}">${escapeHtmlChipText(t('withdrawals_edit_btn', 'Editar'))}</button>
        <button type="button" class="withdrawals-action-btn danger" data-expense-delete="${e.id}">${escapeHtmlChipText(t('withdrawals_delete_btn', 'Eliminar'))}</button>
      </td>`;
    return tr;
  };

  buildMovementDateGroups(list).forEach((group, index) => {
    appendMovementGroup(tbody, group, 7, formatExpenseEuro, renderRow, index < 2, 'wd-amount-expense');
  });

  tbody.querySelectorAll('[data-expense-edit]').forEach((btn) => {
    btn.addEventListener('click', () => startEditExpense(Number(btn.dataset.expenseEdit)));
  });
  tbody.querySelectorAll('[data-expense-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteExpenseAction(Number(btn.dataset.expenseDelete)));
  });
}

async function refreshExpensesUI() {
  if (!document.getElementById('managementView')) return;
  await Promise.all([loadExpensesCache(), loadExpensePropsCache(), loadExpenseCategoriesCache()]);
  fillExpenseAccountSelects();
  const filtered = getFilteredExpensesList();
  const filteredMetrics = calculateExpenseMetrics(filtered);
  const hasAnyExpenses = expensesCache.length > 0;
  updateExpensesLayoutState(hasAnyExpenses);
  renderExpensesSummary(filtered);
  renderExpensesTable(filtered);
  if (hasAnyExpenses) {
    renderExpensesAnalytics(filteredMetrics);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function clearExpenseFilters() {
  const account = document.getElementById('expenseFilterAccount');
  const from = document.getElementById('expenseFilterFrom');
  const to = document.getElementById('expenseFilterTo');
  if (account) account.value = '';
  [from, to].forEach((el) => {
    if (!el) return;
    el.value = '';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function setExpenseModalTitle(isEdit) {
  const titleEl = document.getElementById('expenseModalTitle');
  if (!titleEl) return;
  titleEl.textContent = isEdit
    ? t('expenses_modal_title_edit', 'Editar gasto')
    : t('expenses_modal_title_new', 'Nuevo gasto');
}

function openExpenseModal({ editId = null } = {}) {
  const overlay = document.getElementById('expenseModalOverlay');
  if (!overlay) return;
  fillExpenseAccountSelects();
  resetExpenseForm({ keepEditingId: false });
  if (editId != null) {
    const e = expensesCache.find((row) => row.id === editId);
    if (!e) return;
    editingExpenseId = editId;
    const accountInput = document.getElementById('expenseFormAccount');
    const accountSizeInput = document.getElementById('expenseFormAccountSize');
    const dateInput = document.getElementById('expenseFormDate');
    const amountInput = document.getElementById('expenseFormAmount');
    const categoryInput = document.getElementById('expenseFormCategory');
    const noteInput = document.getElementById('expenseFormNote');
    if (accountInput) accountInput.value = e.account_name || e.accountName || '';
    if (accountSizeInput) accountSizeInput.value = e.account_size || '';
    if (dateInput) dateInput.value = e.date || '';
    if (amountInput) amountInput.value = String(e.amount ?? '');
    if (categoryInput) categoryInput.value = e.category || '';
    if (noteInput) noteInput.value = e.note || '';
    const saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) saveBtn.textContent = t('expenses_save_btn', 'Guardar cambios');
    setExpenseModalTitle(true);
  } else {
    setExpenseModalTitle(false);
    const saveBtn = document.getElementById('saveExpenseBtn');
    if (saveBtn) saveBtn.textContent = t('expenses_add_btn', 'Añadir gasto');
  }
  // "Tamaño de cuenta" se asigna arriba con .value = ... directamente (sin evento change), así
  // que el custom-select que lo envuelve no se entera solo: hay que refrescarlo.
  refreshCustomSelectForNative(document.getElementById('expenseFormAccountSize'));
  syncCustomDatepicker('expenseFormDate');
  syncExpenseCreateAccount({ auto: true });
  overlay.classList.add('active');
  document.getElementById('expenseFormAccount')?.focus();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeExpenseModal() {
  const overlay = document.getElementById('expenseModalOverlay');
  if (overlay) overlay.classList.remove('active');
  resetExpenseForm();
}

function resetExpenseForm({ keepEditingId = false } = {}) {
  if (!keepEditingId) editingExpenseId = null;
  // La casilla de crear cuenta vuelve a estar sin tocar: cada gasto nuevo se juzga por su
  // categoría, no arrastra lo que se decidiera en el anterior.
  const createAccountCheck = document.getElementById('expenseFormCreateAccount');
  if (createAccountCheck) {
    createAccountCheck.checked = false;
    delete createAccountCheck.dataset.touched;
  }
  const accountNumberInput = document.getElementById('expenseFormAccountNumber');
  if (accountNumberInput) accountNumberInput.value = '';
  const dateInput = document.getElementById('expenseFormDate');
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  const amountInput = document.getElementById('expenseFormAmount');
  if (amountInput) amountInput.value = '';
  const categoryInput = document.getElementById('expenseFormCategory');
  if (categoryInput) categoryInput.value = '';
  const noteInput = document.getElementById('expenseFormNote');
  if (noteInput) noteInput.value = '';
  const accountInput = document.getElementById('expenseFormAccount');
  if (accountInput) accountInput.value = '';
  const accountSizeInput = document.getElementById('expenseFormAccountSize');
  if (accountSizeInput) accountSizeInput.value = '';
  const saveBtn = document.getElementById('saveExpenseBtn');
  if (saveBtn) saveBtn.textContent = t('expenses_add_btn', 'Añadir gasto');
  syncCustomDatepicker('expenseFormDate');
  setExpenseModalTitle(false);
}

function startEditExpense(id) {
  openExpenseModal({ editId: id });
}

/* ───────── Crear la cuenta al registrar la compra de un challenge ───────── */

function expenseAccountPreviewName() {
  return buildAccountNameFromExpense({
    prop: document.getElementById('expenseFormAccount')?.value?.trim(),
    size: document.getElementById('expenseFormAccountSize')?.value?.trim(),
    accountNumber: document.getElementById('expenseFormAccountNumber')?.value?.trim(),
    existingNames: getAccounts().map((a) => a.name),
  });
}

/**
 * Refresca la casilla de "crear también la cuenta".
 *
 * Se propone marcada solo cuando la categoría sugiere una compra de cuenta (Evaluación,
 * Activación, Reset...) y hay tamaño elegido: proponerla en una suscripción mensual llenaría el
 * listado de cuentas fantasma. Si el usuario la toca a mano, se respeta su decisión.
 */
function syncExpenseCreateAccount({ auto = false } = {}) {
  const check = document.getElementById('expenseFormCreateAccount');
  const wrap = document.getElementById('expenseFormAccountNumberWrap');
  const preview = document.getElementById('expenseFormAccountPreview');
  if (!check) return;

  // Editar un gasto ya registrado no vuelve a crear cuentas: la cuenta, si tocaba, ya se creó.
  const editing = Boolean(editingExpenseId);
  const container = check.closest('.expense-create-account');
  if (container) container.hidden = editing;
  if (editing) {
    check.checked = false;
    if (wrap) wrap.hidden = true;
    return;
  }

  if (auto && !check.dataset.touched) {
    const category = document.getElementById('expenseFormCategory')?.value || '';
    const size = document.getElementById('expenseFormAccountSize')?.value || '';
    check.checked = Boolean(size) && looksLikeAccountPurchase(category);
  }

  if (wrap) wrap.hidden = !check.checked;
  if (preview) {
    const name = expenseAccountPreviewName();
    preview.textContent = name ? `Se creará la cuenta "${name}"` : 'Elige prop y tamaño para crear la cuenta.';
  }
}

/**
 * Crea la cuenta asociada a un gasto. Devuelve el nombre creado, o null si no se creó.
 *
 * Nunca bloquea el gasto: si la cuenta falla, el gasto ya está guardado y se avisa aparte. Son
 * dos cosas distintas y perder el gasto por un problema al crear la cuenta sería peor.
 */
async function createAccountFromExpense({ prop, size, accountNumber }) {
  const name = buildAccountNameFromExpense({
    prop,
    size,
    accountNumber,
    existingNames: getAccounts().map((a) => a.name),
  });
  if (!name) return null;

  const res = await createRealAccount({
    name,
    prop_name: prop || null,
    account_number: accountNumber || null,
    account_type: 'challenge',
    capital: accountSizeToCapital(size),
    commissionPerLot: 0,
    freeSwap: false,
    challenge_passed: false,
    disabled_by_max_dd: false,
  });

  if (!res?.success) {
    showToast(
      res?.error === 'DUPLICATE'
        ? `Ya existe una cuenta llamada "${name}"`
        : 'El gasto se guardó, pero no se pudo crear la cuenta',
      'warning'
    );
    return null;
  }

  await loadAccounts();
  return name;
}

async function saveExpenseAction() {
  const account = document.getElementById('expenseFormAccount')?.value?.trim();
  const accountSize = document.getElementById('expenseFormAccountSize')?.value?.trim() || '';
  const date = document.getElementById('expenseFormDate')?.value;
  const amount = Number(document.getElementById('expenseFormAmount')?.value);
  const category = document.getElementById('expenseFormCategory')?.value?.trim() || '';
  const note = document.getElementById('expenseFormNote')?.value?.trim() || '';
  if (!account || !date || !Number.isFinite(amount) || amount <= 0) {
    showToast(t('expenses_validation_error', 'Completa cuenta, fecha e importe válido'), 'error');
    return;
  }
  if (expenseFormAccountSuggestHandle && !expenseFormAccountSuggestHandle.isValid()) {
    showToast(
      t('prop_selector_invalid', 'Selecciona una Prop de la lista (o créala antes en Configuración > Props y categorías)'),
      'error'
    );
    return;
  }
  const backend = getBackendApi();
  if (!backend) return;
  const payload = { account_name: account, account_size: accountSize, date, amount, category, note };
  let res;
  if (editingExpenseId) {
    const existing = expensesCache.find((e) => e.id === editingExpenseId);
    res = await backend.updateExpenseLocal({
      id: editingExpenseId,
      client_uuid: existing?.client_uuid,
      ...payload,
    });
  } else {
    res = await backend.addExpenseLocal(payload);
  }
  if (!res?.success) {
    showToast(res?.error || 'Error al guardar gasto', 'error');
    return;
  }
  const createAccount =
    !editingExpenseId && Boolean(document.getElementById('expenseFormCreateAccount')?.checked);
  const accountNumber = document.getElementById('expenseFormAccountNumber')?.value?.trim() || '';

  closeExpenseModal();
  await registerExpensePropIfNew(account);
  await registerExpenseCategoryIfNew(category);
  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  await refreshExpensesUI();
  renderManagementBalanceBanner();

  let createdAccountName = null;
  if (createAccount) {
    createdAccountName = await createAccountFromExpense({
      prop: account,
      size: accountSize,
      accountNumber,
    });
  }

  showToast(
    createdAccountName
      ? `Gasto guardado y cuenta "${createdAccountName}" creada`
      : t('expenses_saved', 'Gasto guardado'),
    'success'
  );
}

async function deleteExpenseAction(id) {
  const e = expensesCache.find((row) => row.id === id);
  if (!e) return;
  const ok = await showConfirmModal({
    title: t('expenses_delete_title', 'Eliminar gasto'),
    message: t('expenses_delete_confirm', '¿Eliminar este gasto?'),
    confirmText: t('withdrawals_delete_btn', 'Eliminar'),
    cancelText: t('cancel', 'Cancelar'),
    danger: true,
  });
  if (!ok) return;
  const backend = getBackendApi();
  if (!backend?.deleteExpenseLocal) return;
  await backend.deleteExpenseLocal(e.client_uuid || String(e.id));
  if (backend.syncPendingChanges) void backend.syncPendingChanges();
  if (editingExpenseId === id) closeExpenseModal();
  await refreshExpensesUI();
  renderManagementBalanceBanner();
  showToast(t('expenses_deleted', 'Gasto eliminado'));
}

// Panel de sugerencias propio (tematizado) para sustituir al popup nativo de <datalist>,
// que en Electron/Chromium no se puede estilizar acorde al tema oscuro de la app.
function attachSuggestDropdown(inputId, panelId, getItems, options = {}) {
  const input = document.getElementById(inputId);
  const panel = document.getElementById(panelId);
  if (!input || !panel || input.dataset.suggestInit === '1') return null;
  input.dataset.suggestInit = '1';
  // strict: el campo deja de ser texto libre y se convierte en un selector — el valor final
  // tiene que coincidir con uno de los elementos de getItems() (p.ej. Props ya creadas), si no
  // se revierte al último valor válido. Se usa para Prop en Gastos/Retiros: ya no se puede crear
  // una prop nueva escribiendo en ese campo, hay que darla de alta antes en Configuración.
  const strict = Boolean(options.strict);
  // Muestra la lista completa al enfocar aunque no sea estricto (comportamiento de desplegable).
  const openAllOnFocus = Boolean(options.openAllOnFocus) || strict;
  let lastValidValue = strict ? String(input.value || '').trim() : '';
  // Contenedor con apariencia de <select> (flecha): hay que marcarlo abierto/cerrado para girarla.
  const selectWrap = input.closest('.suggest-wrap--select');
  const setOpenState = (isOpen) => selectWrap?.classList.toggle('is-open', Boolean(isOpen));

  function renderItems(items) {
    if (!items.length) {
      // En modo selector el vacío es accionable: hay que dar de alta la prop en Configuración.
      const emptyMsg = strict
        ? t('prop_selector_empty', 'No hay props. Créalas en Configuración > Props y categorías')
        : t('no_results', 'Sin sugerencias');
      panel.innerHTML = `<div class="suggest-empty">${escapeHtmlChipText(emptyMsg)}</div>`;
      return;
    }
    panel.innerHTML = items
      .map((item) => `<button type="button" class="suggest-item" data-value="${escapeAttrChip(item)}">${escapeHtmlChipText(item)}</button>`)
      .join('');
  }

  function findExactMatch(value) {
    const all = (typeof getItems === 'function' ? getItems() : []) || [];
    const needle = String(value || '').trim().toLowerCase();
    if (!needle) return '';
    return all.find((item) => String(item).trim().toLowerCase() === needle) || '';
  }

  function enforceStrictValue() {
    if (!strict) return;
    const current = String(input.value || '').trim();
    if (!current) {
      lastValidValue = '';
      return;
    }
    const match = findExactMatch(current);
    if (match) {
      input.value = match;
      lastValidValue = match;
    } else {
      input.value = lastValidValue;
    }
  }

  // El panel usa position:fixed (ver comentario en el CSS de .suggest-panel) porque vive dentro
  // de un formulario con overflow-y:auto: como hijo absolute quedaba recortado por ese overflow
  // y nunca se veía (o se veía un instante al hacer scrollIntoView y luego "se cerraba"). Con
  // fixed hay que posicionarlo a mano con las coordenadas reales del input en pantalla.
  function reposition() {
    const rect = input.getBoundingClientRect();
    const maxHeight = 220;
    const fitsBelow = rect.bottom + 6 + Math.min(maxHeight, 160) <= window.innerHeight;
    panel.style.left = `${Math.round(rect.left)}px`;
    panel.style.width = `${Math.round(rect.width)}px`;
    if (fitsBelow) {
      panel.style.top = `${Math.round(rect.bottom + 6)}px`;
      panel.style.bottom = '';
      panel.style.maxHeight = `${Math.max(120, Math.floor(window.innerHeight - rect.bottom - 16))}px`;
    } else {
      panel.style.bottom = `${Math.round(window.innerHeight - rect.top + 6)}px`;
      panel.style.top = '';
      panel.style.maxHeight = `${Math.max(120, Math.floor(rect.top - 16))}px`;
    }
  }

  function open({ showAll = false } = {}) {
    const query = showAll ? '' : input.value.trim().toLowerCase();
    const all = (typeof getItems === 'function' ? getItems() : []) || [];
    const filtered = query ? all.filter((v) => String(v).toLowerCase().includes(query)) : all;
    // En modo selector siempre abrimos el panel (aunque no haya props todavía) para poder mostrar
    // el "Sin sugerencias" y que se comporte como un desplegable de verdad.
    if (!filtered.length && !query && !openAllOnFocus) {
      panel.hidden = true;
      setOpenState(false);
      return;
    }
    renderItems(filtered);
    reposition();
    panel.hidden = false;
    setOpenState(true);
  }

  function close() {
    panel.hidden = true;
    setOpenState(false);
  }

  function closeAndValidate() {
    close();
    enforceStrictValue();
  }

  // Al abrirlo se muestra la lista COMPLETA (como un <select>), no filtrada por lo que ya
  // hubiera escrito; el texto queda seleccionado para que empezar a teclear lo reemplace y filtre.
  input.addEventListener('focus', () => {
    if (openAllOnFocus) input.select();
    open({ showAll: openAllOnFocus });
  });
  input.addEventListener('mousedown', () => {
    if (!openAllOnFocus) return;
    // Si ya está abierto, un segundo clic lo cierra (comportamiento esperado de un desplegable).
    if (!panel.hidden) {
      setTimeout(closeAndValidate, 0);
      return;
    }
    // Si el input YA tenía el foco (p.ej. justo después de elegir un item), el evento 'focus' no
    // vuelve a dispararse, así que hay que abrirlo aquí a mano o el clic no haría nada.
    if (document.activeElement === input) {
      setTimeout(() => {
        input.select();
        open({ showAll: true });
      }, 0);
    }
  });
  input.addEventListener('input', () => open());
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAndValidate();
    if (strict && event.key === 'Enter') {
      // Con un único resultado visible, Enter lo selecciona directamente (evita tener que usar
      // el ratón si solo queda una coincidencia al buscar).
      const visible = [...panel.querySelectorAll('.suggest-item')];
      if (visible.length === 1) {
        input.value = visible[0].dataset.value || '';
      }
      closeAndValidate();
      event.preventDefault();
    }
  });
  panel.addEventListener('mousedown', (event) => {
    const btn = event.target.closest('.suggest-item');
    if (!btn) return;
    event.preventDefault();
    input.value = btn.dataset.value || '';
    if (strict) lastValidValue = input.value;
    close();
    input.focus();
  });
  input.addEventListener('blur', () => {
    // Nota: seleccionar un item del panel no dispara blur (el mousedown hace preventDefault +
    // vuelve a enfocar el input), así que si llegamos aquí es porque el foco se fue a otro sitio
    // (p.ej. al botón Guardar) y toca validar ya mismo, sin esperar.
    closeAndValidate();
  });
  document.addEventListener('click', (event) => {
    if (event.target === input || panel.contains(event.target)) return;
    closeAndValidate();
  });
  // Captura (true) para enterarse también del scroll dentro del formulario del modal (que no
  // burbujea); si el scroll viene de dentro del propio panel de sugerencias lo ignoramos.
  // OJO: aquí NO se puede cerrar el panel. Al enfocar el input, el navegador hace scroll para
  // traerlo a la vista dentro del formulario (overflow-y:auto), lo que disparaba este listener y
  // cerraba el panel justo después de abrirlo — por eso solo funcionaba pulsando la etiqueta
  // "Prop" (que enfoca sin provocar scroll). Reposicionamos, y solo cerramos si el input se ha
  // salido de la parte visible del formulario.
  window.addEventListener(
    'scroll',
    (event) => {
      if (panel.hidden) return;
      if (event.target && typeof event.target.closest === 'function' && event.target.closest('.suggest-panel')) return;
      const rect = input.getBoundingClientRect();
      const scroller = event.target && event.target.getBoundingClientRect ? event.target.getBoundingClientRect() : null;
      const outOfView = scroller
        ? rect.bottom < scroller.top || rect.top > scroller.bottom
        : rect.bottom < 0 || rect.top > window.innerHeight;
      if (outOfView) {
        close();
        return;
      }
      reposition();
    },
    true
  );
  window.addEventListener('resize', () => {
    if (!panel.hidden) reposition();
  });

  return {
    open,
    close,
    reposition,
    isValid: () => !strict || !input.value.trim() || Boolean(findExactMatch(input.value)),
  };
}

let expenseFormAccountSuggestHandle = null;

function initExpensesUI() {
  if (!document.getElementById('managementView')) return;
  expenseFormAccountSuggestHandle = attachSuggestDropdown(
    'expenseFormAccount',
    'expenseFormAccountSuggest',
    getKnownExpensePropsRecentFirst,
    { strict: true }
  );
  attachSuggestDropdown('expenseFormCategory', 'expenseFormCategorySuggest', () => getKnownExpenseCategories());
  // Datepicker propio (el nativo de Chromium no se puede tematizar y desentona con el tema oscuro).
  initTradeDatepicker('expenseFormDate');
  const openModal = () => openExpenseModal();
  document.getElementById('openExpenseModalBtn')?.addEventListener('click', openModal);
  document.getElementById('expensesEmptyCta')?.addEventListener('click', openModal);
  document.getElementById('saveExpenseBtn')?.addEventListener('click', () => {
    saveExpenseAction().catch(console.error);
  });

  // La propuesta se recalcula al cambiar categoría o tamaño; en cuanto el usuario toca la
  // casilla, deja de proponerse sola (dataset.touched) y manda lo que él haya decidido.
  ['expenseFormCategory', 'expenseFormAccountSize'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => syncExpenseCreateAccount({ auto: true }));
    document.getElementById(id)?.addEventListener('input', () => syncExpenseCreateAccount({ auto: true }));
  });
  ['expenseFormAccount', 'expenseFormAccountNumber'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => syncExpenseCreateAccount());
  });
  document.getElementById('expenseFormCreateAccount')?.addEventListener('change', (event) => {
    event.target.dataset.touched = '1';
    syncExpenseCreateAccount();
  });
  document.getElementById('cancelExpenseEditBtn')?.addEventListener('click', closeExpenseModal);
  document.getElementById('closeExpenseModalBtn')?.addEventListener('click', closeExpenseModal);
  document.getElementById('expenseModalOverlay')?.addEventListener('click', (event) => {
    if (event.target?.id === 'expenseModalOverlay') closeExpenseModal();
  });
  document.getElementById('expenseClearFiltersBtn')?.addEventListener('click', () => {
    clearExpenseFilters();
    refreshExpensesUI().catch(console.error);
  });
  ['expenseFilterAccount', 'expenseFilterFrom', 'expenseFilterTo'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      refreshExpensesUI().catch(console.error);
    });
  });
  updateExpensesLayoutState(false);
  resetExpenseForm();
}

// ------------------------ Gestión: pestañas + balance global compartido ------------------------

let managementActiveTab = 'withdrawals';

function switchManagementTab(tab) {
  managementActiveTab =
    tab === 'expenses' ? 'expenses' : tab === 'config' ? 'config' : tab === 'calendar' ? 'calendar' : 'withdrawals';
  const withdrawalsPanel = document.getElementById('managementTabWithdrawals');
  const expensesPanel = document.getElementById('managementTabExpenses');
  const calendarPanel = document.getElementById('managementTabCalendar');
  const configPanel = document.getElementById('managementTabConfig');
  if (withdrawalsPanel) withdrawalsPanel.hidden = managementActiveTab !== 'withdrawals';
  if (expensesPanel) expensesPanel.hidden = managementActiveTab !== 'expenses';
  if (calendarPanel) calendarPanel.hidden = managementActiveTab !== 'calendar';
  if (configPanel) configPanel.hidden = managementActiveTab !== 'config';
  document.getElementById('mgmtTabBtnWithdrawals')?.classList.toggle('active', managementActiveTab === 'withdrawals');
  document.getElementById('mgmtTabBtnExpenses')?.classList.toggle('active', managementActiveTab === 'expenses');
  document.getElementById('mgmtTabBtnCalendar')?.classList.toggle('active', managementActiveTab === 'calendar');
  document.getElementById('mgmtTabBtnConfig')?.classList.toggle('active', managementActiveTab === 'config');
  if (managementActiveTab === 'config') renderMgmtConfigLists();
  if (managementActiveTab === 'calendar') renderMgmtCalendar();
}

let backtestingViewActiveTab = 'trades';

/** Pestañas dentro de una sesión de backtesting: "Trades" (calendario y registro del día),
 * "Estadísticas" (KPIs, disciplina por horario, análisis) y "Challenges" (proyección a una prop).
 * Separadas para reducir ruido visual; antes iba todo seguido en una vista muy larga.
 *
 * Un panel puede pertenecer a más de una pestaña: el filtro de sesión lleva las clases de
 * "Estadísticas" y "Challenges" porque ambas calculan sobre la sesión elegida. */
const BT_VIEW_TAB_CLASSES = {
  trades: 'bt-tab-panel-trades',
  stats: 'bt-tab-panel-stats',
  challenges: 'bt-tab-panel-challenge',
};

function switchBacktestingViewTab(tab) {
  backtestingViewActiveTab = BT_VIEW_TAB_CLASSES[tab] ? tab : 'trades';
  const activeClass = BT_VIEW_TAB_CLASSES[backtestingViewActiveTab];

  document.querySelectorAll('.bt-tab-panel').forEach((el) => {
    el.hidden = !el.classList.contains(activeClass);
  });

  document.querySelectorAll('[data-bt-view-tab]').forEach((btn) => {
    const isActive = btn.dataset.btViewTab === backtestingViewActiveTab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  // La simulación de challenges es cara (varios miles de repeticiones) y no se recalcula
  // mientras la pestaña está oculta, así que se refresca al entrar.
  if (backtestingViewActiveTab === 'challenges') {
    renderBacktestingChallenge(getBacktestingTradesForMetrics());
  } else if (backtestingViewActiveTab === 'stats') {
    renderBacktestingEquityCurve(getBacktestingTradesForMetrics());
  }
}

function initBacktestingViewTabs() {
  if (!document.getElementById('backtestingView')) return;
  document.querySelectorAll('[data-bt-view-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchBacktestingViewTab(btn.dataset.btViewTab));
  });
  switchBacktestingViewTab('trades');
}

function renderManagementBalanceBanner() {
  // Nota: se eliminó el antiguo "Balance global estimado" (capital + PnL operativo - retiros -
  // gastos) porque mezclaba conceptos y confundía al usuario; el banner de Gestión ahora se
  // centra solo en el propio flujo de retiros/gastos (total retirado, total gastado y su neto).
  const totalWithdrawn = withdrawalsCache.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const totalSpent = expensesCache.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netWithdrawalVsExpense = totalWithdrawn - totalSpent;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set('managementBalanceWithdrawn', formatWithdrawalEuro(totalWithdrawn));
  set('managementBalanceSpent', formatNegativeEuro(totalSpent));
  set('managementBalanceNet', formatWithdrawalEuro(netWithdrawalVsExpense));
  const netEl = document.getElementById('managementBalanceNet');
  if (netEl) {
    netEl.classList.toggle('positive', netWithdrawalVsExpense >= 0);
    netEl.classList.toggle('negative', netWithdrawalVsExpense < 0);
  }
}

async function refreshManagementUI() {
  if (!document.getElementById('managementView')) return;
  await Promise.all([refreshWithdrawalsUI(), refreshExpensesUI()]);
  renderManagementBalanceBanner();
  if (managementActiveTab === 'config') renderMgmtConfigLists();
  if (managementActiveTab === 'calendar') renderMgmtCalendar();
}

function initManagementTabs() {
  if (!document.getElementById('managementView')) return;
  document.getElementById('mgmtTabBtnWithdrawals')?.addEventListener('click', () => switchManagementTab('withdrawals'));
  document.getElementById('mgmtTabBtnExpenses')?.addEventListener('click', () => switchManagementTab('expenses'));
  document.getElementById('mgmtTabBtnCalendar')?.addEventListener('click', () => switchManagementTab('calendar'));
  document.getElementById('mgmtTabBtnConfig')?.addEventListener('click', () => switchManagementTab('config'));
  switchManagementTab('withdrawals');
  initMgmtConfigTab();
  initMgmtCalendarTab();
}

// ------------------------ Gestión: pestaña Calendario (neto retirado - gastado) ------------------------

let mgmtCalendarView = 'month'; // 'month' | 'year'
const mgmtCalendarToday = new Date();
let mgmtCalendarYear = mgmtCalendarToday.getFullYear();
let mgmtCalendarMonth = mgmtCalendarToday.getMonth();
let mgmtCalendarSelectedDate = '';

/** Retirado/gastado/neto para una fecha exacta (YYYY-MM-DD). */
function getManagementDayFlow(dateKey) {
  const withdrawn = withdrawalsCache
    .filter((w) => String(w.date || '').slice(0, 10) === dateKey)
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const spent = expensesCache
    .filter((e) => String(e.date || '').slice(0, 10) === dateKey)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return { withdrawn, spent, net: withdrawn - spent };
}

/** Retirado/gastado/neto agregados para un mes completo (year, month 0-indexado). */
function getManagementMonthFlow(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const withdrawn = withdrawalsCache
    .filter((w) => String(w.date || '').slice(0, 7) === prefix)
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const spent = expensesCache
    .filter((e) => String(e.date || '').slice(0, 7) === prefix)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  return { withdrawn, spent, net: withdrawn - spent };
}

function mgmtCalendarFlowTitle(flow) {
  return `${t('withdrawals_total', 'Total retirado')}: ${formatWithdrawalEuro(flow.withdrawn)}  ·  ${t('expenses_total', 'Total gastado')}: ${formatNegativeEuro(flow.spent)}`;
}

function updateMgmtCalendarPeriodLabel() {
  const label = document.getElementById('mgmtCalendarPeriodLabel');
  if (!label) return;
  label.textContent =
    mgmtCalendarView === 'month' ? formatCalendarTitle(mgmtCalendarYear, mgmtCalendarMonth) : String(mgmtCalendarYear);
}

function renderMgmtCalendarDayDetail(dateKey) {
  const host = document.getElementById('mgmtCalendarDayDetail');
  if (!host) return;
  if (!dateKey) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  const flow = getManagementDayFlow(dateKey);
  host.hidden = false;
  host.innerHTML = `
    <div class="mgmt-calendar-day-detail-item"><span>${escapeHtmlChipText(formatDateEs(dateKey))}</span><strong>—</strong></div>
    <div class="mgmt-calendar-day-detail-item"><span>${t('withdrawals_total', 'Total retirado')}</span><strong class="positive">${formatWithdrawalEuro(flow.withdrawn)}</strong></div>
    <div class="mgmt-calendar-day-detail-item"><span>${t('expenses_total', 'Total gastado')}</span><strong class="negative">${formatNegativeEuro(flow.spent)}</strong></div>
    <div class="mgmt-calendar-day-detail-item"><span>${t('management_balance_net', 'Retirado - Gastado')}</span><strong class="${flow.net >= 0 ? 'positive' : 'negative'}">${formatWithdrawalEuro(flow.net)}</strong></div>`;
}

function renderMgmtCalendarMonthView() {
  const header = document.getElementById('mgmtCalendarMonthHeader');
  const grid = document.getElementById('mgmtCalendarMonthGrid');
  if (!header || !grid) return;

  header.innerHTML = getCalendarWeekdayLabels(true)
    .map((label) => `<span>${escapeHtmlChipText(label)}</span>`)
    .join('');

  const year = mgmtCalendarYear;
  const month = mgmtCalendarMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;

  const cellsHtml = [];
  for (let i = 0; i < startOffset; i++) {
    cellsHtml.push('<div class="mgmt-calendar-cell mgmt-calendar-cell-empty"></div>');
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, month, day);
    const flow = getManagementDayFlow(dateKey);
    const hasData = flow.withdrawn !== 0 || flow.spent !== 0;
    const cls = ['mgmt-calendar-cell'];
    if (hasData) cls.push('has-data', flow.net >= 0 ? 'positive' : 'negative');
    if (dateKey === mgmtCalendarSelectedDate) cls.push('selected');
    cellsHtml.push(`
      <div class="${cls.join(' ')}" data-mgmt-cal-day="${dateKey}" title="${escapeAttrChip(mgmtCalendarFlowTitle(flow))}">
        <span class="mgmt-calendar-cell-label">${day}</span>
        ${hasData ? `<span class="mgmt-calendar-cell-net">${flow.net > 0 ? '+' : ''}${flow.net.toFixed(2)}€</span>` : ''}
      </div>`);
  }
  grid.innerHTML = cellsHtml.join('');

  grid.querySelectorAll('[data-mgmt-cal-day]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const dateKey = cell.dataset.mgmtCalDay;
      mgmtCalendarSelectedDate = mgmtCalendarSelectedDate === dateKey ? '' : dateKey;
      renderMgmtCalendarMonthView();
      renderMgmtCalendarDayDetail(mgmtCalendarSelectedDate);
    });
  });
}

function renderMgmtCalendarYearView() {
  const grid = document.getElementById('mgmtCalendarYearView');
  if (!grid) return;
  const year = mgmtCalendarYear;

  grid.innerHTML = MONTH_I18N_KEYS.map((monthKey, index) => {
    const flow = getManagementMonthFlow(year, index);
    const hasData = flow.withdrawn !== 0 || flow.spent !== 0;
    const cls = ['mgmt-calendar-cell'];
    if (hasData) cls.push('has-data', flow.net >= 0 ? 'positive' : 'negative');
    return `
      <div class="${cls.join(' ')}" data-mgmt-cal-month="${index}" title="${escapeAttrChip(mgmtCalendarFlowTitle(flow))}">
        <span class="mgmt-calendar-cell-label">${escapeHtmlChipText(t(monthKey))}</span>
        ${hasData ? `<span class="mgmt-calendar-cell-net">${flow.net > 0 ? '+' : ''}${flow.net.toFixed(2)}€</span>` : ''}
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-mgmt-cal-month]').forEach((cell) => {
    cell.addEventListener('click', () => {
      mgmtCalendarMonth = Number(cell.dataset.mgmtCalMonth);
      mgmtCalendarView = 'month';
      mgmtCalendarSelectedDate = '';
      syncMgmtCalendarViewUi();
      renderMgmtCalendar();
    });
  });
}

function syncMgmtCalendarViewUi() {
  document.getElementById('mgmtCalendarViewMonthBtn')?.classList.toggle('active', mgmtCalendarView === 'month');
  document.getElementById('mgmtCalendarViewYearBtn')?.classList.toggle('active', mgmtCalendarView === 'year');
  const monthWrap = document.getElementById('mgmtCalendarMonthView');
  const yearWrap = document.getElementById('mgmtCalendarYearView');
  if (monthWrap) monthWrap.hidden = mgmtCalendarView !== 'month';
  if (yearWrap) yearWrap.hidden = mgmtCalendarView !== 'year';
}

function renderMgmtCalendar() {
  if (!document.getElementById('managementTabCalendar')) return;
  updateMgmtCalendarPeriodLabel();
  if (mgmtCalendarView === 'month') {
    renderMgmtCalendarMonthView();
    renderMgmtCalendarDayDetail(mgmtCalendarSelectedDate);
  } else {
    renderMgmtCalendarYearView();
    renderMgmtCalendarDayDetail('');
  }
}

function initMgmtCalendarTab() {
  if (!document.getElementById('managementTabCalendar')) return;
  document.getElementById('mgmtCalendarViewMonthBtn')?.addEventListener('click', () => {
    mgmtCalendarView = 'month';
    syncMgmtCalendarViewUi();
    renderMgmtCalendar();
  });
  document.getElementById('mgmtCalendarViewYearBtn')?.addEventListener('click', () => {
    mgmtCalendarView = 'year';
    syncMgmtCalendarViewUi();
    renderMgmtCalendar();
  });
  document.getElementById('mgmtCalendarPrevBtn')?.addEventListener('click', () => {
    if (mgmtCalendarView === 'month') {
      mgmtCalendarMonth -= 1;
      if (mgmtCalendarMonth < 0) {
        mgmtCalendarMonth = 11;
        mgmtCalendarYear -= 1;
      }
    } else {
      mgmtCalendarYear -= 1;
    }
    mgmtCalendarSelectedDate = '';
    renderMgmtCalendar();
  });
  document.getElementById('mgmtCalendarNextBtn')?.addEventListener('click', () => {
    if (mgmtCalendarView === 'month') {
      mgmtCalendarMonth += 1;
      if (mgmtCalendarMonth > 11) {
        mgmtCalendarMonth = 0;
        mgmtCalendarYear += 1;
      }
    } else {
      mgmtCalendarYear += 1;
    }
    mgmtCalendarSelectedDate = '';
    renderMgmtCalendar();
  });
  syncMgmtCalendarViewUi();
}

function getAccountTradeNames(account) {
  const names = new Set([account?.name].filter(Boolean));
  if (Array.isArray(account?.previous_names)) {
    account.previous_names.forEach((n) => names.add(n));
  }
  return names;
}

function countTradesForAccount(account) {
  const names = getAccountTradeNames(account);
  return cachedTrades.filter((t) => names.has(String(t.account || ''))).length;
}

// Acepta un nombre de cuenta (string, uso legacy) o el objeto de cuenta completo. Cuando se
// pasa el objeto, además de por nombre de cuenta (retiros/gastos antiguos que usaban el nombre
// de cuenta como "prop"), hace match por account.prop_name: así un retiro/gasto registrado con
// la prop vinculada a esta cuenta cuenta también para su balance estimado, aunque no se haya
// elegido explícitamente esta cuenta en el campo opcional del formulario.
/**
 * Retiros atribuibles a UNA cuenta concreta.
 *
 * OJO: los retiros se registran por PROP, no por cuenta; solo son de una cuenta concreta si el
 * usuario los vinculó a ella (campo "Cuenta (opcional)" del retiro). Antes esta función sumaba
 * todos los retiros de la prop, así que dos cuentas de la misma prop mostraban ambas el total
 * de la prop (cifras duplicadas que no eran de esa cuenta).
 *
 * @param {object|string} account
 * @param {{ scope?: 'account'|'prop' }} [options] 'prop' devuelve el total de la prop entera.
 */
function getAccountWithdrawalStats(account, options = {}) {
  const scope = options.scope === 'prop' ? 'prop' : 'account';
  const name = typeof account === 'string' ? account : String(account?.name || '');
  const propName = typeof account === 'string' ? '' : String(account?.prop_name || '').trim();

  const list = withdrawalsCache.filter((w) => {
    const wName = String(w.account_name || w.accountName || '');
    if (scope === 'prop') return wName === name || (propName && wName === propName);
    // Ámbito cuenta: solo lo explícitamente vinculado a ella (o registros antiguos que usaban
    // el nombre de la cuenta como "prop", por compatibilidad).
    if (findLinkedAccountNameForWithdrawal(w) === name && name) return true;
    return wName === name && name !== propName;
  });

  const withdrawn = list.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const count = list.length;
  const last = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  return { withdrawn, count, last };
}

/**
 * Gastos de la PROP a la que pertenece la cuenta. Los gastos no tienen vínculo con una cuenta
 * concreta (solo prop + tamaño), así que este dato es siempre de ámbito prop: la UI debe
 * etiquetarlo como tal para no dar a entender que es el gasto de esa cuenta.
 */
function getAccountExpenseStats(account) {
  const name = typeof account === 'string' ? account : String(account?.name || '');
  const propName = typeof account === 'string' ? '' : String(account?.prop_name || '').trim();
  const list = expensesCache.filter((e) => {
    const eName = String(e.account_name || e.accountName || '');
    return eName === name || (propName && eName === propName);
  });
  const spent = list.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const count = list.length;
  const last = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  return { spent, count, last };
}

/**
 * Balance estimado DE LA CUENTA: capital + PnL de sus trades − retiros vinculados a ella.
 *
 * No se restan los gastos: van asociados a la prop (evaluaciones, resets...), no a una cuenta,
 * y restarlos aquí los duplicaba en cada cuenta de la misma prop y falseaba el balance.
 */
function getAccountEstimatedBalance(account) {
  const names = getAccountTradeNames(account);
  const stats = getAccountWithdrawalStats(account);
  const operationalNet = cachedTrades
    .filter((t) => names.has(String(t.account || '')))
    .reduce((sum, t) => sum + tradeOperationalNet(t), 0);
  return (Number(account.capital ?? 0) || 0) + operationalNet - stats.withdrawn;
}

function countTradesForStrategy(record) {
  const names = new Set([record?.name].filter(Boolean));
  if (Array.isArray(record?.previous_names)) {
    record.previous_names.forEach((n) => names.add(n));
  }
  return cachedTrades.filter((t) => names.has(String(t.strategy || ''))).length;
}

function getStrategyTradeStats(record) {
  const names = new Set([record?.name].filter(Boolean));
  if (Array.isArray(record?.previous_names)) {
    record.previous_names.forEach((n) => names.add(n));
  }
  const trades = cachedTrades.filter((t) => names.has(String(t.strategy || '')));
  const pnl = trades.reduce((sum, t) => sum + tradeOperationalNet(t), 0);
  const wins = trades.filter((t) => tradeOperationalNet(t) > 0).length;
  const winrate = trades.length ? (wins / trades.length) * 100 : 0;
  return { count: trades.length, pnl, winrate };
}

/** Una cuenta deshabilitada (quemada por máximo DD) ya no se puede operar. */
function isAccountDisabled(account) {
  return Boolean(account?.disabled_by_max_dd ?? account?.disabledByMaxDd);
}

async function loadAccounts() {
  await syncRealListsFromStorage();
  const accounts = getAccounts();
  const accountNames = accounts.map((account) => account.name);
  // En los formularios de trade solo se ofrecen las cuentas vivas: si una cuenta se marcó como
  // deshabilitada, seguir pudiendo registrar operaciones en ella no tiene sentido y ensucia las
  // estadísticas. En los demás selectores (reiniciar cuenta, retiros) siguen apareciendo todas,
  // porque ahí sí hace falta poder tocar una cuenta ya quemada.
  const activeAccountNames = accounts.filter((account) => !isAccountDisabled(account)).map((a) => a.name);
  fillSelect('account', activeAccountNames, 'placeholder_select_account');
  fillSelect('editAccount', activeAccountNames, 'placeholder_select_account');
  fillSelect('resetAccountSelect', accountNames, 'placeholder_select_account');
  fillWithdrawalAccountSelects();
  refreshPnlPresetButtons();
  renderSettingsAccountsList();
  if (currentView === 'dashboard') {
    await renderDashboardFilters(cachedTrades);
    renderDashboardWithFilters({ skipCalendar: true });
  }
}

function buildAccountCardDataAttrs(account) {
  return [
    `data-entity-type="account"`,
    account.client_uuid ? `data-client-uuid="${escapeAttrChip(account.client_uuid)}"` : '',
    account.remote_id ? `data-remote-id="${escapeAttrChip(account.remote_id)}"` : '',
    account.id != null && account.id !== '' ? `data-entity-id="${escapeAttrChip(account.id)}"` : '',
    `data-entity-name="${escapeAttrChip(account.name)}"`,
  ]
    .filter(Boolean)
    .join(' ');
}

function getAccountTypeLabel(type) {
  if (type === 'challenge') return t('account_type_challenge', 'Challenge');
  if (type === 'funded') return t('account_type_funded', 'Fondeada');
  if (type === 'own_capital') return t('account_type_own_capital', 'Capital propio');
  return '';
}

/** % de cuentas Challenge quemadas por máximo DD, % de challenges superados, y retiro medio de
 * las cuentas Fondeadas — para poder responder a "qué % de challenges paso" / "qué % de cuentas
 * quemo" / "cuánto retiro de media de cada cuenta que llego a fondear". */
function renderAccountsChallengeStats(accounts) {
  const row = document.getElementById('accountsChallengeStatsRow');
  if (!row) return;

  const challenges = accounts.filter((a) => a.account_type === 'challenge');
  const funded = accounts.filter((a) => a.account_type === 'funded');

  if (!challenges.length && !funded.length) {
    row.hidden = true;
    row.innerHTML = '';
    return;
  }

  const burned = challenges.filter((a) => a.disabled_by_max_dd).length;
  const passed = challenges.filter((a) => a.challenge_passed).length;
  const burnedPct = challenges.length ? (burned / challenges.length) * 100 : 0;
  const passedPct = challenges.length ? (passed / challenges.length) * 100 : 0;
  const avgFundedWithdrawn = funded.length
    ? funded.reduce((sum, a) => sum + getAccountWithdrawalStats(a).withdrawn, 0) / funded.length
    : 0;

  row.hidden = false;
  row.innerHTML = `
    <div class="settings-accounts-stat-card">
      <span>${t('account_stats_challenges', 'Challenges intentados')}</span>
      <strong>${challenges.length}</strong>
    </div>
    <div class="settings-accounts-stat-card">
      <span>${t('account_stats_passed_pct', '% challenges superados')}</span>
      <strong>${challenges.length ? passedPct.toFixed(1) : '0.0'}% <small style="font-weight:400;color:var(--text-muted)">(${passed}/${challenges.length})</small></strong>
    </div>
    <div class="settings-accounts-stat-card">
      <span>${t('account_stats_burned_pct', '% cuentas quemadas (Máx. DD)')}</span>
      <strong>${challenges.length ? burnedPct.toFixed(1) : '0.0'}% <small style="font-weight:400;color:var(--text-muted)">(${burned}/${challenges.length})</small></strong>
    </div>
    <div class="settings-accounts-stat-card" title="Solo cuenta los retiros que hayas vinculado a una cuenta concreta (campo «Cuenta» al registrar el retiro)">
      <span>${t('account_stats_avg_funded_withdrawn', 'Retiro medio por cuenta fondeada')}</span>
      <strong>${formatWithdrawalEuro(avgFundedWithdrawn)} <small style="font-weight:400;color:var(--text-muted)">(${funded.length})</small></strong>
    </div>`;
}

function buildStrategyCardDataAttrs(record) {
  return [
    `data-entity-type="strategy"`,
    record.client_uuid ? `data-client-uuid="${escapeAttrChip(record.client_uuid)}"` : '',
    record.remote_id ? `data-remote-id="${escapeAttrChip(record.remote_id)}"` : '',
    record.id != null && record.id !== '' ? `data-entity-id="${escapeAttrChip(record.id)}"` : '',
    `data-entity-name="${escapeAttrChip(record.name)}"`,
  ]
    .filter(Boolean)
    .join(' ');
}

// Pestaña activa en Configuración > Cuentas: 'all' | 'challenge' | 'funded' | 'own_capital' | 'disabled'.
// 'disabled' son las cuentas Challenge marcadas como quemadas por Máximo DD (disabled_by_max_dd).
let settingsAccountsTab = 'all';
// Prop/broker seleccionada en Configuración > Cuentas ('' = todas).
let settingsAccountsPropFilter = '';

function accountMatchesSettingsTab(account, tab) {
  if (tab === 'all') return true;
  if (tab === 'disabled') return account.account_type === 'challenge' && Boolean(account.disabled_by_max_dd);
  if (tab === 'challenge') return account.account_type === 'challenge' && !account.disabled_by_max_dd;
  return account.account_type === tab;
}

function initSettingsAccountsTabs() {
  document.querySelectorAll('.settings-accounts-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      settingsAccountsTab = btn.getAttribute('data-accounts-tab') || 'all';
      document.querySelectorAll('.settings-accounts-tab-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderSettingsAccountsList();
    });
  });
  document.getElementById('settingsAccountsPropFilter')?.addEventListener('change', (event) => {
    settingsAccountsPropFilter = event.target.value || '';
    renderSettingsAccountsList();
  });
}

/** Rellena el desplegable de props/brokers con los realmente usados en las cuentas. */
function refreshSettingsAccountsPropFilter(accounts) {
  const select = document.getElementById('settingsAccountsPropFilter');
  if (!select) return;
  const props = [...new Set(accounts.map((a) => String(a.prop_name || '').trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  // Si la prop seleccionada ya no existe (renombrada/eliminada), se vuelve a "todas".
  if (settingsAccountsPropFilter && !props.includes(settingsAccountsPropFilter)) {
    settingsAccountsPropFilter = '';
  }
  const allLabel = t('accounts_prop_filter_all', 'Todas las props');
  select.innerHTML = `<option value="">${escapeHtmlChipText(allLabel)}</option>${props
    .map((p) => `<option value="${escapeAttrChip(p)}">${escapeHtmlChipText(p)}</option>`)
    .join('')}`;
  select.value = settingsAccountsPropFilter;
  refreshCustomSelectForNative(select);
  // Sin props configuradas el filtro no aporta nada: se oculta para no añadir ruido.
  const bar = select.closest('.settings-accounts-propbar');
  if (bar) bar.hidden = props.length === 0;
}

function renderSettingsAccountsList() {
  const listEl = document.getElementById('settingsAccountsList');
  if (!listEl) return;
  const accounts = getAccounts();
  refreshSettingsAccountsPropFilter(accounts);
  // Las estadísticas de challenges se calculan sobre la prop seleccionada, para poder comparar
  // el rendimiento de cada prop firm por separado.
  const propScoped = settingsAccountsPropFilter
    ? accounts.filter((a) => String(a.prop_name || '').trim() === settingsAccountsPropFilter)
    : accounts;
  renderAccountsChallengeStats(propScoped);
  const filteredAccounts = propScoped.filter((account) =>
    accountMatchesSettingsTab(account, settingsAccountsTab)
  );
  if (!accounts.length) {
    listEl.innerHTML = `<div class="settings-entity-empty">${t('placeholder_select_account', 'No hay cuentas todavía')}</div>`;
    return;
  }
  if (!filteredAccounts.length) {
    listEl.innerHTML = `<div class="settings-entity-empty">${t('accounts_tab_empty', 'No hay cuentas en esta categoría')}</div>`;
    return;
  }
  listEl.innerHTML = filteredAccounts
    .map((account) => {
      const stats = getAccountWithdrawalStats(account);
      const expenseStats = getAccountExpenseStats(account);
      const balance = getAccountEstimatedBalance(account);
      const tradeCount = countTradesForAccount(account);
      const badges = [];
      if (account.freeSwap) badges.push(`<span class="settings-entity-badge">Free Swap</span>`);
      if (account.prop_name) badges.push(`<span class="settings-entity-badge muted">${escapeHtmlChipText(account.prop_name)}</span>`);
      const typeLabel = getAccountTypeLabel(account.account_type);
      if (typeLabel) badges.push(`<span class="settings-entity-badge muted">${escapeHtmlChipText(typeLabel)}</span>`);
      if (account.account_number) badges.push(`<span class="settings-entity-badge muted">#${escapeHtmlChipText(account.account_number)}</span>`);
      if (account.account_type === 'challenge' && account.disabled_by_max_dd) {
        badges.push(`<span class="settings-entity-badge danger">${escapeHtmlChipText(t('account_max_dd_badge', 'Quemada (Máx. DD)'))}</span>`);
      }
      if (account.account_type === 'challenge' && account.challenge_passed) {
        badges.push(`<span class="settings-entity-badge ok">${escapeHtmlChipText(t('account_challenge_passed_badge', 'Challenge superado'))}</span>`);
      }
      return `
        <article class="settings-entity-card" role="listitem" ${buildAccountCardDataAttrs(account)}>
          <div class="settings-entity-card-main">
            <div class="settings-entity-card-title">${escapeHtmlChipText(account.name)}</div>
            <div class="settings-entity-stats">
              <div class="settings-entity-stat">Capital<strong>${formatWithdrawalEuro(account.capital)}</strong></div>
              <div class="settings-entity-stat">Comisión/lote<strong>${formatWithdrawalEuro(account.commissionPerLot)}</strong></div>
              <div class="settings-entity-stat">Trades<strong>${tradeCount}</strong></div>
              <div class="settings-entity-stat" title="Solo retiros vinculados a esta cuenta">Retirado (cuenta)<strong>${formatWithdrawalEuro(stats.withdrawn)}</strong></div>
              <div class="settings-entity-stat" title="Gastos de la prop (evaluaciones, resets...), no de esta cuenta en concreto">Gastado (prop)<strong>${formatNegativeEuro(expenseStats.spent)}</strong></div>
              <div class="settings-entity-stat" title="Capital + PnL de sus trades − retiros vinculados a esta cuenta">Balance est.<strong>${formatWithdrawalEuro(balance)}</strong></div>
            </div>
            ${badges.length ? `<div class="settings-entity-badges">${badges.join('')}</div>` : ''}
          </div>
          <div class="settings-entity-card-actions">
            <button type="button" class="button button-edit-entity" data-account-action="edit">${t('edit', 'Editar')}</button>
            <button type="button" class="button button-delete" data-account-action="delete">${t('delete', 'Eliminar')}</button>
          </div>
        </article>`;
    })
    .join('');
}

function renderSettingsStrategiesList() {
  const listEl = document.getElementById('settingsStrategiesList');
  if (!listEl) return;
  const records = [...realStrategiesByName.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
  );
  if (!records.length) {
    listEl.innerHTML = `<div class="settings-entity-empty">${t('placeholder_select_strategy', 'No hay estrategias todavía')}</div>`;
    return;
  }
  listEl.innerHTML = records
    .map((record) => {
      const tradeStats = getStrategyTradeStats(record);
      const hours = parseOperatingHours(record.operating_hours);
      const badges = [];
      if (record.schedule_enabled) badges.push(`<span class="settings-entity-badge">Horarios activos</span>`);
      if (hours.length) badges.push(`<span class="settings-entity-badge muted">${hours.length} rangos</span>`);
      const desc = String(record.description || '').trim();
      const shortDesc = desc.length > 100 ? `${desc.slice(0, 100)}…` : desc;
      return `
        <article class="settings-entity-card" role="listitem" ${buildStrategyCardDataAttrs(record)}>
          <div class="settings-entity-card-main">
            <div class="settings-entity-card-title">${escapeHtmlChipText(record.name)}</div>
            <div class="settings-entity-card-desc">${escapeHtmlChipText(shortDesc || t('strategy_description', 'Sin descripción'))}</div>
            <div class="settings-entity-stats">
              <div class="settings-entity-stat">Trades<strong>${tradeStats.count}</strong></div>
              <div class="settings-entity-stat">PnL<strong>${formatWithdrawalEuro(tradeStats.pnl)}</strong></div>
              <div class="settings-entity-stat">Win rate<strong>${tradeStats.count ? tradeStats.winrate.toFixed(1) : '0.0'}%</strong></div>
            </div>
            ${badges.length ? `<div class="settings-entity-badges">${badges.join('')}</div>` : ''}
          </div>
          <div class="settings-entity-card-actions">
            <button type="button" class="button button-edit-entity" data-strategy-action="edit">${t('edit', 'Editar')}</button>
            <button type="button" class="button button-delete" data-strategy-action="delete">${t('delete', 'Eliminar')}</button>
          </div>
        </article>`;
    })
    .join('');
}

function updateAccountModalSummary(account) {
  const summaryEl = document.getElementById('accountModalSummary');
  if (!summaryEl || !account) {
    if (summaryEl) summaryEl.hidden = true;
    return;
  }
  const stats = getAccountWithdrawalStats(account);
  const expenseStats = getAccountExpenseStats(account);
  const balance = getAccountEstimatedBalance(account);
  const tradeCount = countTradesForAccount(account);
  summaryEl.hidden = false;
  summaryEl.innerHTML = `
    <div><strong>Resumen</strong></div>
    <div>Retirado de esta cuenta: <strong>${formatWithdrawalEuro(stats.withdrawn)}</strong> · Nº retiros: <strong>${stats.count}</strong></div>
    <div>Último retiro: <strong>${stats.last ? `${formatWithdrawalEuro(stats.last.amount)} (${formatDateEs(stats.last.date)})` : '—'}</strong></div>
    <div>Gastado en la prop: <strong>${formatNegativeEuro(expenseStats.spent)}</strong> · Nº gastos: <strong>${expenseStats.count}</strong></div>
    <div>Balance estimado: <strong>${formatWithdrawalEuro(balance)}</strong></div>
    <div>Trades asociados: <strong>${tradeCount}</strong></div>`;
}

function updateStrategyModalSummary(record) {
  const summaryEl = document.getElementById('strategyModalSummary');
  if (!summaryEl || !record) {
    if (summaryEl) summaryEl.hidden = true;
    return;
  }
  const stats = getStrategyTradeStats(record);
  summaryEl.hidden = false;
  summaryEl.innerHTML = `
    <div><strong>Resumen</strong></div>
    <div>Trades asociados: <strong>${stats.count}</strong></div>
    <div>PnL asociado: <strong>${formatWithdrawalEuro(stats.pnl)}</strong></div>
    <div>Win rate: <strong>${stats.count ? stats.winrate.toFixed(1) : '0.0'}%</strong></div>`;
}

function openAccountDetailModal(account = null) {
  accountModalIdentity = account ? identityFromAccount(account) : emptyEntityIdentity();
  console.log('[accounts] open detail modal identity', accountModalIdentity);
  clearAccountModalFeedback();
  const title = document.getElementById('accountDetailModalTitle');
  const saveBtn = document.getElementById('saveAccountDetailModalBtn');
  const deleteBtn = document.getElementById('deleteAccountModalBtn');
  const isEdit = hasStableIdentity(accountModalIdentity);
  if (title) title.textContent = isEdit ? t('account_detail_title', 'Detalle de cuenta') : t('add_account', 'Nueva cuenta');
  if (saveBtn) saveBtn.textContent = isEdit ? t('save_changes') : t('add_account');
  if (deleteBtn) deleteBtn.hidden = !isEdit;
  const typeSel = document.getElementById('accountModalType');
  if (account) {
    document.getElementById('accountModalName').value = account.name || '';
    document.getElementById('accountModalProp').value = account.prop_name || '';
    document.getElementById('accountModalNumber').value = account.account_number || '';
    document.getElementById('accountModalCapital').value = String(account.capital ?? '');
    document.getElementById('accountModalCommission').value = String(account.commissionPerLot ?? '');
    document.getElementById('accountModalFreeSwap').checked = Boolean(account.freeSwap);
    document.getElementById('accountModalChallengePassed').checked = Boolean(account.challenge_passed);
    document.getElementById('accountModalMaxDd').checked = Boolean(account.disabled_by_max_dd);
    if (typeSel) {
      typeSel.value = account.account_type || '';
      refreshCustomSelectForNative(typeSel);
    }
    updateAccountModalSummary(account);
  } else {
    document.getElementById('accountModalName').value = '';
    document.getElementById('accountModalProp').value = '';
    document.getElementById('accountModalNumber').value = '';
    document.getElementById('accountModalCapital').value = '';
    document.getElementById('accountModalCommission').value = '';
    document.getElementById('accountModalFreeSwap').checked = false;
    document.getElementById('accountModalChallengePassed').checked = false;
    document.getElementById('accountModalMaxDd').checked = false;
    if (typeSel) {
      typeSel.value = '';
      refreshCustomSelectForNative(typeSel);
    }
    const summaryEl = document.getElementById('accountModalSummary');
    if (summaryEl) summaryEl.hidden = true;
  }
  syncAccountModalChallengeFieldsVisibility();
  showEntityModalOverlay('accountDetailModalOverlay');

  // Las props/brokers configurados viven en las cachés de Gestión, que hasta ahora solo se
  // cargaban al abrir esa sección: si entrabas directo a Configuración > Nueva cuenta, el
  // desplegable salía vacío ("Sin sugerencias"). Se cargan aquí también.
  void (async () => {
    try {
      await Promise.all([loadExpensePropsCache(), loadWithdrawalsCache(), loadExpensesCache()]);
    } catch (err) {
      console.warn('No se pudieron cargar las props para el selector de cuenta:', err);
    }
  })();
}

// Los campos "Challenge superado" / "Máximo DD" solo tienen sentido si la cuenta es de tipo
// Challenge; se ocultan para Fondeada/Capital propio/sin especificar para no confundir.
// Además, si la cuenta es de Capital propio no tiene sentido hablar de "Prop", así que el
// campo pasa a llamarse "Broker" (no es una prop firm, es el bróker donde opera el capital propio).
function syncAccountModalChallengeFieldsVisibility() {
  const type = document.getElementById('accountModalType')?.value || '';
  const wrap = document.getElementById('accountModalChallengeFields');
  if (wrap) wrap.hidden = type !== 'challenge';

  const isOwnCapital = type === 'own_capital';
  const label = document.getElementById('accountModalPropLabel');
  const input = document.getElementById('accountModalProp');
  if (label) {
    label.setAttribute('data-i18n', isOwnCapital ? 'account_broker_label' : 'account_prop_label');
    label.textContent = isOwnCapital ? t('account_broker_label', 'Broker (opcional)') : t('account_prop_label', 'Prop (opcional)');
  }
  if (input) {
    input.setAttribute('data-i18n-placeholder', isOwnCapital ? 'account_broker_placeholder' : 'account_prop_placeholder');
    input.placeholder = isOwnCapital
      ? t('account_broker_placeholder', 'IC Markets, Pepperstone, IBKR...')
      : t('account_prop_placeholder', 'Apex, Topstep, Bulenox...');
  }
}

function closeAccountDetailModal() {
  hideEntityModalOverlay('accountDetailModalOverlay');
  accountModalIdentity = null;
}

function openStrategyDetailModal(record = null) {
  strategyModalIdentity = record ? identityFromStrategy(record) : emptyEntityIdentity();
  console.log('[strategies] open detail modal identity', strategyModalIdentity);
  clearStrategyModalFeedback();
  const title = document.getElementById('strategyDetailModalTitle');
  const saveBtn = document.getElementById('saveStrategyDetailModalBtn');
  const deleteBtn = document.getElementById('deleteStrategyModalBtn');
  const isEdit = hasStableIdentity(strategyModalIdentity);
  if (title) title.textContent = isEdit ? t('strategy_detail_title', 'Detalle de estrategia') : t('add_strategy', 'Nueva estrategia');
  if (saveBtn) saveBtn.textContent = isEdit ? t('save_changes') : t('add_strategy');
  if (deleteBtn) deleteBtn.hidden = !isEdit;
  if (record) {
    loadStrategyModalFromRecord(record);
    updateStrategyModalSummary(record);
  } else {
    clearStrategyModalFields();
    const summaryEl = document.getElementById('strategyModalSummary');
    if (summaryEl) summaryEl.hidden = true;
  }
  showEntityModalOverlay('strategyDetailModalOverlay');
}

function closeStrategyDetailModal() {
  hideEntityModalOverlay('strategyDetailModalOverlay');
  strategyModalIdentity = null;
}

async function saveAccountFromModal() {
  console.log('[accountModal] save clicked');
  clearAccountModalFeedback();

  const name = String(document.getElementById('accountModalName')?.value || '').trim();
  const propName = String(document.getElementById('accountModalProp')?.value || '').trim();
  const accountNumber = String(document.getElementById('accountModalNumber')?.value || '').trim();
  const accountType = normalizeAccountType(document.getElementById('accountModalType')?.value);
  const capital = parseNumericField(document.getElementById('accountModalCapital')?.value, 0);
  const commissionPerLot = parseNumericField(document.getElementById('accountModalCommission')?.value, 0);
  const freeSwap = Boolean(document.getElementById('accountModalFreeSwap')?.checked);
  // Los toggles de challenge solo se guardan tal cual si la cuenta es de tipo Challenge; si se
  // cambia el tipo a Fondeada/Capital propio no tiene sentido arrastrar un estado de challenge.
  const challengePassed = accountType === 'challenge' && Boolean(document.getElementById('accountModalChallengePassed')?.checked);
  const disabledByMaxDd = accountType === 'challenge' && Boolean(document.getElementById('accountModalMaxDd')?.checked);

  if (!name) {
    setAccountModalError('el nombre es obligatorio');
    return;
  }
  if (Number.isNaN(capital)) {
    setAccountModalError('capital debe ser un número válido');
    return;
  }
  if (Number.isNaN(commissionPerLot)) {
    setAccountModalError('comisión por lote debe ser un número válido');
    return;
  }

  const payload = {
    name,
    prop_name: propName || null,
    account_number: accountNumber || null,
    account_type: accountType,
    capital,
    commissionPerLot,
    freeSwap,
    challenge_passed: challengePassed,
    disabled_by_max_dd: disabledByMaxDd,
  };
  const isEdit = hasStableIdentity(accountModalIdentity);
  const existing = isEdit ? findAccountByIdentity(accountModalIdentity) : null;
  const originalName = accountModalIdentity?.originalName || existing?.name || null;

  console.log('[accountModal] payload', payload);
  console.log('[accountModal] identity', accountModalIdentity);

  let didRecalculateTrades = false;

  if (isEdit) {
    const taken = getAccounts().some(
      (a) => a.name === name && !accountMatchesIdentity(a, accountModalIdentity)
    );
    if (taken) {
      setAccountModalError('ya existe una cuenta con ese nombre');
      return;
    }
    let previous_names = existing?.previous_names || [];
    if (originalName && name !== originalName) {
      console.log('[accounts] rename from -> to', originalName, '->', name);
      const backend = getBackendApi();
      if (backend?.updateTradesAccount) {
        const renameRes = await backend.updateTradesAccount(originalName, name);
        if (!renameRes?.success && !renameRes?.skipped) {
          if (Number(renameRes?.localChanges) > 0) {
            console.warn('[accountModal] trades renombrados localmente; remoto pendiente');
          } else {
            setAccountModalError('no se pudieron actualizar los trades asociados');
            return;
          }
        }
      }
      previous_names = mergePreviousNames(previous_names, [originalName]);
    }
    const res = await updateRealAccount(
      {
        ...payload,
        client_uuid: existing?.client_uuid || accountModalIdentity.client_uuid,
        remote_id: existing?.remote_id || accountModalIdentity.remote_id,
        id: existing?.id ?? accountModalIdentity.id,
        previous_names,
      },
      accountModalIdentity,
      { oldName: originalName }
    );
    if (res?.success === false) {
      setAccountModalError(formatAccountSaveError(res));
      return;
    }

    const oldCommissionPerLot = Number(existing?.commissionPerLot ?? 0) || 0;
    const commissionChanged = Number(oldCommissionPerLot) !== Number(commissionPerLot);
    if (commissionChanged) {
      const ok = await showConfirmModal({
        title: 'Comisión por lote',
        message:
          'Has cambiado la comisión por lote. ¿Quieres recalcular las comisiones de todos los trades de esta cuenta?',
        confirmText: 'Recalcular ahora',
        cancelText: 'Solo guardar cuenta',
      });

      if (ok) {
        const backend = getBackendApi();
        if (!backend?.recalculateTradesCommissionForAccount) {
          setAccountModalError('No se pudo recalcular las comisiones (backend no disponible)');
          return;
        }

        const recalcRes = await backend.recalculateTradesCommissionForAccount({
          accountName: name,
          newCommissionPerLot: commissionPerLot,
          oldCommissionPerLot,
        });

        if (!recalcRes?.success) {
          setAccountModalError(recalcRes?.error ? String(recalcRes.error) : 'Error al recalcular trades');
          return;
        }
        didRecalculateTrades = true;
        showToast('Comisiones recalculadas', 'success');
      }
    }
  } else {
    if (getAccounts().some((a) => a.name === name)) {
      setAccountModalError('ya existe una cuenta con ese nombre');
      return;
    }
    console.log('[accounts] create requested', name);
    const res = await createRealAccount(payload);
    if (res?.success === false || res?.error === 'DUPLICATE') {
      setAccountModalError(formatAccountSaveError(res));
      return;
    }
  }

  await registerExpensePropIfNew(propName);
  await syncRealListsFromStorage();
  setAccountModalSuccess(t('account_saved_ok', 'Cuenta actualizada correctamente'));
  await loadAccounts();
  await loadStrategies();
  updateCreateDerivedFields();
  if (isEdit && (didRecalculateTrades || (originalName && name !== originalName))) await loadTrades();
  showToast(t('saved_changes'), 'success');
  setTimeout(() => closeAccountDetailModal(), 450);
}

async function deleteAccountWithConfirmation(account, identity) {
  if (!account) return false;
  const id = identity || identityFromAccount(account);
  const tradeCount = countTradesForAccount(account);
  const withdrawalCount = getAccountWithdrawalStats(account).count;
  const expenseCount = getAccountExpenseStats(account).count;
  const statsLines = [`Trades asociados: <strong>${tradeCount}</strong>`];
  if (withdrawalCount > 0) {
    statsLines.push(`Retiros asociados: <strong>${withdrawalCount}</strong>`);
  }
  if (expenseCount > 0) {
    statsLines.push(`Gastos asociados: <strong>${expenseCount}</strong>`);
  }
  const ok = await showSecureDeleteModal({
    title: t('delete_account', 'Eliminar cuenta'),
    entityName: account.name,
    mainText: t(
      'confirm_delete_account_main',
      'Esta acción ocultará la cuenta de tus formularios, pero no borrará tus trades históricos.'
    ),
    statsLines,
    hasAssociatedData: tradeCount > 0 || withdrawalCount > 0 || expenseCount > 0,
    confirmText: t('delete', 'Eliminar'),
    cancelText: t('cancel', 'Cancelar'),
  });
  if (!ok) return false;
  await markAccountDeletedInRegistry(account);
  await saveAccounts(getAccounts().filter((a) => !accountMatchesIdentity(a, id)));
  try {
    const backend = getBackendApi();
    if (backend?.deleteRealAccountLocal) {
      await backend.deleteRealAccountLocal(account.client_uuid || account.name);
    }
  } catch (err) {
    console.warn('No se pudo borrar cuenta en SQLite:', err);
  }
  await syncRealListsFromStorage();
  closeAccountDetailModal();
  await loadAccounts();
  await loadStrategies();
  updateCreateDerivedFields();
  showToast(t('saved_changes'));
  return true;
}

async function deleteAccountFromModal() {
  if (!hasStableIdentity(accountModalIdentity)) return;
  const account = findAccountByIdentity(accountModalIdentity);
  if (!account) return;
  await deleteAccountWithConfirmation(account, accountModalIdentity);
}

async function saveStrategyFromModal() {
  clearStrategyModalFeedback();
  const formMeta = collectStrategyModalPayload();
  if (formMeta.error) {
    setStrategyModalError(t('strategy_hours_invalid', 'Horarios no válidos'));
    return;
  }
  if (!formMeta.name) {
    setStrategyModalError('el nombre es obligatorio');
    return;
  }
  const isEdit = hasStableIdentity(strategyModalIdentity);
  const existing = isEdit ? findStrategyByIdentity(strategyModalIdentity) : null;
  const originalName = strategyModalIdentity?.originalName || existing?.name || null;

  if (isEdit) {
    const taken = [...realStrategiesByName.values()].some(
      (r) => r.name === formMeta.name && !strategyMatchesIdentity(r, strategyModalIdentity)
    );
    if (taken) {
      setStrategyModalError('ya existe una estrategia con ese nombre');
      return;
    }
    let previous_names = existing?.previous_names || [];
    if (originalName && formMeta.name !== originalName) {
      console.log('[strategies] rename from -> to', originalName, '->', formMeta.name);
      const backend = getBackendApi();
      if (backend?.updateTradesStrategy) {
        const res = await backend.updateTradesStrategy(originalName, formMeta.name);
        if (!res?.success && !res?.skipped && !(Number(res?.localChanges) > 0)) {
          setStrategyModalError('no se pudieron actualizar los trades asociados');
          return;
        }
      }
      previous_names = mergePreviousNames(previous_names, [originalName]);
      if (existing) realStrategiesByName.delete(originalName);
    }
    const nextRecord = {
      ...formMeta,
      client_uuid: existing?.client_uuid || strategyModalIdentity.client_uuid,
      remote_id: existing?.remote_id || strategyModalIdentity.remote_id,
      id: existing?.id ?? strategyModalIdentity.id,
      previous_names,
    };
    realStrategiesByName.set(formMeta.name, nextRecord);
    const names = [...realStrategiesByName.keys()];
    await saveRealStrategiesList(names);
    await persistStrategyRecord(nextRecord, strategyModalIdentity, { isUpdate: true, oldName: originalName });
  } else {
    if (realStrategiesCache.includes(formMeta.name)) {
      setStrategyModalError('ya existe una estrategia con ese nombre');
      return;
    }
    console.log('[strategies] create requested', formMeta.name);
    const names = [...realStrategiesCache, formMeta.name];
    realStrategiesByName.set(formMeta.name, formMeta);
    await saveRealStrategiesList(names);
    await persistStrategyRecord(formMeta, null, { isUpdate: false });
  }
  await syncRealListsFromStorage();
  closeStrategyDetailModal();
  await loadStrategies();
  await loadAccounts();
  if (isEdit && originalName && formMeta.name !== originalName) await loadTrades();
  showToast(t('saved_changes'), 'success');
}

async function deleteStrategyWithConfirmation(record, identity) {
  if (!record) return false;
  const id = identity || identityFromStrategy(record);
  const tradeCount = getStrategyTradeStats(record).count;
  const ok = await showSecureDeleteModal({
    title: t('delete_strategy', 'Eliminar estrategia'),
    entityName: record.name,
    mainText: t(
      'confirm_delete_strategy_main',
      'Esta acción ocultará la estrategia de tus formularios, pero no borrará tus trades históricos.'
    ),
    statsLines: [`Trades asociados: <strong>${tradeCount}</strong>`],
    hasAssociatedData: tradeCount > 0,
    confirmText: t('delete', 'Eliminar'),
    cancelText: t('cancel', 'Cancelar'),
  });
  if (!ok) return false;
  await markStrategyDeletedInRegistry(record);
  const removed = record.name;
  const strategies = realStrategiesCache.filter((item) => item !== removed);
  await saveRealStrategiesList(strategies);
  try {
    const backend = getBackendApi();
    if (backend?.deleteRealStrategyLocal) {
      await backend.deleteRealStrategyLocal(record.client_uuid || removed);
    }
  } catch (err) {
    console.warn('No se pudo borrar estrategia en SQLite:', err);
  }
  await syncRealListsFromStorage();
  closeStrategyDetailModal();
  await loadStrategies();
  await loadAccounts();
  showToast(t('saved_changes'));
  return true;
}

async function deleteStrategyFromModal() {
  if (!hasStableIdentity(strategyModalIdentity)) return;
  const record = findStrategyByIdentity(strategyModalIdentity);
  if (!record) return;
  await deleteStrategyWithConfirmation(record, strategyModalIdentity);
}

function initSettingsEntityListDelegation() {
  const accountsList = document.getElementById('settingsAccountsList');
  if (accountsList && !accountsList.dataset.delegationBound) {
    accountsList.dataset.delegationBound = '1';
    accountsList.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-account-action="edit"]');
      const deleteBtn = event.target.closest('[data-account-action="delete"]');
      if (!editBtn && !deleteBtn) return;
      event.preventDefault();
      event.stopPropagation();
      const card = event.target.closest('.settings-entity-card[data-entity-type="account"]');
      if (!card) return;
      const identity = identityFromCardDataset(card);
      const account = findAccountByIdentity(identity);
      if (!account) return;
      if (editBtn) {
        console.log('[accounts] edit button clicked', identity);
        openAccountDetailModal(account);
        return;
      }
      if (deleteBtn) {
        console.log('[accounts] delete button clicked', identity);
        void deleteAccountWithConfirmation(account, identity);
      }
    });
  }

  const strategiesList = document.getElementById('settingsStrategiesList');
  if (strategiesList && !strategiesList.dataset.delegationBound) {
    strategiesList.dataset.delegationBound = '1';
    strategiesList.addEventListener('click', (event) => {
      const editBtn = event.target.closest('[data-strategy-action="edit"]');
      const deleteBtn = event.target.closest('[data-strategy-action="delete"]');
      if (!editBtn && !deleteBtn) return;
      event.preventDefault();
      event.stopPropagation();
      const card = event.target.closest('.settings-entity-card[data-entity-type="strategy"]');
      if (!card) return;
      const identity = identityFromCardDataset(card);
      const record = findStrategyByIdentity(identity);
      if (!record) return;
      if (editBtn) {
        console.log('[strategies] edit button clicked', identity);
        openStrategyDetailModal(record);
        return;
      }
      if (deleteBtn) {
        console.log('[strategies] delete button clicked', identity);
        void deleteStrategyWithConfirmation(record, identity);
      }
    });
  }
}

function initAccountStrategyModals() {
  initSettingsEntityListDelegation();
  // Selector de props/brokers ya configurados. No es estricto a propósito: para cuentas de
  // Capital propio el bróker puede no estar en la lista de props de Gestión y hay que poder
  // escribirlo. Aun así se abre la lista completa al pulsar, como un desplegable.
  attachSuggestDropdown(
    'accountModalProp',
    'accountModalPropSuggest',
    getKnownExpensePropsRecentFirst,
    { openAllOnFocus: true }
  );
  document.getElementById('accountModalType')?.addEventListener('change', syncAccountModalChallengeFieldsVisibility);
  document.getElementById('openNewAccountModalBtn')?.addEventListener('click', () => openAccountDetailModal());
  document.getElementById('openNewStrategyModalBtn')?.addEventListener('click', () => openStrategyDetailModal());
  document.getElementById('saveAccountDetailModalBtn')?.addEventListener('click', () => {
    saveAccountFromModal().catch(console.error);
  });
  document.getElementById('saveStrategyDetailModalBtn')?.addEventListener('click', () => {
    saveStrategyFromModal().catch(console.error);
  });
  document.getElementById('deleteAccountModalBtn')?.addEventListener('click', () => {
    deleteAccountFromModal().catch(console.error);
  });
  document.getElementById('deleteStrategyModalBtn')?.addEventListener('click', () => {
    deleteStrategyFromModal().catch(console.error);
  });
  document.getElementById('closeAccountDetailModalBtn')?.addEventListener('click', closeAccountDetailModal);
  document.getElementById('cancelAccountDetailModalBtn')?.addEventListener('click', closeAccountDetailModal);
  document.getElementById('closeStrategyDetailModalBtn')?.addEventListener('click', closeStrategyDetailModal);
  document.getElementById('cancelStrategyDetailModalBtn')?.addEventListener('click', closeStrategyDetailModal);
  document.getElementById('accountDetailModalOverlay')?.addEventListener('click', (event) => {
    if (event.target?.id === 'accountDetailModalOverlay') closeAccountDetailModal();
  });
  document.getElementById('strategyDetailModalOverlay')?.addEventListener('click', (event) => {
    if (event.target?.id === 'strategyDetailModalOverlay') closeStrategyDetailModal();
  });
  document.getElementById('strategyModalScheduleEnabled')?.addEventListener('change', syncStrategyModalHoursVisibility);
  document.getElementById('strategyModalAddHourBtn')?.addEventListener('click', () => {
    const next = collectStrategyHoursFromDom('strategyModalHoursList');
    next.push({ start: '08:00', end: '10:30' });
    renderStrategyHoursList(next, 'strategyModalHoursList');
  });
  document.getElementById('strategyModalAddMetricBtn')?.addEventListener('click', () => {
    const next = collectStrategyMetricsFromDom({ keepEmpty: true });
    next.push('');
    renderStrategyMetricsList(next);
    // Foco en la métrica recién añadida para poder escribir directamente.
    const inputs = document.querySelectorAll('#strategyModalMetricsList .strategy-metric-name');
    inputs[inputs.length - 1]?.focus();
  });

  // Al cambiar de estrategia, el checklist del formulario debe reflejar el de esa estrategia.
  document.getElementById('strategy')?.addEventListener('change', () => {
    renderTradeCustomMetricFields('create', document.getElementById('strategy')?.value || '', collectTradeCustomMetrics('create'));
  });
  document.getElementById('editStrategy')?.addEventListener('change', () => {
    renderTradeCustomMetricFields('edit', document.getElementById('editStrategy')?.value || '', collectTradeCustomMetrics('edit'));
  });
}

async function requireDangerConfirmation(actionLabel) {
  const msg = t(
    'confirm_danger_action',
    'Esta acción eliminará TODOS los trades de forma permanente ({action}). ¿Continuar?'
  ).replace('{action}', String(actionLabel || ''));
  const ok = await showConfirmModal({
    title: t('confirm_danger_title', 'Confirmar acción destructiva'),
    message: msg,
    confirmText: t('continue', 'Continuar'),
    cancelText: t('cancel', 'Cancelar'),
    danger: true,
  });
  if (!ok) return false;
  const doubleCheck = window.prompt(
    t('confirm_type_delete', 'Escribe BORRAR para confirmar esta acción irreversible')
  );
  return (doubleCheck || '').trim().toUpperCase() === t('confirm_delete_word', 'BORRAR');
}

async function refreshAfterTradeDeletion() {
  const backend = getBackendApi();
  if (backend?.getTradesLocal) {
    const local = await backend.getTradesLocal();
    await loadTrades(Array.isArray(local) ? local : []);
    return;
  }
  await loadTrades();
}

async function deleteTradesByStrategyAction() {
  const strategy = document.getElementById('resetStrategySelect')?.value || '';
  if (!strategy) {
    showToast(t('select_strategy_first'), 'error');
    return;
  }
  if (!(await requireDangerConfirmation(t('confirm_action_strategy').replace('{name}', strategy)))) {
    showToast(t('action_cancelled'), 'error');
    return;
  }
  if (!(await ensureUserReady())) return;
  const backend = getBackendApi();
  if (!backend?.deleteTradesByStrategy) {
    showToast(t('error_api_delete_strategy'), 'error');
    return;
  }
  console.log('[bulkDeleteTrades] strategy requested (UI)', strategy);
  const result = await backend.deleteTradesByStrategy(strategy);
  if (!result?.success) {
    showToast(t('error_api_delete_strategy'), 'error');
    return;
  }
  const deletedCount = Number(result?.deleted || 0);
  console.log('[bulkDeleteTrades] strategy done', result);
  showToast(t('deleted_trades_count').replace('{count}', String(deletedCount)).replace('{name}', strategy));
  await refreshAfterTradeDeletion();
}

async function deleteTradesByAccountAction() {
  const account = document.getElementById('resetAccountSelect')?.value || '';
  if (!account) {
    showToast(t('select_account_first'), 'error');
    return;
  }
  if (!(await requireDangerConfirmation(t('confirm_action_account').replace('{name}', account)))) {
    showToast(t('action_cancelled'), 'error');
    return;
  }
  if (!(await ensureUserReady())) return;
  const backend = getBackendApi();
  if (!backend?.deleteTradesByAccount) {
    showToast(t('error_api_delete_account'), 'error');
    return;
  }
  console.log('[bulkDeleteTrades] account requested (UI)', account);
  const result = await backend.deleteTradesByAccount(account);
  if (!result?.success) {
    showToast(t('error_api_delete_account'), 'error');
    return;
  }
  const deletedCount = Number(result?.deleted || 0);
  console.log('[bulkDeleteTrades] account done', result);
  showToast(t('deleted_trades_count').replace('{count}', String(deletedCount)).replace('{name}', account));
  await refreshAfterTradeDeletion();
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isExcludeBEEnabled() {
  return localStorage.getItem('excludeBE') === 'true';
}

function getFilteredWinrateTrades(trades) {
  if (!Array.isArray(trades)) return [];
  const closedTrades = trades.filter((trade) => String(trade.result || '').toUpperCase() !== 'BE');
  if (!isExcludeBEEnabled()) return trades;
  return closedTrades;
}

function updateWinrateInfoLabel() {
  const info = document.getElementById('winrateInfo');
  if (!info) return;
  info.textContent = isExcludeBEEnabled() ? t('exclude_be_toggle') : t('include_be_toggle');
}

function getViewFromHash() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'backtestingconfig') return 'backtestingConfig';
  // Alias retrocompatible: enlaces/hash antiguos a #withdrawals siguen llevando a Gestión.
  if (hash === 'withdrawals') return 'management';
  if (
    hash === 'trade' ||
    hash === 'config' ||
    hash === 'management' ||
    hash === 'dashboard' ||
    hash === 'backtesting' ||
    hash === 'stats'
  ) {
    return hash;
  }
  return 'dashboard';
}

function showView(viewId) {
  const views = ['dashboard', 'trade', 'config', 'stats', 'management', 'backtesting', 'backtestingConfig'];
  const previousView = currentView;
  currentView = views.includes(viewId) ? viewId : (viewId === 'withdrawals' ? 'management' : 'dashboard');

  if (previousView === 'stats' && currentView !== 'stats') {
    unmountStatsView();
  }

  normalizeSidebarStructure(currentView);
  setSidebarActiveView(currentView);
  if (currentView !== 'dashboard') closeTradePanel();

  ['dashboard', 'trade', 'config', 'stats', 'management', 'backtesting', 'backtestingConfig'].forEach((v) => {
    const el = document.getElementById(`${v}View`);
    if (el) el.style.display = v === currentView ? 'block' : 'none';
  });

  if (currentView === 'stats') {
    console.log('SPA navigate to stats');
    const statsRoot = document.getElementById('statsView');
    void mountStatsView(statsRoot).catch(console.error);
  }

  if (currentView === 'dashboard') renderDashboard();
  if (currentView === 'trade') {
    cleanupStrayAssetCustomSelects();
    if (typeof assetComboboxState?.refresh === 'function') assetComboboxState.refresh();
    const presetDate = sessionStorage.getItem(NEW_TRADE_DATE_KEY);
    void resetNewTradeForm(presetDate || null).catch(console.error);
    applyPresetTradeDateIfAny();
  }
  if (currentView === 'config') {
    void loadAccounts().catch(console.error);
    void loadStrategies().catch(console.error);
  }
  if (currentView === 'management') {
    void refreshManagementUI().catch(console.error);
  }
  if (currentView === 'backtesting') {
    void refreshBacktestingView().catch(console.error);
  }
  if (currentView === 'backtestingConfig') {
    ensureBtStrategyModalScheduleListeners();
    void (async () => {
      await loadBacktestingSettings();
      await loadBacktestingMetrics();
      renderBtMetricsConfigList();
    })().catch(console.error);
  }
  refreshLucideIcons();
  setTimeout(() => {
    normalizeSidebarStructure(currentView);
  }, 0);

  console.log('Vista actual:', currentView);
}
window.navigateTo = navigateTo;
window.showView = showView;
window.removeBacktestingItem = removeBacktestingItem;
window.testAPI = () => {
  console.log(getBackendApi());
};

function applyModeUI() {
  const isPro = getMode() === 'pro';
  document.querySelectorAll('.pro-only').forEach((element) => {
    element.style.display = isPro ? '' : 'none';
  });
  document.getElementById('basicModeBtn')?.classList.toggle('active', !isPro);
  document.getElementById('proModeBtn')?.classList.toggle('active', isPro);
}

function getSelectedAccount(selectId) {
  const accountName = document.getElementById(selectId)?.value;
  if (!accountName) return null;
  return getAccounts().find((account) => account.name === accountName) || null;
}

function updateCreateDerivedFields() {
  const account = getSelectedAccount('account');
  const accountCapitalInput = document.getElementById('accountCapital');
  const commissionPerLotInput = document.getElementById('commissionPerLot');
  if (accountCapitalInput) accountCapitalInput.value = account ? String(account.capital) : '';
  if (commissionPerLotInput) commissionPerLotInput.value = account ? String(account.commissionPerLot) : '';
  refreshPnlPresetButtons();
}

function calculateNetPnL() {
  const gross = Number(document.getElementById('pnl')?.value) || 0;
  const lotaje = Number(document.getElementById('lotaje')?.value || document.getElementById('lotSize')?.value) || 0;
  const commissionInput = Number(document.getElementById('commission')?.value) || 0;
  const account = getSelectedAccount('account');
  const computedCommission = commissionInput || (lotaje * (account?.commissionPerLot || 0));
  return gross - computedCommission;
}

function toggleSidebar() {
  toggleSidebarCollapse();
  refreshLucideIcons();
}

async function loadStats() {
  if (!isAppAuthenticated) return;
  if (!(await ensureUserReady())) return;
  const backend = getBackendApi();
  if (!backend?.getTrades) return;

  const trades = await backend.getTrades();
  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter((trade) => (trade.date || '').slice(0, 10) === today);
  const pnlToday = todayTrades.reduce((sum, trade) => sum + getTradeRealPnl(trade), 0);
  const filteredTrades = getFilteredWinrateTrades(todayTrades);
  const wins = filteredTrades.filter((trade) => getTradeRealPnl(trade) > 0).length;
  const total = filteredTrades.length;
  const winrate = total ? ((wins / total) * 100).toFixed(1) : '0.0';

  const pnlEl = document.getElementById('pnlToday') || document.getElementById('todayPnl');
  const winrateEl = document.getElementById('winrate') || document.getElementById('todayWinrate');
  const tradesEl = document.getElementById('tradesToday') || document.getElementById('todayTrades');
  if (pnlEl) pnlEl.textContent = `${pnlToday.toFixed(2)}€`;
  if (winrateEl) winrateEl.textContent = `${winrate}%`;
  if (tradesEl) tradesEl.textContent = String(todayTrades.length);
  renderRealBeAnalysisSection(trades);
  updateWinrateInfoLabel();
}

function getTradeGrossPnl(trade) {
  const gross = Number(trade?.pnl ?? 0);
  return Number.isFinite(gross) ? Math.abs(gross) : 0;
}

function computeRealBeAnalysisMetrics(trades) {
  const allTrades = Array.isArray(trades) ? trades : [];
  const beTrades = allTrades.filter((t) => String(t.result || '').toUpperCase() === 'BE');
  const beToTP = beTrades.filter((t) => String(t.be_after_result || '').toUpperCase() === 'TP').length;
  const beToSL = beTrades.filter((t) => String(t.be_after_result || '').toUpperCase() === 'SL').length;
  const beUnknown = beTrades.filter((t) => !t.be_after_result).length;
  const beResolved = beToTP + beToSL;
  const beUsefulRate = beResolved > 0 ? (beToSL / beResolved) * 100 : 0;
  const beMissedRate = beResolved > 0 ? (beToTP / beResolved) * 100 : 0;
  const pnlWithoutBE = beTrades.reduce((acc, t) => {
    const movement = getTradeGrossPnl(t);
    const after = String(t.be_after_result || '').toUpperCase();
    if (after === 'TP') return acc + movement;
    if (after === 'SL') return acc - movement;
    return acc;
  }, 0);
  return { beTrades, beToTP, beToSL, beUnknown, beResolved, beUsefulRate, beMissedRate, pnlWithoutBE };
}

function renderRealBeAnalysisSection(trades) {
  const host = document.getElementById('statsView');
  if (!host) return;
  const blockId = 'beAnalysisStatsReal';
  let block = document.getElementById(blockId);
  if (!block) {
    block = document.createElement('section');
    block.id = blockId;
    block.className = 'card';
    block.style.marginTop = '14px';
    block.style.padding = '16px';
    block.style.border = '1px solid rgba(148,163,184,.14)';
    block.style.background = 'rgba(15,23,42,.48)';
    block.style.borderRadius = '14px';
    host.appendChild(block);
  }

  const m = computeRealBeAnalysisMetrics(trades);
  if (!m.beTrades.length) {
    block.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <h3 style="margin:0;font-size:16px;">Análisis BE</h3>
        <p class="muted" style="margin:0 0 4px;">Evalúa si mover operaciones a break even está protegiendo capital o limitando beneficios.</p>
        <div class="muted" style="padding:10px 0;">No hay operaciones BE suficientes para analizar.</div>
        <div class="muted" style="font-size:12px;">Cuando registres trades BE y marques si después fueron a TP o SL, aparecerá el análisis.</div>
      </div>
    `;
    return;
  }

  const money = `${m.pnlWithoutBE >= 0 ? '+' : ''}${m.pnlWithoutBE.toFixed(2)}€`;
  block.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
      <h3 style="margin:0;font-size:16px;">Análisis BE</h3>
      <p class="muted" style="margin:0;">Evalúa si mover operaciones a break even está protegiendo capital o limitando beneficios.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:10px;">
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">BE → TP</div>
        <div style="font-size:20px;font-weight:800;color:#fb7185;">${m.beToTP}</div>
        <div class="muted" style="font-size:11px;">Operaciones que habrían llegado a TP</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">BE → SL</div>
        <div style="font-size:20px;font-weight:800;color:#4ade80;">${m.beToSL}</div>
        <div class="muted" style="font-size:11px;">Pérdidas evitadas por BE</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">BE útil</div>
        <div style="font-size:20px;font-weight:800;color:#4ade80;">${m.beUsefulRate.toFixed(1)}%</div>
        <div class="muted" style="font-size:11px;">Sobre BE con resultado posterior</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">Beneficio limitado</div>
        <div style="font-size:20px;font-weight:800;color:#fb7185;">${m.beMissedRate.toFixed(1)}%</div>
        <div class="muted" style="font-size:11px;">BE que habría terminado en TP</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">BE sin resolver</div>
        <div style="font-size:20px;font-weight:800;color:#93c5fd;">${m.beUnknown}</div>
        <div class="muted" style="font-size:11px;">Sin TP/SL posterior registrado</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">PnL hipotético sin BE</div>
        <div style="font-size:20px;font-weight:800;${m.pnlWithoutBE >= 0 ? 'color:#4ade80;' : 'color:#f87171;'}">${money}</div>
        <div class="muted" style="font-size:11px;">Estimación basada en el PnL bruto registrado</div>
      </div>
    </div>
  `;
}

function computeBeAdvancedMetrics(trades) {
  const list = Array.isArray(trades) ? trades : [];
  const beTrades = list.filter((trade) => String(trade.result || '').toUpperCase() === 'BE');
  const beTP = beTrades.filter((trade) => sanitizeBeAfterResult(trade.be_after_result) === 'TP').length;
  const beSL = beTrades.filter((trade) => sanitizeBeAfterResult(trade.be_after_result) === 'SL').length;
  const beTotal = beTrades.length;
  const beSuccessRate = beTotal > 0 ? (beTP / beTotal) * 100 : 0;
  const hypotheticalPnL = beTrades.reduce((acc, trade) => {
    const mapped = sanitizeBeAfterResult(trade.be_after_result);
    const pnlAbs = Math.abs(Number(getTradeRealPnl(trade) || trade.pnl || 0));
    if (mapped === 'TP') return acc + pnlAbs;
    if (mapped === 'SL') return acc - pnlAbs;
    return acc;
  }, 0);
  return { beTP, beSL, beTotal, beSuccessRate, hypotheticalPnL };
}

function renderBeAdvancedStatsCard({ hostId, blockId, title, subtitle, trades }) {
  const host = document.getElementById(hostId);
  if (!host) return;
  let block = document.getElementById(blockId);
  if (!block) {
    block = document.createElement('div');
    block.id = blockId;
    block.className = 'card';
    block.style.marginTop = '14px';
    block.style.padding = '16px';
    block.style.border = '1px solid rgba(148,163,184,.14)';
    block.style.background = 'rgba(15,23,42,.48)';
    block.style.borderRadius = '14px';
    host.appendChild(block);
  }
  const m = computeBeAdvancedMetrics(trades);
  const hasBeData = m.beTotal > 0;
  if (!hasBeData) {
    block.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <h3 style="margin:0;font-size:16px;">${title}</h3>
        <p class="muted" style="margin:0 0 4px;">${subtitle || ''}</p>
        <div class="muted" style="padding:10px 0;">No hay operaciones BE suficientes para analizar.</div>
      </div>
    `;
    return;
  }
  block.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
      <h3 style="margin:0;font-size:16px;">${title}</h3>
      <p class="muted" style="margin:0;">${subtitle || ''}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;">
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">BE → TP</div>
        <div style="font-size:20px;font-weight:800;color:#4ade80;">${m.beTP}</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">BE → SL</div>
        <div style="font-size:20px;font-weight:800;color:#f87171;">${m.beSL}</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">% BE útil</div>
        <div style="font-size:20px;font-weight:800;">${m.beSuccessRate.toFixed(1)}%</div>
      </div>
      <div class="card" style="padding:10px 12px;border:1px solid rgba(148,163,184,.12);background:rgba(2,6,23,.36);border-radius:12px;">
        <div class="muted" style="font-size:12px;">PnL hipotético sin BE</div>
        <div style="font-size:20px;font-weight:800;${m.hypotheticalPnL >= 0 ? 'color:#4ade80;' : 'color:#f87171;'}">${m.hypotheticalPnL >= 0 ? '+' : ''}${m.hypotheticalPnL.toFixed(2)}€</div>
      </div>
    </div>
  `;
}

function parseMoneyInput(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value).replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function recalculateCreateNetPnl() {
  if (isTradeCompositeEnabled('create')) {
    recalculateTradeCompositeTotals('create');
    const grossPnl = parseMoneyInput(document.getElementById('pnl')?.value);
    const lotSize = Number((document.getElementById('lotSize') || document.getElementById('lotaje'))?.value) || 0;
    const fee = getTradeCommissionCalc({ lotSize, grossPnl, form: 'create' });
    return { grossPnl: fee.grossPnl, commission: fee.commission, netPnl: fee.netPnl };
  }
  const grossPnl = parseMoneyInput(document.getElementById('pnl')?.value);
  const lotSize = Number(document.getElementById('lotSize')?.value) || 0;
  const fee = getTradeCommissionCalc({ lotSize, grossPnl, form: 'create' });
  const netPnl = fee.netPnl;
  const commission = fee.commission;

  const pnlNetInput = document.getElementById('pnlNet');
  const commissionInput = document.getElementById('commissionValue');
  if (pnlNetInput) {
    pnlNetInput.value = `${netPnl.toFixed(2)}€`;
    pnlNetInput.classList.remove('trade-profit', 'trade-loss', 'trade-be');
    pnlNetInput.classList.add(netPnl > 0 ? 'trade-profit' : netPnl < 0 ? 'trade-loss' : 'trade-be');
  }
  if (commissionInput) commissionInput.value = `${commission.toFixed(2)}€`;
  updateTradeRiskDisplay();
}

function applyPnlSignForResult(rawValue) {
  const result = document.getElementById('result')?.value;
  const n = Math.abs(Number(rawValue) || 0);
  if (result === 'SL') return -n;
  return n;
}

function normalizePnlByResult() {
  if (isTradeCompositeEnabled('create')) {
    applyCompositeLegPnlSign('create');
    recalculateTradeCompositeTotals('create');
    return;
  }
  const pnlEl = document.getElementById('pnl');
  const resultEl = document.getElementById('result');

  if (!pnlEl || !resultEl) return;

  const raw = pnlEl.value;

  // No tocar mientras está vacío o incompleto
  if (
    raw === '' ||
    raw === '-' ||
    raw === '+' ||
    raw.endsWith(',') ||
    raw.endsWith('.')
  ) {
    recalculateCreateNetPnl();
    return;
  }

  const value = Math.abs(parseMoneyInput(raw));

  if (resultEl.value === 'SL') {
    pnlEl.value = String(-value);
  } else if (resultEl.value === 'TP') {
    pnlEl.value = String(value);
  }

  recalculateCreateNetPnl();
}

/**
 * Mismo ajuste de signo para el formulario de edición (campo único, sin entradas parciales):
 * un SL guarda el PnL en negativo y un TP en positivo, sin obligar a volver a marcar el
 * resultado después de escribir la cifra.
 */
function normalizeEditPnlByResult() {
  if (isTradeCompositeEnabled('edit')) {
    applyCompositeLegPnlSign('edit');
    recalculateTradeCompositeTotals('edit');
    return;
  }
  const pnlEl = document.getElementById('editPnl');
  const resultEl = document.getElementById('editResult');
  if (!pnlEl || !resultEl) return;

  const raw = pnlEl.value;
  if (raw === '' || raw === '-' || raw === '+' || raw.endsWith(',') || raw.endsWith('.')) {
    recalculateEditNetPnl();
    return;
  }

  const value = Math.abs(parseMoneyInput(raw));
  if (resultEl.value === 'SL') pnlEl.value = String(-value);
  else if (resultEl.value === 'TP') pnlEl.value = String(value);

  recalculateEditNetPnl();
}

function sanitizeBeAfterResult(value) {
  const up = String(value || '').trim().toUpperCase();
  if (up === 'TP' || up === 'SL') return up;
  return null;
}

function injectBeAfterResultStyles() {
  if (document.getElementById('be-after-result-styles')) return;
  const style = document.createElement('style');
  style.id = 'be-after-result-styles';
  style.textContent = `
.be-after-wrap{
  transition:all .2s ease;
  max-height:0;
  opacity:0;
  overflow:hidden;
  transform:translateY(-4px);
}
.be-after-wrap.visible{
  max-height:96px;
  opacity:1;
  transform:translateY(0);
  overflow:visible;
  position:relative;
  z-index:120;
}
.be-after-wrap .custom-select.open{
  z-index:130;
}
.be-after-wrap .select-options{
  z-index:140;
}
select,
.form-select{
  pointer-events:auto;
  cursor:pointer;
  appearance:auto;
}
`;
  document.head.appendChild(style);
}

function ensureBeAfterResultField({ resultId, selectId, labelText, wrapperId = null, selectClass = 'input' }) {
  injectBeAfterResultStyles();
  const resultEl = document.getElementById(resultId);
  if (!resultEl) return null;
  const beAfterOptions = [
    { value: '', label: 'Sin definir' },
    { value: 'TP', label: 'TP' },
    { value: 'SL', label: 'SL' }
  ];

  const resolvedWrapperId = wrapperId || `${selectId}Wrap`;
  let wrap = document.getElementById(resolvedWrapperId);
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = resolvedWrapperId;
    wrap.className = 'be-after-wrap';
    const optionsHtml = beAfterOptions
      .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
      .join('');
    wrap.innerHTML = `
      <label for="${selectId}">${labelText}</label>
      <select id="${selectId}" name="be_after_result" class="${selectClass}">
        ${optionsHtml}
      </select>
    `;
    const parent = resultEl.closest('label, .form-group, .field, .bt-custom-field') || resultEl.parentElement;
    if (parent?.parentElement) parent.parentElement.insertBefore(wrap, parent.nextSibling);
    else resultEl.insertAdjacentElement('afterend', wrap);
  }

  const beSelectEl = document.getElementById(selectId);
  if (beSelectEl && !beSelectEl.options.length) {
    beSelectEl.innerHTML = beAfterOptions
      .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
      .join('');
  }
  if (beSelectEl) {
    beSelectEl.disabled = false;
    beSelectEl.removeAttribute('disabled');
    beSelectEl.removeAttribute('readonly');
    beSelectEl.style.pointerEvents = 'auto';
    beSelectEl.style.zIndex = '2';
    beSelectEl.style.position = 'relative';
    const maybeOldCustom = beSelectEl.parentElement?.querySelector(':scope > .custom-select');
    if (maybeOldCustom) maybeOldCustom.remove();
    if (typeof refreshCustomSelectForNative === 'function') {
      refreshCustomSelectForNative(beSelectEl);
    }
  }

  const syncVisibility = () => {
    const isBe = String(resultEl.value || '').toUpperCase() === 'BE';
    wrap.classList.toggle('visible', isBe);
    if (!isBe && beSelectEl) beSelectEl.value = '';
    if (isBe && beSelectEl && typeof refreshCustomSelectForNative === 'function') {
      const maybeOldCustom = beSelectEl.parentElement?.querySelector(':scope > .custom-select');
      if (maybeOldCustom) maybeOldCustom.remove();
      refreshCustomSelectForNative(beSelectEl);
    }
  };

  if (resultEl.dataset.beAfterBound !== 'true') {
    resultEl.dataset.beAfterBound = 'true';
    resultEl.addEventListener('change', syncVisibility);
  }

  syncVisibility();
  return beSelectEl;
}

function getRecentPairs() {
  try {
    const raw = localStorage.getItem(RECENT_PAIRS_KEY);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && String(x).trim()) : [];
  } catch {
    return [];
  }
}

function addRecentPair(symbol) {
  const s = String(symbol || '').trim().toUpperCase();
  if (!s) return;
  let list = getRecentPairs().filter((x) => x !== s);
  list.unshift(s);
  list = list.slice(0, MAX_RECENT_PAIRS);
  localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(list));
}

function getRecentBtPairs() {
  try {
    const raw = localStorage.getItem(RECENT_BT_PAIRS_KEY);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && String(x).trim()) : [];
  } catch {
    return [];
  }
}

function addRecentBtPair(symbol) {
  const s = String(symbol || '').trim().toUpperCase();
  if (!s) return;
  let list = getRecentBtPairs().filter((x) => x !== s);
  list.unshift(s);
  list = list.slice(0, MAX_RECENT_PAIRS);
  localStorage.setItem(RECENT_BT_PAIRS_KEY, JSON.stringify(list));
}

function parseAssetPairsFromSelect(selectEl) {
  const out = [];
  if (!selectEl) return out;
  selectEl.querySelectorAll('option').forEach((opt) => {
    const v = opt.value;
    if (!v) return;
    out.push({ value: v, text: opt.textContent.trim() || v });
  });
  return out;
}

/** Fallback si no hay lista en DOM (misma idea que Nuevo trade + extras). */
const DEFAULT_ASSETS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'USDCHF',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
  'EURGBP',
  'XAUUSD',
  'US30',
  'NAS100',
  'SPX500'
];

/**
 * Misma lista que el select del trade real (#asset) cuando existe; si no, fuentes globales o fallback.
 */
function getAvailableTradingAssets() {
  try {
    const assetEl = document.getElementById('asset');
    if (assetEl) {
      const pairs = parseAssetPairsFromSelect(assetEl);
      const vals = pairs.map((p) => p.value).filter(Boolean);
      if (vals.length) return vals;
    }
  } catch (_) {
    /* ignore */
  }
  if (Array.isArray(window.availableAssets) && window.availableAssets.length) {
    return window.availableAssets.map(String);
  }
  if (typeof availableAssets !== 'undefined' && Array.isArray(availableAssets) && availableAssets.length) {
    return availableAssets.map(String);
  }
  const ga = typeof globalThis !== 'undefined' ? globalThis.availableAssets : undefined;
  if (Array.isArray(ga) && ga.length) {
    return ga.map(String);
  }
  if (Array.isArray(DEFAULT_ASSETS) && DEFAULT_ASSETS.length) {
    return [...DEFAULT_ASSETS];
  }
  const defG = typeof globalThis !== 'undefined' ? globalThis.DEFAULT_ASSETS : undefined;
  if (Array.isArray(defG) && defG.length) {
    return defG.map(String);
  }
  return [...DEFAULT_ASSETS];
}

let btSessionSelectedPairs = [];
let btSessionPairsCatalog = [];

function getSessionPairs(session) {
  if (!session) return [];
  return String(session.asset || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function formatSessionPairsDisplay(session) {
  const selectedPairs = getSessionPairs(session);
  if (selectedPairs.length > 1) return selectedPairs.join(' · ');
  return selectedPairs[0] || '—';
}

function getBtSessionPairFilteredList(query) {
  const ql = String(query || '').trim().toLowerCase();
  const sel = new Set(btSessionSelectedPairs.map((s) => String(s).trim()));
  return btSessionPairsCatalog.filter((p) => {
    const ps = String(p).trim();
    if (!ps || sel.has(ps)) return false;
    if (!ql) return true;
    return ps.toLowerCase().includes(ql);
  });
}

function renderBtSessionPairChips() {
  const container = document.getElementById('btSessionChipsContainer');
  if (!container) return;
  container.innerHTML = '';
  btSessionSelectedPairs.forEach((pair) => {
    const sym = String(pair).trim();
    if (!sym) return;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `${escapeHtmlChipText(sym)}<span class="remove" data-pair="${escapeAttrChip(sym)}" role="button" tabindex="0" aria-label="Quitar">&times;</span>`;
    container.appendChild(chip);
  });
}

function renderBtSessionPairDropdown(list) {
  const dropdown = document.getElementById('btSessionPairMultiSelectDropdown');
  if (!dropdown) return;
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) {
    dropdown.innerHTML = '<div class="dropdown-empty">Sin coincidencias</div>';
    return;
  }
  dropdown.innerHTML = arr
    .map(
      (p) =>
        `<div class="dropdown-item" role="option" data-pair="${escapeAttrChip(String(p))}">${escapeHtmlChipText(String(p))}</div>`
    )
    .join('');
}

function setBtSessionPairDropdownOpen(open) {
  const root = document.getElementById('btSessionPairMultiSelect');
  if (!root) return;
  root.classList.toggle('open', Boolean(open));
}

function syncBtSessionPairMultiSelectUI() {
  renderBtSessionPairChips();
  const search = document.getElementById('btSessionPairSearch');
  const q = search?.value ?? '';
  renderBtSessionPairDropdown(getBtSessionPairFilteredList(q));
}

function addBtSessionPair(sym) {
  const s = String(sym || '').trim();
  if (!s || btSessionSelectedPairs.includes(s)) return;
  btSessionSelectedPairs.push(s);
  syncBtSessionPairMultiSelectUI();
}

function removeBtSessionPair(sym) {
  const s = String(sym || '').trim();
  btSessionSelectedPairs = btSessionSelectedPairs.filter((x) => String(x).trim() !== s);
  syncBtSessionPairMultiSelectUI();
}

function ensureBtSessionPairMultiSelectProBound() {
  const root = document.getElementById('btSessionPairMultiSelect');
  if (!root || root.dataset.msProBound === '1') return;
  root.dataset.msProBound = '1';
  const input = document.getElementById('btSessionPairSearch');
  const wrapper = document.getElementById('btSessionPairInputWrapper');
  const chipsContainer = document.getElementById('btSessionChipsContainer');
  const dropdown = document.getElementById('btSessionPairMultiSelectDropdown');

  function openDropdown() {
    renderBtSessionPairDropdown(getBtSessionPairFilteredList(input?.value ?? ''));
    setBtSessionPairDropdownOpen(true);
  }

  wrapper?.addEventListener('click', (e) => {
    if (e.target.closest('.chip .remove')) return;
    input?.focus();
    openDropdown();
  });

  input?.addEventListener('focus', () => {
    openDropdown();
  });

  input?.addEventListener('input', () => {
    renderBtSessionPairDropdown(getBtSessionPairFilteredList(input.value));
    setBtSessionPairDropdownOpen(true);
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setBtSessionPairDropdownOpen(false);
      return;
    }
    if (e.key === 'Backspace' && !String(input.value || '').trim()) {
      if (btSessionSelectedPairs.length) {
        e.preventDefault();
        btSessionSelectedPairs.pop();
        syncBtSessionPairMultiSelectUI();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const filtered = getBtSessionPairFilteredList(input.value);
      if (filtered.length) {
        input.value = '';
        addBtSessionPair(filtered[0]);
        setBtSessionPairDropdownOpen(false);
      }
    }
  });

  chipsContainer?.addEventListener('click', (e) => {
    const rm = e.target.closest('.remove');
    if (!rm) return;
    e.preventDefault();
    e.stopPropagation();
    const pair = rm.getAttribute('data-pair');
    if (pair) removeBtSessionPair(pair);
  });

  dropdown?.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    e.preventDefault();
    const pair = item.getAttribute('data-pair');
    if (pair) {
      if (input) input.value = '';
      addBtSessionPair(pair);
      setBtSessionPairDropdownOpen(false);
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.classList.contains('open')) return;
    if (root.contains(e.target)) return;
    setBtSessionPairDropdownOpen(false);
  });
}

function pairMatchesQuery(pair, q) {
  const ql = String(q || '').trim().toLowerCase();
  if (!ql) return true;
  return pair.value.toLowerCase().includes(ql) || pair.text.toLowerCase().includes(ql);
}

function escapeHtmlAssetLabel(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function refreshAssetComboboxAfterI18n() {
  assetComboboxState?.refresh?.();
}

function cleanupStrayAssetCustomSelects() {
  const wrap = document.querySelector('#tradeView .custom-asset-wrap');
  if (wrap) {
    wrap.querySelectorAll('.custom-select').forEach((el) => el.remove());
  }
  const assetSelect = document.getElementById('asset');
  if (assetSelect) {
    assetSelect.classList.add('native-select-hidden');
    let sibling = assetSelect.nextElementSibling;
    while (sibling && sibling.classList?.contains('custom-select')) {
      const rm = sibling;
      sibling = sibling.nextElementSibling;
      rm.remove();
    }
  }
}

function initAssetCombobox() {
  cleanupStrayAssetCustomSelects();
  const assetSelect = document.getElementById('asset');
  if (assetSelect?.dataset.comboboxInit === '1') {
    assetComboboxState?.refresh?.();
    return;
  }
  const btn = document.getElementById('assetComboBtn');
  const labelEl = document.getElementById('assetComboLabel');
  const panel = document.getElementById('assetDropdownPanel');
  const searchInput = document.getElementById('pairSearch');
  const listEl = document.getElementById('pairDropdown');
  const wrap = document.querySelector('.custom-asset-wrap');
  if (!assetSelect || !btn || !labelEl || !panel || !searchInput || !listEl || !wrap) {
    assetComboboxState = null;
    return;
  }

  assetSelect.dataset.comboboxInit = '1';

  let allPairs = parseAssetPairsFromSelect(assetSelect);

  function placeholderText() {
    const opt = assetSelect.querySelector('option[value=""]');
    return opt ? opt.textContent.trim() : '';
  }

  function updateComboLabel() {
    const v = assetSelect.value;
    if (!v) {
      labelEl.textContent = placeholderText();
      return;
    }
    const found = allPairs.find((p) => p.value === v);
    labelEl.textContent = found ? found.text : v;
  }

  function renderPairDropdown() {
    const q = searchInput.value;
    const filteredAll = allPairs.filter((p) => pairMatchesQuery(p, q));
    const recentSymbols = getRecentPairs();
    const recentPairs = [];
    for (const sym of recentSymbols) {
      const pair = allPairs.find((p) => p.value === sym);
      if (pair && pairMatchesQuery(pair, q)) recentPairs.push(pair);
    }
    const recentSet = new Set(recentPairs.map((p) => p.value));
    const restPairs = filteredAll.filter((p) => !recentSet.has(p.value));

    const parts = [];
    if (recentPairs.length) {
      parts.push('<div class="asset-dd-section-label">Recientes</div>');
      recentPairs.forEach((p) => {
        parts.push(
          `<button type="button" class="asset-dd-item" role="option" data-value="${escapeHtmlAssetLabel(p.value)}">${escapeHtmlAssetLabel(p.text)}</button>`
        );
      });
    }
    if (recentPairs.length && restPairs.length) {
      parts.push('<div class="asset-dd-sep" aria-hidden="true"></div>');
    }
    if (restPairs.length) {
      parts.push('<div class="asset-dd-section-label">Todos</div>');
      restPairs.forEach((p) => {
        parts.push(
          `<button type="button" class="asset-dd-item" role="option" data-value="${escapeHtmlAssetLabel(p.value)}">${escapeHtmlAssetLabel(p.text)}</button>`
        );
      });
    }
    if (!recentPairs.length && !restPairs.length) {
      parts.push('<div class="asset-dd-section-label" style="padding:12px 8px;">Sin resultados</div>');
    }
    listEl.innerHTML = parts.join('');
    listEl.querySelectorAll('.asset-dd-item').forEach((item) => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value');
        if (!val) return;
        assetSelect.value = val;
        assetSelect.dispatchEvent(new Event('change', { bubbles: true }));
        updateComboLabel();
        closePanel();
      });
    });
  }

  let open = false;

  function closePanel() {
    open = false;
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    searchInput.value = '';
  }

  function openPanel() {
    open = true;
    panel.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    searchInput.value = '';
    renderPairDropdown();
    setTimeout(() => searchInput.focus(), 0);
  }

  function onDocClick(e) {
    if (!open) return;
    if (wrap.contains(e.target)) return;
    closePanel();
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) closePanel();
    else openPanel();
  });

  searchInput.addEventListener('input', () => renderPairDropdown());
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePanel();
      btn.focus();
    }
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  assetSelect.addEventListener('change', updateComboLabel);

  document.addEventListener('click', onDocClick);

  updateComboLabel();

  assetComboboxState = {
    closePanel,
    refresh: () => {
      allPairs = parseAssetPairsFromSelect(assetSelect);
      updateComboLabel();
      if (open) renderPairDropdown();
    }
  };
}

/**
 * Combobox de activo para backtesting: lista desde backtestingSettings.assets + recientes propios.
 */
function initBacktestingAssetCombobox() {
  const assetSelect = document.getElementById('btAsset');
  const btn = document.getElementById('btAssetComboBtn');
  const labelEl = document.getElementById('btAssetComboLabel');
  const panel = document.getElementById('btAssetDropdownPanel');
  const searchInput = document.getElementById('btPairSearch');
  const listEl = document.getElementById('btPairDropdown');
  const wrap = document.getElementById('btCustomAssetWrap');
  if (!assetSelect || !btn || !labelEl || !panel || !searchInput || !listEl || !wrap) {
    backtestingAssetComboboxState = null;
    return;
  }

  assetSelect.classList.remove('native-select-hidden');
  let stray = assetSelect.nextElementSibling;
  while (stray && stray.classList?.contains('custom-select')) {
    const nextSib = stray.nextElementSibling;
    stray.remove();
    stray = nextSib;
  }

  if (assetSelect.dataset.comboboxInit === '1') {
    backtestingAssetComboboxState?.refresh?.();
    return;
  }
  assetSelect.dataset.comboboxInit = '1';

  function rebuildPairsFromSettings() {
    const opts = ['<option value="">—</option>'];
    (backtestingSettings.assets || []).forEach((sym) => {
      const s = String(sym).trim();
      if (!s) return;
      opts.push(`<option value="${escapeHtmlAssetLabel(s)}">${escapeHtmlAssetLabel(s)}</option>`);
    });
    assetSelect.innerHTML = opts.join('');
    filterBtAssetOptionsToActiveSessionPairs();
  }

  rebuildPairsFromSettings();
  let allPairs = parseAssetPairsFromSelect(assetSelect);

  function placeholderText() {
    const opt = assetSelect.querySelector('option[value=""]');
    return opt ? opt.textContent.trim() : '—';
  }

  function updateComboLabel() {
    const v = assetSelect.value;
    if (!v) {
      labelEl.textContent = placeholderText();
      return;
    }
    const found = allPairs.find((p) => p.value === v);
    labelEl.textContent = found ? found.text : v;
  }

  function renderPairDropdown() {
    const q = searchInput.value;
    const filteredAll = allPairs.filter((p) => pairMatchesQuery(p, q));
    const recentSymbols = getRecentBtPairs();
    const recentPairs = [];
    for (const sym of recentSymbols) {
      const pair = allPairs.find((p) => p.value === sym);
      if (pair && pairMatchesQuery(pair, q)) recentPairs.push(pair);
    }
    const recentSet = new Set(recentPairs.map((p) => p.value));
    const restPairs = filteredAll.filter((p) => !recentSet.has(p.value));

    const parts = [];
    if (recentPairs.length) {
      parts.push('<div class="asset-dd-section-label">Recientes</div>');
      recentPairs.forEach((p) => {
        parts.push(
          `<button type="button" class="asset-dd-item" role="option" data-value="${escapeHtmlAssetLabel(p.value)}">${escapeHtmlAssetLabel(p.text)}</button>`
        );
      });
    }
    if (recentPairs.length && restPairs.length) {
      parts.push('<div class="asset-dd-sep" aria-hidden="true"></div>');
    }
    if (restPairs.length) {
      parts.push('<div class="asset-dd-section-label">Activos configurados</div>');
      restPairs.forEach((p) => {
        parts.push(
          `<button type="button" class="asset-dd-item" role="option" data-value="${escapeHtmlAssetLabel(p.value)}">${escapeHtmlAssetLabel(p.text)}</button>`
        );
      });
    }
    if (!recentPairs.length && !restPairs.length) {
      parts.push('<div class="asset-dd-section-label" style="padding:12px 8px;">Sin resultados</div>');
    }
    listEl.innerHTML = parts.join('');
    listEl.querySelectorAll('.asset-dd-item').forEach((item) => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value');
        if (!val) return;
        assetSelect.value = val;
        assetSelect.dispatchEvent(new Event('change', { bubbles: true }));
        if (backtestingAssetComboboxState) {
          backtestingAssetComboboxState.selectedValue = val;
          backtestingAssetComboboxState.value = val;
        }
        updateComboLabel();
        closePanel();
      });
    });
  }

  let open = false;

  function closePanel() {
    open = false;
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    searchInput.value = '';
  }

  function openPanel() {
    open = true;
    panel.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    searchInput.value = '';
    renderPairDropdown();
    setTimeout(() => searchInput.focus(), 0);
  }

  function onDocClick(e) {
    if (!open) return;
    if (wrap.contains(e.target)) return;
    closePanel();
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) closePanel();
    else openPanel();
  });

  searchInput.addEventListener('input', () => renderPairDropdown());
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      closePanel();
      btn.focus();
    }
  });

  panel.addEventListener('click', (e) => e.stopPropagation());

  assetSelect.addEventListener('change', updateComboLabel);

  document.addEventListener('click', onDocClick);

  updateComboLabel();

  function setValue(raw) {
    const cleanValue = String(raw ?? '').trim();
    if (backtestingAssetComboboxState) {
      backtestingAssetComboboxState.selectedValue = cleanValue;
      backtestingAssetComboboxState.value = cleanValue;
    }
    if (!cleanValue) {
      assetSelect.value = '';
      allPairs = parseAssetPairsFromSelect(assetSelect);
      updateComboLabel();
      searchInput.value = '';
      return;
    }
    ensureSelectHasValue(assetSelect, cleanValue);
    assetSelect.value = cleanValue;
    allPairs = parseAssetPairsFromSelect(assetSelect);
    updateComboLabel();
    assetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    if (open) renderPairDropdown();
  }

  backtestingAssetComboboxState = {
    selectedValue: '',
    value: '',
    setValue,
    closePanel,
    rebuildFromSettings: () => {
      rebuildPairsFromSettings();
      allPairs = parseAssetPairsFromSelect(assetSelect);
      updateComboLabel();
      if (open) renderPairDropdown();
    },
    refresh: () => {
      rebuildPairsFromSettings();
      allPairs = parseAssetPairsFromSelect(assetSelect);
      updateComboLabel();
      if (open) renderPairDropdown();
    }
  };
}

function setCreateTradePnlFromPreset(value) {
  const finalValue = applyPnlSignForResult(value);
  const el = document.getElementById('pnl');
  if (!el) return;
  el.value = String(Math.round(finalValue));
  recalculateCreateNetPnl();
}

function updateTradeRiskDisplay() {
  const pnl = parseMoneyInput(document.getElementById('pnl')?.value);
  const account = getSelectedAccount('account');
  const capital = Number(account?.capital) || 0;
  const el = document.getElementById('riskDisplay');
  if (!el) return;
  el.className = 'risk-display';
  if (!capital) {
    el.textContent = 'Riesgo: —';
    return;
  }
  const risk = (pnl / capital) * 100;
  el.textContent = `Riesgo: ${risk.toFixed(2)}%`;
  if (risk < 1) el.classList.add('risk-low');
  else if (risk < 2) el.classList.add('risk-medium');
  else el.classList.add('risk-high');
}

function refreshPnlPresetButtons() {
  const container = document.getElementById('pnlPresetRow');
  if (!container) return;
  const account = getSelectedAccount('account');
  const capital = Number(account?.capital) || 0;
  const resultVal = document.getElementById('result')?.value;
  const isSL = resultVal === 'SL';
  const presets = [
    { pct: 1, value: capital * 0.01 },
    { pct: 2, value: capital * 0.02 },
    { pct: 3, value: capital * 0.03 }
  ];
  container.innerHTML = '';
  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pnl-preset-btn';
    const euros = Math.round(p.value);
    btn.textContent = isSL ? `-${p.pct}% (-${euros}€)` : `${p.pct}% (${euros}€)`;
    btn.addEventListener('click', () => setCreateTradePnlFromPreset(p.value));
    container.appendChild(btn);
  });
}

function recalculateEditNetPnl() {
  if (isTradeCompositeEnabled('edit')) {
    recalculateTradeCompositeTotals('edit');
    const grossPnl = parseMoneyInput(document.getElementById('editPnl')?.value);
    const lotSize = Number(document.getElementById('editLotSize')?.value) || 0;
    const fee = getTradeCommissionCalc({ lotSize, grossPnl, form: 'edit' });
    const account = getSelectedAccount('editAccount');
    const accountCapital = account ? Number(account.capital) || 0 : 0;
    return { commission: fee.commission, netPnl: fee.netPnl, accountCapital };
  }
  const grossPnl = Number(document.getElementById('editPnl')?.value) || 0;
  const lotSize = Number(document.getElementById('editLotSize')?.value) || 0;
  const fee = getTradeCommissionCalc({ lotSize, grossPnl, form: 'edit' });
  const account = getSelectedAccount('editAccount');
  const accountCapital = account ? Number(account.capital) || 0 : 0;
  const editCommission = document.getElementById('editCommission');
  const editAccountCapital = document.getElementById('editAccountCapital');
  if (editCommission) editCommission.value = fee.commission.toFixed(2);
  if (editAccountCapital) editAccountCapital.value = accountCapital.toFixed(2);
  return { commission: fee.commission, netPnl: fee.netPnl, accountCapital };
}

function updateDashboardMetrics(trades, options = {}) {
  const withKpi = options.withKpi !== false;
  const today = getTodayDateString();
  const todayTrades = trades.filter((trade) => (trade.date || '').slice(0, 10) === today);
  const totalTrades = todayTrades.length;
  const pnlToday = todayTrades.reduce((sum, trade) => sum + getTradeRealPnl(trade), 0);
  const grossPnlToday = todayTrades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const totalCommission = todayTrades.reduce((sum, trade) => sum + (Number(trade.commission) || 0), 0);
  const filteredTrades = getFilteredWinrateTrades(todayTrades);
  const wins = filteredTrades.filter((trade) => getTradeRealPnl(trade) > 0).length;
  const winrate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0;

  const pnlEl = document.getElementById('todayPnl');
  if (pnlEl) {
    pnlEl.textContent = `${pnlToday > 0 ? '+' : ''}${pnlToday.toFixed(2)}€`;
    pnlEl.classList.remove('trade-profit', 'trade-loss', 'trade-be');
    pnlEl.classList.add(pnlToday > 0 ? 'trade-profit' : pnlToday < 0 ? 'trade-loss' : 'trade-be');
  }
  const winrateEl = document.getElementById('todayWinrate');
  if (winrateEl) winrateEl.textContent = `${winrate.toFixed(1)}%`;
  updateWinrateInfoLabel();
  const tradesEl = document.getElementById('todayTrades');
  if (tradesEl) tradesEl.textContent = String(totalTrades);
  const grossPnlEl = document.getElementById('todayGrossPnl');
  if (grossPnlEl) grossPnlEl.textContent = `${grossPnlToday > 0 ? '+' : ''}${grossPnlToday.toFixed(2)}€`;
  const commissionEl = document.getElementById('todayCommission');
  if (commissionEl) commissionEl.textContent = `${totalCommission.toFixed(2)}€`;
  if (withKpi) {
    updateKpiCards(trades, currentMonth, currentYear);
    if (activeKPIType) renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, trades);
  }
}

function getSortedTradesForKpis(trades) {
  return [...(Array.isArray(trades) ? trades : [])].sort((a, b) => {
    const dateA = new Date((a.date || '').slice(0, 10)).getTime();
    const dateB = new Date((b.date || '').slice(0, 10)).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function groupTradesForKpiByDay(trades) {
  const grouped = {};

  (Array.isArray(trades) ? trades : []).forEach((trade) => {
    const isoDate = (trade.date || '').slice(0, 10);
    if (!isoDate) return;
    if (!grouped[isoDate]) {
      grouped[isoDate] = {
        isoDate,
        label: formatDate(isoDate),
        pnl: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        profit: 0,
        loss: 0
      };
    }

    const pnl = getTradeRealPnl(trade);
    grouped[isoDate].pnl += pnl;
    grouped[isoDate].trades += 1;
    if (pnl > 0) {
      grouped[isoDate].wins += 1;
      grouped[isoDate].profit += pnl;
    }
    if (pnl < 0) {
      grouped[isoDate].losses += 1;
      grouped[isoDate].loss += Math.abs(pnl);
    }
  });

  return Object.values(grouped).sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
}

function getTradesByMonth(trades, month = currentMonth, year = currentYear) {
  if (!Array.isArray(trades)) return [];
  return trades.filter((trade) => {
    const dateStr = (trade.date || '').slice(0, 10);
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === month && date.getFullYear() === year;
  });
}

function getAccountInitialCapitalValue(account) {
  return (
    Number(account?.capital ?? account?.initial_capital ?? account?.account_capital ?? 0) || 0
  );
}

function getMonthStartIso(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function getAccountMonthOpeningBalance(account, allTrades, year, month) {
  const accountName = account?.name;
  if (!accountName) return 0;

  const initialCapital = getAccountInitialCapitalValue(account);
  const monthStartIso = getMonthStartIso(year, month);

  const pnlBeforeMonth = (Array.isArray(allTrades) ? allTrades : [])
    .filter((trade) => {
      const tradeDate = String(trade.date || '').slice(0, 10);
      return trade.account === accountName && tradeDate && tradeDate < monthStartIso;
    })
    .reduce((sum, trade) => sum + getTradeRealPnl(trade), 0);

  return initialCapital + pnlBeforeMonth;
}

function getDashboardAccountsIncludedForCapital(monthTrades = []) {
  const list = typeof getAccounts === 'function' ? getAccounts() : [];
  const all = selectedDashboardAccounts.has('ALL') || selectedDashboardAccounts.size === 0;

  const tradedAccountNames = [
    ...new Set(
      (Array.isArray(monthTrades) ? monthTrades : [])
        .map((trade) => trade.account)
        .filter(Boolean)
    )
  ];

  if (all) {
    return list.filter((account) => account?.name && tradedAccountNames.includes(account.name));
  }

  return list.filter(
    (account) =>
      account?.name &&
      selectedDashboardAccounts.has(account.name) &&
      tradedAccountNames.includes(account.name)
  );
}

function calculateDashboardReturnPercent({ pnl, accounts, monthTrades: _monthTrades, allTrades, year, month }) {
  const mode =
    localStorage.getItem('dashboard_return_mode') === 'month_initial'
      ? 'month_initial'
      : 'account_initial';

  const pnlValue = Number(pnl || 0);
  const accountsArr = Array.isArray(accounts) ? accounts.filter(Boolean) : [];

  let baseCapital = 0;

  if (mode === 'month_initial') {
    baseCapital = accountsArr.reduce((sum, account) => {
      return sum + getAccountMonthOpeningBalance(account, allTrades, year, month);
    }, 0);
  } else {
    baseCapital = accountsArr.reduce((sum, account) => {
      return sum + getAccountInitialCapitalValue(account);
    }, 0);
  }

  if (!baseCapital || baseCapital <= 0) return 0;

  return (pnlValue / baseCapital) * 100;
}

function initDashboardReturnModeControl() {
  const sel = document.getElementById('dashboardReturnMode');
  if (!sel || sel.dataset.bound === 'true') return;
  sel.dataset.bound = 'true';
  const saved = localStorage.getItem('dashboard_return_mode');
  if (saved === 'month_initial') sel.value = 'month_initial';
  else sel.value = 'account_initial';
  sel.addEventListener('change', () => {
    localStorage.setItem('dashboard_return_mode', sel.value);
    const ft = getDashboardFilteredTrades();
    updateKpiCards(ft, currentMonth, currentYear);
    if (activeKPIType) {
      renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, ft);
    }
  });
}

function calculateDashboardKpis(trades) {
  const source = Array.isArray(trades) ? trades : [];
  const filteredForWinrate = getFilteredWinrateTrades(source);
  const wins = filteredForWinrate.filter((trade) => getTradeRealPnl(trade) > 0).length;
  const winRate = filteredForWinrate.length ? (wins / filteredForWinrate.length) * 100 : 0;
  const totalPnl = source.reduce((sum, trade) => sum + getTradeRealPnl(trade), 0);
  const profit = source.reduce((sum, trade) => {
    const pnl = getTradeRealPnl(trade);
    return pnl > 0 ? sum + pnl : sum;
  }, 0);
  const loss = source.reduce((sum, trade) => {
    const pnl = getTradeRealPnl(trade);
    return pnl < 0 ? sum + Math.abs(pnl) : sum;
  }, 0);
  const profitFactor = loss > 0 ? profit / loss : null;
  const pfHasProfitNoLoss = loss === 0 && profit > 0;
  const be = computeBeAdvancedMetrics(source);
  return { winRate, totalPnl, profitFactor, pfHasProfitNoLoss, ...be };
}

function setKpiValue(elementId, value, positiveIsGood = true) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.textContent = value;
  element.classList.remove('positive', 'negative');
  const numeric = Number(String(value).replace('%', '').replace('€', '').replace('+', ''));
  if (Number.isNaN(numeric)) return;
  if (numeric > 0) element.classList.add(positiveIsGood ? 'positive' : 'negative');
  if (numeric < 0) element.classList.add(positiveIsGood ? 'negative' : 'positive');
}

function updateKpiCards(trades = cachedTrades, month = currentMonth, year = currentYear) {
  const monthTrades = getTradesByMonth(trades, month, year);
  const stats = calculateDashboardKpis(monthTrades);
  const accountsForCapital = getDashboardAccountsIncludedForCapital(monthTrades);

  const rentabilidad = calculateDashboardReturnPercent({
    pnl: stats.totalPnl,
    accounts: accountsForCapital,
    monthTrades,
    allTrades: cachedTrades,
    year,
    month
  });

  setKpiValue('kpiWinrateValue', `${stats.winRate.toFixed(1)}%`);
  setKpiValue('kpiPnlValue', `${stats.totalPnl > 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}€`);
  setKpiValue('kpiReturnsValue', `${rentabilidad.toFixed(1)}%`);
  const kpiPfEl = document.getElementById('kpiPfValue');
  if (kpiPfEl) {
    kpiPfEl.classList.remove('positive', 'negative');
    if (stats.profitFactor == null) {
      kpiPfEl.textContent = '—';
      if (stats.pfHasProfitNoLoss) kpiPfEl.title = 'Sin pérdidas registradas';
      else kpiPfEl.removeAttribute('title');
    } else {
      kpiPfEl.textContent = stats.profitFactor.toFixed(2);
      kpiPfEl.removeAttribute('title');
      const numeric = stats.profitFactor;
      if (numeric > 0) kpiPfEl.classList.add('positive');
      if (numeric < 0) kpiPfEl.classList.add('negative');
    }
  }
  document.getElementById('beAdvancedStatsDashboard')?.remove();
}

function getKpiSeries(type, trades) {
  const daily = groupTradesForKpiByDay(getSortedTradesForKpis(trades));
  const labels = [];
  const values = [];
  const metaByLabel = {};
  let runningPnl = 0;
  let runningWins = 0;
  let runningTotal = 0;
  let runningProfit = 0;
  let runningLoss = 0;

  daily.forEach((day, index) => {
    const dayLabel = day.label || String(index + 1);
    labels.push(dayLabel);
    metaByLabel[dayLabel] = day;

    runningPnl += day.pnl;
    runningProfit += day.profit;
    runningLoss += day.loss;

    if (type === 'winrate' || type === 'returns') {
      if (isExcludeBEEnabled()) {
        runningTotal += day.wins + day.losses;
      } else {
        runningTotal += day.trades;
      }
      runningWins += day.wins;
    }

    if (type === 'winrate') {
      values.push(runningTotal ? Number(((runningWins / runningTotal) * 100).toFixed(2)) : 0);
    } else if (type === 'pnl') {
      values.push(Number(runningPnl.toFixed(2)));
    } else if (type === 'returns') {
      values.push(day.trades ? Number(((day.wins / day.trades) * 100).toFixed(2)) : 0);
    } else {
      values.push(
        runningLoss > 0 ? Number((runningProfit / runningLoss).toFixed(2)) : null
      );
    }
  });

  return { labels, values, metaByLabel };
}

function renderKpiExpandedChart(type, month = currentMonth, year = currentYear, tradesSource = null) {
  const container = document.getElementById('kpiExpandedChart');
  const canvas = document.getElementById('kpiExpandedCanvas');
  const title = document.getElementById('kpiExpandedTitle');
  if (!container || !canvas || !title) return;

  const src = Array.isArray(tradesSource) ? tradesSource : getDashboardFilteredTrades();
  const monthTrades = getTradesByMonth(src, month, year);
  const series = getKpiSeries(type, monthTrades);
  if (!series.labels.length) {
    container.classList.add('hidden');
    return;
  }

  const chartTitles = {
    winrate: t('kpi_winrate_hist'),
    pnl: t('kpi_equity_hist'),
    returns: t('kpi_returns_hist'),
    pf: t('kpi_pf_hist')
  };

  title.textContent = chartTitles[type] || t('kpi_detail_title');
  container.classList.remove('hidden');

  if (kpiExpandedChartInstance) {
    kpiExpandedChartInstance.destroy();
    kpiExpandedChartInstance = null;
  }

  const chartType = type === 'returns' ? 'bar' : 'line';
  const color = type === 'winrate' || type === 'pnl' ? '#22c55e' : type === 'returns' ? '#60a5fa' : '#f59e0b';

  kpiExpandedChartInstance = new window.Chart(canvas.getContext('2d'), {
    type: chartType,
    data: {
      labels: series.labels,
      datasets: [{
        label: chartTitles[type] || t('chart_dataset_kpi'),
        data: series.values,
        borderColor: color,
        backgroundColor: `${color}55`,
        borderWidth: 2,
        fill: chartType === 'line',
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (context) => context?.[0]?.label || '',
            label: (context) => {
              const day = series.metaByLabel?.[context.label];
              if (!day) return `${context.parsed.y ?? context.parsed}`;
              if (type === 'returns') {
                return [
                  `${t('tooltip_winrate')}: ${Number(context.raw || 0).toFixed(1)}%`,
                  `${t('tooltip_trades')}: ${day.trades}`,
                  `${t('tooltip_pnl')}: ${day.pnl.toFixed(2)}€`
                ];
              }
              return `${Number(context.raw || 0).toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: getChartGridColor() } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: getChartGridColor() } }
      }
    }
  });
}

function refreshHistoryHeight() {
  const historyContainer = document.getElementById('historyContainer');
  const historyContent = document.getElementById('historyContent');
  if (!historyContainer || !historyContent) return;
  if (!historyContainer.classList.contains('open')) return;
  historyContent.style.maxHeight = `${historyContent.scrollHeight}px`;
}

function initHistoryAccordion() {
  const historyContainer = document.getElementById('historyContainer');
  const historyHeader = document.getElementById('historyHeader');
  const historyContent = document.getElementById('historyContent');
  if (!historyContainer || !historyHeader || !historyContent) return;

  historyContainer.classList.remove('open');
  historyContent.style.maxHeight = '0px';

  historyHeader.addEventListener('click', () => {
    const willOpen = !historyContainer.classList.contains('open');
    historyContainer.classList.toggle('open');
    if (willOpen) {
      historyContent.style.maxHeight = `${historyContent.scrollHeight}px`;
    } else {
      historyContent.style.maxHeight = '0px';
    }
  });
}

function onKpiClick(type) {
  const cards = document.querySelectorAll('.kpi-card');
  if (activeKPIType === type) {
    activeKPIType = null;
    document.getElementById('kpiExpandedChart')?.classList.add('hidden');
    if (kpiExpandedChartInstance) {
      kpiExpandedChartInstance.destroy();
      kpiExpandedChartInstance = null;
    }
    cards.forEach((card) => card.classList.remove('active'));
    return;
  }

  activeKPIType = type;
  cards.forEach((card) => card.classList.toggle('active', card.getAttribute('data-type') === type));
  renderKpiExpandedChart(type, currentMonth, currentYear, getDashboardFilteredTrades());
}

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function groupTradesByDay(trades) {
  const map = {};

  trades.forEach((trade) => {
    const date = (trade.date || '').slice(0, 10);
    if (!date) return;
    if (!map[date]) {
      map[date] = {
        trades: [],
        totalPnL: 0
      };
    }

    map[date].trades.push(trade);
    map[date].totalPnL += getTradeRealPnl(trade);
  });

  return map;
}

function getHeatmapClass(pnl) {
  let className = 'day';

  if (pnl > 0) {
    if (pnl < 50) className += ' positive-1';
    else if (pnl < 200) className += ' positive-2';
    else className += ' positive-3';
  }

  if (pnl < 0) {
    if (pnl > -50) className += ' negative-1';
    else if (pnl > -200) className += ' negative-2';
    else className += ' negative-3';
  }

  return className;
}

function getCalendarContainer() {
  const calendar = document.getElementById('calendarGrid') || document.getElementById('calendar');
  if (!calendar) {
    console.error('Calendar no encontrado en DOM');
    return null;
  }
  return calendar;
}

function renderWeek(daysArray, year, month, weekendMode = false, sourceTrades = null) {
  const tradePool = Array.isArray(sourceTrades) ? sourceTrades : cachedTrades;
  const container = getCalendarContainer();
  if (!container) return;

  const maxDaySlots = weekendMode ? 7 : 5;
  const gridCols = maxDaySlots + 1;

  const row = document.createElement('div');
  row.className = 'calendar-row';
  row.style.gridTemplateColumns = `repeat(${gridCols}, minmax(0, 1fr))`;

  const padded = [...daysArray];
  while (padded.length < maxDaySlots) padded.push(null);
  const slotDays = padded.slice(0, maxDaySlots);

  let weeklyPnL = 0;
  let weeklyTrades = 0;

  slotDays.forEach((day) => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    if (!day) {
      cell.className = 'day-cell day-empty day-outside';
      row.appendChild(cell);
      return;
    }

    const dateStr = toDateKey(year, month, day);
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    const dayTrades = (Array.isArray(tradePool) ? tradePool : []).filter(
      (trade) => (trade.date || '').slice(0, 10) === dateStr
    );
    const pnl = dayTrades.reduce((sum, trade) => sum + getTradeRealPnl(trade), 0);
    weeklyPnL += pnl;
    weeklyTrades += dayTrades.length;

    cell.innerHTML = `
      <span class="day-number">${day}</span>
      <button class="day-add-trade" type="button" data-date="${dateStr}" aria-label="${t('add_trade_day_aria')}">+</button>
      <div class="day-content">
        <span class="trade-count"></span>
        <span class="day-pnl"></span>
      </div>
    `;

    const countEl = cell.querySelector('.trade-count');
    const pnlEl = cell.querySelector('.day-pnl');
    if (countEl) countEl.textContent = dayTrades.length > 0 ? String(dayTrades.length) : '';
    if (pnlEl) pnlEl.textContent = dayTrades.length > 0 ? pnl.toFixed(1) : '';

    const addTradeBtn = cell.querySelector('.day-add-trade');
    addTradeBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      openTradeViewWithPresetDate(dateStr);
    });

    if (dayTrades.length > 0) {
      const abs = Math.abs(pnl);
      const tier = abs < 50 ? 1 : abs < 200 ? 2 : 3;

      if (pnl > 0) {
        cell.classList.add('day-profit', `day-profit-${tier}`);
      } else if (pnl < 0) {
        cell.classList.add('day-loss', `day-loss-${tier}`);
      } else {
        cell.classList.add('day-neutral');
      }
    }

    if (isToday) {
      cell.classList.add('day-today');
    }

    cell.addEventListener('click', () => {
      openTradePanel(dateStr);
    });

    row.appendChild(cell);
  });

  const summary = document.createElement('div');
  summary.className = 'week-summary';
  const summaryClass = weeklyPnL > 0 ? 'summary-positive' : weeklyPnL < 0 ? 'summary-negative' : 'summary-neutral';
  summary.innerHTML = `
    <span>${weeklyTrades}</span>
    <strong class="${summaryClass}">${weeklyPnL.toFixed(1)}</strong>
  `;
  row.appendChild(summary);

  container.appendChild(row);
}

function applyPresetTradeDateIfAny() {
  const presetDate = sessionStorage.getItem(NEW_TRADE_DATE_KEY);
  if (!presetDate) return;
  const input = document.getElementById('date');
  if (!input) return;
  input.value = presetDate;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  sessionStorage.removeItem(NEW_TRADE_DATE_KEY);
}

async function resetNewTradeForm(presetDate = null) {
  const today = getTodayDateString();

  const dateEl = document.getElementById('date');
  const assetEl = document.getElementById('asset');
  const resultEl = document.getElementById('result');
  const beAfterEl = document.getElementById('beAfterResult') || document.getElementById('tradeBeAfterResult');
  const pnlEl = document.getElementById('pnl');
  const lotajeEl = document.getElementById('lotaje') || document.getElementById('lotSize');
  const beforeEl = document.getElementById('beforeImage');
  const afterEl = document.getElementById('afterImage');

  if (dateEl) {
    dateEl.value = presetDate || today;
    dateEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (assetEl) {
    assetEl.value = '';
    assetEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (resultEl) {
    resultEl.value = '';
    resultEl.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (beAfterEl) beAfterEl.value = '';

  if (pnlEl) pnlEl.value = '';

  if (lotajeEl) lotajeEl.value = '';

  const entryEl = document.getElementById('entryTime');
  const exitEl = document.getElementById('exitTime');
  if (entryEl) entryEl.value = '';
  if (exitEl) exitEl.value = '';
  updateTradeScheduleHints();

  if (beforeEl) beforeEl.value = '';
  if (afterEl) afterEl.value = '';

  createBeforeImagePath = '';
  createAfterImagePath = '';

  await updateImagePreview('beforeImagePreview', 'openBeforeImageBtnCreate', '');
  await updateImagePreview('afterImagePreview', 'openAfterImageBtnCreate', '');

  resetTradeCompositeForm('create');
  recalculateCreateNetPnl();
  refreshPnlPresetButtons();

  if (typeof assetComboboxState?.refresh === 'function') {
    assetComboboxState.refresh();
  }
}

function openTradeViewWithPresetDate(dateStr) {
  const safeDate = String(dateStr || '').slice(0, 10);
  if (!safeDate) return;

  sessionStorage.setItem(NEW_TRADE_DATE_KEY, safeDate);

  showView('trade');

  setTimeout(() => {
    void resetNewTradeForm(safeDate).catch(console.error);
  }, 0);
}

function isDashboardActive() {
  const dashboard = document.getElementById('dashboardView');
  return Boolean(dashboard && dashboard.style.display !== 'none');
}

function formatCalendarTitle(year, month) {
  return formatMonthYear(year, month);
}

function loadMonths() {
  const yearDisplay = document.getElementById('yearDisplay');
  const monthsGrid = document.getElementById('monthsGrid');
  if (!yearDisplay || !monthsGrid) return;

  yearDisplay.textContent = String(selectedYear);
  monthsGrid.innerHTML = '';

  MONTH_I18N_KEYS.forEach((monthKey, index) => {
    const monthCell = document.createElement('div');
    monthCell.className = 'month calendar-cell';
    monthCell.textContent = t(monthKey);
    if (selectedYear === currentYear && index === currentMonth) {
      monthCell.classList.add('active');
    }

    monthCell.addEventListener('click', () => {
      currentMonth = index;
      currentYear = selectedYear;
      renderCalendar(currentYear, currentMonth, true, getDashboardFilteredTrades());
      closeDateModal();
    });

    monthsGrid.appendChild(monthCell);
  });
}

function openDateModal() {
  const modal = document.getElementById('dateModal');
  if (!modal) return;
  selectedYear = currentYear;
  modal.classList.remove('hidden');
  loadMonths();
}

function closeDateModal() {
  document.getElementById('dateModal')?.classList.add('hidden');
}

async function openDayModal(date) {
  if (!(await ensureUserReady())) return;
  const backend = getBackendApi();
  const trades = backend?.getTrades ? await backend.getTrades() : cachedTrades;
  const filtered = (trades || []).filter((trade) => trade.date === date || (trade.date || '').slice(0, 10) === date);

  const modal = document.getElementById('dayModal');
  if (!modal) return;

  openDayTradesModal(formatDateToDisplay(date), filtered);

  activeDayModalIsoDate = date;
  modal.classList.remove('hidden');
}

function openEditModal(trade) {
  if (!trade?.id) return;
  openTradeForEdit(trade.id);
}

function attachDayTradeEvents(trades) {
  document.querySelectorAll('.day-trade-item').forEach((element) => {
    element.addEventListener('click', () => {
      const id = element.getAttribute('data-id');
      const trade = trades.find((item) => String(item.id) === String(id));
      closeDayModal();
      openEditModal(trade);
    });
  });
  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const id = button.getAttribute('data-id');
      if (!id) return;
      const row = button.closest('.day-trade-item');
      openDeleteModal(id, row);
    });
  });
}

function openDayTradesModal(dateStr, trades) {
  const title = document.getElementById('modalDateTitle');
  const container = document.getElementById('dayTradesList');
  if (!title || !container) return;

  title.textContent = dateStr;

  if (!trades.length) {
    container.innerHTML = `<p>${t('no_trades_modal')}</p>`;
    return;
  }

  let html = '<div class="day-trades-list">';
  trades.forEach((trade) => {
    const pnlNet = getTradeRealPnl(trade);
    html += `
      <div class="day-trade-item" data-id="${trade.id}">
        <div class="trade-main">
          <strong>${trade.asset || '-'}</strong>
          <small>${trade.strategy || '-'}</small>
        </div>
        <div class="day-trade-actions">
          <div class="trade-pnl ${pnlNet > 0 ? 'green' : pnlNet < 0 ? 'red' : ''}">
            ${pnlNet > 0 ? '+' : ''}${pnlNet.toFixed(2)}€
          </div>
          <button class="delete-btn" type="button" data-id="${trade.id}">${t('delete')}</button>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
  attachDayTradeEvents(trades);
}

function closeDayModal() {
  activeDayModalIsoDate = '';
  document.getElementById('dayModal')?.classList.add('hidden');
}

function getTradesByDate(date) {
  const key = String(date || '').slice(0, 10);
  return getDashboardFilteredTrades().filter((trade) => (trade.date || '').slice(0, 10) === key);
}

function closeTradePanel() {
  const panel = document.getElementById('tradePanel');
  if (!panel) return;
  panel.classList.remove('open');
  setTimeout(() => {
    if (!panel.classList.contains('open')) panel.classList.add('hidden');
  }, 250);
}

function formatTradePanelTime(time) {
  if (time == null || String(time).trim() === '') return '';
  const s = String(time).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function formatPositionLegsPanelSummary(legs) {
  const list = parsePositionLegs(legs);
  if (!list.length) return '';
  const totalLot = sumLegsLotSize(list);
  const lotTxt = totalLot > 0 ? Number(totalLot).toFixed(2).replace(/\.?0+$/, '') : '0';
  return `${list.length} entradas · Lotes ${lotTxt}`;
}

function getTradePanelScheduleBadge(trade) {
  const strategy = getStrategyRecordByName(trade.strategy);
  const status = getTradeScheduleStatus(trade, strategy);
  const labels = {
    inside: { cls: 'schedule-inside', text: 'Dentro de horario' },
    outside: { cls: 'schedule-outside', text: 'Fuera de horario' },
    missing_time: { cls: 'schedule-missing', text: 'Sin hora' },
  };
  const item = labels[status];
  if (!item) return '';
  return `<span class="trade-schedule-badge ${item.cls}">${item.text}</span>`;
}

function renderTradePanel(trades) {
  const container = document.getElementById('tradePanelList');
  if (!container) return;
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (!safeTrades.length) {
    container.innerHTML = `<div class="trade-panel-empty">${t('no_trades_day')}</div>`;
    return;
  }

  container.innerHTML = safeTrades.map((trade) => {
    const hydrated = hydrateTradeCompositeFields(trade);
    const netPnl = getTradeRealPnl(hydrated);
    const grossPnl = Number(hydrated.pnl ?? 0) || 0;
    const commission = Number(hydrated.commission ?? 0) || 0;
    const lotaje = Number(hydrated.lotaje ?? hydrated.lotSize ?? 0) || 0;
    const valueClass = netPnl >= 0 ? 'green' : 'red';
    const result = String(hydrated.result || 'BE').toUpperCase();
    const resultCls = result === 'TP' ? 'tp' : result === 'SL' ? 'sl' : 'be';
    const entry = formatTradePanelTime(hydrated.entry_time);
    const exit = formatTradePanelTime(hydrated.exit_time);
    const timeLine = exit
      ? `Entrada ${entry || '—'} · Salida ${exit}`
      : entry
        ? `Entrada ${entry}`
        : 'Sin hora registrada';
    const composite = isCompositePositionFlag(hydrated.is_composite_position);
    const compositeBadge = composite ? '<span class="trade-composite-badge">Posición</span>' : '';
    const legsSummary = composite
      ? `<div class="trade-panel-legs">${escapeHtmlChipText(formatPositionLegsPanelSummary(hydrated.position_legs))}</div>`
      : '';
    const scheduleBadge = getTradePanelScheduleBadge(hydrated);
    const lotLine = composite ? '' : `<span>Lotes ${lotaje > 0 ? lotaje.toFixed(2) : '0'}</span>`;

    return `
      <article class="trade-panel-card" data-id="${hydrated.id}">
        <div class="trade-panel-card-top">
          <div class="trade-panel-head">
            <div class="trade-panel-asset-line">
              <strong class="trade-panel-asset">${escapeHtmlChipText(hydrated.asset || '-')}</strong>
              <span class="trade-result-badge ${resultCls}">${result}</span>
              ${compositeBadge}
            </div>
            <div class="trade-panel-badges">${scheduleBadge}</div>
          </div>
          <div class="trade-panel-pnl ${valueClass}">${netPnl > 0 ? '+' : ''}${netPnl.toFixed(2)}€</div>
        </div>
        <div class="trade-panel-meta">${escapeHtmlChipText(hydrated.strategy || '-')} · ${escapeHtmlChipText(hydrated.account || '-')}</div>
        <div class="trade-panel-times">${escapeHtmlChipText(timeLine)}</div>
        <div class="trade-panel-finance">
          <span>Bruto ${grossPnl >= 0 ? '+' : ''}${grossPnl.toFixed(2)}€</span>
          <span class="trade-panel-commission">Com. ${commission.toFixed(2)}€</span>
          ${lotLine}
        </div>
        ${legsSummary}
        <div class="trade-panel-actions">
          <button type="button" class="trade-panel-btn trade-panel-edit" data-id="${hydrated.id}">Editar</button>
          <button type="button" class="trade-panel-btn trade-panel-delete danger" data-id="${hydrated.id}">Eliminar</button>
        </div>
      </article>
    `;
  }).join('');

  console.log('[renderTrades] trade panel visible count:', safeTrades.length);
}

function openTradePanel(date) {
  activeTradePanelDate = String(date || '').slice(0, 10);
  const panel = document.getElementById('tradePanel');
  const title = document.getElementById('tradePanelTitle');
  if (!panel) return;

  const trades = getTradesByDate(activeTradePanelDate);
  if (title) title.textContent = `${t('trades_of_day')} · ${formatDateToDisplay(activeTradePanelDate)}`;
  renderTradePanel(trades);
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('open'));
}

function removeUndoToast() {
  const toast = document.getElementById('undoToast');
  if (toast) toast.remove();
  if (undoToastTimer) {
    clearTimeout(undoToastTimer);
    undoToastTimer = null;
  }
}

function showUndoToast() {
  removeUndoToast();
  const toast = document.createElement('div');
  toast.id = 'undoToast';
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span>${t('trade_deleted_undo')}</span>
    <button id="undoBtn" class="undo-btn" type="button">${t('undo')}</button>
  `;
  document.body.appendChild(toast);

  undoToastTimer = setTimeout(() => {
    removeUndoToast();
    lastDeletedTrade = null;
  }, 5000);

  const undoBtn = document.getElementById('undoBtn');
  undoBtn?.addEventListener('click', () => {
    restoreLastDeletedTrade().catch((error) => {
      console.error('Error restaurando trade', error);
      showToast(t('error_undo'), 'error');
    });
  });
}

async function restoreLastDeletedTrade() {
  if (!lastDeletedTrade) return;
  const backend = getBackendApi();
  if (!backend?.restoreDeletedTrade) {
    showToast(t('error_api_undo'), 'error');
    return;
  }
  if (!(await ensureUserReady())) return;

  const localId = Number(lastDeletedTrade.id);
  const result = await backend.restoreDeletedTrade({
    id: Number.isFinite(localId) ? localId : null,
    trade: lastDeletedTrade,
  });

  if (!result?.success) {
    showToast(t('error_api_undo'), 'error');
    return;
  }

  if (result.id) rememberOwnInsertedTradeId(result.id);
  removeUndoToast();
  lastDeletedTrade = null;

  const fresh =
    typeof backend.getTradesLocal === 'function'
      ? await backend.getTradesLocal()
      : await backend.getTrades();
  await loadTrades(Array.isArray(fresh) ? fresh : []);
  if (activeTradePanelDate) openTradePanel(activeTradePanelDate);
}

function closeTradeDeleteConfirmModal() {
  tradeToDelete = null;
  tradeToDeleteRow = null;
  document.getElementById('confirmModal')?.classList.remove('active');
}

function openDeleteModal(id, rowElement = null) {
  tradeToDelete = id;
  tradeToDeleteRow = rowElement ?? null;
  document.getElementById('confirmModal')?.classList.add('active');
}

async function deleteTradeFromPanel(tradeId, rowElement) {
  if (deletingTradeInProgress) return;
  if (!(await ensureUserReady())) return;
  const api = window.api || window.electronAPI;
  if (!api?.deleteTrade) {
    showToast(t('error_api_delete_trade'), 'error');
    return;
  }

  console.log('[deleteTrade] requested (UI)', tradeId);

  const idNum = Number(tradeId);
  const trade = (Array.isArray(cachedTrades) ? cachedTrades : []).find(
    (item) =>
      (Number.isFinite(idNum) && Number(item.id) === idNum) ||
      (item.client_uuid && String(item.client_uuid) === String(tradeId))
  );
  if (!trade) return;
  lastDeletedTrade = { ...trade, sync_status: trade.sync_status || 'synced' };

  const cacheKey = Number(trade.id);
  deletingTradeInProgress = true;

  if (rowElement) rowElement.remove();
  cachedTrades = (Array.isArray(cachedTrades) ? cachedTrades : []).filter(
    (item) => Number(item.id) !== cacheKey
  );
  window.cachedTrades = cachedTrades;
  renderTradePanel(getTradesByDate(activeTradePanelDate));

  try {
    const deleteKey = trade.id;
    const result = await api.deleteTrade(deleteKey);

    if (!result?.success && result?.error !== 'NOT_FOUND') {
      showToast('Error al eliminar trade', 'error');
      await loadTrades();
      if (activeTradePanelDate) openTradePanel(activeTradePanelDate);
      return;
    }

    const rawList =
      typeof api.getTradesLocal === 'function'
        ? await api.getTradesLocal()
        : await api.getTrades();
    const updatedTrades = Array.isArray(rawList) ? rawList : [];

    cachedTrades = updatedTrades;
    window.cachedTrades = updatedTrades;
    if (typeof trades !== 'undefined') {
      trades = updatedTrades;
    }

    console.log('[deleteTrade] UI refresh, visible trades:', updatedTrades.length);

    if (typeof renderCalendar === 'function') {
      await renderCalendar(currentYear, currentMonth, true, getDashboardFilteredTrades());
    }

    if (typeof renderStats === 'function') {
      renderStats();
    }

    if (typeof renderTradesList === 'function') {
      renderTradesList();
    }

    if (typeof loadTrades === 'function') {
      await loadTrades(updatedTrades, { skipCalendar: true });
    } else {
      await renderCalendar(currentYear, currentMonth, true, getDashboardFilteredTrades());
    }

    showToast('Trade eliminado', 'success');

    if (result?.supabaseError) {
      console.warn('⚠️ Eliminado local pero no en Supabase:', result.supabaseError);
    }

    showUndoToast();
  } catch (error) {
    console.error('Error eliminando trade', error);
    showToast(t('error_delete'), 'error');
    await loadTrades();
    if (activeTradePanelDate) openTradePanel(activeTradePanelDate);
  } finally {
    deletingTradeInProgress = false;
  }
}

window.openDayModal = openDayModal;
window.closeDayModal = closeDayModal;

async function renderCalendar(year, month, useCurrentCache = false, displayTrades = null) {
  try {
    if (!(await ensureUserReady())) return;
    console.log('Renderizando calendario:', year, month);
    const calendar = getCalendarContainer();
    if (!calendar) return;

    if (!isDashboardActive()) {
      console.log('Calendario omitido: dashboard no activo');
      return;
    }

    const label = document.getElementById('monthLabel') || document.getElementById('calendarTitle') || document.getElementById('currentMonthLabel');
    const header = document.getElementById('calendarHeader');
    const monthPnlEl = document.getElementById('monthPnl');
    const monthTradesEl = document.getElementById('monthTrades');
    if (!label || !header) {
      console.error('No existe #calendarTitle');
      return;
    }

    let latestTrades;
    if (Array.isArray(displayTrades)) {
      latestTrades = displayTrades;
    } else if (useCurrentCache) {
      latestTrades = Array.isArray(cachedTrades) ? cachedTrades : [];
    } else {
      const backend = getBackendApi();
      latestTrades = backend?.getTrades ? await backend.getTrades() : cachedTrades;
      window.cachedTrades = latestTrades;
      cachedTrades = Array.isArray(latestTrades) ? latestTrades : cachedTrades;
    }

    const grouped = groupTradesByDay(latestTrades);
    const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekDays = getCalendarWeekdayLabels(showWeekend);

    label.textContent = formatCalendarTitle(year, month);

    let monthPnl = 0;
    let monthTrades = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const info = grouped[toDateKey(year, month, day)];
      if (info) {
        monthPnl += info.totalPnL;
        monthTrades += info.trades.length;
      }
    }
    if (monthPnlEl) monthPnlEl.textContent = `${monthPnl > 0 ? '+' : ''}${monthPnl.toFixed(2)}€`;
    if (monthTradesEl) monthTradesEl.textContent = String(monthTrades);

    header.innerHTML = '';
    if (showWeekend) {
      header.style.gridTemplateColumns = 'repeat(8, minmax(0, 1fr))';
    } else {
      header.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
    }
    weekDays.forEach((dayName) => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-header-day';
      dayHeader.textContent = dayName;
      header.appendChild(dayHeader);
    });
    const summaryHeader = document.createElement('div');
    summaryHeader.className = 'calendar-header-day';
    summaryHeader.textContent = t('week_summary');
    header.appendChild(summaryHeader);

    calendar.innerHTML = '';

    if (!showWeekend) {
      const cells = [];
      for (let i = 0; i < startOffset; i += 1) {
        cells.push(null);
      }
      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = (dateObj.getDay() + 6) % 7;
        if (dayOfWeek === 5 || dayOfWeek === 6) continue;
        cells.push(day);
      }

      const colsPerRow = 5;
      const rows = [];
      for (let i = 0; i < cells.length; i += colsPerRow) {
        rows.push(cells.slice(i, i + colsPerRow));
      }
      rows.forEach((weekDaysChunk) => {
        const chunk = [...weekDaysChunk];
        while (chunk.length < 5) chunk.push(null);
        renderWeek(chunk.slice(0, 5), year, month, false, latestTrades);
      });
    } else {
      const visibleColumns = 7;
      let weekRow = [];

      for (let i = 0; i < startOffset; i += 1) {
        weekRow.push(null);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        weekRow.push(day);
        if (weekRow.length === visibleColumns) {
          renderWeek(weekRow, year, month, true, latestTrades);
          weekRow = [];
        }
      }

      if (weekRow.length > 0) {
        while (weekRow.length < visibleColumns) weekRow.push(null);
        renderWeek(weekRow, year, month, true, latestTrades);
      }
    }

    updateKpiCards(latestTrades, month, year);
    if (activeKPIType) renderKpiExpandedChart(activeKPIType, month, year, latestTrades);

    logCalendarLayoutDiagnostics(calendar);

  } catch (error) {
    console.error('ERROR EN CALENDARIO:', error);
  }
}

function logCalendarLayoutDiagnostics(calendarEl) {
  if (!calendarEl || typeof window === 'undefined') return;
  const grid = calendarEl;
  const wrapper =
    grid.closest('.calendar-wrapper') ||
    grid.closest('.calendar-card') ||
    grid.closest('.calendar-container') ||
    grid.parentElement;
  const main = document.querySelector('.main-content');
  const cs = window.getComputedStyle(grid);
  const row = grid.querySelector('.calendar-row');
  const rowCs = row ? window.getComputedStyle(row) : null;
  const payload = {
    calendarWidth: grid.offsetWidth,
    calendarClientWidth: grid.clientWidth,
    gridDisplay: cs.display,
    gridTemplateColumns: cs.gridTemplateColumns,
    gridMinWidth: cs.minWidth,
    rowTemplateColumns: rowCs?.gridTemplateColumns ?? null,
    rowCount: grid.querySelectorAll('.calendar-row').length,
    parentWidths: {
      wrapper: wrapper?.offsetWidth ?? null,
      mainContent: main?.offsetWidth ?? null,
      statsView: document.getElementById('statsView')?.offsetWidth ?? null,
    },
  };
  console.log('[calendar-layout]', payload);
}

function renderCalendarFromState(useCurrentCache = false, displayTrades = null) {
  renderCalendar(currentYear, currentMonth, useCurrentCache, displayTrades);
}

function getFilteredBacktestingTradesBySession(trades = []) {
  const list = Array.isArray(trades) ? trades : [];
  if (selectedBacktestingSessionIds.includes('all')) return list;

  return list.filter((trade) => selectedBacktestingSessionIds.includes(String(trade.session_id)));
}

function getActiveBacktestingSession() {
  if (!activeBacktestingSessionId) return null;

  return (
    (cachedBacktestingSessions || []).find(
      (session) => String(session.id) === String(activeBacktestingSessionId)
    ) || null
  );
}

function filterBtAssetOptionsToActiveSessionPairs() {
  const sel = document.getElementById('btAsset');
  if (!sel) return;
  const sess = getActiveBacktestingSession();
  const allowed = getSessionPairs(sess);
  if (!allowed.length) return;
  const keep = new Set(['', ...allowed]);
  Array.from(sel.options).forEach((opt) => {
    if (!keep.has(opt.value)) opt.remove();
  });
}

function isDateInsideBacktestingSessionRange(dateStr) {
  if (selectedBacktestingSessionIds.includes('all')) return true;

  const session = getActiveBacktestingSession();
  if (!session) return true;

  const startRaw = session.start_date ?? session.date_start ?? session.startDate;
  const endRaw = session.end_date ?? session.date_end ?? session.endDate;
  const startKey = String(startRaw ?? '').slice(0, 10);
  const endKey = String(endRaw ?? '').slice(0, 10);

  if (!startKey || !endKey || !/^\d{4}-\d{2}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}-\d{2}$/.test(endKey)) {
    return true;
  }

  const dKey = String(dateStr ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dKey)) return false;

  return dKey >= startKey && dKey <= endKey;
}

function pruneStaleBacktestingSessionSelection() {
  if (selectedBacktestingSessionIds.includes('all')) return;
  const valid = new Set((cachedBacktestingSessions || []).map((s) => String(s.id)));
  const next = selectedBacktestingSessionIds.filter((sid) => valid.has(String(sid)));
  selectedBacktestingSessionIds = next.length ? next : ['all'];
}

function renderBacktestingSessionFilterOptions() {
  const optionsWrap = document.getElementById('btSessionFilterOptions');
  if (!optionsWrap) return;

  optionsWrap.innerHTML = (cachedBacktestingSessions || [])
    .map((session) => {
      const id = String(session.id);
      const checked = selectedBacktestingSessionIds.includes(id) ? 'checked' : '';
      const nameStrong = escapeHtmlAssetLabel(session.name || 'Sesión sin nombre');
      const metaSmall = `${escapeHtmlAssetLabel(formatSessionPairsDisplay(session))} · ${escapeHtmlAssetLabel(session.strategy || 'Sin estrategia')}`;

      return `<label class="bt-session-filter-option"><input type="checkbox" value="${escapeAttrChip(id)}" ${checked} /><span class="bt-session-checkmark" aria-hidden="true"></span><span class="bt-session-option-content"><strong>${nameStrong}</strong><small>${metaSmall}</small></span></label>`;
    })
    .join('');
}

function closeBacktestingSessionFilterDropdown() {
  const dropdown = document.getElementById('btSessionFilterDropdown');
  const btn = document.getElementById('btSessionFilterBtn');
  dropdown?.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/** Navega el mes del calendario si el filtro deja una sola sesión (misma UX que antes con el `<select>`). */
function navigateBacktestingCalendarWhenFilterSingleSession() {
  let sid = null;
  if (!selectedBacktestingSessionIds.includes('all') && selectedBacktestingSessionIds.length === 1) {
    sid = Number(selectedBacktestingSessionIds[0]);
  }

  if (sid != null && Number.isFinite(sid) && sid > 0) {
    const session = cachedBacktestingSessions.find((s) => Number(s.id) === sid);
    if (session?.start_date) {
      const d = new Date(`${session.start_date}T12:00:00`);
      if (!Number.isNaN(+d)) {
        backtestingCurrentMonth = d.getMonth();
        backtestingCurrentYear = d.getFullYear();
      }
    }
  }
}

function onBacktestingSessionFilterCheckboxChanged(checkbox) {
  const value = checkbox.value;

  if (value === 'all') {
    selectedBacktestingSessionIds = checkbox.checked ? ['all'] : [];
  } else {
    selectedBacktestingSessionIds = selectedBacktestingSessionIds.filter((id) => id !== 'all');

    if (checkbox.checked) {
      selectedBacktestingSessionIds.push(value);
    } else {
      selectedBacktestingSessionIds = selectedBacktestingSessionIds.filter((id) => id !== value);
    }

    if (selectedBacktestingSessionIds.length === 0) {
      selectedBacktestingSessionIds = ['all'];
    }
  }

  if (selectedBacktestingSessionIds.length === 0) {
    selectedBacktestingSessionIds = ['all'];
  }

  syncBacktestingSessionFilterUI();
  navigateBacktestingCalendarWhenFilterSingleSession();
  reloadBacktestingPnlAndGeometryAfterFilterChange();
  highlightActiveBacktestingSessionCard();
  rerenderBacktestingLocal();
}

function reloadBacktestingPnlAndGeometryAfterFilterChange() {
  updateBacktestingPnlConversionHint();
}

function syncBacktestingSessionFilterUI() {
  const label = document.getElementById('btSessionFilterLabel');
  const dropdown = document.getElementById('btSessionFilterDropdown');

  if (!label || !dropdown) return;

  const allCheckbox = dropdown.querySelector('input[value="all"]');
  if (allCheckbox) {
    allCheckbox.checked = selectedBacktestingSessionIds.includes('all');
  }

  dropdown.querySelectorAll('#btSessionFilterOptions input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = selectedBacktestingSessionIds.includes(String(checkbox.value));
  });

  if (selectedBacktestingSessionIds.includes('all')) {
    label.textContent = 'Todas las sesiones';
    return;
  }

  const selectedNames = (cachedBacktestingSessions || [])
    .filter((session) => selectedBacktestingSessionIds.includes(String(session.id)))
    .map((session) => session.name || 'Sesión sin nombre');

  if (selectedNames.length === 1) {
    label.textContent = selectedNames[0];
  } else if (selectedNames.length === 0) {
    label.textContent = 'Todas las sesiones';
  } else {
    label.textContent = `${selectedNames.length} sesiones seleccionadas`;
  }
}

function initBacktestingSessionFilter() {
  const btn = document.getElementById('btSessionFilterBtn');
  const dropdown = document.getElementById('btSessionFilterDropdown');
  const label = document.getElementById('btSessionFilterLabel');

  if (!btn || !dropdown || !label) return;

  renderBacktestingSessionFilterOptions();
  syncBacktestingSessionFilterUI();

  if (!btn.dataset.btSessionFilterToggleBound) {
    btn.dataset.btSessionFilterToggleBound = 'true';
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains('open');
      if (willOpen) {
        dropdown.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        dropdown.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (!dropdown.dataset.btSessionFilterInteractBound) {
    dropdown.dataset.btSessionFilterInteractBound = 'true';
    dropdown.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    dropdown.addEventListener('change', (event) => {
      const t = event.target;
      if (t instanceof HTMLInputElement && t.type === 'checkbox') {
        onBacktestingSessionFilterCheckboxChanged(t);
      }
    });
  }

  if (!document.documentElement.dataset.btSessionFilterDocCloseBound) {
    document.documentElement.dataset.btSessionFilterDocCloseBound = 'true';
    document.addEventListener('click', () => {
      closeBacktestingSessionFilterDropdown();
    });
  }

  void refreshLucideIcons();
}

function refreshBacktestingFilterSelects() {
  pruneStaleBacktestingSessionSelection();
  initBacktestingSessionFilter();
}

function getFilteredBacktestingTrades() {
  let list = Array.isArray(cachedBacktestingTrades) ? [...cachedBacktestingTrades] : [];
  list = getFilteredBacktestingTradesBySession(list);
  return list;
}

/** Sesión cuyo capital usamos para rentabilidad % en KPI: solo tiene sentido con exactamente una sesión filtrada. */
function getBacktestingKpiSessionForMetrics() {
  if (selectedBacktestingSessionIds.includes('all')) return null;

  const ids = selectedBacktestingSessionIds.filter((x) => x !== 'all');
  if (ids.length !== 1) return null;

  const nr = Number(ids[0]);
  if (!Number.isFinite(nr) || nr <= 0) return null;

  return (cachedBacktestingSessions || []).find((s) => Number(s.id) === nr) || null;
}

function getBacktestingCommissionMinPercent() {
  return Number(localStorage.getItem('bt_commission_min_percent') || 0.3);
}

function getBacktestingCommissionMaxPercent() {
  return Number(localStorage.getItem('bt_commission_max_percent') || 1);
}

function setBacktestingCommissionRange(min, max) {
  localStorage.setItem('bt_commission_min_percent', String(Number(min || 0)));
  localStorage.setItem('bt_commission_max_percent', String(Number(max || 0)));
}

function getBacktestingSessionForCommissions() {
  return getActiveBacktestingSession() ?? getBacktestingKpiSessionForMetrics();
}

function seededRandomFromString(str) {
  let hash = 0;
  const input = String(str || '');
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function getTradeCommissionPercent(trade, minPercent, maxPercent) {
  const min = Number(minPercent || 0);
  const max = Number(maxPercent || 0);

  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  if (safeMax <= 0) return 0;
  if (safeMin === safeMax) return safeMin;

  const seed =
    trade.id != null && trade.id !== ''
      ? String(trade.id)
      : `${trade.date || ''}-${trade.asset || trade.pair || ''}-${trade.pnl_estimated ?? trade.pnl ?? ''}`;

  const random = seededRandomFromString(seed);

  return safeMin + random * (safeMax - safeMin);
}

function calculateBacktestingEstimatedCommissions({ trades = [] } = {}) {
  const enabled = localStorage.getItem('bt_commission_enabled') !== 'false';
  if (!enabled) return 0;

  const minPercent = getBacktestingCommissionMinPercent();
  const maxPercent = getBacktestingCommissionMaxPercent();

  const safeTrades = Array.isArray(trades) ? trades : [];

  return safeTrades.reduce((sum, trade) => {
    const pnl = Number(
      trade.pnl_estimated ??
        trade.pnl ??
        trade.pnl_eur ??
        trade.result_amount ??
        0
    );

    const commissionPercent = getTradeCommissionPercent(trade, minPercent, maxPercent);

    return sum + Math.abs(pnl) * (commissionPercent / 100);
  }, 0);
}

function getBacktestingTradePnlEuros(tr) {
  return Number(tr?.pnl ?? tr?.pnl_estimated ?? 0) || 0;
}

function getRawBacktestingStrategyByName(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  for (const item of backtestingSettings?.strategies || []) {
    const norm = normalizeBacktestingStrategy(item);
    if (norm.name === n) return item && typeof item === 'object' ? item : null;
  }
  return null;
}

function getBacktestingSessionForTrade(trade = {}) {
  const sessionId =
    trade.session_id != null && trade.session_id !== '' ? trade.session_id : activeBacktestingSessionId;
  if (sessionId == null || sessionId === '') return null;
  const sessionIdStr = String(sessionId);
  return (
    (cachedBacktestingSessions || []).find((session) => String(session.id) === sessionIdStr) || null
  );
}

function getBacktestingStrategyForTrade(trade = {}) {
  const strategyName = String(trade.strategy || '').trim();
  if (!strategyName) return null;

  const normalized = getBacktestingStrategies().find(
    (strategy) => String(strategy.name || '').trim() === strategyName
  );
  const raw = getRawBacktestingStrategyByName(strategyName);
  if (!normalized && !raw) return null;

  return {
    ...(raw && typeof raw === 'object' ? { ...raw } : {}),
    ...(normalized ? { ...normalized } : {})
  };
}

function getActiveBacktestingSessionCapital() {
  let sessionId = activeBacktestingSessionId;
  if (
    !sessionId &&
    Array.isArray(selectedBacktestingSessionIds) &&
    !selectedBacktestingSessionIds.includes('all')
  ) {
    const only = selectedBacktestingSessionIds.filter((x) => x !== 'all');
    if (only.length === 1) sessionId = only[0];
  }
  const session = (cachedBacktestingSessions || []).find((s) => String(s.id) === String(sessionId));
  const capital = Number(
    session?.account_capital ?? session?.capital ?? session?.initial_capital ?? 0
  );
  return Number.isFinite(capital) ? capital : 0;
}

function getBacktestingTradeRiskEuro(trade = {}) {
  const session = getBacktestingSessionForTrade(trade);
  const strategy = getBacktestingStrategyForTrade(trade);

  const capital = Number(
    session?.account_capital ??
    session?.capital ??
    session?.initial_capital ??
    0
  );

  if (strategy) {
    const unitRaw = String(strategy.risk_unit ?? strategy.riskUnit ?? 'eur').toLowerCase();
    const unit = unitRaw === 'percent' ? 'percent' : 'eur';
    const rv = Number(
      strategy.risk_value ??
        strategy.riskValue ??
        (unit === 'eur' ? strategy.risk_per_trade : null) ??
        strategy.risk ??
        strategy.risk_eur ??
        0
    );

    if (unit === 'percent') {
      if (!capital || capital <= 0 || !rv || rv <= 0) return 0;
      return capital * (rv / 100);
    }

    if (rv > 0) return rv;
  }

  if (!capital || capital <= 0) return 0;

  const explicitRiskPercent = Number(
    strategy?.risk_percent ?? strategy?.riskPercent ?? strategy?.risk_pct ?? 0
  );

  if (explicitRiskPercent > 0) {
    return (capital * explicitRiskPercent) / 100;
  }

  return capital * 0.01;
}

function getBacktestingTradeRValue(trade = {}) {
  const tr = trade || {};
  const pnl = getBacktestingTradePnlEuros(tr);
  const riskEuro = getBacktestingTradeRiskEuro(tr);

  if (!riskEuro || riskEuro <= 0) return 0;

  return pnl / riskEuro;
}

function calculateBacktestingRFromPnl(pnlValue, strategyNameOpt) {
  const pnl = parseBacktestingNumber(pnlValue);

  let strategyName = strategyNameOpt != null ? String(strategyNameOpt).trim() : '';
  if (!strategyName) strategyName = String(document.getElementById('btStrategy')?.value || '').trim();

  const stubTrade = { strategy: strategyName, session_id: activeBacktestingSessionId };
  const riskEuro = getBacktestingTradeRiskEuro(stubTrade);

  if (!riskEuro || riskEuro <= 0) return 0;
  return pnl / riskEuro;
}

function computeBacktestingMetrics(trades) {
  const arr = Array.isArray(trades) ? trades : [];
  const n = arr.length;
  let tp = 0;
  let sl = 0;
  let be = 0;
  let sumR = 0;
  let sumWinPnl = 0;
  let sumLossPnl = 0;
  const byAsset = {};
  const byStrategy = {};

  for (const tr of arr) {
    const res = String(tr.result || '').toUpperCase();
    if (res === 'TP') tp += 1;
    else if (res === 'SL') sl += 1;
    else be += 1;

    const r = getBacktestingTradeRValue(tr);
    if (Number.isFinite(r)) sumR += r;

    const pnl = getBacktestingTradePnlEuros(tr);
    const p = Number.isFinite(pnl) ? pnl : 0;
    if (p > 0) sumWinPnl += p;
    else if (p < 0) sumLossPnl += Math.abs(p);

    const a = String(tr.asset || '—') || '—';
    if (!byAsset[a]) byAsset[a] = { n: 0, pnl: 0, r: 0 };
    byAsset[a].n += 1;
    byAsset[a].pnl += p;
    byAsset[a].r += getBacktestingTradeRValue(tr);

    const s = String(tr.strategy || '—') || '—';
    if (!byStrategy[s]) byStrategy[s] = { n: 0, pnl: 0 };
    byStrategy[s].n += 1;
    byStrategy[s].pnl += p;
  }

  const includeBE = isBacktestingIncludeBeEnabled();
  const winrateBase = includeBE
    ? arr
    : arr.filter((tr) => String(tr.result || '').toUpperCase() !== 'BE');
  const winrateTotal = winrateBase.length;
  const winrateWins = winrateBase.filter((tr) => String(tr.result || '').toUpperCase() === 'TP').length;

  const winrate = winrateTotal ? ((winrateWins / winrateTotal) * 100).toFixed(1) : '0.0';
  const avgR = n ? (sumR / n).toFixed(2) : '0.00';
  const pf = sumLossPnl > 0 ? sumWinPnl / sumLossPnl : null;
  const totalPnl = arr.reduce((acc, tr) => acc + getBacktestingTradePnlEuros(tr), 0);

  const commissionSession = getBacktestingSessionForCommissions();
  const estimatedCommissions = calculateBacktestingEstimatedCommissions({
    trades: arr
  });
  const netPnl = totalPnl - estimatedCommissions;

  const capForNet = Number(commissionSession?.account_capital ?? 0);
  const netReturnPercent = capForNet > 0 ? (netPnl / capForNet) * 100 : 0;

  let bestPair = '—';
  let bestPairPnl = -Infinity;
  Object.entries(byAsset).forEach(([name, v]) => {
    if (v.pnl > bestPairPnl) {
      bestPairPnl = v.pnl;
      bestPair = name;
    }
  });

  let bestStrat = '—';
  let bestStratPnl = -Infinity;
  Object.entries(byStrategy).forEach(([name, v]) => {
    if (v.pnl > bestStratPnl) {
      bestStratPnl = v.pnl;
      bestStrat = name;
    }
  });

  const streaks = computeResultStreaks(arr);

  const beTrades = arr.filter((tr) => String(tr.result || '').toUpperCase() === 'BE');
  const beTP = beTrades.filter((tr) => sanitizeBeAfterResult(tr.be_after_result) === 'TP').length;
  const beSL = beTrades.filter((tr) => sanitizeBeAfterResult(tr.be_after_result) === 'SL').length;
  const beTotal = beTrades.length;
  const beSuccessRate = beTotal > 0 ? (beTP / beTotal) * 100 : 0;
  const hypotheticalPnL = beTrades.reduce((acc, tr) => {
    const mapped = sanitizeBeAfterResult(tr.be_after_result);
    const pnlAbs = Math.abs(Number(getBacktestingTradePnlEuros(tr) || tr.pnl || 0));
    if (mapped === 'TP') return acc + pnlAbs;
    if (mapped === 'SL') return acc - pnlAbs;
    return acc;
  }, 0);

  return {
    n,
    tp,
    sl,
    be,
    streaks,
    winrate,
    avgR,
    pf,
    totalPnl,
    estimatedCommissions,
    netPnl,
    netReturnPercent,
    beTP,
    beSL,
    beTotal,
    beSuccessRate,
    hypotheticalPnL,
    bestPair: n ? bestPair : '—',
    bestStrategy: n ? bestStrat : '—',
    byAsset
  };
}

function formatBacktestingMoneyEUR(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return '0.00€';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}€`;
}

function renderBacktestingMetrics(filtered) {
  const m = computeBacktestingMetrics(filtered);
  const estimatedCommissions = Number(m.estimatedCommissions) || 0;
  const netPnl = Number.isFinite(m.netPnl) ? m.netPnl : Number(m.totalPnl) - estimatedCommissions;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const toneKpiValue = (id, kind) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('pro-kpi-val--pos', 'pro-kpi-val--neg', 'pro-kpi-val--neutral', 'positive', 'negative');
    if (kind === 'pos') el.classList.add('positive');
    else if (kind === 'neg') el.classList.add('negative');
  };
  const activeSession = getBacktestingKpiSessionForMetrics();
  const capital = Number(activeSession?.account_capital || 0);
  const pnlPercent = capital > 0 ? (netPnl / capital) * 100 : null;

  set('btKpiPnl', formatBacktestingMoneyEUR(m.totalPnl));
  toneKpiValue('btKpiPnl', m.totalPnl > 0 ? 'pos' : m.totalPnl < 0 ? 'neg' : null);

  const netEl = document.getElementById('btKpiPnlNet');
  if (netEl) {
    netEl.textContent = formatBacktestingMoneyEUR(netPnl);
    netEl.classList.remove('positive', 'negative');
    if (netPnl > 0) netEl.classList.add('positive');
    else if (netPnl < 0) netEl.classList.add('negative');
  }
  const minPercent = getBacktestingCommissionMinPercent();
  const maxPercent = getBacktestingCommissionMaxPercent();
  const commLabelEl = document.getElementById('btKpiCommissionLabel');
  if (commLabelEl) {
    commLabelEl.textContent = `Comisiones estimadas ${minPercent}%–${maxPercent}%`;
  }
  const commEl = document.getElementById('btKpiCommissionEstimated');
  if (commEl) {
    const c = Number(estimatedCommissions) || 0;
    commEl.textContent = c > 0 ? formatBacktestingMoneyEUR(-c) : '-0.00€';
  }

  set('btKpiRent', pnlPercent != null ? `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%` : '—');
  toneKpiValue(
    'btKpiRent',
    pnlPercent == null ? null : pnlPercent > 0 ? 'pos' : pnlPercent < 0 ? 'neg' : null
  );

  const wr = parseFloat(m.winrate);
  set('btKpiWinrate', `${m.winrate}%`);
  toneKpiValue('btKpiWinrate', wr >= 50 ? 'pos' : wr > 0 ? 'neg' : null);

  set('btKpiSetups', String(m.n));
  toneKpiValue('btKpiSetups', null);

  set('btKpiAvgRr', m.avgR);
  toneKpiValue('btKpiAvgRr', Number(m.avgR) > 0 ? 'pos' : Number(m.avgR) < 0 ? 'neg' : null);

  const pfEl = document.getElementById('btKpiPf');
  if (pfEl) {
    if (m.pf == null) {
      pfEl.textContent = '—';
      if (Number(m.totalPnl) > 0) pfEl.title = 'Sin pérdidas registradas';
      else pfEl.removeAttribute('title');
    } else {
      const pfNum = Number(m.pf);
      pfEl.textContent = Number.isFinite(pfNum) ? pfNum.toFixed(2) : '—';
      pfEl.removeAttribute('title');
    }
  }
  const pfNum = m.pf == null ? null : Number(m.pf);
  toneKpiValue(
    'btKpiPf',
    pfNum == null ? null : pfNum >= 1 ? 'pos' : Number.isFinite(pfNum) && pfNum > 0 ? 'neg' : null
  );

  set('btKpiBestPair', m.bestPair);
  toneKpiValue('btKpiBestPair', null);
  set('btKpiBestStrategy', m.bestStrategy);
  toneKpiValue('btKpiBestStrategy', null);

  set('btDistTp', String(m.tp));
  set('btDistSl', String(m.sl));
  set('btDistBe', String(m.be));

  const streaks = m.streaks || { maxTp: 0, maxSl: 0, currentTp: 0, currentSl: 0 };
  set('btStreakTp', String(streaks.maxTp));
  set('btStreakSl', String(streaks.maxSl));
  // La racha en curso es una sola cosa: o vas encadenando TP, o SL, o vienes de un BE.
  set(
    'btStreakCurrent',
    streaks.currentTp > 0
      ? `${streaks.currentTp} TP`
      : streaks.currentSl > 0
        ? `${streaks.currentSl} SL`
        : '—'
  );
  toneKpiValue('btStreakCurrent', streaks.currentTp > 0 ? 'pos' : streaks.currentSl > 0 ? 'neg' : null);
  renderBeAdvancedStatsCard({
    hostId: 'backtestingView',
    blockId: 'beAdvancedStatsBacktesting',
    title: 'BE Avanzado (Backtesting)',
    trades: (Array.isArray(filtered) ? filtered : []).map((tr) => ({
      ...tr,
      pnl: getBacktestingTradePnlEuros(tr)
    }))
  });
}

function renderBacktestingPairTable(filtered) {
  const tbody = document.getElementById('btPairTableBody');
  if (!tbody) return;
  const m = computeBacktestingMetrics(filtered);
  const entries = Object.entries(m.byAsset).sort((a, b) => b[1].pnl - a[1].pnl);
  tbody.innerHTML = '';
  entries.forEach(([name, v]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtmlAssetLabel(name)}</td><td>${v.n}</td><td>${v.pnl.toFixed(2)}€</td><td>${v.r.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
}

function getTradesForBacktestSession(sessionId) {
  const sid = Number(sessionId);
  if (!Number.isFinite(sid) || sid <= 0) return [];
  return (cachedBacktestingTrades || []).filter((t) => Number(t.session_id) === sid);
}

function computeSessionProgress(session, tradesForSession) {
  const start = session?.start_date ? new Date(`${session.start_date}T12:00:00`) : null;
  const end = session?.end_date ? new Date(`${session.end_date}T12:00:00`) : null;
  if (!start || !end || Number.isNaN(+start) || Number.isNaN(+end) || end < start) {
    return null;
  }
  const msPerDay = 86400000;
  const total_days = Math.floor((end - start) / msPerDay) + 1;
  const dates = new Set();
  (tradesForSession || []).forEach((t) => {
    const d = (t.date || '').slice(0, 10);
    if (!d) return;
    const td = new Date(`${d}T12:00:00`);
    if (!Number.isNaN(+td) && td >= start && td <= end) dates.add(d);
  });
  const tested_days = dates.size;
  const pending_days = Math.max(0, total_days - tested_days);
  const progress_percent = total_days > 0 ? (tested_days / total_days) * 100 : 0;
  return { total_days, tested_days, pending_days, progress_percent };
}

/** Aplica al formulario de "Nueva operación" el contexto de la sesión activa (par permitido,
 * estrategia y riesgo € de esa estrategia), y deja el PnL auto-calculado listo si Resultado ya
 * tiene un valor (normalmente TP por defecto). Se usa tanto al pulsar "Trabajar" en una sesión
 * como después de guardar cada trade, para que la sesión activa se mantenga entre operaciones
 * y no haya que volver a pulsar "Trabajar" para cada trade nuevo. */
function applyActiveBacktestingSessionToTradeForm(opts = {}) {
  const { jumpToWorkDate = false } = opts;
  const id = Number(activeBacktestingSessionId);
  if (!Number.isFinite(id) || id <= 0) return;

  const session = cachedBacktestingSessions.find((s) => Number(s.id) === id);
  if (!session) return;

  if (jumpToWorkDate) {
    // Retomar donde se dejó: si la sesión ya tiene operaciones se abre por el día de la última,
    // y solo si está vacía se va a la fecha de inicio. Así un backtest a medias continúa solo.
    const lastKey = getLastBacktestingTradeDate(id);
    const startKey = (session.start_date || '').slice(0, 10);
    setBacktestingWorkDate(lastKey || startKey, { navigateMonth: true });
  }

  const assetInput = document.getElementById('btAsset');
  const allowedPairs = getSessionPairs(session);

  if (assetInput) {
    if (typeof backtestingAssetComboboxState?.rebuildFromSettings === 'function') {
      backtestingAssetComboboxState.rebuildFromSettings();
    }

    if (allowedPairs.length === 1) {
      const only = allowedPairs[0];
      ensureSelectHasValue(assetInput, only);
      assetInput.value = only;
      assetInput.dispatchEvent(new Event('change', { bubbles: true }));
      if (backtestingAssetComboboxState) {
        backtestingAssetComboboxState.selectedValue = only;
        backtestingAssetComboboxState.value = only;
        if (typeof backtestingAssetComboboxState.setValue === 'function') {
          backtestingAssetComboboxState.setValue(only);
        }
      }
    } else if (allowedPairs.length > 1) {
      const cur = String(assetInput.value || '').trim();
      if (cur && allowedPairs.includes(cur)) {
        ensureSelectHasValue(assetInput, cur);
        assetInput.value = cur;
        assetInput.dispatchEvent(new Event('change', { bubbles: true }));
        if (backtestingAssetComboboxState) {
          backtestingAssetComboboxState.selectedValue = cur;
          backtestingAssetComboboxState.value = cur;
          if (typeof backtestingAssetComboboxState.setValue === 'function') {
            backtestingAssetComboboxState.setValue(cur);
          }
        }
      } else if (typeof backtestingAssetComboboxState?.setValue === 'function') {
        backtestingAssetComboboxState.setValue('');
      } else {
        assetInput.value = '';
        assetInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  const strategyInput = document.getElementById('btStrategy');
  if (strategyInput && session.strategy) {
    ensureSelectHasValue(strategyInput, session.strategy);
    strategyInput.value = session.strategy;
    refreshBacktestingCustomSelect(strategyInput);
  }

  const strategyConfig = getBacktestingStrategies().find((s) => s.name === session.strategy);
  if (strategyConfig) {
    const riskInput = document.getElementById('btRisk');
    if (riskInput && !riskInput.value) {
      const auto = getBacktestingStrategyRiskEuroForForm(strategyConfig);
      if (auto !== '') riskInput.value = auto;
    }
  }

  refreshBacktestingFormUiWidgets();

  // El mes del calendario ya lo ha movido setBacktestingWorkDate() más arriba (al día del
  // último trade de la sesión, o a su fecha de inicio si aún no tiene ninguno).

  // El Resultado ya viene en 'TP' por defecto sin pasar por su listener de 'change' (que es el
  // que dispara el auto-cálculo del PnL a partir del riesgo%/RR), así que hay que forzarlo aquí
  // también para que cada trade nuevo dentro de esta sesión ya salga con el PnL correcto.
  applyBacktestingAutoPnlIfUnset();
  syncBacktestingPnlFromResult();
}

function highlightActiveBacktestingSessionCard() {
  document.querySelectorAll('.bt-session-card').forEach((card) => {
    const btn = card.querySelector('.bt-session-work-btn');
    const sid = Number(btn?.getAttribute('data-session-id'));
    card.classList.toggle('is-active-session', Number(activeBacktestingSessionId) === sid);
  });
}

function renderBacktestingSessionCards() {
  const host = document.getElementById('backtestingSessionsCards');
  if (!host) return;
  let sessions = Array.isArray(cachedBacktestingSessions) ? cachedBacktestingSessions : [];

  sessions = selectedBacktestingSessionIds.includes('all')
    ? sessions
    : sessions.filter((s) => selectedBacktestingSessionIds.includes(String(s.id)));

  if (!sessions.length) {
    const hadAnyBacktestingSessions = Array.isArray(cachedBacktestingSessions) && cachedBacktestingSessions.length > 0;
    host.innerHTML = hadAnyBacktestingSessions && !selectedBacktestingSessionIds.includes('all')
      ? '<p class="muted small">Ninguna sesión coincide con el filtro seleccionado.</p>'
      : '<p class="muted small">No hay sesiones. Crea una para agrupar operaciones por rango de fechas.</p>';
    return;
  }
  host.innerHTML = '';
  sessions.forEach((sess) => {
    const trades = getTradesForBacktestSession(sess.id);
    const prog = computeSessionProgress(sess, trades);
    const card = document.createElement('div');
    card.className = 'card bt-session-card pro-card pro-session-card';
    card.dataset.sessionId = String(sess.id);
    const pct = prog ? `${prog.progress_percent.toFixed(0)}%` : '—';
    const xy = prog ? `${prog.tested_days}/${prog.total_days}` : '—';
    const pend = prog ? prog.pending_days : '—';
    const pbar = prog ? Math.min(100, Math.max(0, prog.progress_percent)) : 0;
    let hint = '';
    if (prog && prog.progress_percent < 100) {
      hint = `<p class="muted small">Te faltan ${prog.pending_days} día${prog.pending_days === 1 ? '' : 's'} para terminar este backtest.</p>`;
    } else if (prog && prog.progress_percent >= 100) {
      hint = '<p class="muted small text-success">Backtest completado.</p>';
    }
    const stRaw = String(sess.status || 'in_progress');
    const stClass = ['in_progress', 'completed', 'paused'].includes(stRaw) ? stRaw : 'in_progress';
    const stLabelMap = { in_progress: 'En progreso', completed: 'Completada', paused: 'Pausada' };
    const stLabel = stLabelMap[stClass] || stRaw;
    card.innerHTML = `
  <div class="bt-session-card-header pro-session-top">
    <div>
      <div class="bt-session-title">${escapeHtmlAssetLabel(sess.name || 'Sin nombre')}</div>
      <div class="bt-session-subtitle">
        ${escapeHtmlAssetLabel(formatSessionPairsDisplay(sess))} · ${escapeHtmlAssetLabel(sess.strategy || 'Sin estrategia')}
      </div>
    </div>
    <span class="bt-session-status pro-badge ${stClass}">${escapeHtmlAssetLabel(stLabel)}</span>
  </div>

  <div class="bt-session-dates">
    ${escapeHtmlAssetLabel(formatDateRangeEs(sess.start_date, sess.end_date))}${
      sess.account_capital != null && Number(sess.account_capital) > 0
        ? ` · Capital: ${Number(sess.account_capital).toLocaleString('es-ES')}€`
        : ''
    }
  </div>

  <div class="bt-progress-wrap">
    <div class="bt-progress-top">
      <span>Progreso</span>
      <strong>${pct}</strong>
    </div>
    <div class="bt-progress-bar">
      <span class="pro-progress-fill" style="--bt-w:${pbar}%"></span>
    </div>
    <div class="bt-progress-meta">
      <span>${xy} días testeados</span>
      <span>Faltan ${pend}</span>
    </div>
  </div>

  ${hint}

  <div class="bt-session-actions pro-actions">
    <button type="button" class="btn btn-primary bt-session-work-btn" data-session-id="${sess.id}">
      Trabajar
    </button>
    <button type="button" class="btn btn-secondary bt-session-edit-btn" data-session-id="${sess.id}">
      Editar
    </button>
    <button type="button" class="btn btn-danger bt-session-del-btn" data-session-id="${sess.id}">
      Eliminar
    </button>
  </div>
    `;
    host.appendChild(card);
  });

  host.querySelectorAll('.bt-session-work-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-session-id'));

      if (!Number.isFinite(id) || id <= 0) return;

      activeBacktestingSessionId = id;
      selectedBacktestingSessionIds = [String(id)];
      initBacktestingSessionFilter();

      applyActiveBacktestingSessionToTradeForm({ jumpToWorkDate: true });

      rerenderBacktestingLocal();
      highlightActiveBacktestingSessionCard();
      showToast('Sesión activada para trabajar', 'success');
    });
  });
  host.querySelectorAll('.bt-session-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const editId = Number(btn.getAttribute('data-session-id'));
      void (async () => {
        await loadBacktestingSettings();
        openBacktestingSessionModal(editId);
      })();
    });
  });
  host.querySelectorAll('.bt-session-del-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delId = Number(btn.getAttribute('data-session-id'));
      void deleteBacktestingSessionById(delId);
    });
  });
  highlightActiveBacktestingSessionCard();
}

function parseTradeCustomMetrics(trade) {
  const raw = trade?.custom_metrics;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  return {};
}

function renderBacktestingCustomMetricFields(preset) {
  const container = document.getElementById('btCustomMetricsFields');
  if (!container) return;
  const block = document.getElementById('btCustomMetricsBlock');
  const metrics = (cachedBacktestingMetrics || []).filter((m) => m.is_active);
  if (!metrics.length) {
    container.innerHTML = '';
    if (block) block.style.display = 'none';
    return;
  }
  if (block) block.style.display = '';
  container.innerHTML = '';
  const vals = preset && typeof preset === 'object' ? preset : {};
  metrics.forEach((m) => {
    const name = m.name;
    const v = vals[name];
    const mid = String(m.id);
    const inpId = `bt-cm-${mid}`;

    if (m.metric_type === 'checkbox') {
      const row = document.createElement('div');
      row.className = 'bt-custom-metric-row';
      const lab = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.dataset.btMetricId = mid;
      inp.checked = v === true || v === 'true';
      const span = document.createElement('span');
      span.textContent = name;
      lab.appendChild(inp);
      lab.appendChild(span);
      row.appendChild(lab);
      if (m.description) {
        const hint = document.createElement('p');
        hint.className = 'muted bt-custom-metric-hint';
        hint.textContent = m.description;
        row.appendChild(hint);
      }
      container.appendChild(row);
      return;
    }

    const row = document.createElement('div');
    row.className = 'bt-custom-metric-row';
    const lab = document.createElement('label');
    lab.htmlFor = inpId;
    lab.textContent = name;
    const inp = document.createElement('input');
    inp.id = inpId;
    inp.className = 'input';
    inp.dataset.btMetricId = mid;
    if (m.metric_type === 'number') {
      inp.type = 'number';
      inp.step = 'any';
      inp.value = v != null && v !== '' ? String(v) : '';
    } else {
      inp.type = 'text';
      inp.value = v != null ? String(v) : '';
    }
    row.appendChild(lab);
    row.appendChild(inp);
    if (m.description) {
      const hint = document.createElement('p');
      hint.className = 'muted bt-custom-metric-hint';
      hint.textContent = m.description;
      row.appendChild(hint);
    }
    container.appendChild(row);
  });
}

function collectBacktestingCustomMetrics() {
  const byId = new Map((cachedBacktestingMetrics || []).map((x) => [String(x.id), x.name]));
  const out = {};
  document.querySelectorAll('#btCustomMetricsFields [data-bt-metric-id]').forEach((el) => {
    const id = el.getAttribute('data-bt-metric-id');
    const name = byId.get(id);
    if (!name) return;
    if (el.type === 'checkbox') out[name] = Boolean(el.checked);
    else if (el.type === 'number') out[name] = Number(el.value) || 0;
    else out[name] = String(el.value ?? '');
  });
  return out;
}

/** Métricas de un subconjunto de trades (bloque reutilizable para comparar "con" vs "sin"). */
function summarizeBacktestingSubset(subset) {
  const n = subset.length;
  if (!n) return { n: 0, winrate: null, pnl: 0, sumR: 0, avgRr: null };
  let sumR = 0;
  let pnl = 0;
  subset.forEach((t) => {
    sumR += getBacktestingTradeRValue(t);
    pnl += getBacktestingTradePnlEuros(t);
  });
  const includeBE = isBacktestingIncludeBeEnabled();
  const winrateBase = includeBE
    ? subset
    : subset.filter((tr) => String(tr.result || '').toUpperCase() !== 'BE');
  const wrN = winrateBase.length;
  const wins = winrateBase.filter((tr) => String(tr.result || '').toUpperCase() === 'TP').length;
  return {
    n,
    winrate: wrN ? (wins / wrN) * 100 : null,
    pnl,
    sumR,
    avgRr: sumR / n,
  };
}

/**
 * Compara los trades donde la métrica está marcada frente a los que no. Sin esa comparación el
 * dato no dice nada: saber que con "Siguió el plan" ganas 300€ solo es útil si sabes cuánto
 * ganas (o pierdes) cuando NO la cumples.
 */
function analyzeCheckboxMetric(trades, metricName) {
  const marked = [];
  const unmarked = [];
  trades.forEach((t) => {
    const value = parseTradeCustomMetrics(t)[metricName];
    if (value === true) marked.push(t);
    else if (value === false) unmarked.push(t);
    // undefined/null => el trade es anterior a la métrica: no cuenta en ninguno de los dos lados.
  });
  return {
    yes: summarizeBacktestingSubset(marked),
    no: summarizeBacktestingSubset(unmarked),
    evaluated: marked.length + unmarked.length,
    total: trades.length,
  };
}

/* ============================== Curva de capital ==============================
 * La lectura rapida de "como ha ido esto": el capital operacion a operacion. El calculo esta
 * en services/backtestEquityCurve.js; aqui solo se dibuja.
 */

let backtestingEquityChart = null;

function renderBacktestingEquityCurve(filtered) {
  const canvas = document.getElementById('btEquityChart');
  if (!canvas || !window.Chart) return;

  const trades = Array.isArray(filtered) ? filtered : [];
  const empty = document.getElementById('btEquityEmpty');
  const subtitle = document.getElementById('btEquitySubtitle');
  const wrap = canvas.parentElement;

  // El capital de partida solo se conoce si hay UNA sesion seleccionada; con varias, sus
  // capitales pueden ser distintos y sumarlos seria inventarse una cuenta que no existe.
  const session = getBacktestingKpiSessionForMetrics();
  const capital = Number(session?.account_capital || 0);
  const curve = buildEquityCurve(
    trades.map((tr) => ({
      date: tr.date,
      entry_time: tr.entry_time,
      id: tr.id,
      pnl: getBacktestingTradePnlEuros(tr),
    })),
    { startingCapital: capital }
  );

  const money = (v) => `${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(2)}€`;
  const signed = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}€`;
  const set = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  if (subtitle) {
    subtitle.textContent = capital
      ? `Desde el capital de la sesión (${money(capital)}), operación a operación y en orden cronológico.`
      : 'PnL acumulado operación a operación. Selecciona una sola sesión para verlo como capital.';
  }

  if (!curve.trades) {
    if (empty) empty.hidden = false;
    if (wrap) wrap.hidden = true;
    set('btEquityFinal', '—');
    set('btEquityMaxDd', '—');
    set('btEquityPeak', '—');
    if (backtestingEquityChart) {
      backtestingEquityChart.destroy();
      backtestingEquityChart = null;
    }
    return;
  }

  if (empty) empty.hidden = true;
  if (wrap) wrap.hidden = false;

  set('btEquityFinal', capital ? money(curve.finalEquity) : signed(curve.totalPnl));
  set(
    'btEquityMaxDd',
    curve.maxDrawdown > 0
      ? `-${curve.maxDrawdown.toFixed(2)}€${curve.maxDrawdownPct > 0 ? ` (${curve.maxDrawdownPct.toFixed(1)}%)` : ''}`
      : '0.00€'
  );
  set('btEquityPeak', capital ? money(curve.peakEquity) : signed(curve.peakEquity));

  const positive = curve.totalPnl >= 0;
  const color = positive ? '#22c55e' : '#ef4444';
  const labels = curve.points.map((p, i) => (i === 0 ? 'Inicio' : formatDateToDisplay(p.date)));
  const values = curve.points.map((p) => Number(p.equity.toFixed(2)));

  if (backtestingEquityChart) {
    backtestingEquityChart.destroy();
    backtestingEquityChart = null;
  }

  backtestingEquityChart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: capital ? 'Capital' : 'PnL acumulado',
          data: values,
          borderColor: color,
          backgroundColor: `${color}22`,
          borderWidth: 2,
          fill: true,
          tension: 0.2,
          // Con decenas de operaciones los puntos ensucian; se ven al pasar el raton.
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 12,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (ctx) => {
              const i = ctx?.[0]?.dataIndex ?? 0;
              return i === 0 ? 'Punto de partida' : `Operación ${i} · ${labels[i]}`;
            },
            label: (ctx) => {
              const i = ctx.dataIndex;
              const point = curve.points[i];
              const lines = [`${capital ? 'Capital' : 'Acumulado'}: ${money(point.equity)}`];
              if (i > 0) lines.push(`Esta operación: ${signed(point.pnl)}`);
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxTicksLimit: 10, autoSkip: true },
          grid: { color: getChartGridColor() },
        },
        y: {
          ticks: { color: '#94a3b8', callback: (v) => `${Number(v).toFixed(0)}€` },
          grid: { color: getChartGridColor() },
        },
      },
    },
  });
}

/* ================================ Challenges ================================
 * Traduce los resultados del backtest a la pregunta que de verdad importa cuando compras un
 * challenge: cuánto tardaré y qué probabilidad tengo. El cálculo vive en
 * services/challengeSimulator.js; aquí solo está la configuración y la presentación.
 */

function getChallengeConfig() {
  return normalizeChallengeConfig(backtestingSettings.challenge_config || defaultChallengeConfig());
}

function renderChallengePhaseInputs() {
  const host = document.getElementById('btChallengePhaseRows');
  const select = document.getElementById('btChallengePhases');
  if (!host) return;

  const cfg = getChallengeConfig();
  if (select) select.value = String(cfg.phases.length);
  const countInput = document.getElementById('btChallengeCount');
  if (countInput && document.activeElement !== countInput) countInput.value = String(cfg.accounts || 1);

  host.innerHTML = cfg.phases
    .map(
      (phase, i) => `
      <tr>
        <th>Fase ${i + 1}</th>
        <td><div class="challenge-input"><input type="number" class="input" data-challenge="target" data-index="${i}" value="${phase.target}" min="0" step="0.5" /><span>%</span></div></td>
        <td><div class="challenge-input"><input type="number" class="input" data-challenge="risk" data-index="${i}" value="${phase.risk}" min="0" step="0.1" /><span>%</span></div></td>
        <td><div class="challenge-input"><input type="number" class="input" data-challenge="maxDrawdown" data-index="${i}" value="${phase.maxDrawdown}" min="0" step="0.5" /><span>%</span></div></td>
        <td><div class="challenge-input"><input type="number" class="input" data-challenge="consistency" data-index="${i}" value="${phase.consistency || 0}" min="0" max="100" step="5" /><span>%</span></div></td>
      </tr>`
    )
    .join('');
}

function readChallengeConfigFromDom() {
  const rows = document.querySelectorAll('#btChallengePhaseRows tr');
  const phases = [...rows].map((row) => ({
    target: Number(row.querySelector('[data-challenge="target"]')?.value) || 0,
    risk: Number(row.querySelector('[data-challenge="risk"]')?.value) || 0,
    maxDrawdown: Number(row.querySelector('[data-challenge="maxDrawdown"]')?.value) || 0,
    consistency: Number(row.querySelector('[data-challenge="consistency"]')?.value) || 0,
  }));
  const typed = Number(document.getElementById('btChallengeCount')?.value);
  const accounts = Math.max(1, Math.min(10, typed || Number(getChallengeConfig().accounts) || 1));
  return { phases: phases.length ? phases : defaultChallengeConfig().phases, accounts };
}

function renderBacktestingChallenge(filtered) {
  const section = document.getElementById('btChallengeSection');
  if (!section) return;

  if (!document.getElementById('btChallengePhaseRows')?.children.length) {
    renderChallengePhaseInputs();
  }

  const trades = filtered || [];
  const rValues = trades.map((t) => getBacktestingTradeRValue(t)).filter((v) => Number.isFinite(v));
  const cfg = readChallengeConfigFromDom();
  const results = document.getElementById('btChallengeResults');
  const caveat = document.getElementById('btChallengeCaveat');

  if (rValues.length < 5) {
    if (results) {
      results.innerHTML =
        '<p class="muted small">Hacen falta al menos 5 operaciones registradas para simular un challenge con un mínimo de sentido.</p>';
    }
    const rotationHost = document.getElementById('btChallengeRotation');
    if (rotationHost) rotationHost.innerHTML = '';
    const rotationHead = document.getElementById('btChallengeRotationHead');
    if (rotationHead) rotationHead.hidden = true;
    if (caveat) caveat.textContent = '';
    bindChallengeInputs();
    return;
  }

  const perDay = tradesPerTradingDay(trades);
  // Este bloque responde siempre a "¿paso UN challenge?". Comprar varios es otra pregunta y
  // tiene su propio apartado abajo; mezclarlas en el mismo titular confundía.
  const sim = simulateChallenge(rValues, cfg.phases, { runs: 3000, tradesPerDay: perDay });
  if (!sim) return;

  const toDays = (n) => (n == null || !perDay ? null : Math.ceil(n / perDay));
  const pct = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
  const tone = (v) => (v == null ? '' : v >= 70 ? 'positive' : v >= 40 ? '' : 'negative');

  // Con el modelo de días activo los días salen de la propia simulación (la consistencia obliga
  // a parar antes de tiempo, así que dividir operaciones entre ritmo daría de menos).
  const days = sim.medianDaysTotal ?? toDays(sim.medianTradesTotal);
  const daysP90 = sim.p90DaysTotal ?? toDays(sim.p90TradesTotal);
  const hasConsistency = cfg.phases.some((p) => Number(p.consistency) > 0);

  if (results) {
    results.innerHTML = `
      <div class="challenge-headline ${tone(sim.overallPassRate)}">
        Probabilidad de superar el challenge completo: <strong>${pct(sim.overallPassRate)}</strong>
      </div>
      <div class="stats-grid challenge-kpis">
        <div class="advanced-item">
          <span>Operaciones · caso normal</span>
          <h2>${sim.medianTradesTotal ?? '—'}</h2>
        </div>
        <div class="advanced-item">
          <span>Días · caso normal</span>
          <h2>${days ?? '—'}</h2>
        </div>
        <div class="advanced-item">
          <span>Días · si va mal</span>
          <h2>${daysP90 ?? '—'}</h2>
        </div>
        ${
          // Solo se enseña si de verdad te frena: un "0.0" permanente es ruido.
          hasConsistency && sim.avgConsistencyStops >= 0.05
            ? `<div class="advanced-item">
          <span>Días que paras por consistencia</span>
          <h2>${sim.avgConsistencyStops.toFixed(1)}</h2>
        </div>`
            : ''
        }
        <div class="advanced-item">
          <span>Ritmo del backtest</span>
          <h2>${perDay ? `${perDay.toFixed(1)}/día` : '—'}</h2>
        </div>
      </div>
      <div class="table-wrap">
        <table class="challenge-table">
          <thead>
            <tr><th>Fase</th><th>Probabilidad de superarla</th><th>Operaciones · caso normal</th><th>Días</th></tr>
          </thead>
          <tbody>
            ${sim.phases
              .map(
                (p) => `<tr>
                  <th>Fase ${p.index}</th>
                  <td class="${tone(p.passRate)}">${pct(p.passRate)}</td>
                  <td>${p.medianTrades ?? '—'}</td>
                  <td>${toDays(p.medianTrades) ?? '—'}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  }

  if (results && sim.consistencyIssues && sim.consistencyIssues.length) {
    results.insertAdjacentHTML(
      'afterbegin',
      `<div class="challenge-warning">
        ${sim.consistencyIssues
          .map(
            (w) =>
              `Fase ${w.index}: con este riesgo, una sola operación ganadora (${w.maxWin.toFixed(2)}% de la cuenta)
               ya supera el tope diario de consistencia (${w.cap.toFixed(2)}%). Tal y como está, la prop no te
               validaría el challenge: tendrías que bajar el riesgo a ${w.suggestedRisk.toFixed(2)}% o menos.`
          )
          .join('<br>')}
      </div>`
    );
  }

  renderChallengeRotation(rValues, cfg, perDay, { pct, tone });

  if (caveat) {
    // El usuario tiene que poder juzgar cuánto fiarse: se dice el tamaño de la muestra y los
    // supuestos, en vez de dar un porcentaje a secas que parezca una certeza.
    caveat.innerHTML =
      '<strong>Caso normal</strong> = la mitad de las veces necesitarías menos de esa cifra, y la otra mitad más. ' +
      'No se usa la media porque unas pocas rachas malas muy largas la disparan y dejaría de representar lo habitual. ' +
      '<strong>Si va mal</strong> = el 10% de los casos peores.<br>' +
      (hasConsistency
        ? 'La <strong>consistencia</strong> se aplica como tope de beneficio del día: si el objetivo es 3.000 € ' +
          'y pones 50%, ningún día puede pasar de 1.500 €, así que dejas de operar aunque el sistema siga dando señales.<br>'
        : '') +
      `Calculado repartiendo al azar 3.000 veces las ${sim.sampleSize} operaciones de este backtest, ` +
      `al ritmo real de ${perDay ? perDay.toFixed(1) : '—'} operaciones por día operado. ` +
      'Da por hecho que tus próximas operaciones se parecerán a estas y son independientes entre sí. ' +
      'No tiene en cuenta el límite de pérdida diaria ni el mínimo de días operados que exija tu prop.';
  }

  bindChallengeInputs();
}

/**
 * "¿Y si compro varios challenges?" — el usuario escribe cuántos compra y se listan uno a uno,
 * de 1 hasta esa cifra, para ver dónde deja de compensar.
 *
 * Los dos modos se llaman por su nombre en el argot de props: "riesgo rotativo" (cambias de
 * cuenta al primer SL) y "sin riesgo rotativo" (agotas una antes de abrir la siguiente).
 *
 * Solo se reescribe el contenedor de resultados: la cabecera con el campo numérico es HTML fijo,
 * porque regenerarla mientras se teclea robaría el foco.
 */
function renderChallengeRotation(rValues, cfg, perDay, fmt) {
  const host = document.getElementById('btChallengeRotation');
  const head = document.getElementById('btChallengeRotationHead');
  if (!host) return;
  if (head) head.hidden = false;

  const picked = Math.max(1, Math.min(10, Number(cfg.accounts) || 1));
  // 600 repeticiones y no 3.000 como el bloque principal: aquí se listan hasta diez escenarios
  // (el doble contando las dos gestiones) y las cifras ya se estabilizan en la segunda decimal,
  // comprobado. Con 1.200 la lista de diez tardaba casi un segundo en redibujarse.
  const rows = compareChallengeAccounts(rValues, cfg.phases, { runs: 600, tradesPerDay: perDay }, picked);
  if (!rows.length) {
    host.innerHTML = '';
    return;
  }

  const current = rows[rows.length - 1];
  // Se compara por "los pasas todos" y, si empatan, por "al menos uno". Antes se comparaba por
  // la media, pero entonces el veredicto podía decir que una opción era mejor mientras las dos
  // cifras en pantalla eran iguales.
  const gapAll = current.rotating.passAllRate - current.sequential.passAllRate;
  const gapAny = current.rotating.anyPassRate - current.sequential.anyPassRate;
  const decisive = Math.abs(gapAll) >= 1 ? gapAll : Math.abs(gapAny) >= 1 ? gapAny : 0;
  const rotWins = decisive > 0;
  const seqWins = decisive < 0;

  const modeCard = (title, subtitle, data, isBest) => `
    <div class="challenge-mode-card ${isBest ? 'is-best' : ''}">
      <div class="challenge-mode-head">
        <h5>${title}</h5>
        ${isBest ? '<span class="challenge-mode-flag">Mejor opción</span>' : ''}
      </div>
      <p class="muted small">${subtitle}</p>
      <div class="challenge-mode-rows">
        <div><span>Pasas al menos uno</span><strong class="${fmt.tone(data.anyPassRate)}">${fmt.pct(data.anyPassRate)}</strong></div>
        <div><span>Los pasas los ${picked}</span><strong class="${fmt.tone(data.passAllRate)}">${fmt.pct(data.passAllRate)}</strong></div>
        <div><span>Lo más habitual</span><strong>${data.mostLikelyPassed} de ${picked} <small>(${fmt.pct(data.mostLikelyPct)})</small></strong></div>
        <div><span>Días hasta pasar el primero</span><strong>${data.medianDays ?? '—'}</strong></div>
      </div>
      <p class="muted small challenge-dist">
        ${data.passedDistribution
          .map((d) => `<span>${d.passed}: <strong>${d.pct.toFixed(0)}%</strong></span>`)
          .join(' · ')}
      </p>
    </div>`;

  host.innerHTML = `
    ${
      picked === 1
        ? `<p class="muted small">Con un solo challenge no hay nada que rotar: tienes un ${fmt.pct(rows[0].rotating.anyPassRate)}
           de pasarlo. Escribe 2 o más arriba para comparar las dos formas de gestionarlos.</p>`
        : `<div class="challenge-modes">
        ${modeCard(
          'Riesgo rotativo',
          'Operas una cuenta y, en cuanto te salta un SL, pasas a la siguiente. Los SL se reparten entre todas y ninguna se acerca tanto a su pérdida máxima.',
          current.rotating,
          rotWins
        )}
        ${modeCard(
          'Sin riesgo rotativo',
          'Operas la misma cuenta hasta que la pasas o la quemas. Solo entonces empiezas la siguiente, que sigue intacta.',
          current.sequential,
          seqWins
        )}
      </div>
      <p class="muted small challenge-verdict">
        ${
          rotWins
            ? `Con ${picked} cuentas te compensa el riesgo rotativo: los pasas todos el ${fmt.pct(current.rotating.passAllRate)} de las veces, frente al ${fmt.pct(current.sequential.passAllRate)}.`
            : seqWins
              ? `Con ${picked} cuentas sale mejor sin riesgo rotativo: los pasas todos el ${fmt.pct(current.sequential.passAllRate)} de las veces, frente al ${fmt.pct(current.rotating.passAllRate)}.`
              : `Con ${picked} cuentas da igual cómo las gestiones: los dos caminos acaban prácticamente en lo mismo.`
        }
        La fila de abajo de cada tarjeta es el reparto completo: de cada 100 intentos, cuántas
        veces acabarías con 0 challenges pasados, con 1, con 2… Ahí no hay medias: o lo pasas o no.
      </p>`
    }

    <div class="table-wrap">
      <table class="challenge-table challenge-table--rotation">
        <thead>
          <tr>
            <th rowspan="2">Compro</th>
            <th colspan="2">Riesgo rotativo</th>
            <th colspan="2">Sin riesgo rotativo</th>
          </tr>
          <tr>
            <th>Pasas ≥1</th><th>Los pasas todos</th>
            <th>Pasas ≥1</th><th>Los pasas todos</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `<tr class="${r.accounts === picked ? 'is-current' : ''}">
                <th>${r.accounts}</th>
                <td class="${fmt.tone(r.rotating.anyPassRate)}">${fmt.pct(r.rotating.anyPassRate)}</td>
                <td>${fmt.pct(r.rotating.passAllRate)}</td>
                <td class="${fmt.tone(r.sequential.anyPassRate)}">${fmt.pct(r.sequential.anyPassRate)}</td>
                <td>${fmt.pct(r.sequential.passAllRate)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function bindChallengeInputs() {
  const section = document.getElementById('btChallengeSection');
  if (!section || section.dataset.bound === 'true') return;
  section.dataset.bound = 'true';

  const persist = () => {
    backtestingSettings.challenge_config = readChallengeConfigFromDom();
    void persistBacktestingSettings();
  };

  // Redibujar dispara doce simulaciones de Monte Carlo, así que no se hace en cada pulsación:
  // se espera a que el usuario deje de teclear.
  let redrawTimer = null;
  const redrawSoon = () => {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(() => renderBacktestingChallenge(getBacktestingTradesForMetrics()), 180);
  };

  section.addEventListener('input', (event) => {
    if (!event.target.matches('[data-challenge], [data-challenge-count]')) return;
    redrawSoon();
  });

  // Se guarda al soltar el campo y no en cada tecla, para no escribir en Supabase en cada dígito.
  section.addEventListener('change', (event) => {
    if (event.target.matches('[data-challenge], [data-challenge-count]')) persist();
  });

  document.getElementById('btChallengePhases')?.addEventListener('change', (event) => {
    const wanted = Math.max(1, Math.min(3, Number(event.target.value) || 1));
    const currentCfg = readChallengeConfigFromDom();
    const current = currentCfg.phases;
    const next = [];
    for (let i = 0; i < wanted; i += 1) {
      // Al añadir una fase se hereda la consistencia de la anterior: las props suelen aplicar la
      // misma regla en todas, y así el usuario no tiene que reescribirla.
      next.push(
        current[i] || {
          target: 5,
          risk: 1,
          maxDrawdown: 10,
          consistency: current[current.length - 1]?.consistency || 0,
        }
      );
    }
    backtestingSettings.challenge_config = { phases: next, accounts: currentCfg.accounts };
    renderChallengePhaseInputs();
    renderBacktestingChallenge(getBacktestingTradesForMetrics());
    void persistBacktestingSettings();
  });
}

/* ---------------------------- Explorador de métricas ----------------------------
 * La tabla de «Análisis por métricas» compara cada métrica por separado contra su propia
 * negación, y eso se queda corto cuando las métricas describen escenarios relacionados
 * (por ejemplo «llegó al 0.5%» y «llegó al 0%»): la pregunta real es «de las operaciones que
 * llegaron al 0.5%, ¿cuántas habrían llegado al 0%?», y eso exige cruzar condiciones.
 *
 * Aquí cada métrica es un filtro de tres estados (ignorar / exigir cumplida / exigir NO
 * cumplida) que se puede combinar con el resultado y la dirección. El resumen se recalcula
 * sobre el subconjunto resultante.
 */

/** { nombreMétrica: 'yes' | 'no' }. Lo que no aparece se ignora. */
let btExplorerMetricState = {};
let btExplorerResults = new Set();
let btExplorerDirections = new Set();

const BT_EXPLORER_RESULTS = [
  ['TP', 'TP'],
  ['SL', 'SL'],
  ['BE', 'BE'],
];
const BT_EXPLORER_DIRECTIONS = [
  ['LONG', 'Compras'],
  ['SHORT', 'Ventas'],
];

function cycleBtExplorerMetric(name) {
  const current = btExplorerMetricState[name];
  if (!current) btExplorerMetricState[name] = 'yes';
  else if (current === 'yes') btExplorerMetricState[name] = 'no';
  else delete btExplorerMetricState[name];
}

function applyBtExplorerFilters(trades) {
  return (trades || []).filter((trade) => {
    const result = String(trade.result || '').toUpperCase();
    if (btExplorerResults.size && !btExplorerResults.has(result)) return false;

    const direction = String(trade.direction || '').toUpperCase();
    if (btExplorerDirections.size && !btExplorerDirections.has(direction)) return false;

    const metrics = parseTradeCustomMetrics(trade);
    return Object.entries(btExplorerMetricState).every(([name, want]) =>
      want === 'yes' ? metrics[name] === true : metrics[name] === false
    );
  });
}

/** Frase que describe el filtro activo, para que el subconjunto no sea ambiguo. */
function describeBtExplorerQuery(matching, total) {
  const parts = [];
  if (btExplorerResults.size) parts.push(`resultado ${[...btExplorerResults].join(' o ')}`);
  if (btExplorerDirections.size) {
    const labels = [...btExplorerDirections].map(
      (d) => BT_EXPLORER_DIRECTIONS.find(([v]) => v === d)?.[1] || d
    );
    parts.push(labels.join(' o ').toLowerCase());
  }
  Object.entries(btExplorerMetricState).forEach(([name, want]) => {
    parts.push(`${want === 'yes' ? 'con' : 'sin'} «${name}»`);
  });

  if (!parts.length) return `Todas las operaciones (${total}). Pulsa los filtros para acotar.`;
  return `${matching} de ${total} operaciones: ${parts.join(', ')}.`;
}

function renderBacktestingMetricExplorer(filtered) {
  const section = document.getElementById('btMetricExplorerSection');
  if (!section) return;

  const metricNames = (cachedBacktestingMetrics || [])
    .filter((m) => m.is_active && m.metric_type === 'checkbox')
    .map((m) => m.name)
    .filter(Boolean);

  // Si se borra una métrica, su filtro deja de tener sentido.
  Object.keys(btExplorerMetricState).forEach((name) => {
    if (!metricNames.includes(name)) delete btExplorerMetricState[name];
  });

  section.hidden = !metricNames.length;
  if (!metricNames.length) return;

  const chip = (label, state, attr) => {
    const mark = state === 'yes' ? '✓ ' : state === 'no' ? '✕ ' : '';
    const cls = state === 'yes' ? 'chip-on' : state === 'no' ? 'chip-off' : '';
    return `<button type="button" class="bt-explorer-chip ${cls}" ${attr}>${mark}${escapeHtmlAssetLabel(label)}</button>`;
  };

  const metricsHost = document.getElementById('btExplorerMetrics');
  if (metricsHost) {
    metricsHost.innerHTML = metricNames
      .map((name) =>
        chip(name, btExplorerMetricState[name], `data-metric="${escapeAttrChip(name)}"`)
      )
      .join('');
  }

  const resultsHost = document.getElementById('btExplorerResults');
  if (resultsHost) {
    resultsHost.innerHTML = BT_EXPLORER_RESULTS.map(([value, label]) =>
      chip(label, btExplorerResults.has(value) ? 'yes' : '', `data-result="${value}"`)
    ).join('');
  }

  const dirHost = document.getElementById('btExplorerDirections');
  if (dirHost) {
    dirHost.innerHTML = BT_EXPLORER_DIRECTIONS.map(([value, label]) =>
      chip(label, btExplorerDirections.has(value) ? 'yes' : '', `data-direction="${value}"`)
    ).join('');
  }

  const pool = filtered || [];
  const subset = applyBtExplorerFilters(pool);
  const stats = summarizeBacktestingSubset(subset);

  const queryEl = document.getElementById('btExplorerQuery');
  if (queryEl) queryEl.textContent = describeBtExplorerQuery(subset.length, pool.length);

  const money = (v) => `${v >= 0 ? '+' : ''}${Number(v || 0).toFixed(2)}€`;
  const tone = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : '');
  const share = pool.length ? (subset.length / pool.length) * 100 : 0;

  const kpis = [
    ['Operaciones', String(stats.n), ''],
    ['% del total', `${share.toFixed(1)}%`, ''],
    ['Acierto', stats.winrate == null ? '—' : `${stats.winrate.toFixed(1)}%`, ''],
    ['PnL', money(stats.pnl), tone(stats.pnl)],
    ['R acumulada', `${stats.sumR >= 0 ? '+' : ''}${stats.sumR.toFixed(2)}`, tone(stats.sumR)],
    ['PnL medio', stats.n ? money(stats.pnl / stats.n) : '—', tone(stats.pnl)],
  ];

  const kpisHost = document.getElementById('btExplorerKpis');
  if (kpisHost) {
    kpisHost.innerHTML = kpis
      .map(
        ([label, value, cls]) =>
          `<div class="advanced-item"><span>${label}</span><h2 class="${cls}">${value}</h2></div>`
      )
      .join('');
  }

  const body = document.getElementById('btExplorerBody');
  if (body) {
    const rows = [...subset]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 100);
    body.innerHTML = rows.length
      ? rows
          .map((t) => {
            const pnl = getBacktestingTradePnlEuros(t);
            const r = getBacktestingTradeRValue(t);
            const res = String(t.result || '').toUpperCase();
            const dir = String(t.direction || '').toUpperCase() === 'SHORT' ? 'Venta' : 'Compra';
            return `<tr>
              <td>${formatDateEs(t.date)}</td>
              <td>${escapeHtmlAssetLabel(t.asset || '—')}</td>
              <td>${dir}</td>
              <td><span class="bt-result-badge ${res === 'TP' || res === 'SL' ? res.toLowerCase() : 'be'}">${res || '—'}</span></td>
              <td class="${tone(pnl)}">${money(pnl)}</td>
              <td class="${tone(r)}">${r.toFixed(2)}</td>
            </tr>`;
          })
          .join('') +
        (subset.length > 100
          ? `<tr><td colspan="6" class="muted">…y ${subset.length - 100} operaciones más</td></tr>`
          : '')
      : '<tr><td colspan="6" class="muted">Ninguna operación cumple estos filtros.</td></tr>';
  }

  if (section.dataset.bound !== 'true') {
    section.dataset.bound = 'true';
    section.addEventListener('click', (event) => {
      const btn = event.target.closest('.bt-explorer-chip');
      const reset = event.target.closest('#btExplorerReset');
      if (reset) {
        btExplorerMetricState = {};
        btExplorerResults.clear();
        btExplorerDirections.clear();
      } else if (btn?.dataset.metric) {
        cycleBtExplorerMetric(btn.dataset.metric);
      } else if (btn?.dataset.result) {
        const v = btn.dataset.result;
        btExplorerResults.has(v) ? btExplorerResults.delete(v) : btExplorerResults.add(v);
      } else if (btn?.dataset.direction) {
        const v = btn.dataset.direction;
        btExplorerDirections.has(v) ? btExplorerDirections.delete(v) : btExplorerDirections.add(v);
      } else {
        return;
      }
      renderBacktestingMetricExplorer(getBacktestingTradesForMetrics());
    });
  }
}

function renderBacktestingMetricAnalysis(filtered) {
  const tbody = document.getElementById('btMetricAnalysisBody');
  if (!tbody) return;
  const checkboxes = (cachedBacktestingMetrics || []).filter((m) => m.is_active && m.metric_type === 'checkbox');
  tbody.innerHTML = '';
  if (!checkboxes.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" class="muted">No hay métricas checkbox activas. Configúralas en Config. Backtesting.</td>`;
    tbody.appendChild(tr);
    return;
  }
  const money = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}€`;
  const wr = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
  const cell = (s) =>
    s.n
      ? `<strong>${money(s.pnl)}</strong><span class="bt-metric-sub">${s.n} ops · ${wr(s.winrate)} acierto</span>`
      : '<span class="muted">—</span>';

  checkboxes.forEach((m) => {
    const a = analyzeCheckboxMetric(filtered, m.name);
    const tr = document.createElement('tr');

    // Métrica recién creada (o nunca marcada): decirlo explícitamente en vez de mostrar ceros,
    // que parecerían un mal resultado cuando en realidad es falta de datos.
    if (!a.evaluated) {
      tr.innerHTML = `
        <td>${escapeHtmlAssetLabel(m.name)}</td>
        <td colspan="3" class="muted">Aún sin datos: márcala al registrar o editar tus operaciones y aparecerá aquí.</td>`;
      tbody.appendChild(tr);
      return;
    }

    let verdict = '<span class="muted">Pocos datos</span>';
    if (a.yes.n && a.no.n) {
      const diff = a.yes.pnl - a.no.pnl;
      verdict =
        diff > 0
          ? `<span class="bt-metric-verdict good">Mejor cumpliéndola (${money(diff)})</span>`
          : diff < 0
            ? `<span class="bt-metric-verdict bad">Peor cumpliéndola (${money(diff)})</span>`
            : '<span class="muted">Sin diferencia</span>';
    } else if (a.yes.n && !a.no.n) {
      verdict = '<span class="muted">Sin casos sin marcar para comparar</span>';
    } else if (!a.yes.n && a.no.n) {
      verdict = '<span class="muted">Nunca la has marcado</span>';
    }

    tr.innerHTML = `
      <td>${escapeHtmlAssetLabel(m.name)}</td>
      <td class="bt-metric-cell">${cell(a.yes)}</td>
      <td class="bt-metric-cell">${cell(a.no)}</td>
      <td>${verdict}</td>`;
    tbody.appendChild(tr);
  });
}

function renderBacktestingWeek(daysArray, year, month, tradePool) {
  const container = document.getElementById('backtestingCalendarGrid');
  if (!container) return;

  const maxDaySlots = 5;
  const row = document.createElement('div');
  row.className = 'calendar-row';

  const padded = [...daysArray];
  while (padded.length < maxDaySlots) padded.push(null);
  const slotDays = padded.slice(0, maxDaySlots);

  let weeklyPnL = 0;
  let weeklyTrades = 0;

  slotDays.forEach((day) => {
    const cell = document.createElement('div');

    if (!day) {
      cell.className = 'day-cell day-empty day-outside empty';
      row.appendChild(cell);
      return;
    }

    const dateStr = toDateKey(year, month, day);
    const isLocked = !isDateInsideBacktestingSessionRange(dateStr);
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    const dayTrades = (Array.isArray(tradePool) ? tradePool : []).filter(
      (trade) => (trade.date || '').slice(0, 10) === dateStr
    );
    const pnl = dayTrades.reduce((sum, trade) => sum + getBacktestingTradePnlEuros(trade), 0);
    const rSum = dayTrades.reduce((sum, trade) => sum + getBacktestingTradeRValue(trade), 0);
    weeklyPnL += pnl;
    weeklyTrades += dayTrades.length;

    if (isLocked) {
      cell.className = 'day-cell bt-date-locked';
      if (isToday) cell.classList.add('day-today');

      cell.innerHTML = `
        <span class="bt-locked-watermark" aria-hidden="true">Fuera de rango</span>
        <span class="day-number">${day}</span>
      `;

      cell.dataset.date = dateStr;

      cell.addEventListener('click', () => {
        showToast('Este día está fuera del rango de la sesión', 'warning');
      });

      row.appendChild(cell);
      return;
    }

    cell.className = 'day-cell';

    cell.innerHTML = `
      <span class="day-number">${day}</span>
      <div class="day-content">
        <span class="trade-count"></span>
        <span class="day-pnl"></span>
        <span class="day-r"></span>
      </div>
    `;

    const countEl = cell.querySelector('.trade-count');
    const pnlEl = cell.querySelector('.day-pnl');
    const rEl = cell.querySelector('.day-r');
    if (countEl) countEl.textContent = dayTrades.length > 0 ? String(dayTrades.length) : '';
    if (pnlEl) pnlEl.textContent = dayTrades.length > 0 ? pnl.toFixed(1) : '';
    if (rEl) rEl.textContent = dayTrades.length > 0 ? `${rSum >= 0 ? '+' : ''}${rSum.toFixed(1)}` : '';

    if (dayTrades.length > 0) {
      cell.classList.add('has-trades');
      if (pnl > 0) {
        cell.classList.add('day-profit', 'positive');
        const intensity = Math.min(Math.abs(pnl) / 500, 1);
        cell.style.background = `rgba(34,197,94,${Math.max(intensity, 0.15)})`;
      } else if (pnl < 0) {
        cell.classList.add('day-loss', 'negative');
        const intensity = Math.min(Math.abs(pnl) / 500, 1);
        cell.style.background = `rgba(239,68,68,${Math.max(intensity, 0.15)})`;
      } else {
        cell.classList.add('day-neutral');
      }
    }

    if (isToday) {
      cell.classList.add('day-today');
    }
    if (selectedBacktestingDate && dateStr === selectedBacktestingDate) {
      cell.classList.add('selected');
    }

    cell.dataset.date = dateStr;

    cell.addEventListener('click', () => {
      // Pulsar un día ya deja «Nueva operación» apuntando a esa fecha: es el flujo normal de
      // backtesting (voy día a día) y evita tener que abrir el datepicker en cada trade.
      setBacktestingWorkDate(dateStr);
      renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
      renderBacktestingDayTrades();
    });

    row.appendChild(cell);
  });

  const summary = document.createElement('div');
  summary.className = 'week-summary';
  const summaryClass = weeklyPnL > 0 ? 'summary-positive' : weeklyPnL < 0 ? 'summary-negative' : 'summary-neutral';
  summary.innerHTML = `
    <span>${weeklyTrades}</span>
    <strong class="${summaryClass}">${weeklyPnL.toFixed(1)}</strong>
  `;
  row.appendChild(summary);
  container.appendChild(row);
}

function renderBacktestingCalendar(year, month) {
  const header = document.getElementById('backtestingCalendarHeader');
  const grid = document.getElementById('backtestingCalendarGrid');
  const label = document.getElementById('backtestingMonthLabel');
  const monthPnlEl = document.getElementById('backtestingMonthPnl');
  const monthTradesEl = document.getElementById('backtestingMonthTrades');
  if (!header || !grid || !label) return;

  const tradePool = getFilteredBacktestingTrades();

  const grouped = {};
  for (const tr of tradePool) {
    const key = (tr.date || '').slice(0, 10);
    if (!key) continue;
    if (!grouped[key]) grouped[key] = { trades: [], totalPnL: 0, totalR: 0 };
    grouped[key].trades.push(tr);
    grouped[key].totalPnL += getBacktestingTradePnlEuros(tr);
    grouped[key].totalR += getBacktestingTradeRValue(tr);
  }

  let monthPnl = 0;
  let monthTrades = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(year, month, day);
    const info = grouped[key];
    if (info) {
      monthPnl += info.totalPnL;
      monthTrades += info.trades.length;
    }
  }
  if (monthPnlEl) monthPnlEl.textContent = `${monthPnl > 0 ? '+' : ''}${monthPnl.toFixed(2)}€`;
  if (monthTradesEl) monthTradesEl.textContent = String(monthTrades);
  label.textContent = formatCalendarTitle(year, month);

  header.innerHTML = '';
  const weekDays = getCalendarWeekdayLabels(false);
  weekDays.forEach((dayName) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-header-day';
    dayHeader.textContent = dayName;
    header.appendChild(dayHeader);
  });
  const summaryHeader = document.createElement('div');
  summaryHeader.className = 'calendar-header-day';
  summaryHeader.textContent = t('week_summary');
  header.appendChild(summaryHeader);

  grid.innerHTML = '';

  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day);
    const dayOfWeek = (dateObj.getDay() + 6) % 7;
    if (dayOfWeek === 5 || dayOfWeek === 6) continue;
    cells.push(day);
  }
  const colsPerRow = 5;
  const rows = [];
  for (let i = 0; i < cells.length; i += colsPerRow) {
    rows.push(cells.slice(i, i + colsPerRow));
  }
  rows.forEach((weekDaysChunk) => {
    const chunk = [...weekDaysChunk];
    while (chunk.length < 5) chunk.push(null);
    renderBacktestingWeek(chunk.slice(0, 5), year, month, tradePool);
  });

  updateBacktestingLastTradeHint();
  void refreshLucideIcons();
}

/**
 * Fija la fecha de trabajo del backtesting: marca el día en el calendario y lo escribe en
 * «Nueva operación». El datepicker propio solo refresca su etiqueta visible al recibir el
 * evento 'change' del input nativo, por eso no basta con asignar .value.
 */
function setBacktestingWorkDate(dateKey, { navigateMonth = false } = {}) {
  const key = String(dateKey || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  selectedBacktestingDate = key;
  const input = document.getElementById('btDate');
  if (input) {
    input.value = key;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  if (navigateMonth) {
    const d = new Date(`${key}T12:00:00`);
    if (!Number.isNaN(+d)) {
      backtestingCurrentYear = d.getFullYear();
      backtestingCurrentMonth = d.getMonth();
    }
  }
  return true;
}

/**
 * Fecha (YYYY-MM-DD) de la operación de backtesting más reciente. Con sessionId se limita a esa
 * sesión; sin él usa el mismo pool que pinta el calendario (respeta el filtro de sesiones).
 * Las fechas son ISO, así que comparar strings ya es comparar cronológicamente.
 */
function getLastBacktestingTradeDate(sessionId = null) {
  const sid = Number(sessionId);
  const pool =
    Number.isFinite(sid) && sid > 0
      ? (cachedBacktestingTrades || []).filter((t) => Number(t?.session_id) === sid)
      : getFilteredBacktestingTrades();
  let last = '';
  (pool || []).forEach((trade) => {
    const key = String(trade?.date || '').slice(0, 10);
    if (key && key > last) last = key;
  });
  return last || null;
}

/** Botón «Último trade»: retomar un backtest a medias sin ir mes a mes con las flechas. */
function goToLastBacktestingTrade() {
  const key = getLastBacktestingTradeDate();
  if (!key) {
    showToast('Todavía no hay ninguna operación registrada', 'info');
    return;
  }
  setBacktestingWorkDate(key, { navigateMonth: true });
  renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
  renderBacktestingDayTrades();
}

function goToBacktestingToday() {
  setBacktestingWorkDate(getTodayDateString(), { navigateMonth: true });
  renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
  renderBacktestingDayTrades();
}

/** Pista bajo el calendario: en qué día quedó el último trade (y deshabilita el botón si no hay). */
function updateBacktestingLastTradeHint() {
  const key = getLastBacktestingTradeDate();
  const btn = document.getElementById('backtestingGoLastTrade');
  const hint = document.getElementById('backtestingLastTradeHint');
  if (btn) btn.disabled = !key;
  if (hint) hint.textContent = key ? `Último trade: ${formatDateEs(key)}` : '';
}

function prevBacktestingMonth() {
  backtestingCurrentMonth -= 1;
  if (backtestingCurrentMonth < 0) {
    backtestingCurrentMonth = 11;
    backtestingCurrentYear -= 1;
  }
  renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
}

function nextBacktestingMonth() {
  backtestingCurrentMonth += 1;
  if (backtestingCurrentMonth > 11) {
    backtestingCurrentMonth = 0;
    backtestingCurrentYear += 1;
  }
  renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
}

function setValueIfExists(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = value !== undefined && value !== null ? String(value) : '';
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Carga una operación de backtesting en el formulario (misma zona que «Nueva operación»). */
function openBacktestingTradeEditor(trade) {
  if (!trade) return;

  const idNum = Number(trade.id);
  editingBacktestingTradeId = Number.isFinite(idNum) && idNum > 0 ? idNum : trade.id;

  const hid = document.getElementById('btEditId');
  if (hid) hid.value = String(editingBacktestingTradeId);

  setValueIfExists('btDate', (trade.date || '').slice(0, 10));
  setValueIfExists('btEntryTime', trade.entry_time || trade.entryTime || '');
  setValueIfExists('btExitTime', trade.exit_time || trade.exitTime || '');

  ensureSelectHasValue(document.getElementById('btStrategy'), trade.strategy || '');
  ensureSelectHasValue(document.getElementById('btSession'), trade.session || '');

  setValueIfExists('btDirection', trade.direction || 'LONG');
  setValueIfExists('btResult', trade.result || 'BE');
  setValueIfExists('btBeAfterResult', sanitizeBeAfterResult(trade.be_after_result) || '');
  setValueIfExists('btEntry', trade.entry_price != null ? String(trade.entry_price) : '');
  setValueIfExists('btSl', trade.stop_loss != null ? String(trade.stop_loss) : '');
  setValueIfExists('btTp', trade.take_profit != null ? String(trade.take_profit) : '');
  const cm = parseTradeCustomMetrics(trade);
  const riskVal =
    trade.risk_eur != null && trade.risk_eur !== '' ? trade.risk_eur : cm.risk_eur != null ? cm.risk_eur : '';
  setValueIfExists('btRisk', riskVal !== '' && riskVal != null ? String(riskVal) : '');
  setValueIfExists('btRrPlanned', trade.rr_planned != null ? String(trade.rr_planned) : '');

  const pm = document.getElementById('btPnlMode');
  const sm = document.getElementById('btSlMode');
  const tm = document.getElementById('btTpMode');
  if (pm) pm.value = 'money';
  if (sm) sm.value = 'price';
  if (tm) tm.value = 'price';

  const pnlInput = document.getElementById('btPnl');
  if (pnlInput) pnlInput.value = String(getBacktestingTradePnlEuros(trade));
  setValueIfExists('btNotes', trade.notes || '');

  renderBacktestingCustomMetricFields(cm);
  btBeforeImagePath = trade.image_before || '';
  btAfterImagePath = trade.image_after || '';
  void updateImagePreview('btBeforeImagePreview', 'openBtBeforeImageBtn', btBeforeImagePath);
  void updateImagePreview('btAfterImagePreview', 'openBtAfterImageBtn', btAfterImagePath);
  updateBacktestingTradeScheduleHints();

  backtestingAssetComboboxState?.rebuildFromSettings?.();
  const av = trade.asset || '';
  if (av) {
    ensureSelectHasValue(document.getElementById('btAsset'), av);
    const lab = document.getElementById('btAssetComboLabel');
    if (lab) lab.textContent = av;
    document.getElementById('btAsset')?.dispatchEvent(new Event('change', { bubbles: true }));
    if (backtestingAssetComboboxState) {
      backtestingAssetComboboxState.selectedValue = av;
      backtestingAssetComboboxState.value = av;
      if (typeof backtestingAssetComboboxState.setValue === 'function') {
        backtestingAssetComboboxState.setValue(av);
      }
    }
  }

  const saveBtn = document.getElementById('btSaveBacktest');
  if (saveBtn) saveBtn.textContent = t('bt_update_operation', 'Guardar cambios');

  refreshBacktestingCustomSelect(document.getElementById('btStrategy'));
  refreshBacktestingCustomSelect(document.getElementById('btSession'));
  refreshBacktestingCustomSelect(document.getElementById('btResult'));

  if (editingBacktestingTradeId) {
    btManagementCollapsed = false;
    btResultCollapsed = false;
  } else {
    btManagementCollapsed = true;
    btResultCollapsed = false;
  }

  refreshBacktestingFormUiWidgets();
  syncBacktestingPnlFromResult();
  updateBacktestingPnlConversionHint();
  updateBacktestingDerivedRFields();

  document.querySelector('#backtestingView .bt-operation-form-card')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function bindBacktestingDayTradeEditHandlers() {
  document.querySelectorAll('#backtestingView .bt-day-trade-edit').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const raw = btn.getAttribute('data-id');
      const idNum = Number(raw);
      const trade =
        cachedBacktestingTrades.find((t) => Number(t.id) === idNum) ||
        cachedBacktestingTrades.find((t) => String(t.id) === String(raw));
      if (!trade) {
        showToast('No se encontró la operación', 'error');
        return;
      }
      openBacktestingTradeEditor(trade);
    });
  });
}

function renderBacktestingDayTrades() {
  const wrap = document.getElementById('backtestingDayTrades');
  const lbl = document.getElementById('backtestingSelectedDateLabel');
  if (!wrap) return;
  const pool = getFilteredBacktestingTrades();
  const dateStr = selectedBacktestingDate;
  if (!dateStr) {
    if (lbl) lbl.textContent = 'Selecciona un día en el calendario';
    wrap.innerHTML = '';
    return;
  }
  if (lbl) lbl.textContent = formatDateEs(dateStr);
  const dayTrades = pool.filter((t) => (t.date || '').slice(0, 10) === dateStr);
  wrap.innerHTML = '';
  if (!dayTrades.length) {
    wrap.innerHTML = '<p class="muted-label">Sin operaciones este día.</p>';
    return;
  }
  dayTrades.forEach((tr) => {
    const pnl = getBacktestingTradePnlEuros(tr);
    const pnlToneClass = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : '';

    const resUp = String(tr.result || '').toUpperCase();
    const badgeTone = resUp === 'TP' || resUp === 'SL' ? resUp.toLowerCase() : 'be';
    const resLabel = escapeHtmlAssetLabel(tr.result || '—');

    const card = document.createElement('div');
    card.className = 'bt-day-trade-card';
    card.dataset.id = String(tr.id);
    card.innerHTML = `
  <div class="bt-day-trade-main">
    <div>
      <div class="bt-day-trade-title">
        ${escapeHtmlAssetLabel(tr.asset || '—')}
        <span class="bt-result-badge ${badgeTone}">${resLabel}</span>
      </div>
      <div class="bt-day-trade-meta">
        ${escapeHtmlAssetLabel(tr.strategy || 'Sin estrategia')} · ${escapeHtmlAssetLabel(String(tr.direction || '—'))}
      </div>
    </div>
    <div class="bt-day-trade-pnl ${pnlToneClass}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}€</div>
  </div>
  <div class="bt-day-trade-actions">
    <button type="button" class="bt-day-trade-edit" data-id="${escapeAttrChip(String(tr.id))}">
      Editar
    </button>
    <button type="button" class="bt-day-trade-delete" data-id="${escapeAttrChip(String(tr.id))}">
      Eliminar
    </button>
  </div>`;
    wrap.appendChild(card);
  });
  bindBacktestingDayTradeEditHandlers();
  bindBacktestingDayTradeDeleteHandlers();
  bindBacktestingDayTradeDetailHandlers();
  void refreshLucideIcons();
}

/**
 * Ficha de solo lectura de una operación de backtesting, con sus capturas.
 *
 * Se abre pulsando la tarjeta del día: consultar un trade es lo que más se hace mientras se
 * testea, y hasta ahora obligaba a entrar en el formulario de edición (con el riesgo de tocar
 * algo sin querer) y ni siquiera enseñaba las imágenes.
 */
function openBacktestingTradeDetail(trade) {
  if (!trade) return;

  let overlay = document.getElementById('btTradeDetailOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'btTradeDetailOverlay';
    overlay.className = 'modal-overlay app-modal-overlay bt-detail-overlay';
    overlay.innerHTML = `
      <div class="modal app-modal bt-detail-modal">
        <div class="modal-header">
          <h2 id="btDetailTitle">Detalle de la operación</h2>
          <button type="button" class="modal-close" id="btDetailClose" aria-label="Cerrar">✕</button>
        </div>
        <div class="pro-modal-scroll" id="btDetailBody"></div>
        <div class="pro-modal-footer">
          <button type="button" class="button button-cancel" id="btDetailEdit">Editar</button>
          <button type="button" class="button button-save" id="btDetailCloseFooter">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('active');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById('btDetailClose')?.addEventListener('click', close);
    document.getElementById('btDetailCloseFooter')?.addEventListener('click', close);
  }

  const pnl = getBacktestingTradePnlEuros(trade);
  const resUp = String(trade.result || '').toUpperCase();
  const badgeTone = resUp === 'TP' || resUp === 'SL' ? resUp.toLowerCase() : 'be';
  const dirLabel = { LONG: 'Compra (Long)', SHORT: 'Venta (Short)' }[String(trade.direction || '').toUpperCase()] || '—';
  const sessionName =
    (cachedBacktestingSessions || []).find((s) => String(s.id) === String(trade.session_id))?.name || '—';

  const val = (v) => (v === 0 || v ? escapeHtmlAssetLabel(String(v)) : '—');
  const money = (v) => `${Number(v) >= 0 ? '+' : ''}${Number(v || 0).toFixed(2)}€`;
  const priceOrDash = (v) => (Number(v) ? String(v) : '—');

  const rows = [
    ['Fecha', formatDateEs(trade.date)],
    ['Sesión', val(sessionName)],
    ['Activo', val(trade.asset)],
    ['Estrategia', val(trade.strategy)],
    ['Dirección', dirLabel],
    ['Hora entrada', val(trade.entry_time)],
    ['Hora salida', val(trade.exit_time)],
    ['Precio entrada', priceOrDash(trade.entry_price)],
    ['Stop loss', priceOrDash(trade.stop_loss)],
    ['Take profit', priceOrDash(trade.take_profit)],
    ['RR previsto', Number(trade.rr_planned) ? Number(trade.rr_planned).toFixed(2) : '—'],
    ['R obtenida', Number(trade.rr_result) ? Number(trade.rr_result).toFixed(2) : '—'],
    ['Riesgo', Number(trade.risk_eur) ? `${Number(trade.risk_eur).toFixed(2)}€` : '—'],
  ];

  // Las métricas guardan todas las claves (true/false), menos las internas como risk_eur.
  const metrics = Object.entries(trade.custom_metrics || {}).filter(([k]) => k !== 'risk_eur');
  const metricsHtml = metrics.length
    ? `<div class="bt-detail-block">
         <h4>Métricas</h4>
         <ul class="bt-detail-metrics">
           ${metrics
             .map(
               ([name, value]) =>
                 `<li class="${value ? 'ok' : 'no'}"><span>${value ? '✓' : '✕'}</span>${escapeHtmlAssetLabel(name)}</li>`
             )
             .join('')}
         </ul>
       </div>`
    : '';

  const notesHtml = trade.notes
    ? `<div class="bt-detail-block"><h4>Notas</h4><p class="bt-detail-notes">${escapeHtmlAssetLabel(trade.notes)}</p></div>`
    : '';

  const body = document.getElementById('btDetailBody');
  if (body) {
    body.innerHTML = `
      <div class="bt-detail-head">
        <div>
          <div class="bt-detail-asset">
            ${escapeHtmlAssetLabel(trade.asset || '—')}
            <span class="bt-result-badge ${badgeTone}">${escapeHtmlAssetLabel(trade.result || '—')}</span>
          </div>
          <div class="bt-detail-sub">${escapeHtmlAssetLabel(trade.strategy || 'Sin estrategia')} · ${dirLabel}</div>
        </div>
        <div class="bt-detail-pnl ${pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''}">${money(pnl)}</div>
      </div>
      <dl class="bt-detail-grid">
        ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}
      </dl>
      ${metricsHtml}
      ${notesHtml}
      <div class="bt-detail-block bt-detail-images" id="btDetailImages" hidden>
        <h4>Capturas</h4>
        <div class="bt-detail-images-grid">
          <figure hidden id="btDetailBeforeFig"><figcaption>Antes</figcaption><img id="btDetailBefore" alt="Imagen antes" /></figure>
          <figure hidden id="btDetailAfterFig"><figcaption>Después</figcaption><img id="btDetailAfter" alt="Imagen después" /></figure>
        </div>
      </div>`;
  }

  // Las imágenes pueden estar en Supabase Storage: resolver la URL es asíncrono, así que la
  // ficha se muestra ya y las capturas aparecen en cuanto están listas.
  void (async () => {
    const box = document.getElementById('btDetailImages');
    let any = false;
    for (const [path, figId, imgId] of [
      [trade.image_before, 'btDetailBeforeFig', 'btDetailBefore'],
      [trade.image_after, 'btDetailAfterFig', 'btDetailAfter'],
    ]) {
      if (!path) continue;
      const src = await getDisplayImageSrc(path);
      if (!src) continue;
      const fig = document.getElementById(figId);
      const img = document.getElementById(imgId);
      if (!fig || !img) continue;
      img.src = src;
      img.onclick = () => openImageViewer(src);
      fig.hidden = false;
      any = true;
    }
    if (box) box.hidden = !any;
  })();

  const editBtn = document.getElementById('btDetailEdit');
  if (editBtn) {
    editBtn.onclick = () => {
      overlay.classList.remove('active');
      openBacktestingTradeEditor(trade);
    };
  }

  overlay.classList.add('active');
}

/* ======================= Recalcular PnL de operaciones de backtesting =======================
 * El PnL se guarda al crear cada operación. Si luego cambia el RR de la estrategia o el capital
 * de la sesión, lo guardado se queda desfasado. Esto lo pone al día, pero SIEMPRE enseñando
 * antes qué va a cambiar: reescribir PnL sin que el usuario lo vea es inaceptable.
 */
let btRecalcPlan = null;

function openBacktestRecalcModal() {
  const overlay = document.getElementById('btRecalcOverlay');
  if (!overlay) return;

  btRecalcPlan = planBacktestRecalc(
    cachedBacktestingTrades || [],
    getBacktestingStrategies(),
    cachedBacktestingSessions || []
  );

  const money = (v) => `${v >= 0 ? '+' : ''}${Number(v || 0).toFixed(2)}€`;
  const arrow = (from, to, fmt) =>
    from === to
      ? `<span class="muted">${fmt(to)}</span>`
      : `<span class="muted">${fmt(from)}</span> → <strong>${fmt(to)}</strong>`;

  const summary = document.getElementById('btRecalcSummary');
  const body = document.getElementById('btRecalcBody');
  const skipped = document.getElementById('btRecalcSkipped');
  const applyBtn = document.getElementById('btRecalcApply');

  const n = btRecalcPlan.changes.length;
  if (summary) {
    summary.textContent = n
      ? `${n} de ${btRecalcPlan.total} operaciones cambiarían. Revisa la lista antes de aplicar.`
      : `Todas las operaciones (${btRecalcPlan.total}) ya están al día. No hay nada que cambiar.`;
    summary.className = n ? 'form-hint' : 'form-hint success';
  }
  if (applyBtn) applyBtn.disabled = !n;

  if (body) {
    body.innerHTML = n
      ? btRecalcPlan.changes
          .map(
            (c) => `<tr>
              <td>${formatDateEs(c.date)}</td>
              <td>${escapeHtmlAssetLabel(c.asset || '—')}</td>
              <td>${escapeHtmlAssetLabel(c.strategy)}</td>
              <td>${c.result}</td>
              <td>${money(c.risk)}</td>
              <td>${arrow(c.from.pnl, c.to.pnl, money)}</td>
              <td>${arrow(c.from.r, c.to.r, (v) => Number(v).toFixed(2))}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="7" class="muted">Nada que recalcular.</td></tr>';
  }

  if (skipped) {
    // Las que no se pueden recalcular se listan aparte: si no, parecería que se han ignorado.
    skipped.innerHTML = btRecalcPlan.skipped.length
      ? `<p class="muted small" style="margin-top:12px">
           ${btRecalcPlan.skipped.length} operaciones no se pueden recalcular y se dejarán tal cual:
           ${[...new Set(btRecalcPlan.skipped.map((s) => s.reason))].map(escapeHtmlAssetLabel).join(' · ')}
         </p>`
      : '';
  }

  overlay.classList.add('active');

  if (overlay.dataset.bound !== 'true') {
    overlay.dataset.bound = 'true';
    const close = () => overlay.classList.remove('active');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById('btRecalcClose')?.addEventListener('click', close);
    document.getElementById('btRecalcCancel')?.addEventListener('click', close);
    document.getElementById('btRecalcApply')?.addEventListener('click', () => void applyBacktestRecalc());
  }
}

async function applyBacktestRecalc() {
  const backend = getBackendApi();
  const applyBtn = document.getElementById('btRecalcApply');
  if (!backend?.updateBacktestTrade || !btRecalcPlan?.changes?.length) return;

  const ok = await showConfirmModal({
    title: 'Aplicar recálculo',
    message: `Se actualizarán ${btRecalcPlan.changes.length} operaciones. Solo cambian el PnL y la R; el resto de datos no se toca. ¿Continuar?`,
    confirmText: 'Aplicar',
    cancelText: 'Cancelar',
  });
  if (!ok) return;

  if (applyBtn) applyBtn.disabled = true;
  let done = 0;
  let failed = 0;

  for (const change of btRecalcPlan.changes) {
    const trade = (cachedBacktestingTrades || []).find((t) => String(t.id) === String(change.id));
    if (!trade) {
      failed += 1;
      continue;
    }
    // Se reenvía el trade completo con los dos campos corregidos, para no perder nada de lo demás.
    const res = await backend.updateBacktestTrade({
      ...trade,
      pnl: change.to.pnl,
      rr_result: change.to.r,
    });
    if (res?.success) done += 1;
    else failed += 1;
  }

  document.getElementById('btRecalcOverlay')?.classList.remove('active');
  showToast(
    failed
      ? `Recalculadas ${done} operaciones, ${failed} fallaron`
      : `Recalculadas ${done} operaciones`,
    failed ? 'warning' : 'success'
  );

  const reloaded = await backend.getBacktestTrades();
  cachedBacktestingTrades = Array.isArray(reloaded) ? reloaded : [];
  rerenderBacktestingLocal();
  if (applyBtn) applyBtn.disabled = false;
}

/* ==================== Compartir resultados de backtesting por enlace ==================== */

/**
 * La dirección del visor viaja dentro del build (SHARE_VIEWER_URL), así que el cliente no
 * configura nada: genera el enlace y listo. Esta anulación por localStorage existe solo para
 * poder apuntar a otro visor en pruebas sin recompilar.
 */
const getShareViewerUrl = () => (localStorage.getItem('backtest_share_viewer_url') || '').trim();

/** Nombres de las métricas checkbox activas, que son las que el visor puede analizar. */
function getShareableBacktestingMetricNames() {
  return (cachedBacktestingMetrics || [])
    .filter((m) => m.is_active && m.metric_type === 'checkbox')
    .map((m) => m.name)
    .filter(Boolean);
}

function buildBacktestSharePayload() {
  const trades = getFilteredBacktestingTrades();
  const visibleSessionIds = new Set(trades.map((t) => String(t.session_id)));
  const sessions = (cachedBacktestingSessions || []).filter(
    (s) => selectedBacktestingSessionIds.includes('all') || visibleSessionIds.has(String(s.id))
  );

  const dates = trades.map((t) => String(t.date || '').slice(0, 10)).filter(Boolean).sort();
  const range = dates.length ? `${formatDateEs(dates[0])} – ${formatDateEs(dates[dates.length - 1])}` : '';

  const title = sessions.length === 1 ? sessions[0].name : 'Resultados de backtesting';
  // El capital solo tiene sentido para calcular rentabilidad si hay una única sesión.
  const capital = sessions.length === 1 ? Number(sessions[0].account_capital || 0) : 0;

  return { title, trades, sessions, metrics: getShareableBacktestingMetricNames(), capital, range };
}

async function openBacktestShareModal() {
  let overlay = document.getElementById('btShareOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'btShareOverlay';
    overlay.className = 'modal-overlay app-modal-overlay';
    overlay.innerHTML = `
      <div class="modal app-modal bt-share-modal">
        <div class="modal-header">
          <h2>Compartir resultados</h2>
          <button type="button" class="modal-close" id="btShareClose" aria-label="Cerrar">✕</button>
        </div>
        <div class="pro-modal-scroll">
          <p class="muted small" id="btShareSummary"></p>

          <div class="field" style="margin-top:14px">
            <label for="btShareMaxDevices">Dispositivos que podrán abrirlo</label>
            <select id="btShareMaxDevices" class="input">
              <option value="1">1 dispositivo</option>
              <option value="3" selected>3 dispositivos</option>
              <option value="5">5 dispositivos</option>
              <option value="10">10 dispositivos</option>
              <option value="25">25 dispositivos</option>
            </select>
            <p class="muted small" style="margin-top:6px">
              Se cuenta cada navegador distinto que abra el enlace. Al alcanzar el límite, los
              nuevos dispositivos ya no podrán entrar. Borrar los datos del navegador cuenta
              como un dispositivo nuevo.
            </p>
          </div>

          <button type="button" class="button button-save" id="btShareGenerate" style="width:100%;margin-top:6px">
            Generar enlace y contraseña
          </button>
          <p class="form-hint" id="btShareMsg"></p>

          <div id="btShareResult" hidden>
            <div class="bt-share-field">
              <label>Enlace</label>
              <div class="bt-share-copy">
                <input type="text" id="btShareUrl" readonly />
                <button type="button" class="button button-cancel" data-copy="btShareUrl">Copiar</button>
              </div>
            </div>
            <div class="bt-share-field">
              <label>Contraseña</label>
              <div class="bt-share-copy">
                <input type="text" id="btSharePassword" readonly class="bt-share-password" />
                <button type="button" class="button button-cancel" data-copy="btSharePassword">Copiar</button>
              </div>
              <p class="muted small">Guárdala ahora: no se almacena en claro y no se puede volver a consultar.</p>
            </div>
          </div>

          <div class="bt-share-links">
            <h4>Enlaces generados</h4>
            <div id="btShareList"></div>
          </div>
        </div>
        <div class="pro-modal-footer">
          <button type="button" class="button button-cancel" id="btShareCloseFooter">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('active');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById('btShareClose')?.addEventListener('click', close);
    document.getElementById('btShareCloseFooter')?.addEventListener('click', close);
    document.getElementById('btShareGenerate')?.addEventListener('click', generateBacktestShareLink);

    // El modal se crea después de que initCustomSelects() haya recorrido la página, así que su
    // <select> se quedaba con el desplegable nativo de Windows, sin tematizar. Hay que envolverlo
    // a mano al construirlo.
    initCustomSelects(overlay);

    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-copy]');
      if (!btn) return;
      const input = document.getElementById(btn.dataset.copy);
      if (!input?.value) return;
      void navigator.clipboard.writeText(input.value).then(() => showToast('Copiado', 'success'));
    });
  }

  const payload = buildBacktestSharePayload();
  const summary = document.getElementById('btShareSummary');
  if (summary) {
    // El backtesting no tiene filtro de fechas: siempre se comparte el rango completo testeado.
    // Se muestra ese rango solo como información, no como un filtro aplicado.
    summary.textContent = payload.trades.length
      ? `Se compartirán las ${payload.trades.length} operaciones del rango completo${payload.range ? `, del ${payload.range}` : ''}. El enlace se mantiene al día solo: quien lo abra verá lo que haya en ese momento, siempre en modo lectura.`
      : 'No hay operaciones que compartir.';
  }
  document.getElementById('btShareResult').hidden = true;
  document.getElementById('btShareMsg').textContent = '';

  overlay.classList.add('active');
  void refreshBacktestShareList();
}

async function generateBacktestShareLink() {
  const backend = getBackendApi();
  const msg = document.getElementById('btShareMsg');
  const btn = document.getElementById('btShareGenerate');
  if (!backend?.createBacktestShareLink) return;

  const payload = buildBacktestSharePayload();
  if (!payload.trades.length) {
    if (msg) {
      msg.textContent = 'No hay operaciones que compartir con los filtros actuales.';
      msg.className = 'form-hint error';
    }
    return;
  }

  btn.disabled = true;
  if (msg) {
    msg.textContent = 'Generando enlace...';
    msg.className = 'form-hint';
  }

  try {
    const result = await backend.createBacktestShareLink({
      ...payload,
      maxDevices: Number(document.getElementById('btShareMaxDevices')?.value) || 3,
      viewerBaseUrl: getShareViewerUrl(),
    });

    if (!result?.success) {
      if (msg) {
        msg.textContent =
          typeof result?.error === 'string' ? result.error : 'No se pudo generar el enlace.';
        msg.className = 'form-hint error';
      }
      return;
    }

    document.getElementById('btShareUrl').value = result.data.url;
    document.getElementById('btSharePassword').value = result.data.password;
    document.getElementById('btShareResult').hidden = false;
    if (msg) {
      const gotUrl = Boolean(result.data.url);
      msg.textContent = gotUrl
        ? `Enlace listo${result.data.images ? ` (${result.data.images} capturas incluidas)` : ''}. Envía el enlace y la contraseña por separado.`
        : 'Informe creado, pero esta versión no tiene configurada la página del visor.';
      msg.className = gotUrl ? 'form-hint success' : 'form-hint error';
    }
    void refreshBacktestShareList();
  } finally {
    btn.disabled = false;
  }
}

async function refreshBacktestShareList() {
  const host = document.getElementById('btShareList');
  const backend = getBackendApi();
  if (!host || !backend?.listBacktestShareLinks) return;

  const result = await backend.listBacktestShareLinks(getShareViewerUrl());
  const rows = (result?.data || []).filter((r) => !r.revoked);

  if (!rows.length) {
    host.innerHTML = '<p class="muted small">Todavía no has generado ningún enlace.</p>';
    return;
  }

  host.innerHTML = rows
    .map(
      (r) => `
      <div class="bt-share-item">
        <div>
          <strong>${escapeHtmlAssetLabel(r.title || 'Backtesting')}</strong>
          <div class="muted small">
            ${formatDateEs(String(r.created_at).slice(0, 10))} ·
            ${r.opened_count} aperturas · máx. ${r.max_devices} dispositivos
          </div>
        </div>
        <div class="bt-share-item-actions">
          <button type="button" class="button button-cancel" data-share-copy="${escapeAttrChip(r.url)}">Copiar</button>
          <button type="button" class="button button-danger" data-share-revoke="${escapeAttrChip(r.id)}">Revocar</button>
        </div>
      </div>`
    )
    .join('');

  host.querySelectorAll('[data-share-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      void navigator.clipboard
        .writeText(btn.getAttribute('data-share-copy'))
        .then(() => showToast('Enlace copiado', 'success'));
    });
  });

  host.querySelectorAll('[data-share-revoke]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await showConfirmModal({
        title: 'Revocar enlace',
        message: 'Quien tenga el enlace dejará de poder ver los resultados. No se puede deshacer.',
        confirmText: 'Revocar',
        cancelText: 'Cancelar',
        danger: true,
      });
      if (!ok) return;
      const res = await getBackendApi()?.revokeBacktestShareLink?.(btn.getAttribute('data-share-revoke'));
      if (res?.success) {
        showToast('Enlace revocado', 'success');
        void refreshBacktestShareList();
      } else {
        showToast(typeof res?.error === 'string' ? res.error : 'No se pudo revocar', 'error');
      }
    });
  });
}

function bindBacktestingDayTradeDetailHandlers() {
  document.querySelectorAll('#backtestingView .bt-day-trade-card').forEach((card) => {
    if (card.dataset.detailBound === 'true') return;
    card.dataset.detailBound = 'true';
    card.addEventListener('click', (event) => {
      // Editar y Eliminar tienen su propia acción: pulsar la tarjeta solo abre la ficha.
      if (event.target.closest('.bt-day-trade-actions')) return;
      const raw = card.dataset.id;
      const idNum = Number(raw);
      const trade =
        cachedBacktestingTrades.find((t) => Number(t.id) === idNum) ||
        cachedBacktestingTrades.find((t) => String(t.id) === String(raw));
      if (trade) openBacktestingTradeDetail(trade);
    });
  });
}

function bindBacktestingDayTradeDeleteHandlers() {
  document.querySelectorAll('#backtestingView .bt-day-trade-delete').forEach((btn) => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const raw = btn.getAttribute('data-id');
      void deleteBacktestingDayTrade(raw);
    });
  });
}

async function deleteBacktestingDayTrade(rawId) {
  const idNum = Number(rawId);
  const trade =
    cachedBacktestingTrades.find((t) => Number(t.id) === idNum) ||
    cachedBacktestingTrades.find((t) => String(t.id) === String(rawId));
  if (!trade) {
    showToast('No se encontró la operación', 'error');
    return;
  }

  const ok = await showConfirmModal({
    title: 'Eliminar operación',
    message: `¿Eliminar la operación de ${trade.asset || 'este activo'} del ${formatDateEs(trade.date)}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    danger: true
  });
  if (!ok) return;

  const backend = getBackendApi();
  if (!backend?.deleteBacktestTrade) return;

  const result = await backend.deleteBacktestTrade(trade.id);
  if (!result?.success) {
    showToast(
      typeof result?.error === 'string'
        ? result.error
        : result?.error?.message || 'No se pudo eliminar la operación',
      'error'
    );
    return;
  }

  showToast('Operación eliminada', 'success');

  if (Number(editingBacktestingTradeId) === Number(trade.id)) {
    clearBacktestForm();
  }

  const reloaded = await backend.getBacktestTrades();
  cachedBacktestingTrades = Array.isArray(reloaded) ? reloaded : [];
  rerenderBacktestingLocal();
  renderBacktestingSessionCards();
  await refreshBacktestingView({ skipTradeFetch: true });
}

/**
 * Deja seleccionado un valor aunque ya no esté entre las opciones, añadiéndolo si hace falta.
 *
 * Es lo que permite editar registros antiguos cuyo valor ya no se ofrece (una cuenta que se
 * deshabilitó, una estrategia que se borró): sin esto el campo saldría vacío y al guardar el
 * registro perdería ese dato. `suffix` sirve para marcar esas opciones recuperadas.
 */
function ensureSelectHasValue(selectEl, value, suffix = '') {
  if (!selectEl) return;
  if (value == null || value === '') {
    selectEl.value = '';
    return;
  }
  const v = String(value);
  if ([...selectEl.options].some((o) => o.value === v)) {
    selectEl.value = v;
    return;
  }
  const op = document.createElement('option');
  op.value = v;
  op.textContent = v + suffix;
  selectEl.appendChild(op);
  selectEl.value = v;
}

function normalizeBacktestingStrategy(item, defaultRisk = 100, defaultRr = 2) {
  const dr = Number(defaultRisk) || 100;
  const drr = Number(defaultRr) || 2;

  if (typeof item === 'string') {
    const name = String(item).trim();
    if (!name) {
      return {
        id: '',
        name: '',
        risk_value: dr,
        risk_unit: 'eur',
        risk: dr,
        rr: drr,
        notes: '',
        active: true,
        risk_per_trade: dr
      };
    }
    return {
      id: crypto.randomUUID(),
      name,
      risk_value: dr,
      risk_unit: 'eur',
      risk: dr,
      rr: drr,
      notes: '',
      active: true,
      risk_per_trade: dr
    };
  }

  const o = item && typeof item === 'object' ? item : {};
  const ruRaw = o.risk_unit ?? o.riskUnit;
  const riskUnit = ruRaw === 'percent' || ruRaw === '%' ? 'percent' : 'eur';

  const riskValueRaw =
    o.risk_value ??
    o.riskValue ??
    o.risk_per_trade ??
    o.risk ??
    o.risk_eur ??
    o.default_risk ??
    dr;
  const riskValue = Number(riskValueRaw);
  const riskValueSafe = Number.isFinite(riskValue) && riskValue > 0 ? riskValue : dr;

  const rr = Number(o.rr ?? o.default_rr ?? drr) || drr;

  const riskPerTradeStored =
    o.risk_per_trade != null && o.risk_per_trade !== '' && Number.isFinite(Number(o.risk_per_trade))
      ? Number(o.risk_per_trade)
      : riskUnit === 'eur'
        ? riskValueSafe
        : null;

  return {
    id: o.id || crypto.randomUUID(),
    name: String(o.name || '').trim(),
    risk_value: riskValueSafe,
    risk_unit: riskUnit,
    risk: riskValueSafe,
    rr,
    notes: String(o.notes || ''),
    description: String(o.description || o.notes || '').trim(),
    schedule_enabled: Boolean(o.schedule_enabled),
    operating_hours: parseOperatingHours(o.operating_hours ?? []),
    active: o.active !== false,
    risk_per_trade: riskPerTradeStored
  };
}

function syncBtStrategyHoursSectionVisibility() {
  const enabled = Boolean(document.getElementById('btStrategyScheduleEnabled')?.checked);
  const section = document.getElementById('btStrategyHoursSection');
  if (section) section.hidden = !enabled;
  updateBtStrategyHoursEmptyHint();
}

function updateBtStrategyHoursEmptyHint() {
  const hint = document.getElementById('btStrategyHoursEmptyHint');
  const section = document.getElementById('btStrategyHoursSection');
  if (!hint) return;
  if (!section || section.hidden) {
    hint.hidden = true;
    return;
  }
  hint.hidden = collectBtStrategyHoursFromDom().length > 0;
}

function ensureBtStrategyModalScheduleListeners() {
  const sched = document.getElementById('btStrategyScheduleEnabled');
  if (sched && sched.dataset.bound !== 'true') {
    sched.dataset.bound = 'true';
    sched.addEventListener('change', syncBtStrategyHoursSectionVisibility);
  }
  const addBtn = document.getElementById('btAddStrategyHour');
  if (addBtn && addBtn.dataset.bound !== 'true') {
    addBtn.dataset.bound = 'true';
    addBtn.addEventListener('click', () => {
      const next = [...collectBtStrategyHoursFromDom(), { start: '08:00', end: '10:00' }];
      renderBtStrategyHoursList(next);
      updateBtStrategyHoursEmptyHint();
    });
  }
}

function renderBtStrategyHoursList(hours) {
  const list = document.getElementById('btStrategyHoursList');
  if (!list) return;
  const ranges = parseOperatingHours(hours);
  list.innerHTML = '';
  ranges.forEach((range, idx) => {
    const row = document.createElement('div');
    row.className = 'strategy-hour-row';
    row.dataset.index = String(idx);
    row.innerHTML = `
      <input type="time" class="input strategy-hour-start" value="${range.start || ''}" aria-label="Inicio" />
      <span class="strategy-hour-sep">—</span>
      <input type="time" class="input strategy-hour-end" value="${range.end || ''}" aria-label="Fin" />
      <button type="button" class="button button-delete strategy-hour-remove" data-index="${idx}" aria-label="Eliminar">×</button>
    `;
    list.appendChild(row);
  });
  // Selector de hora propio (el nativo de Chromium no se puede tematizar).
  list.querySelectorAll('input[type="time"]').forEach((input) => initTradeTimepicker(input));
  list.querySelectorAll('.strategy-hour-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      const next = parseOperatingHours(collectBtStrategyHoursFromDom());
      next.splice(i, 1);
      renderBtStrategyHoursList(next);
      updateBtStrategyHoursEmptyHint();
    });
  });
  updateBtStrategyHoursEmptyHint();
}

function collectBtStrategyHoursFromDom() {
  const list = document.getElementById('btStrategyHoursList');
  if (!list) return [];
  const out = [];
  list.querySelectorAll('.strategy-hour-row').forEach((row) => {
    const start = row.querySelector('.strategy-hour-start')?.value?.trim();
    const end = row.querySelector('.strategy-hour-end')?.value?.trim();
    if (start && end) out.push({ start, end });
  });
  return out;
}

function getBacktestingStrategyRecordByName(name) {
  return getBacktestingStrategies().find((s) => String(s.name || '').trim() === String(name || '').trim()) || null;
}

function updateBacktestingTradeScheduleHints() {
  const notice = document.getElementById('btTradeScheduleNotice');
  const warn = document.getElementById('btTradeScheduleWarning');
  if (!notice || !warn) return;

  const strategyName = String(document.getElementById('btStrategy')?.value || '').trim();
  const entryTime = document.getElementById('btEntryTime')?.value || '';
  const exitTime = document.getElementById('btExitTime')?.value || '';
  const tradeDate = document.getElementById('btDate')?.value || '';
  const rec = getBacktestingStrategyRecordByName(strategyName);

  notice.hidden = true;
  warn.hidden = true;
  notice.textContent = '';
  warn.textContent = '';

  if (entryTime && exitTime) {
    const exitM = parseTimeToMinutes(exitTime);
    const entryMin = parseTimeToMinutes(entryTime);
    if (exitM != null && entryMin != null && exitM < entryMin) {
      notice.hidden = false;
      notice.textContent = t('trade_duration_midnight_hint');
    }
  }

  if (!rec?.schedule_enabled) return;

  const summary = formatOperatingHoursSummary(rec.operating_hours);
  if (summary) {
    notice.hidden = false;
    notice.textContent = t('trade_schedule_notice', 'Horario operativo: {hours}').replace('{hours}', summary);
  }

  if (!entryTime) return;
  const within = isEntryWithinOperatingHours(entryTime, rec.operating_hours, tradeDate);
  if (within === false) {
    warn.hidden = false;
    warn.textContent = t('trade_outside_schedule_warning');
  }
}

function isBtExcludeOutOfScheduleEnabled() {
  const el = document.getElementById('btExcludeOutOfSchedule');
  if (!el) return false;
  return el.checked === true;
}

async function getBtExcludeScheduleStorageKey() {
  const userId = await getCurrentUserIdSafe();
  return userId ? `${BT_EXCLUDE_SCHEDULE_KEY_PREFIX}_${userId}` : null;
}

async function loadBtExcludeScheduleState() {
  const el = document.getElementById('btExcludeOutOfSchedule');
  if (!el) return;
  const key = await getBtExcludeScheduleStorageKey();
  if (key) {
    const saved = localStorage.getItem(key);
    if (saved !== null) el.checked = saved === 'true';
  }
}

async function saveBtExcludeScheduleState() {
  const key = await getBtExcludeScheduleStorageKey();
  if (!key) return;
  const el = document.getElementById('btExcludeOutOfSchedule');
  localStorage.setItem(key, el?.checked ? 'true' : 'false');
}

function updateBtScheduleFilterUi({ active = false, excludedCount = 0, useSessionReference = false } = {}) {
  const notice = document.getElementById('btScheduleFilterNotice');
  if (!notice) return;
  notice.classList.toggle('show', active);
  if (!active) {
    notice.textContent = '';
    return;
  }
  if (excludedCount > 0) {
    const key = useSessionReference
      ? 'stats_schedule_filter_active_selected'
      : 'stats_schedule_filter_active';
    const fallback = useSessionReference
      ? 'Vista filtrada: {count} trades fuera de horario o sin hora ocultos.'
      : 'Vista filtrada: {count} trades fuera de horario ocultos. Los trades sin horario evaluable se mantienen.';
    notice.textContent = t(key, fallback).replace('{count}', String(excludedCount));
  } else {
    notice.textContent = t('stats_schedule_filter_active_none', 'No hay trades fuera de horario para ocultar.');
  }
}

function getBacktestingTradesForMetrics() {
  const base = getFilteredBacktestingTrades();
  const strategies = getBacktestingStrategies();

  if (!isBtExcludeOutOfScheduleEnabled()) {
    updateBtScheduleFilterUi({ active: false, excludedCount: 0 });
    return base;
  }

  const result = filterBacktestingTradesForMetrics(base, strategies, {
    excludeOutside: true,
    selectedSessionIds: selectedBacktestingSessionIds,
    sessions: cachedBacktestingSessions || [],
  });

  updateBtScheduleFilterUi({
    active: true,
    excludedCount: result.excludedTrades.length,
    useSessionReference: Boolean(result.useSessionReference),
  });

  return result.includedTrades;
}

function renderBacktestingScheduleDiscipline(trades) {
  const sched = calculateBacktestingScheduleDiscipline(trades, {
    strategies: getBacktestingStrategies(),
    selectedSessionIds: selectedBacktestingSessionIds,
    sessions: cachedBacktestingSessions || [],
  });

  const metricsEl = document.getElementById('btScheduleStatsMetrics');
  const emptyEl = document.getElementById('btScheduleStatsEmpty');
  if (metricsEl) {
    metricsEl.hidden = false;
    // El contenido ya no es una rejilla de tarjetas: debe fluir en bloque (ver CSS).
    metricsEl.style.display = '';
  }
  if (emptyEl) emptyEl.hidden = sched.hasEvaluableDiscipline;

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const money = (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}€`;

  set('btStatTradesInSchedule', String(sched.tradesIn));
  set('btStatTradesOutSchedule', String(sched.tradesOut));
  set('btStatTradesMissingTime', String(sched.tradesMissingTime));
  set('btStatTradesNoSchedule', String(sched.tradesNoSchedule));
  set('btStatScheduleCompliance', sched.compliancePct == null ? '—' : `${sched.compliancePct.toFixed(1)}%`);
  set('btStatPnlInSchedule', money(sched.pnlIn));
  set('btStatPnlOutSchedule', money(sched.pnlOut));
  set('btStatPnlMissingTime', money(sched.pnlMissingTime));
  set('btStatAvgDurationInSchedule', formatMinutesAsHm(sched.avgDurationIn));
  set('btStatAvgDurationOutSchedule', formatMinutesAsHm(sched.avgDurationOut));
  set('btStatAvgDurationTotal', formatMinutesAsHm(sched.avgDurationTotal));

  const pctOrDash = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
  set('btStatWinrateInSchedule', pctOrDash(sched.winRateIn));
  set('btStatWinrateOutSchedule', pctOrDash(sched.winRateOut));
  set('btStatWinrateTotal', pctOrDash(sched.winRateTotal));

  // Columna Total: la suma de los tres grupos. Se calcula aquí y no en el servicio porque es
  // literalmente la suma de valores que ese servicio ya devuelve.
  set(
    'btStatTradesTotal',
    String(sched.tradesIn + sched.tradesOut + sched.tradesMissingTime)
  );
  set('btStatPnlTotal', money(sched.pnlIn + sched.pnlOut + sched.pnlMissingTime));

  renderHourConcentration('btHourConcentration', sched);
  renderBacktestingScheduleVerdict(sched);
  renderBacktestingScheduleSimulator(sched);
}

/* ------------------------- Simulador de horario (backtesting) -------------------------
 * Responde «¿me renta ampliar o acortar mi horario?» sin tocar la estrategia: reparte los
 * mismos trades con los rangos que escriba el usuario y compara el resultado contra el
 * horario realmente configurado.
 */
let btScheduleSimRanges = null;

function getBacktestingSimRanges() {
  return document.querySelectorAll('#btStatScheduleSimRanges .schedule-sim-range').length
    ? [...document.querySelectorAll('#btStatScheduleSimRanges .schedule-sim-range')].map((row) => ({
        start: row.querySelector('.sim-start')?.value || '',
        end: row.querySelector('.sim-end')?.value || '',
      }))
    : [];
}

function renderBacktestingSimRangeInputs() {
  const host = document.getElementById('btStatScheduleSimRanges');
  if (!host) return;
  host.innerHTML = (btScheduleSimRanges || [])
    .map(
      (r, i) => `
      <div class="schedule-sim-range">
        <input type="time" class="input sim-start" value="${escapeAttrChip(r.start || '')}" />
        <span class="muted">a</span>
        <input type="time" class="input sim-end" value="${escapeAttrChip(r.end || '')}" />
        <button type="button" class="schedule-sim-remove" data-sim-remove="${i}" aria-label="Quitar rango">✕</button>
      </div>`
    )
    .join('');
}

function renderBacktestingScheduleSimulator(sched) {
  const section = document.getElementById('btScheduleSimOverlay');
  if (!section) return;

  // La primera vez se precarga con el horario configurado: así el punto de partida es el
  // horario real y el usuario solo tiene que estirarlo o encogerlo.
  if (btScheduleSimRanges == null) {
    const configured = Array.isArray(sched?.referenceRanges) ? sched.referenceRanges : [];
    btScheduleSimRanges = configured.length
      ? configured.map((r) => ({ start: r.start, end: r.end }))
      : [{ start: '08:00', end: '17:00' }];
    renderBacktestingSimRangeInputs();
  }

  const ranges = getBacktestingSimRanges().filter((r) => r.start && r.end);
  const sim = simulateScheduleRanges(
    getFilteredBacktestingTrades(),
    ranges,
    getBacktestingTradePnlEuros
  );

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const money = (v) => `${v >= 0 ? '+' : ''}${Number(v || 0).toFixed(2)}€`;
  const pct = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);

  set('btStatSimTradesIn', String(sim.inside.n));
  set('btStatSimTradesOut', String(sim.outside.n));
  set('btStatSimTradesMissing', String(sim.missing.n));
  set('btStatSimWinrateIn', pct(sim.inside.winrate));
  set('btStatSimWinrateOut', pct(sim.outside.winrate));
  set('btStatSimPnlIn', money(sim.inside.pnl));
  set('btStatSimPnlOut', money(sim.outside.pnl));
  set('btStatSimPnlMissing', money(sim.missing.pnl));
  set('btStatSimDurationIn', formatMinutesAsHm(sim.inside.avgDuration));
  set('btStatSimDurationOut', formatMinutesAsHm(sim.outside.avgDuration));

  const verdict = document.getElementById('btStatScheduleSimVerdict');
  if (verdict) {
    if (!ranges.length) {
      verdict.textContent = 'Escribe al menos un rango para simular.';
      verdict.className = 'schedule-sim-verdict muted';
    } else {
      // La comparación relevante es contra lo que hoy se opera dentro del horario configurado.
      const diff = sim.inside.pnl - sched.pnlIn;
      const label = ranges.map((r) => `${r.start}–${r.end}`).join(', ');
      if (Math.abs(diff) < 0.005) {
        verdict.textContent = `Con ${label} obtendrías lo mismo que con tu horario actual.`;
        verdict.className = 'schedule-sim-verdict muted';
      } else {
        verdict.textContent =
          diff > 0
            ? `Con ${label} habrías ganado ${money(diff)} más que con tu horario actual.`
            : `Con ${label} habrías ganado ${money(Math.abs(diff))} menos que con tu horario actual.`;
        verdict.className = `schedule-sim-verdict ${diff > 0 ? 'good' : 'bad'}`;
      }
    }
  }

  if (section.dataset.bound !== 'true') {
    section.dataset.bound = 'true';
    const close = () => section.classList.remove('active');
    section.addEventListener('input', () => renderBacktestingScheduleSimulator(sched));
    section.addEventListener('click', (event) => {
      if (event.target === section) return close();
      const remove = event.target.closest('[data-sim-remove]');
      const add = event.target.closest('#btStatScheduleSimAdd');
      if (event.target.closest('#btScheduleSimClose, #btScheduleSimCloseFooter')) return close();
      if (remove) {
        btScheduleSimRanges = getBacktestingSimRanges();
        btScheduleSimRanges.splice(Number(remove.dataset.simRemove), 1);
      } else if (add) {
        btScheduleSimRanges = [...getBacktestingSimRanges(), { start: '', end: '' }];
      } else {
        return;
      }
      renderBacktestingSimRangeInputs();
      renderBacktestingScheduleSimulator(sched);
    });
  }

  // El botón de la tarjeta es lo único que se ve: toda la configuración vive en el modal para
  // no llenar de controles una vista que se consulta mucho más de lo que se toca.
  const openBtn = document.getElementById('btScheduleSimOpen');
  if (openBtn && openBtn.dataset.bound !== 'true') {
    openBtn.dataset.bound = 'true';
    openBtn.addEventListener('click', () => {
      renderBacktestingSimRangeInputs();
      renderBacktestingScheduleSimulator(sched);
      section.classList.add('active');
    });
  }
}

/**
 * En qué horas se concentran los TP y los SL. Barras apiladas por hora de entrada (verde TP,
 * rojo SL) más un resumen en texto de las 3 franjas con más de cada uno.
 * Compartido por Real y Backtesting: ambos reciben el mismo objeto del helper scheduleUtils.
 */
function renderHourConcentration(containerId, sched) {
  const box = document.getElementById(containerId);
  if (!box) return;

  const hours = Array.isArray(sched?.hoursWithData) ? sched.hoursWithData : [];
  const decided = hours.filter((h) => h.tp > 0 || h.sl > 0);
  if (!decided.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }

  const label = (h) => `${String(h).padStart(2, '0')}:00`;
  const range = (h) => `${label(h)}–${label((h + 1) % 24)}`;
  const listOf = (arr, key, cls) =>
    arr.length
      ? arr.map((h) => `<span class="${cls}">${range(h.hour)}</span> (${h[key]})`).join(' · ')
      : '<span class="muted">—</span>';

  const maxTotal = Math.max(...decided.map((h) => h.tp + h.sl), 1);
  const bars = decided
    .map((h) => {
      const total = h.tp + h.sl;
      const height = (total / maxTotal) * 100;
      const tpShare = total ? (h.tp / total) * 100 : 0;
      const slShare = total ? (h.sl / total) * 100 : 0;
      return `
        <div class="hour-bar" title="${range(h.hour)} · ${h.tp} TP · ${h.sl} SL">
          <div class="hour-bar-stack" style="height:${Math.max(10, height)}%">
            <div class="hour-bar-tp" style="height:${tpShare}%"></div>
            <div class="hour-bar-sl" style="height:${slShare}%"></div>
          </div>
          <span class="hour-bar-label">${String(h.hour).padStart(2, '0')}</span>
        </div>`;
    })
    .join('');

  box.innerHTML = `
    <p class="hour-concentration-title">¿A qué horas ganas y a qué horas pierdes?</p>
    <p class="hour-concentration-sub">Por hora de entrada. Verde = TP, rojo = SL (los BE no cuentan).</p>
    <div class="hour-concentration-highlights">
      <span>Más TP: ${listOf(sched.topTpHours || [], 'tp', 'hc-tp')}</span>
      <span>Más SL: ${listOf(sched.topSlHours || [], 'sl', 'hc-sl')}</span>
    </div>
    <div class="hour-bars">${bars}</div>`;
  box.hidden = false;
}

/**
 * Traduce las métricas de disciplina a una conclusión directa: ¿compensa operar fuera del
 * horario definido? Se muestra arriba del todo para que no haya que interpretar 11 cifras.
 */
function renderBacktestingScheduleVerdict(sched) {
  const box = document.getElementById('btScheduleVerdict');
  const headlineEl = document.getElementById('btScheduleVerdictHeadline');
  const detailEl = document.getElementById('btScheduleVerdictDetail');
  const compareEl = document.getElementById('btScheduleVerdictCompare');
  if (!box || !headlineEl || !detailEl || !compareEl) return;

  box.classList.remove('is-negative', 'is-positive');

  // Sin horarios configurados (o sin trades evaluables) no hay nada que concluir.
  if (!sched.hasEvaluableDiscipline) {
    box.hidden = true;
    return;
  }

  const money = (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}€`;
  const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

  let headline = '';
  let detail = '';

  if (sched.tradesOut === 0) {
    box.classList.add('is-positive');
    headline = 'Has respetado tu horario en todos los trades.';
    detail = `Los ${plural(sched.tradesIn, 'trade', 'trades')} evaluados están dentro de tu horario operativo.`;
  } else if (sched.pnlOut < 0) {
    box.classList.add('is-negative');
    headline = `Operar fuera de tu horario te resta ${money(sched.pnlOut)}.`;
    detail = `Esos ${plural(sched.tradesOut, 'trade', 'trades')} fuera de horario están en negativo. Ceñirte a tu horario habría mejorado tu resultado.`;
  } else if (sched.pnlOut > 0 && sched.pnlIn > 0) {
    box.classList.add('is-positive');
    headline = `Fuera de tu horario también ganas (${money(sched.pnlOut)}).`;
    detail = `Los ${plural(sched.tradesOut, 'trade', 'trades')} fuera de horario suman en positivo. Quizá merezca la pena ampliar tu franja horaria.`;
  } else {
    headline = `Fuera de tu horario sumas ${money(sched.pnlOut)}.`;
    detail = `Con ${plural(sched.tradesOut, 'trade', 'trades')} fuera de horario todavía hay pocos datos para concluir. Sigue registrando operaciones.`;
  }

  // Aviso honesto: con muy pocos trades fuera de horario la conclusión no es fiable.
  if (sched.tradesOut > 0 && sched.tradesOut < 5) {
    detail += ' Ojo: son pocos trades, tómalo como un indicio y no como una conclusión.';
  }

  headlineEl.textContent = headline;
  detailEl.textContent = detail;
  compareEl.innerHTML = `
    <span>Dentro: <strong>${money(sched.pnlIn)}</strong> · ${plural(sched.tradesIn, 'trade', 'trades')} · acierto <strong>${pct(sched.winRateIn)}</strong></span>
    <span>Fuera: <strong>${money(sched.pnlOut)}</strong> · ${plural(sched.tradesOut, 'trade', 'trades')} · acierto <strong>${pct(sched.winRateOut)}</strong></span>
    ${
      sched.tradesOut > 0
        ? `<button type="button" class="button button-cancel bt-schedule-outside-btn" id="btScheduleOutsideOpen">Ver cuáles son</button>`
        : ''
    }
  `;

  document.getElementById('btScheduleOutsideOpen')?.addEventListener('click', () => {
    openBacktestingOutsideScheduleModal();
  });

  box.hidden = false;
}

/**
 * Listado de las operaciones que quedaron fuera del horario operativo.
 *
 * Importante para interpretarlo: una operación se clasifica por su HORA DE ENTRADA. Si entraste
 * dentro de tu horario y el TP o el SL saltó más tarde, cuenta como dentro. Se dice de forma
 * explícita en el modal porque es justo la duda que genera el dato.
 */
function openBacktestingOutsideScheduleModal() {
  let overlay = document.getElementById('btOutsideScheduleOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'btOutsideScheduleOverlay';
    overlay.className = 'modal-overlay app-modal-overlay';
    overlay.innerHTML = `
      <div class="modal app-modal bt-outside-modal">
        <div class="modal-header">
          <h2>Operaciones fuera de horario</h2>
          <button type="button" class="modal-close" id="btOutsideClose" aria-label="Cerrar">✕</button>
        </div>
        <div class="pro-modal-scroll">
          <p class="muted small">
            Una operación cuenta como fuera de horario solo por su <strong>hora de entrada</strong>.
            Si entraste dentro de tu franja y el TP o el SL saltó después, cuenta como dentro.
          </p>
          <p class="form-hint" id="btOutsideSummary"></p>
          <div class="table-wrap">
            <table class="data-table" id="btOutsideTable">
              <thead>
                <tr><th>Fecha</th><th>Par</th><th>Dir.</th><th>Entrada</th><th>Salida</th><th>Res.</th><th>PnL</th><th>R</th><th>Horario</th></tr>
              </thead>
              <tbody id="btOutsideBody"></tbody>
            </table>
          </div>
          <p class="muted small" style="margin-top:10px">Pulsa una fila para ver la ficha completa.</p>
        </div>
        <div class="pro-modal-footer">
          <button type="button" class="button button-save" id="btOutsideCloseFooter">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('active');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById('btOutsideClose')?.addEventListener('click', close);
    document.getElementById('btOutsideCloseFooter')?.addEventListener('click', close);
  }

  // Se usa el mismo clasificador que el cálculo de disciplina para que el listado y el número
  // del resumen no puedan discrepar nunca.
  const strategyByName = buildBacktestingStrategyByNameMap(getBacktestingStrategies());
  const selectedStrategyName = getBacktestingReferenceStrategyName(
    selectedBacktestingSessionIds,
    cachedBacktestingSessions || []
  );
  const outside = getFilteredBacktestingTrades().filter(
    (trade) =>
      classifyBacktestingTrade(trade, { strategyByName, selectedStrategyName }) === 'outside'
  );

  const money = (v) => `${v >= 0 ? '+' : ''}${Number(v || 0).toFixed(2)}€`;
  const tone = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : '');
  const totalPnl = outside.reduce((acc, t) => acc + getBacktestingTradePnlEuros(t), 0);

  const summary = document.getElementById('btOutsideSummary');
  if (summary) {
    summary.textContent = `${outside.length} ${outside.length === 1 ? 'operación' : 'operaciones'} fuera de horario · PnL ${money(totalPnl)}`;
    summary.className = `form-hint ${totalPnl < 0 ? 'error' : ''}`;
  }

  const body = document.getElementById('btOutsideBody');
  if (body) {
    body.innerHTML = outside.length
      ? [...outside]
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .map((t) => {
            const pnl = getBacktestingTradePnlEuros(t);
            const r = getBacktestingTradeRValue(t);
            const res = String(t.result || '').toUpperCase();
            const dir = String(t.direction || '').toUpperCase() === 'SHORT' ? 'Venta' : 'Compra';
            const strategy = strategyByName.get(String(t.strategy || '').trim());
            const hours = formatOperatingHoursSummary(strategy?.operating_hours) || '—';
            return `<tr data-trade-id="${escapeAttrChip(String(t.id))}" class="bt-outside-row">
              <td>${formatDateEs(t.date)}</td>
              <td>${escapeHtmlAssetLabel(t.asset || '—')}</td>
              <td>${dir}</td>
              <td><strong>${escapeHtmlAssetLabel(t.entry_time || '—')}</strong></td>
              <td>${escapeHtmlAssetLabel(t.exit_time || '—')}</td>
              <td><span class="bt-result-badge ${res === 'TP' || res === 'SL' ? res.toLowerCase() : 'be'}">${res || '—'}</span></td>
              <td class="${tone(pnl)}">${money(pnl)}</td>
              <td class="${tone(r)}">${r.toFixed(2)}</td>
              <td class="muted">${escapeHtmlAssetLabel(hours)}</td>
            </tr>`;
          })
          .join('')
      : '<tr><td colspan="9" class="muted">No hay operaciones fuera de horario.</td></tr>';

    body.querySelectorAll('.bt-outside-row').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.tradeId;
        const trade = (cachedBacktestingTrades || []).find((t) => String(t.id) === String(id));
        if (trade) {
          overlay.classList.remove('active');
          openBacktestingTradeDetail(trade);
        }
      });
    });
  }

  overlay.classList.add('active');
}

function getBacktestingStrategyRiskEuroForForm(strategy) {
  if (!strategy) return '';
  const cap = getActiveBacktestingSessionCapital();
  const unit = String(strategy.risk_unit ?? strategy.riskUnit ?? 'eur').toLowerCase() === 'percent' ? 'percent' : 'eur';
  const rv = Number(
    strategy.risk_value ??
      strategy.riskValue ??
      strategy.risk_per_trade ??
      strategy.risk ??
      strategy.risk_eur ??
      0
  );
  if (!rv || rv <= 0) return '';
  if (unit === 'percent') {
    if (!cap || cap <= 0) return '';
    const eur = cap * (rv / 100);
    return String(eur);
  }
  return String(rv);
}

// Si el riesgo se define en %, muestra cuánto es eso en € para la sesión de backtesting
// activa (o la única seleccionada en el filtro), usando su capital de cuenta configurado.
// Así se puede saber el +/- objetivo por operación sin salir del modal de estrategia.
function updateBtStrategyRiskEuroHint() {
  const hint = document.getElementById('btStrategyRiskEuroHint');
  if (!hint) return;
  if (btStrategyRiskUnit !== 'percent') {
    hint.hidden = true;
    hint.textContent = '';
    return;
  }
  const riskValue = Number(document.getElementById('btStrategyRiskValue')?.value || 0);
  const capital = getActiveBacktestingSessionCapital();
  if (!capital || capital <= 0) {
    hint.hidden = false;
    hint.textContent = 'Abre o selecciona una sesión de backtesting para ver el equivalente en €.';
    return;
  }
  if (!riskValue || riskValue <= 0) {
    hint.hidden = true;
    hint.textContent = '';
    return;
  }
  const euroEquivalent = capital * (riskValue / 100);
  hint.hidden = false;
  hint.textContent = `≈ ${euroEquivalent.toFixed(2)}€ por operación (capital de sesión: ${capital.toFixed(2)}€)`;
}

function syncBtStrategyRiskUnitToggleUi() {
  const toggle = document.getElementById('btStrategyRiskUnitToggle');
  const input = document.getElementById('btStrategyRiskValue');
  if (toggle) {
    toggle.querySelectorAll('button[data-unit]').forEach((b) => {
      b.classList.toggle('active', b.dataset.unit === btStrategyRiskUnit);
    });
  }
  if (input) {
    input.placeholder = btStrategyRiskUnit === 'percent' ? 'Ej: 1' : 'Ej: 500';
  }
  updateBtStrategyRiskEuroHint();
}

function ensureBtStrategyRiskUnitToggleBound() {
  if (document.documentElement.dataset.btStrategyRiskToggleBound === 'true') return;
  document.documentElement.dataset.btStrategyRiskToggleBound = 'true';
  const toggle = document.getElementById('btStrategyRiskUnitToggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-unit]');
      if (!btn) return;
      btStrategyRiskUnit = btn.dataset.unit === 'percent' ? 'percent' : 'eur';
      syncBtStrategyRiskUnitToggleUi();
    });
  }
  document.getElementById('btStrategyRiskValue')?.addEventListener('input', updateBtStrategyRiskEuroHint);
}

function getBacktestingStrategies() {
  const dr = Number(backtestingSettings?.default_risk ?? 100) || 100;
  const drr = Number(backtestingSettings?.default_rr ?? 2) || 2;
  return (backtestingSettings.strategies || [])
    .map((item) => normalizeBacktestingStrategy(item, dr, drr))
    .filter((s) => s.name);
}

function getBacktestingStrategyNames() {
  return getBacktestingStrategies()
    .filter((s) => s.active !== false)
    .map((s) => s.name);
}

function renderBacktestingStrategiesConfigList() {
  const host = document.getElementById('btStrategiesList');
  if (!host) return;

  const strategies = getBacktestingStrategies();

  if (!strategies.length) {
    host.innerHTML = '<p class="muted">Aún no tienes estrategias de backtesting.</p>';
    return;
  }

  host.innerHTML = strategies
    .map(
      (s) => `
    <div class="bt-strategy-card pro-card pro-strategy-card" data-id="${escapeAttrChip(s.id)}">
      <div class="pro-session-top bt-strategy-card-top">
        <div>
          <div class="bt-strategy-name">${escapeHtmlChipText(s.name)}</div>
        </div>
        <span class="pro-badge ${s.active !== false ? 'pro-badge--ok' : ''}">${s.active !== false ? 'Activa' : 'Inactiva'}</span>
      </div>

      <div class="bt-strategy-meta">
        <span>${
          String(s.risk_unit || 'eur').toLowerCase() === 'percent'
            ? `Riesgo: ${Number(s.risk_value ?? 0)}%`
            : `Riesgo: ${Number(s.risk_value ?? s.risk ?? 0).toFixed(2)}€`
        }</span>
        <span>RR: ${Number(s.rr || 0).toFixed(2)}</span>
      </div>

      ${s.notes ? `<p class="bt-strategy-notes">${escapeHtmlChipText(s.notes)}</p>` : ''}

      <div class="bt-strategy-actions pro-actions pro-strategy-actions">
        <button type="button" class="secondary bt-edit-strategy" data-id="${escapeAttrChip(s.id)}">Editar</button>
        <button type="button" class="danger bt-delete-strategy" data-id="${escapeAttrChip(s.id)}">Eliminar</button>
      </div>
    </div>
  `
    )
    .join('');

  host.querySelectorAll('.bt-edit-strategy').forEach((btn) => {
    btn.addEventListener('click', () => openBacktestingStrategyModal(btn.getAttribute('data-id')));
  });

  host.querySelectorAll('.bt-delete-strategy').forEach((btn) => {
    btn.addEventListener('click', () => {
      void deleteBacktestingStrategy(btn.getAttribute('data-id'));
    });
  });
}

function openBacktestingStrategyModal(strategyId = null) {
  const overlay = document.getElementById('btStrategyModalOverlay');
  if (!overlay) return;

  ensureBtStrategyModalScheduleListeners();
  ensureBtStrategyRiskUnitToggleBound();

  const title = document.getElementById('btStrategyModalTitle');
  const idInput = document.getElementById('btStrategyEditId');

  const strategies = getBacktestingStrategies();
  const strategy = strategyId
    ? strategies.find((s) => String(s.id) === String(strategyId))
    : null;

  if (title) title.textContent = strategy ? 'Editar estrategia' : 'Nueva estrategia';
  if (idInput) idInput.value = strategy?.id || '';

  const nm = document.getElementById('btStrategyName');
  const rk = document.getElementById('btStrategyRiskValue');
  const rr = document.getElementById('btStrategyRR');
  const nt = document.getElementById('btStrategyNotes');
  const ac = document.getElementById('btStrategyActive');
  if (nm) nm.value = strategy?.name || '';

  btStrategyRiskUnit =
    strategy &&
    String(strategy.risk_unit ?? strategy.riskUnit ?? 'eur').toLowerCase() === 'percent'
      ? 'percent'
      : 'eur';

  const riskValueRaw =
    strategy != null
      ? Number(
          strategy.risk_value ??
            strategy.riskValue ??
            strategy.risk_per_trade ??
            strategy.risk ??
            strategy.risk_eur ??
            0
        )
      : 100;
  const riskValueSafe = Number.isFinite(riskValueRaw) && riskValueRaw > 0 ? riskValueRaw : 100;

  if (rk) rk.value = String(riskValueSafe);
  if (rr) rr.value = strategy != null ? String(strategy.rr ?? 2) : '2';
  if (nt) nt.value = strategy?.notes || '';
  if (ac) ac.checked = strategy?.active !== false;

  const desc = document.getElementById('btStrategyDescription');
  const schedEn = document.getElementById('btStrategyScheduleEnabled');
  if (desc) desc.value = strategy?.description || '';
  if (schedEn) schedEn.checked = Boolean(strategy?.schedule_enabled);
  renderBtStrategyHoursList(strategy?.operating_hours || []);
  syncBtStrategyHoursSectionVisibility();
  updateBtStrategyHoursEmptyHint();

  syncBtStrategyRiskUnitToggleUi();

  overlay.classList.add('active');
  void refreshLucideIcons();
}

function closeBacktestingStrategyModal() {
  document.getElementById('btStrategyModalOverlay')?.classList.remove('active');
}

async function saveBacktestingStrategyFromModal() {
  if (!(await ensureUserReady())) return;
  if (!(await syncSupabaseSessionWithMain())) {
    showToast('Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.', 'error');
    return;
  }
  const id = document.getElementById('btStrategyEditId')?.value || '';
  const name = document.getElementById('btStrategyName')?.value?.trim() || '';
  const riskValue = Number(document.getElementById('btStrategyRiskValue')?.value || 0);
  const rr = Number(document.getElementById('btStrategyRR')?.value || 0);
  const notes = document.getElementById('btStrategyNotes')?.value || '';
  const active = document.getElementById('btStrategyActive')?.checked !== false;
  const riskUnit = btStrategyRiskUnit === 'percent' ? 'percent' : 'eur';

  if (!name) {
    showToast('Indica un nombre de estrategia', 'error');
    return;
  }

  if (!riskValue || riskValue <= 0) {
    showToast('Indica un riesgo válido', 'error');
    return;
  }

  if (!rr || rr <= 0) {
    showToast('Indica un RR válido', 'error');
    return;
  }

  const strategies = getBacktestingStrategies();

  const duplicated = strategies.some(
    (s) => s.name.toLowerCase() === name.toLowerCase() && String(s.id) !== String(id)
  );

  if (duplicated) {
    showToast('Ya existe una estrategia con ese nombre', 'error');
    return;
  }

  const description = String(document.getElementById('btStrategyDescription')?.value || '').trim();
  const schedule_enabled = Boolean(document.getElementById('btStrategyScheduleEnabled')?.checked);
  let operating_hours = [];
  if (schedule_enabled) {
    operating_hours = collectBtStrategyHoursFromDom();
    if (operating_hours.length) {
      const validation = validateOperatingHoursList(operating_hours);
      if (!validation.valid) {
        showToast('Revisa los horarios operativos', 'error');
        return;
      }
      operating_hours = validation.hours;
    } else {
      showToast('Horarios activados sin rangos. Puedes añadirlos después.', 'info');
    }
  }

  const payload = {
    id: id || crypto.randomUUID(),
    name,
    risk_value: riskValue,
    risk_unit: riskUnit,
    rr,
    notes,
    description: description || notes,
    schedule_enabled,
    operating_hours,
    active,
    risk_per_trade: riskUnit === 'eur' ? riskValue : null
  };
  if (riskUnit === 'eur') {
    payload.risk = riskValue;
  }

  if (id) {
    backtestingSettings.strategies = strategies.map((s) => (String(s.id) === String(id) ? payload : s));
  } else {
    backtestingSettings.strategies = [...strategies, payload];
  }

  const api = getBackendApi();

  if (api?.saveBacktestingSettings) {
    const result = await persistBacktestingSettings(api);

    if (!result?.success) {
      showToast(
        typeof result?.error === 'string'
          ? result.error
          : result?.error?.message || 'No se pudo guardar la estrategia',
        'error'
      );
      return;
    }
  }

  closeBacktestingStrategyModal();
  renderBacktestingSettings();
  populateBacktestingSessionModalForm();
  populateBacktestingSelects();

  showToast('Estrategia guardada', 'success');
}

async function deleteBacktestingStrategy(strategyId) {
  const strategies = getBacktestingStrategies();
  const strategy = strategies.find((s) => String(s.id) === String(strategyId));

  if (!strategy) return;

  const okDel = await showConfirmModal({
    title: 'Eliminar estrategia',
    message: `¿Eliminar la estrategia "${strategy.name}"?`,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    danger: true,
  });
  if (!okDel) return;

  backtestingSettings.strategies = strategies.filter((s) => String(s.id) !== String(strategyId));

  const api = getBackendApi();

  if (api?.saveBacktestingSettings) {
    const result = await persistBacktestingSettings(api);

    if (!result?.success) {
      showToast(
        typeof result?.error === 'string'
          ? result.error
          : result?.error?.message || 'No se pudo eliminar la estrategia',
        'error'
      );
      return;
    }
  }

  renderBacktestingSettings();
  populateBacktestingSessionModalForm();
  populateBacktestingSelects();

  showToast('Estrategia eliminada', 'success');
}

/**
 * Único punto de guardado de los ajustes de backtesting.
 *
 * Se niega a escribir si los ajustes no se han cargado antes: en ese momento las listas están
 * vacías por defecto y el guardado dejaría al usuario sin estrategias. Es justo la ventana que
 * se abre al arrancar la app o al perder la sesión.
 */
async function persistBacktestingSettings(api, { allowEmptyLists = false } = {}) {
  const backend = api || getBackendApi();
  if (!backend?.saveBacktestingSettings) return { success: false, error: 'NO_API' };
  if (!backtestingSettingsLoaded) {
    console.warn('[backtesting] guardado bloqueado: los ajustes aún no se han cargado');
    return { success: false, error: 'SETTINGS_NOT_LOADED' };
  }
  // allowEmptyLists solo se pasa cuando el usuario ha borrado algo a propósito: es lo que
  // autoriza al servidor a dejar una lista vacía (ver upsertBacktestingSettings).
  return backend.saveBacktestingSettings({ ...backtestingSettings, allowEmptyLists });
}

async function loadBacktestingSettings() {
  const api = getBackendApi();
  if (!api?.getBacktestingSettings) return;
  try {
    const result = await api.getBacktestingSettings();
    // Sin fila todavía (primer uso) también cuenta como carga correcta: las listas vacías son
    // el estado real, no un fallo.
    if (result?.success) backtestingSettingsLoaded = true;
    if (result?.success && result.data) {
      const d = result.data;
      const dr = d.default_risk != null ? Number(d.default_risk) : 100;
      const drr = d.default_rr != null ? Number(d.default_rr) : 2;
      backtestingSettings = {
        accounts: Array.isArray(d.accounts) ? d.accounts.map(String) : [],
        strategies: Array.isArray(d.strategies)
          ? d.strategies.map((item) => normalizeBacktestingStrategy(item, dr, drr)).filter((s) => s.name)
          : [],
        assets: Array.isArray(d.assets) ? d.assets.map(String) : [],
        sessions: Array.isArray(d.sessions) ? d.sessions.map(String) : [],
        default_account: '',
        default_strategy: d.default_strategy || '',
        default_asset: '',
        default_risk: Number.isFinite(dr) && dr > 0 ? dr : 100,
        default_rr: Number.isFinite(drr) && drr > 0 ? drr : 2,
        challenge_config: normalizeChallengeConfig(d.challenge_config)
      };
    }
  } catch (e) {
    console.warn('loadBacktestingSettings', e);
  }
  renderBacktestingSettings();
}

async function saveBacktestingSettings() {
  const api = getBackendApi();
  if (!api?.saveBacktestingSettings) return;

  backtestingSettings.default_account = '';
  backtestingSettings.default_strategy = '';
  backtestingSettings.default_asset = '';

  const result = await persistBacktestingSettings(api);

  if (!result?.success) {
    showToast(
      typeof result?.error === 'string'
        ? result.error
        : result?.error?.message || 'No se pudo guardar configuración backtesting',
      'error'
    );
    return;
  }

  showToast('Configuración backtesting guardada', 'success');
  if (currentView === 'backtesting') {
    refreshBacktestingFilterSelects();
    populateBacktestingSelects();
  }
  populateBacktestingSessionModalForm();
}

async function addBacktestingItem(key, inputId) {
  const input = document.getElementById(inputId);
  const value = input?.value?.trim();

  if (!value) return;

  if (!Array.isArray(backtestingSettings[key])) {
    backtestingSettings[key] = [];
  }

  if (!backtestingSettings[key].includes(value)) {
    backtestingSettings[key].push(value);
  }

  input.value = '';

  renderBacktestingSettings();

  const api = getBackendApi();

  if (api?.saveBacktestingSettings) {
    const result = await persistBacktestingSettings(api);

    if (!result?.success) {
      showToast('No se pudo guardar configuración backtesting', 'error');
      return;
    }
  }

  showToast('Guardado', 'success');

  populateBacktestingSelects();
  populateBacktestingSessionModalForm();
  if (currentView === 'backtesting') {
    refreshBacktestingFilterSelects();
  }
}

async function removeBacktestingItem(key, value) {
  if (!Array.isArray(backtestingSettings[key])) return;
  backtestingSettings[key] = backtestingSettings[key].filter((item) => item !== value);
  renderBacktestingSettings();
  const api = getBackendApi();
  if (api?.saveBacktestingSettings) {
    // Borrado explícito del usuario: aquí sí es legítimo quedarse sin ningún elemento.
    const result = await persistBacktestingSettings(api, { allowEmptyLists: true });
    if (!result?.success) {
      showToast('No se pudo guardar configuración backtesting', 'error');
      return;
    }
  }
  populateBacktestingSelects();
  populateBacktestingSessionModalForm();
  if (currentView === 'backtesting') {
    refreshBacktestingFilterSelects();
  }
}

function renderChipList(containerId, key) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = '';
  (backtestingSettings[key] || []).forEach((item) => {
    const span = document.createElement('span');
    span.className = 'config-chip';
    // Las etiquetas de sesión se pueden renombrar: al pulsar el texto se abre el modal de edición.
    if (key === 'sessions') {
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'config-chip-label';
      label.textContent = item;
      label.title = 'Editar etiqueta';
      label.addEventListener('click', () => openBtSessionTagModal(item));
      span.appendChild(label);
    } else {
      span.appendChild(document.createTextNode(item));
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'config-chip-remove';
    btn.setAttribute('aria-label', 'Quitar');
    btn.dataset.btKey = key;
    btn.dataset.btVal = encodeURIComponent(item);
    btn.textContent = '×';
    span.appendChild(btn);
    el.appendChild(span);
  });
}

function renderBacktestingSettings() {
  renderBacktestingStrategiesConfigList();
  renderChipList('btSessionsList', 'sessions');

  backtestingAssetComboboxState?.rebuildFromSettings?.();
}

function initBacktestingDirectionToggle() {
  const wrapper = document.querySelector('#backtestingView .bt-direction-toggle');
  const select = document.getElementById('btDirection');
  if (!wrapper || !select) return;

  const sync = (value) => {
    const v = value === 'SHORT' ? 'SHORT' : 'LONG';
    select.value = v;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    wrapper.querySelectorAll('.bt-dir-btn').forEach((btn) => {
      const on = btn.dataset.value === v;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  if (wrapper.dataset.bound !== 'true') {
    wrapper.dataset.bound = 'true';
    wrapper.querySelectorAll('.bt-dir-btn').forEach((btn) => {
      btn.addEventListener('click', () => sync(btn.dataset.value));
    });
  }

  sync(select.value || 'LONG');
}

function syncBacktestingFormAccordionDom() {
  const root = document.getElementById('backtestingView');
  if (!root) return;
  const mgmt = root.querySelector('.bt-form-accordion[data-section="management"]');
  const res = root.querySelector('.bt-form-accordion[data-section="result"]');
  if (mgmt) mgmt.classList.toggle('open', !btManagementCollapsed);
  if (res) res.classList.toggle('open', !btResultCollapsed);
}

function initBacktestingFormAccordions() {
  document.querySelectorAll('#backtestingView .bt-form-accordion-header').forEach((header) => {
    if (header.dataset.bound === 'true') return;
    header.dataset.bound = 'true';
    header.addEventListener('click', () => {
      const acc = header.closest('.bt-form-accordion');
      const sec = acc?.getAttribute('data-section');
      if (sec === 'management') {
        btManagementCollapsed = !btManagementCollapsed;
      } else if (sec === 'result') {
        btResultCollapsed = !btResultCollapsed;
      } else {
        acc?.classList.toggle('open');
        void refreshLucideIcons();
        return;
      }
      syncBacktestingFormAccordionDom();
      void refreshLucideIcons();
    });
  });
}

function refreshBacktestingFormUiWidgets() {
  initBacktestingDirectionToggle();
  initBacktestingFormAccordions();
  syncBacktestingFormAccordionDom();
  initBacktestingModeToggles();
  syncBacktestingModeToggleButtonsFromHidden();
  initBacktestingFormCalculationListeners();
  initBacktestingResultPnlSync();
  updateBacktestingPnlConversionHint();
  updateBacktestingDerivedRFields();
  applyTranslations(document.getElementById('backtestingView'));
  void refreshLucideIcons();
}

function populateBacktestingSelects() {
  const stratSel = document.getElementById('btStrategy');
  const accSel = document.getElementById('btAccount');
  const sessSel = document.getElementById('btSession');
  const strategies = getBacktestingStrategyNames();
  const accounts = backtestingSettings.accounts || [];
  const sessions = backtestingSettings.sessions || [];

  function refill(sel, items) {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">—</option>';
    items.forEach((s) => {
      const op = document.createElement('option');
      op.value = s;
      op.textContent = s;
      sel.appendChild(op);
    });
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    else sel.value = '';
  }

  refill(stratSel, strategies);
  refill(accSel, accounts);
  backtestingAssetComboboxState?.rebuildFromSettings?.();
  refill(sessSel, sessions);
  refreshBacktestingCustomSelect(stratSel);
  refreshBacktestingCustomSelect(sessSel);
}

const BT_INCLUDE_BE_KEY = 'backtesting_include_be';

function isBacktestingIncludeBeEnabled() {
  const value = localStorage.getItem(BT_INCLUDE_BE_KEY);
  return value === null ? true : value === 'true';
}

function setBacktestingIncludeBeEnabled(enabled) {
  localStorage.setItem(BT_INCLUDE_BE_KEY, String(Boolean(enabled)));
}

function getBacktestingPnlInputElement() {
  return document.getElementById('btPnl') || document.getElementById('btPnlEstimated');
}

function parseBacktestingNumber(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBacktestingResultFromPnl(pnlValue) {
  const value = parseBacktestingNumber(pnlValue);

  if (value > 0) return 'TP';
  if (value < 0) return 'SL';
  return 'BE';
}

function normalizeBacktestingPnlByResult(pnlValue, result) {
  const raw = parseBacktestingNumber(pnlValue);
  const abs = Math.abs(raw);

  if (result === 'TP') return abs;
  if (result === 'SL') return -abs;
  if (result === 'BE') return 0;

  return raw;
}

/** Magnitud de PnL "esperada" para un resultado, a partir del riesgo (€, tomado del campo
 * Riesgo € o, si está vacío, de la estrategia) y el RR objetivo de la estrategia: TP = riesgo
 * × RR, SL = riesgo, BE = 0. Se expresa en las mismas unidades que el modo actual de "PnL
 * estimado" (€ o %), para poder escribirla directamente en ese campo. */
function computeBacktestingAutoPnlMagnitude(result) {
  if (result !== 'TP' && result !== 'SL') return 0;

  const strategyName = document.getElementById('btStrategy')?.value || '';
  const strategy = getBacktestingStrategies().find((s) => s.name === strategyName);

  let riskEuro = Number(document.getElementById('btRisk')?.value);
  if (!Number.isFinite(riskEuro) || riskEuro <= 0) {
    riskEuro = Number(getBacktestingStrategyRiskEuroForForm(strategy)) || 0;
  }
  if (!riskEuro || riskEuro <= 0) return 0;

  const rr = Number(strategy?.rr) > 0 ? Number(strategy.rr) : 2;
  const magnitudeEuro = result === 'TP' ? riskEuro * rr : riskEuro;

  const mode = document.getElementById('btPnlMode')?.value || 'money';
  if (mode === 'percent') {
    const capital = getActiveBacktestingSessionCapital();
    return capital > 0 ? (magnitudeEuro / capital) * 100 : 0;
  }
  return magnitudeEuro;
}

/** Rellena "PnL estimado" con la magnitud calculada arriba, solo si el campo sigue "vacío"
 * (0, sin tocar) para no pisar nunca un valor que el usuario haya escrito a mano. Así, con
 * Gestión vacía pero una estrategia con riesgo % y RR objetivo configurados, marcar TP/SL basta
 * para que el PnL (y su sumatoria en € o %) se calcule solo. */
function applyBacktestingAutoPnlIfUnset() {
  const pnlInput = getBacktestingPnlInputElement();
  const resultInput = document.getElementById('btResult');
  if (!pnlInput || !resultInput) return;

  const result = resultInput.value;
  if (parseBacktestingNumber(pnlInput.value) !== 0) return;

  const magnitude = computeBacktestingAutoPnlMagnitude(result);
  if (!magnitude) return;

  pnlInput.value = String(magnitude);
  markBacktestingPnlAsAuto(pnlInput);
}

/* ---------------- PnL automático: recalcular la magnitud al cambiar el resultado ----------------
 * El PnL de TP y de SL NO son el mismo número cuando el RR es distinto de 1: TP = riesgo × RR y
 * SL = riesgo. Antes, al cambiar el desplegable de Resultado solo se invertía el signo del valor
 * que ya hubiera, así que un TP autocalculado de 500 (riesgo 1000 × RR 0,5) se convertía en un SL
 * de -500 cuando debía ser -1000. Con RR 1 coincidían y por eso pasó desapercibido.
 *
 * La magnitud solo se recalcula si el valor lo había puesto la app; si lo escribió el usuario a
 * mano se respeta y únicamente se ajusta el signo.
 */
function markBacktestingPnlAsAuto(input) {
  const el = input || getBacktestingPnlInputElement();
  if (el) el.dataset.autoPnl = 'true';
}

function isBacktestingPnlAuto() {
  return getBacktestingPnlInputElement()?.dataset.autoPnl === 'true';
}

function applyBacktestingAutoPnlForResultChange() {
  const pnlInput = getBacktestingPnlInputElement();
  const resultInput = document.getElementById('btResult');
  if (!pnlInput || !resultInput) return;

  if (parseBacktestingNumber(pnlInput.value) === 0) {
    applyBacktestingAutoPnlIfUnset();
    return;
  }
  if (!isBacktestingPnlAuto()) return;

  const magnitude = computeBacktestingAutoPnlMagnitude(resultInput.value);
  if (!magnitude) return;

  pnlInput.value = String(magnitude);
  markBacktestingPnlAsAuto(pnlInput);
}

function syncBacktestingResultFromPnl() {
  const pnlInput = getBacktestingPnlInputElement();
  const resultInput = document.getElementById('btResult');

  if (!pnlInput || !resultInput) return;

  const result = getBacktestingResultFromPnl(pnlInput.value);

  resultInput.value = result;
  resultInput.dispatchEvent(new Event('change', { bubbles: true }));

  if (typeof refreshCustomSelectLabel === 'function') {
    refreshCustomSelectLabel(resultInput);
  } else {
    refreshCustomSelectForNative(resultInput);
  }

  updateBacktestingPnlConversionHint();
  updateBacktestingDerivedRFields();
}

function syncBacktestingPnlFromResult() {
  const pnlInput = getBacktestingPnlInputElement();
  const resultInput = document.getElementById('btResult');

  if (!pnlInput || !resultInput) return;

  pnlInput.value = String(normalizeBacktestingPnlByResult(pnlInput.value, resultInput.value));

  updateBacktestingPnlConversionHint();
  updateBacktestingDerivedRFields();
}

function initBacktestingResultPnlSync() {
  const pnlInput = getBacktestingPnlInputElement();
  const resultInput = document.getElementById('btResult');

  if (!pnlInput || !resultInput) return;

  if (pnlInput.dataset.resultSyncBound !== 'true') {
    pnlInput.dataset.resultSyncBound = 'true';

    pnlInput.addEventListener('input', () => {
      // Lo ha escrito el usuario: a partir de aquí su valor manda sobre el cálculo automático.
      pnlInput.dataset.autoPnl = 'false';
      syncBacktestingResultFromPnl();
    });

    pnlInput.addEventListener('blur', () => {
      syncBacktestingResultFromPnl();
      syncBacktestingPnlFromResult();
    });
  }

  if (resultInput.dataset.pnlSyncBound !== 'true') {
    resultInput.dataset.pnlSyncBound = 'true';

    resultInput.addEventListener('change', () => {
      applyBacktestingAutoPnlForResultChange();
      syncBacktestingPnlFromResult();
    });
  }
}

function initBacktestingIncludeBeSwitch() {
  const el = document.getElementById('btIncludeBeSwitch');
  if (!el) return;
  el.checked = isBacktestingIncludeBeEnabled();
  if (el.dataset.bound === 'true') return;
  el.dataset.bound = 'true';
  el.addEventListener('change', () => {
    setBacktestingIncludeBeEnabled(el.checked);
    rerenderBacktestingLocal();
  });
}

function initBtExcludeOutOfScheduleSwitch() {
  const el = document.getElementById('btExcludeOutOfSchedule');
  if (!el) return;
  if (el.dataset.bound !== 'true') {
    el.dataset.bound = 'true';
    el.addEventListener('change', () => {
      void saveBtExcludeScheduleState();
      rerenderBacktestingLocal();
    });
  }
}

function ensureBacktestingScheduleFormListeners() {
  ensureBtStrategyModalScheduleListeners();
  if (document.documentElement.dataset.btScheduleFormBound === 'true') return;
  document.documentElement.dataset.btScheduleFormBound = 'true';

  ['btEntryTime', 'btExitTime', 'btDate'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateBacktestingTradeScheduleHints);
    document.getElementById(id)?.addEventListener('change', updateBacktestingTradeScheduleHints);
  });
  document.getElementById('btStrategy')?.addEventListener('change', updateBacktestingTradeScheduleHints);
}

function getBacktestingEstimatedPnlMoney() {
  const input = getBacktestingPnlInputElement();
  const mode = document.getElementById('btPnlMode')?.value || 'money';

  const raw = parseBacktestingNumber(input?.value);
  if (!Number.isFinite(raw)) return 0;

  if (mode === 'percent') {
    const capital = getActiveBacktestingSessionCapital();
    return capital > 0 ? (capital * raw) / 100 : 0;
  }

  return raw;
}

function getBacktestingPipSize(asset = '') {
  const pair = String(asset || '').toUpperCase();
  if (pair.includes('JPY')) return 0.01;
  if (pair.includes('XAU') || pair.includes('GOLD')) return 0.1;
  if (
    pair.includes('NAS') ||
    pair.includes('SPX') ||
    pair.includes('US30') ||
    pair.includes('GER') ||
    pair.includes('DAX')
  ) {
    return 1;
  }
  return 0.0001;
}

function getBacktestingEffectivePriceLevel(slOrTpInputId, modeInputId, entryValue, direction, asset) {
  const input = document.getElementById(slOrTpInputId);
  const mode = document.getElementById(modeInputId)?.value === 'pips' ? 'pips' : 'price';

  const raw = Number(String(input?.value || '').replace(',', '.'));
  const entry = Number(String(entryValue ?? '').replace(',', '.'));

  if (!Number.isFinite(raw)) return null;

  if (mode === 'price') return raw;

  if (!Number.isFinite(entry)) return null;

  const pipSize = getBacktestingPipSize(asset);
  const distance = raw * pipSize;

  if (slOrTpInputId === 'btSl') {
    return direction === 'LONG' ? entry - distance : entry + distance;
  }

  if (slOrTpInputId === 'btTp') {
    return direction === 'LONG' ? entry + distance : entry - distance;
  }

  return raw;
}

function resolveBacktestingPriceForSave(inputId, modeId, entryVal, direction, asset) {
  const modeEl = document.getElementById(modeId);
  const mode = modeEl?.value === 'pips' ? 'pips' : 'price';
  if (mode === 'pips') {
    const p = getBacktestingEffectivePriceLevel(inputId, modeId, entryVal, direction, asset);
    return Number.isFinite(p) ? p : 0;
  }
  const raw = Number(String(document.getElementById(inputId)?.value || '').replace(',', '.'));
  return Number.isFinite(raw) ? raw : 0;
}

function updateBacktestingPnlConversionHint() {
  const pnlInput = getBacktestingPnlInputElement();
  const modeInput = document.getElementById('btPnlMode');
  const hint = document.getElementById('btPnlConvertedHint');

  if (!pnlInput || !modeInput || !hint) return;

  const capital = getActiveBacktestingSessionCapital();
  const raw = parseBacktestingNumber(pnlInput.value);

  if (!capital || !Number.isFinite(raw)) {
    hint.textContent = '';
    return;
  }

  if (modeInput.value === 'percent') {
    const euros = (capital * raw) / 100;
    hint.textContent = t('bt_pnl_hint_from_pct', '{pct}% ≈ €{eur}')
      .replace('{pct}', raw.toFixed(2))
      .replace('{eur}', euros.toFixed(2));
  } else {
    const percent = (raw / capital) * 100;
    hint.textContent = t('bt_pnl_hint_from_eur', '€{eur} ≈ {pct}%')
      .replace('{eur}', raw.toFixed(2))
      .replace('{pct}', percent.toFixed(2));
  }
}

function updateBacktestingAutoRR() {
  const asset = document.getElementById('btAsset')?.value || '';
  const direction = document.getElementById('btDirection')?.value || 'LONG';
  const entry = Number(String(document.getElementById('btEntry')?.value || '').replace(',', '.'));

  const sl = getBacktestingEffectivePriceLevel('btSl', 'btSlMode', entry, direction, asset);
  const tp = getBacktestingEffectivePriceLevel('btTp', 'btTpMode', entry, direction, asset);

  const planned = document.getElementById('btRrPlanned');
  if (!planned) return;

  if (!Number.isFinite(entry) || sl == null || tp == null) {
    planned.value = '';
    return;
  }

  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);

  planned.value = risk > 0 ? String((reward / risk).toFixed(2)) : '';
}

function updateBacktestingDerivedRFields() {
  updateBacktestingAutoRR();
  const rrRes = document.getElementById('btRrResult');
  if (!rrRes) return;

  const res = document.getElementById('btResult')?.value || 'BE';

  const pnlMoneyForR = normalizeBacktestingPnlByResult(getBacktestingEstimatedPnlMoney(), res);

  const strategyName = document.getElementById('btStrategy')?.value || '';

  const rrAuto = calculateBacktestingRFromPnl(pnlMoneyForR, strategyName);

  const rrNum = Number.isFinite(rrAuto) ? rrAuto : 0;

  rrRes.value =
    Math.abs(rrNum) < 1e-12 ? '0' : String(Math.round(rrNum * 10000) / 10000);
}

function syncOneBacktestingModeToggleUI(toggle, hidden) {
  if (!toggle || !hidden) return;
  const v = hidden.value;
  toggle.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === v);
  });
}

function syncBacktestingModeToggleButtonsFromHidden() {
  document.querySelectorAll('#backtestingView .bt-mode-toggle').forEach((toggle) => {
    const id = toggle.dataset.target;
    const hidden = id ? document.getElementById(id) : null;
    syncOneBacktestingModeToggleUI(toggle, hidden);
  });
}

function initBacktestingModeToggles() {
  document.querySelectorAll('#backtestingView .bt-mode-toggle').forEach((toggle) => {
    const targetId = toggle.dataset.target;
    const hidden = targetId ? document.getElementById(targetId) : null;

    if (toggle.dataset.bound !== 'true') {
      toggle.dataset.bound = 'true';
      toggle.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          toggle.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          if (hidden) {
            const prevMode = hidden.value;
            const nextMode = btn.dataset.value;
            // Al cambiar € <-> % en el PnL estimado hay que convertir el número que ya hay en el
            // campo, no solo la etiqueta del modo: si no, 500€ (1% de 50.000€) se queda como
            // "500" al pasar a %, que se interpretaría como un 500% en vez de un 1%.
            if (hidden.id === 'btPnlMode' && prevMode !== nextMode) {
              const pnlInput = getBacktestingPnlInputElement();
              const capital = getActiveBacktestingSessionCapital();
              if (pnlInput && capital > 0) {
                const raw = parseBacktestingNumber(pnlInput.value);
                if (raw) {
                  const converted =
                    nextMode === 'percent' ? (raw / capital) * 100 : (raw * capital) / 100;
                  pnlInput.value = String(Math.round(converted * 100) / 100);
                }
              }
            }
            hidden.value = nextMode;
            hidden.dispatchEvent(new Event('change', { bubbles: true }));
          }
          updateBacktestingPnlConversionHint();
          updateBacktestingDerivedRFields();
        });
      });
    }

    syncOneBacktestingModeToggleUI(toggle, hidden);
  });
}

let btFormCalculationListenersBound = false;

function initBacktestingFormCalculationListeners() {
  if (btFormCalculationListenersBound) return;
  if (!document.getElementById('backtestingView')) return;

  btFormCalculationListenersBound = true;

  const onGeom = () => updateBacktestingDerivedRFields();

  const onHintAndR = () => {
    updateBacktestingPnlConversionHint();
    updateBacktestingDerivedRFields();
  };

  ['btEntry', 'btSl', 'btTp'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', onGeom);
    document.getElementById(id)?.addEventListener('change', onGeom);
  });

  document.getElementById('btDirection')?.addEventListener('change', onGeom);
  document.getElementById('btAsset')?.addEventListener('change', onGeom);

  ['btSlMode', 'btTpMode'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', onGeom);
  });

  const pnlEstimated = document.getElementById('btPnlEstimated');
  const pnlEl = getBacktestingPnlInputElement();

  const bindPnlDerived = (el) => {
    if (!el) return;
    el.addEventListener('input', onHintAndR);
    el.addEventListener('change', onHintAndR);
  };

  bindPnlDerived(pnlEl);
  if (pnlEstimated && pnlEstimated !== pnlEl) bindPnlDerived(pnlEstimated);

  const onRiskChange = () => {
    applyBacktestingAutoPnlIfUnset();
    syncBacktestingPnlFromResult();
    updateBacktestingDerivedRFields();
  };
  document.getElementById('btPnlMode')?.addEventListener('change', onHintAndR);
  document.getElementById('btRisk')?.addEventListener('input', onRiskChange);
  document.getElementById('btRisk')?.addEventListener('change', onRiskChange);
}

/**
 * Campos que NO cambian entre operaciones de una misma tanda de backtesting: día que se está
 * testeando, par, estrategia, cuenta, sesión y los parámetros de riesgo/RR del plan. Tras
 * guardar un trade se conservan y se reinicia todo lo demás (horas, precios, resultado, PnL,
 * notas, imágenes, métricas), que es lo único que cambia de una operación a la siguiente.
 */
const BT_STICKY_FIELD_IDS = [
  'btDate',
  'btAsset',
  'btStrategy',
  'btAccount',
  'btSession',
  'btRisk',
  'btRrPlanned',
  'btSlMode',
  'btTpMode',
  'btPnlMode',
];

/** Reinicio «rápido» tras guardar: limpia el formulario pero devuelve el contexto de trabajo. */
function resetBacktestFormForNextTrade() {
  const snapshot = {};
  BT_STICKY_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) snapshot[id] = el.value;
  });

  clearBacktestForm();

  BT_STICKY_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = snapshot[id];
    if (val == null || val === '') return;
    // Los <select> solo aceptan valores que sigan existiendo entre sus opciones (por ejemplo
    // si la sesión limita los pares permitidos): si ya no está, se deja el valor por defecto.
    if (el.tagName === 'SELECT' && ![...el.options].some((o) => o.value === val)) return;
    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // El par usa un combobox propio: hay que sincronizar además su estado y su etiqueta visible,
  // porque no se entera de que el <select> oculto ha cambiado de valor.
  const assetVal = snapshot.btAsset;
  if (assetVal) {
    const assetLabel = document.getElementById('btAssetComboLabel');
    if (assetLabel) assetLabel.textContent = assetVal;
    if (backtestingAssetComboboxState) {
      backtestingAssetComboboxState.selectedValue = assetVal;
      backtestingAssetComboboxState.value = assetVal;
      backtestingAssetComboboxState.setValue?.(assetVal);
    }
  }
  refreshBacktestingCustomSelect(document.getElementById('btStrategy'));
  refreshBacktestingCustomSelect(document.getElementById('btSession'));

  refreshBacktestingFormUiWidgets();
  // El PnL automático depende de riesgo/RR, que acabamos de restaurar.
  applyBacktestingAutoPnlIfUnset();
  syncBacktestingPnlFromResult();
  updateBacktestingDerivedRFields();
}

function clearBacktestForm() {
  editingBacktestingTradeId = null;
  btManagementCollapsed = true;
  btResultCollapsed = false;
  const hid = document.getElementById('btEditId');
  if (hid) hid.value = '';
  const saveBtn = document.getElementById('btSaveBacktest');
  if (saveBtn) saveBtn.textContent = t('bt_save_operation', 'Guardar operación');
  const today = getTodayDateString();
  const ids = [
    ['btDate', today],
    ['btEntryTime', ''],
    ['btExitTime', ''],
    ['btEntry', ''],
    ['btSl', ''],
    ['btTp', ''],
    ['btRisk', ''],
    ['btRrPlanned', ''],
    ['btRrResult', ''],
    ['btPnl', ''],
    ['btNotes', '']
  ];
  ids.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });
  // btEntryTime/btExitTime tienen un timepicker propio que solo se entera de los cambios de
  // valor vía el evento 'change' del <input> nativo; sin esto, tras limpiar el formulario la
  // etiqueta visible del timepicker se quedaría mostrando la hora anterior.
  document.getElementById('btEntryTime')?.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('btExitTime')?.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('btDate')?.dispatchEvent(new Event('change', { bubbles: true }));
  const slMode = document.getElementById('btSlMode');
  const tpMode = document.getElementById('btTpMode');
  const pnlMode = document.getElementById('btPnlMode');
  if (slMode) slMode.value = 'price';
  if (tpMode) tpMode.value = 'price';
  if (pnlMode) pnlMode.value = 'money';
  const pnlHint = document.getElementById('btPnlConvertedHint');
  if (pnlHint) pnlHint.textContent = '';
  document.getElementById('btDirection').value = 'LONG';
  document.getElementById('btResult').value = 'TP';
  const btBeAfter = document.getElementById('btBeAfterResult');
  if (btBeAfter) btBeAfter.value = '';
  populateBacktestingSelects();
  const d = backtestingSettings;
  const pick = (selId, defVal) => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    if (!defVal) {
      sel.value = '';
      return;
    }
    sel.value = [...sel.options].some((o) => o.value === defVal) ? defVal : '';
  };
  pick('btAccount', d.default_account);
  pick('btStrategy', d.default_strategy);
  pick('btAsset', d.default_asset);
  pick('btSession', '');
  const riskEl = document.getElementById('btRisk');
  const rrEl = document.getElementById('btRrPlanned');
  if (riskEl) riskEl.value = '';
  if (rrEl) rrEl.value = '';
  renderBacktestingCustomMetricFields({});
  btBeforeImagePath = '';
  btAfterImagePath = '';
  const btBeforeInput = document.getElementById('btBeforeImage');
  if (btBeforeInput) btBeforeInput.value = '';
  const btAfterInput = document.getElementById('btAfterImage');
  if (btAfterInput) btAfterInput.value = '';
  void updateImagePreview('btBeforeImagePreview', 'openBtBeforeImageBtn', '');
  void updateImagePreview('btAfterImagePreview', 'openBtAfterImageBtn', '');
  const msg = document.getElementById('btFormMsg');
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-hint';
  }
  refreshBacktestingFormUiWidgets();
  updateBacktestingTradeScheduleHints();

  // Si hay una sesión activa ("Trabajar"), re-aplica su par/estrategia/riesgo por encima de los
  // valores por defecto genéricos de arriba, para que la sesión se mantenga seleccionada trade
  // tras trade sin tener que volver a pulsar "Trabajar". Esta función también fuerza, en
  // cualquier caso (con o sin sesión activa), el auto-cálculo del PnL: btResult y btStrategy se
  // dejan con un valor por defecto ('TP' / estrategia por defecto) sin pasar por sus listeners de
  // 'change' (los que auto-rellenan Riesgo € y el PnL a partir del riesgo%/RR), así que sin esto
  // un trade nuevo guardado sin tocar esos campos se quedaría con PnL 0.
  if (Number(activeBacktestingSessionId) > 0) {
    applyActiveBacktestingSessionToTradeForm();
  } else {
    const riskElAfterClear = document.getElementById('btRisk');
    const strategyNameAfterClear = document.getElementById('btStrategy')?.value || '';
    const strategyAfterClear = getBacktestingStrategies().find((s) => s.name === strategyNameAfterClear);
    if (strategyAfterClear && riskElAfterClear && !riskElAfterClear.value) {
      const autoRisk = getBacktestingStrategyRiskEuroForForm(strategyAfterClear);
      if (autoRisk !== '') riskElAfterClear.value = autoRisk;
    }
    applyBacktestingAutoPnlIfUnset();
    syncBacktestingPnlFromResult();
  }
}

async function loadBacktestingSessions() {
  const api = getBackendApi();
  if (!api?.getBacktestingSessions) return;
  try {
    const result = await api.getBacktestingSessions();
    if (result?.success && Array.isArray(result.data)) {
      cachedBacktestingSessions = result.data;
    }
  } catch (e) {
    console.warn('loadBacktestingSessions', e);
  }
}

async function loadBacktestingMetrics() {
  const api = getBackendApi();
  if (!api?.getBacktestingMetrics) return;
  try {
    const result = await api.getBacktestingMetrics();
    if (result?.success && Array.isArray(result.data)) {
      cachedBacktestingMetrics = result.data;
    }
  } catch (e) {
    console.warn('loadBacktestingMetrics', e);
  }
}

async function refreshBacktestingView(opts = {}) {
  const skipTradeFetch = opts.skipTradeFetch === true;
  if (!(await ensureUserReady())) return;
  await loadBacktestingSettings();
  await loadBacktestingSessions();
  await loadBacktestingMetrics();
  const backend = getBackendApi();
  if (!skipTradeFetch) {
    if (!backend?.getBacktestTrades) {
      console.warn('Backtesting API no disponible');
      return;
    }
    try {
      const rawList = await backend.getBacktestTrades();
      cachedBacktestingTrades = Array.isArray(rawList) ? rawList : [];
      console.log('📥 Backtesting trades (Supabase → caché):', cachedBacktestingTrades.length);
    } catch (e) {
      console.error(e);
      cachedBacktestingTrades = [];
    }
  }
  initBacktestingAssetCombobox();
  refreshBacktestingFilterSelects();
  populateBacktestingSelects();
  renderBacktestingSessionCards();
  renderBacktestingCustomMetricFields({});
  rerenderBacktestingLocal();
  refreshBacktestingFormUiWidgets();
  initBacktestingCommissionConfig();
  // Las capturas de las operaciones nuevas se copian al bucket del informe compartido. Los datos
  // del enlace son en vivo, pero las imágenes necesitan que la app esté abierta para copiarse.
  void getBackendApi()?.syncLiveShareImages?.(cachedBacktestingTrades || []);
  void loadBtExcludeScheduleState();
  ensureBacktestingScheduleFormListeners();
}

function rerenderBacktestingLocal() {
  const filteredForDiscipline = getFilteredBacktestingTrades();
  const filteredForMetrics = getBacktestingTradesForMetrics();
  renderBacktestingMetrics(filteredForMetrics);
  renderBacktestingScheduleDiscipline(filteredForDiscipline);
  renderBacktestingPairTable(filteredForMetrics);
  renderBacktestingMetricAnalysis(filteredForMetrics);
  renderBacktestingMetricExplorer(filteredForMetrics);
  // Un grafico dibujado dentro de un panel oculto se queda con tamano 0, asi que solo se pinta
  // con su pestana a la vista; al entrar en ella se vuelve a pintar.
  if (backtestingViewActiveTab === 'stats') renderBacktestingEquityCurve(filteredForMetrics);
  // Solo si su pestaña está a la vista: son ~9 simulaciones de Monte Carlo y no tiene sentido
  // pagarlas en cada refresco del calendario. Al abrir la pestaña se recalcula.
  if (backtestingViewActiveTab === 'challenges') renderBacktestingChallenge(filteredForMetrics);
  renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
  renderBacktestingDayTrades();
  initBacktestingIncludeBeSwitch();
  initBtExcludeOutOfScheduleSwitch();
}

function openBacktestingCommissionModal() {
  const overlay = document.getElementById('btCommissionModalOverlay');
  const modal = document.getElementById('btCommissionConfigModal');
  const minEl = document.getElementById('btCommissionMinPercent');
  const maxEl = document.getElementById('btCommissionMaxPercent');
  const enabledEl = document.getElementById('btCommissionEnabled');
  if (enabledEl) enabledEl.checked = localStorage.getItem('bt_commission_enabled') !== 'false';
  if (
    localStorage.getItem('bt_commission_min_percent') == null &&
    localStorage.getItem('bt_commission_max_percent') == null &&
    localStorage.getItem('bt_commission_value')
  ) {
    const legacy = Number(localStorage.getItem('bt_commission_value'));
    if (Number.isFinite(legacy) && legacy > 0) {
      setBacktestingCommissionRange(legacy, legacy);
    }
  }
  if (minEl) minEl.value = String(getBacktestingCommissionMinPercent());
  if (maxEl) maxEl.value = String(getBacktestingCommissionMaxPercent());
  modal?.classList.remove('hidden');
  overlay?.classList.add('active');
}

function closeBacktestingCommissionModal() {
  const overlay = document.getElementById('btCommissionModalOverlay');
  const modal = document.getElementById('btCommissionConfigModal');
  overlay?.classList.remove('active');
  modal?.classList.add('hidden');
}

function initBacktestingCommissionConfig() {
  if (document.documentElement.dataset.btCommissionConfigBound === 'true') return;
  document.documentElement.dataset.btCommissionConfigBound = 'true';

  const overlay = document.getElementById('btCommissionModalOverlay');
  const openBtn = document.getElementById('btCommissionConfigBtn');
  const closeBtn = document.getElementById('btCloseCommissionConfig');
  const saveBtn = document.getElementById('btSaveCommissionConfig');
  const commissionEnabledToggle = document.getElementById('btCommissionEnabled');

  commissionEnabledToggle?.addEventListener('change', () => {
    localStorage.setItem(
      'bt_commission_enabled',
      commissionEnabledToggle.checked ? 'true' : 'false'
    );
    rerenderBacktestingLocal();
  });

  openBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openBacktestingCommissionModal();
  });

  closeBtn?.addEventListener('click', () => {
    closeBacktestingCommissionModal();
  });

  saveBtn?.addEventListener('click', () => {
    const en = document.getElementById('btCommissionEnabled');
    const enabled = Boolean(en?.checked);
    const min = Number(document.getElementById('btCommissionMinPercent')?.value || 0);
    const max = Number(document.getElementById('btCommissionMaxPercent')?.value || 0);

    localStorage.setItem('bt_commission_enabled', enabled ? 'true' : 'false');
    setBacktestingCommissionRange(min, max);

    rerenderBacktestingLocal();
    closeBacktestingCommissionModal();

    showToast('Comisiones actualizadas', 'success');
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeBacktestingCommissionModal();
  });
}

function formatDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function applyBacktestingSessionQuickRange(range) {
  const startInput = document.getElementById('btSessionStartDate');
  const endInput = document.getElementById('btSessionEndDate');

  if (!startInput || !endInput) return;

  const end = new Date();
  const start = new Date();

  if (range === 'today') {
    start.setFullYear(end.getFullYear(), end.getMonth(), end.getDate());
    end.setFullYear(end.getFullYear(), end.getMonth(), end.getDate());
  } else if (range === '1m') {
    start.setMonth(start.getMonth() - 1);
  } else if (range === '3m') {
    start.setMonth(start.getMonth() - 3);
  } else if (range === '1y') {
    start.setFullYear(start.getFullYear() - 1);
  }

  startInput.value = formatDateInputValue(start);
  endInput.value = formatDateInputValue(end);

  // Los campos de fecha están envueltos por el datepicker propio, que solo refresca su etiqueta
  // visible al recibir el evento 'change' del input nativo. Sin esto la fecha sí se asignaba,
  // pero los recuadros seguían mostrando "DD-MM-AAAA" y parecía que los botones no hacían nada.
  startInput.dispatchEvent(new Event('change', { bubbles: true }));
  endInput.dispatchEvent(new Event('change', { bubbles: true }));
  syncCustomDatepicker('btSessionStartDate');
  syncCustomDatepicker('btSessionEndDate');
}

function populateBacktestingSessionModalForm() {
  btSessionPairsCatalog = getAvailableTradingAssets();
  ensureBtSessionPairMultiSelectProBound();
  const search = document.getElementById('btSessionPairSearch');
  if (search) search.value = '';
  const strategySelect = document.getElementById('btSessionStrategy');
  if (strategySelect) {
    const strategies = getBacktestingStrategyNames();
    strategySelect.innerHTML = `<option value="">${'Sin estrategia'}</option>${strategies
      .map((name) => `<option value="${escapeAttrChip(name)}">${escapeHtmlChipText(name)}</option>`)
      .join('')}`;
  }
}

function openBacktestingSessionModal(sessionId) {
  const ov = document.getElementById('btSessionModalOverlay');
  if (!ov) return;
  populateBacktestingSessionModalForm();
  const title = document.getElementById('btSessionModalTitle');
  const hid = document.getElementById('btSessionEditId');
  if (sessionId) {
    const sess = (cachedBacktestingSessions || []).find((s) => Number(s.id) === Number(sessionId));
    if (title) title.textContent = 'Editar sesión de backtesting';
    if (hid) hid.value = String(sessionId);
    if (sess) {
      const setv = (id, v) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = v ?? '';
        // Necesario para que los selectores propios de fecha refresquen su etiqueta visible.
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setv('btSessionName', sess.name);
      setv('btSessionStartDate', sess.start_date || '');
      setv('btSessionEndDate', sess.end_date || '');
      setv('btSessionStatus', sess.status || 'in_progress');
      setv('btSessionNotes', sess.notes);
      setv('btSessionStrategy', sess.strategy || '');
      setv(
        'btSessionCapital',
        sess.account_capital != null && sess.account_capital !== '' ? String(sess.account_capital) : ''
      );
      btSessionSelectedPairs = getSessionPairs(sess);
      syncBtSessionPairMultiSelectUI();
      const stSel = document.getElementById('btSessionStrategy');
      if (stSel && sess.strategy) {
        ensureSelectHasValue(stSel, sess.strategy);
      }
    }
  } else {
    if (title) title.textContent = 'Nueva sesión de backtesting';
    if (hid) hid.value = '';
    ['btSessionName', 'btSessionStartDate', 'btSessionEndDate', 'btSessionNotes', 'btSessionCapital'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = '';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const st = document.getElementById('btSessionStatus');
    if (st) st.value = 'in_progress';
    btSessionSelectedPairs = [];
    syncBtSessionPairMultiSelectUI();
    document.getElementById('btSessionPairMultiSelect')?.classList.remove('open');
    applyBacktestingSessionQuickRange('1m');
  }
  // Estrategia/Estado usan el mismo desplegable "custom-select" que el resto de la app (antes
  // este modal los excluía explícitamente y se veían como <select> nativos sin estilo). Se
  // refresca aquí, después de poblar opciones y valores, para reflejar el estado actual.
  refreshCustomSelectForNative(document.getElementById('btSessionStrategy'));
  refreshCustomSelectForNative(document.getElementById('btSessionStatus'));
  ov.classList.add('active');
  void refreshLucideIcons();
}

function closeBacktestingSessionModal() {
  document.getElementById('btSessionModalOverlay')?.classList.remove('active');
}

async function saveBacktestingSessionFromModal() {
  if (!(await ensureUserReady())) return;
  if (!(await syncSupabaseSessionWithMain())) {
    showToast('Tu sesión ha caducado o no se pudo verificar. Cierra sesión y vuelve a entrar, e inténtalo de nuevo.', 'error');
    return;
  }
  const api = getBackendApi();
  if (!api?.addBacktestingSession || !api?.updateBacktestingSession) return;
  const rawId = document.getElementById('btSessionEditId')?.value;
  const id = rawId ? Number(rawId) : 0;
  const selectedPairs = btSessionSelectedPairs.map((s) => String(s || '').trim()).filter(Boolean);
  const selectedPairsValue = Array.isArray(selectedPairs)
    ? selectedPairs.join(',')
    : String(selectedPairs || '');
  const payload = {
    name: document.getElementById('btSessionName')?.value?.trim() || '',
    asset: selectedPairsValue,
    strategy: document.getElementById('btSessionStrategy')?.value || '',
    start_date: document.getElementById('btSessionStartDate')?.value || null,
    end_date: document.getElementById('btSessionEndDate')?.value || null,
    status: document.getElementById('btSessionStatus')?.value || 'in_progress',
    notes: document.getElementById('btSessionNotes')?.value || '',
    account_capital: Number(document.getElementById('btSessionCapital')?.value || 0)
  };
  if (!payload.name) {
    showToast('Indica un nombre de sesión', 'error');
    return;
  }
  if (!selectedPairs.length) {
    showToast('Selecciona al menos un par', 'error');
    return;
  }
  if (!payload.start_date) {
    showToast('Indica la fecha de inicio', 'error');
    return;
  }
  if (!payload.end_date) {
    showToast('Indica la fecha de fin', 'error');
    return;
  }
  let result;
  if (Number.isFinite(id) && id > 0) {
    result = await api.updateBacktestingSession({ ...payload, id });
  } else {
    result = await api.addBacktestingSession(payload);
  }
  if (!result?.success) {
    console.error('❌ Error guardando sesión backtesting:', result?.error || result);
    showToast(
      typeof result?.error === 'string'
        ? result.error
        : result?.error?.message || 'No se pudo guardar la sesión',
      'error'
    );
    return;
  }
  showToast('Sesión guardada', 'success');
  selectedPairs.forEach((p) => addRecentBtPair(p));
  closeBacktestingSessionModal();
  await loadBacktestingSessions();
  backtestingAssetComboboxState?.rebuildFromSettings?.();

  const savedId =
    result?.data?.id != null && result.data.id !== undefined
      ? Number(result.data.id)
      : Number.isFinite(id) && id > 0
        ? id
        : null;

  refreshBacktestingFilterSelects();

  if (savedId) {
    // La sesión recién guardada pasa a ser la activa (es sobre la que se va a trabajar), pero
    // NO se toca el filtro si estaba en "todas": antes se reducía a la nueva sesión y, como el
    // listado de tarjetas respeta ese filtro, las sesiones anteriores desaparecían de la vista
    // y parecía que se habían borrado.
    activeBacktestingSessionId = savedId;
    if (!selectedBacktestingSessionIds.includes('all')) {
      // Si había un filtro concreto, se añade la nueva para que no quede invisible.
      selectedBacktestingSessionIds = [
        ...new Set([...selectedBacktestingSessionIds, String(savedId)]),
      ];
    }
    initBacktestingSessionFilter();
  }

  renderBacktestingSessionCards();
  rerenderBacktestingLocal();
}

async function deleteBacktestingSessionById(sessionId) {
  const id = Number(sessionId);
  if (!Number.isFinite(id) || id <= 0) return;
  const tradesInSession = (Array.isArray(cachedBacktestingTrades) ? cachedBacktestingTrades : []).filter(
    (tr) => Number(tr?.session_id) === id
  ).length;
  const okSession = await showConfirmModal({
    title: 'Eliminar sesión',
    message: tradesInSession
      ? `¿Seguro que quieres eliminar esta sesión de backtesting? Se eliminarán también sus ${tradesInSession} trade${tradesInSession === 1 ? '' : 's'}. Esta acción no se puede deshacer.`
      : '¿Seguro que quieres eliminar esta sesión de backtesting? Esta acción no se puede deshacer.',
    confirmText: 'Eliminar',
    cancelText: 'Cancelar',
    danger: true,
  });
  if (!okSession) return;
  const api = getBackendApi();
  if (!api?.deleteBacktestingSession) return;
  const result = await api.deleteBacktestingSession(id);
  if (!result?.success) {
    showToast('No se pudo eliminar', 'error');
    return;
  }
  showToast('Sesión eliminada', 'success');
  if (Number(activeBacktestingSessionId) === Number(id)) activeBacktestingSessionId = null;
  selectedBacktestingSessionIds = selectedBacktestingSessionIds.filter((sid) => String(sid) !== String(id));
  if (!selectedBacktestingSessionIds.includes('all') && selectedBacktestingSessionIds.length === 0) {
    selectedBacktestingSessionIds = ['all'];
  }
  await loadBacktestingSessions();
  try {
    cachedBacktestingTrades = (await getBackendApi().getBacktestTrades()) || [];
  } catch (_) {
    cachedBacktestingTrades = [];
  }
  refreshBacktestingFilterSelects();
  renderBacktestingSessionCards();
  rerenderBacktestingLocal();
}

function btMetricTypeDisplayLabel(metricType) {
  switch (String(metricType || '').toLowerCase()) {
    case 'number':
      return 'Número';
    case 'text':
      return 'Texto';
    default:
      return 'Checkbox';
  }
}

/* ── Modales de Métricas y Etiquetas de sesión ──────────────────────────────────────────────
 * Antes eran formularios inline dentro de la página de configuración; ahora siguen el mismo
 * patrón que Estrategias (botón «Nueva…» + modal), que es más limpio y permite editar sin que
 * el formulario quede descolgado del elemento que se está editando.
 */
function openBtMetricModal(metric = null) {
  const overlay = document.getElementById('btMetricModalOverlay');
  if (!overlay) return;
  editingBtMetricId = metric ? Number(metric.id) : null;

  const title = document.getElementById('btMetricModalTitle');
  if (title) title.textContent = metric ? 'Editar métrica' : 'Nueva métrica';
  const setVal = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.value = v ?? '';
  };
  setVal('btMetricEditId', metric ? String(metric.id) : '');
  setVal('btMetricNameInput', metric?.name || '');
  setVal('btMetricDescInput', metric?.description || '');
  const typeSel = document.getElementById('btMetricTypeInput');
  if (typeSel) {
    typeSel.value = metric?.metric_type || 'checkbox';
    refreshCustomSelectForNative(typeSel);
  }
  const activeEl = document.getElementById('btMetricActiveInput');
  if (activeEl) activeEl.checked = metric ? metric.is_active !== false : true;

  overlay.classList.add('active');
  document.getElementById('btMetricNameInput')?.focus();
}

function closeBtMetricModal() {
  document.getElementById('btMetricModalOverlay')?.classList.remove('active');
  editingBtMetricId = null;
}

let editingBtSessionTag = null;

function openBtSessionTagModal(tag = null) {
  const overlay = document.getElementById('btSessionTagModalOverlay');
  if (!overlay) return;
  editingBtSessionTag = tag;
  const title = document.getElementById('btSessionTagModalTitle');
  if (title) title.textContent = tag ? 'Editar etiqueta' : 'Nueva etiqueta';
  const input = document.getElementById('btSessionInput');
  if (input) input.value = tag || '';
  const original = document.getElementById('btSessionTagOriginal');
  if (original) original.value = tag || '';
  overlay.classList.add('active');
  input?.focus();
}

function closeBtSessionTagModal() {
  document.getElementById('btSessionTagModalOverlay')?.classList.remove('active');
  editingBtSessionTag = null;
}

/** Crea o renombra una etiqueta de franja horaria. */
async function saveBtSessionTagFromModal() {
  const input = document.getElementById('btSessionInput');
  const value = String(input?.value || '').trim();
  if (!value) {
    showToast('Indica un nombre para la etiqueta', 'error');
    return;
  }
  if (!Array.isArray(backtestingSettings.sessions)) backtestingSettings.sessions = [];

  const exists = backtestingSettings.sessions.some(
    (s) => String(s).toLowerCase() === value.toLowerCase() && s !== editingBtSessionTag
  );
  if (exists) {
    showToast('Ya existe una etiqueta con ese nombre', 'error');
    return;
  }

  if (editingBtSessionTag) {
    const idx = backtestingSettings.sessions.indexOf(editingBtSessionTag);
    if (idx >= 0) backtestingSettings.sessions[idx] = value;
  } else {
    backtestingSettings.sessions.push(value);
  }

  closeBtSessionTagModal();
  renderBacktestingSettings();

  const api = getBackendApi();
  if (api?.saveBacktestingSettings) {
    const result = await persistBacktestingSettings(api);
    if (!result?.success) {
      showToast('No se pudo guardar la etiqueta', 'error');
      return;
    }
  }
  populateBacktestingSelects();
  showToast('Etiqueta guardada', 'success');
}

function renderBtMetricsConfigList() {
  const host = document.getElementById('btMetricsConfigList');
  if (!host) return;
  const list = Array.isArray(cachedBacktestingMetrics) ? cachedBacktestingMetrics : [];
  if (!list.length) {
    host.innerHTML =
      '<p class="muted bt-metrics-empty" style="margin:0;">Aún no hay métricas. Añade la primera abajo.</p>';
    return;
  }
  host.innerHTML = '';
  list.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'bt-metric-card pro-card pro-metric-card';
    const descRaw = m.description != null ? String(m.description).trim() : '';
    const descHtml = descRaw
      ? escapeHtmlAssetLabel(descRaw)
      : '<span class="muted">Sin descripción</span>';
    const typeLabel = escapeHtmlAssetLabel(btMetricTypeDisplayLabel(m.metric_type));
    const activeClass = m.is_active !== false ? ' active' : '';
    const statusText = m.is_active !== false ? 'Activa' : 'Inactiva';
    card.innerHTML = `
      <div class="bt-metric-card-header">
        <div>
          <h4>${escapeHtmlAssetLabel(m.name)}</h4>
          <p>${descHtml}</p>
        </div>
        <span class="bt-metric-badge pro-badge">${typeLabel}</span>
      </div>
      <div class="bt-metric-footer">
        <span class="bt-metric-status${activeClass} pro-badge">${statusText}</span>
        <div class="bt-metric-actions pro-actions">
          <button type="button" class="secondary bt-metric-edit" data-mid="${m.id}">Editar</button>
          <button type="button" class="danger bt-metric-del" data-mid="${m.id}">Eliminar</button>
        </div>
      </div>
    `;
    host.appendChild(card);
  });
  host.querySelectorAll('.bt-metric-edit').forEach((b) => {
    b.addEventListener('click', () => {
      const mid = Number(b.getAttribute('data-mid'));
      const m = list.find((x) => Number(x.id) === mid);
      if (!m) return;
      openBtMetricModal(m);
    });
  });
  host.querySelectorAll('.bt-metric-del').forEach((b) => {
    b.addEventListener('click', async () => {
      const mid = Number(b.getAttribute('data-mid'));
      const okMetric = await showConfirmModal({
        title: 'Eliminar métrica',
        message: '¿Eliminar esta métrica?',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        danger: true,
      });
      if (!okMetric) return;
      const api = getBackendApi();
      if (!api?.deleteBacktestingMetric) return;
      const result = await api.deleteBacktestingMetric(mid);
      if (!result?.success) {
        showToast('No se pudo eliminar', 'error');
        return;
      }
      showToast('Métrica eliminada', 'success');
      await loadBacktestingMetrics();
      renderBtMetricsConfigList();
      renderBacktestingCustomMetricFields({});
    });
  });
}

function nextMonth() {
  console.log('nextMonth -> antes:', currentYear, currentMonth);
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  console.log('nextMonth -> despues:', currentYear, currentMonth);
  renderCalendar(currentYear, currentMonth, true, getDashboardFilteredTrades());
}

function prevMonth() {
  console.log('prevMonth -> antes:', currentYear, currentMonth);
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  console.log('prevMonth -> despues:', currentYear, currentMonth);
  renderCalendar(currentYear, currentMonth, true, getDashboardFilteredTrades());
}

function openEditTradeModal() {
  document.getElementById('editTradeModalOverlay')?.classList.add('active');
}

function closeEditTradeModal() {
  document.getElementById('editTradeModalOverlay')?.classList.remove('active');
}

async function openTradeForEdit(tradeId) {
  if (!(await ensureUserReady())) return;

  const id = Number(tradeId);
  if (!Number.isFinite(id)) {
    console.warn('⚠️ ID de trade inválido para editar:', tradeId);
    return;
  }

  let trade = null;

  // 1. Fuente principal: cache actual cargada desde Supabase
  const source = Array.isArray(window.cachedTrades) ? window.cachedTrades : cachedTrades;
  trade = source.find((item) => Number(item.id) === id) || null;

  const backend = getBackendApi();
  if (backend?.getTrade) {
    try {
      const fresh = await backend.getTrade(id);
      if (fresh) trade = trade ? { ...trade, ...fresh } : fresh;
    } catch (err) {
      console.warn('⚠️ getTrade falló:', err);
    }
  }

  if (!trade) {
    console.error('❌ No se encontró trade para editar:', id);
    showToast('No se pudo abrir el trade para editar', 'error');
    return;
  }

  trade = hydrateTradeCompositeFields(trade);
  console.log('✏️ Abriendo trade para editar:', trade);

  const setValue = (elementId, value) => {
    const el = document.getElementById(elementId);
    if (!el) {
      console.warn(`⚠️ No existe #${elementId} en el DOM`);
      return;
    }

    el.value = value ?? '';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  setValue('editTradeId', String(trade.id));
  setValue('editDirection', String(trade.direction || '').toUpperCase());
  setValue('editDate', toInputDate(trade.date || ''));
  setValue('editEntryTime', trade.entry_time || '');
  setValue('editExitTime', trade.exit_time || '');
  setValue('editAsset', trade.asset || '');
  setValue('editStrategy', trade.strategy || '');
  setValue('editResult', trade.result || '');
  setValue('editBeAfterResult', sanitizeBeAfterResult(trade.be_after_result) || '');
  // Si el trade es de una cuenta que después se deshabilitó, su nombre ya no está en la lista:
  // se añade solo para este trade, marcado, en vez de dejar el campo vacío.
  ensureSelectHasValue(document.getElementById('editAccount'), trade.account || '', ' (deshabilitada)');

  const lotValue = Number(trade.lotSize ?? trade.lotaje ?? 0) || 0;
  setValue('editLotSize', String(lotValue));

  const grossStored = Number(trade.pnl ?? 0) || 0;
  setValue('editPnl', String(grossStored));

  editBeforeImagePath = trade.image_before || trade.beforeImage || '';
  editAfterImagePath = trade.image_after || trade.afterImage || '';

  renderTradeCustomMetricFields('edit', trade.strategy || '', parseTradeCustomMetrics(trade));

  await updateImagePreview('editBeforeImagePreview', 'openBeforeImageBtn', editBeforeImagePath);
  await updateImagePreview('editAfterImagePreview', 'openAfterImageBtn', editAfterImagePath);

  const legs = parsePositionLegs(trade.position_legs ?? trade.positionLegs ?? []);
  let legsToRender = legs;
  // Compatibilidad: trades legacy sin position_legs => crear una entrada visual inicial.
  if (!legsToRender.length) {
    const lotValue = Number(trade.lotSize ?? trade.lotaje ?? 0) || 0;
    const pnlValue = Number(trade.pnl ?? 0) || 0;
    const legacyLeg = createEmptyPositionLeg(1);
    legacyLeg.lot_size = lotValue > 0 ? lotValue : null;
    legacyLeg.pnl = pnlValue;
    legsToRender = [legacyLeg];
  }

  renderTradePositionLegsList('edit', legsToRender);
  syncTradeCompositeSectionVisibility('edit');
  recalculateTradeCompositeTotals('edit');

  const detailHost = document.getElementById('editTradeCompositeDetail');
  if (detailHost) {
    detailHost.innerHTML = renderTradeCompositeDetailHtml({ ...trade, position_legs: legsToRender });
    detailHost.hidden = !legsToRender.length;
  }

  if (typeof recalculateEditNetPnl === 'function') {
    recalculateEditNetPnl();
  }

  updateTradeScheduleHints({
    strategyId: 'editStrategy',
    entryId: 'editEntryTime',
    exitId: 'editExitTime',
    noticeId: 'editTradeScheduleNotice',
    warnId: 'editTradeScheduleWarning',
    dateId: 'editDate',
  });

  // Estos <select> están envueltos por un "custom-select": asignar .value actualiza el select
  // nativo pero no la etiqueta visible, así que hay que refrescarlos uno a uno. Si se olvida
  // alguno (editDirection lo estuvo), el modal muestra un valor y guarda otro.
  ['editAsset', 'editStrategy', 'editResult', 'editAccount', 'editDirection', 'editBeAfterResult'].forEach((selectId) => {
    const select = document.getElementById(selectId);
    if (select && typeof refreshCustomSelectForNative === 'function') {
      refreshCustomSelectForNative(select);
    }
  });

  openEditTradeModal();
}

async function loadTrades(preloadedTrades, options = {}) {
  const skipCalendar = options.skipCalendar === true;
  if (!(await ensureUserReady())) return;
  if (isSyncing && preloadedTrades === undefined) return;

  isSyncing = true;
  try {
    const backend = getBackendApi();

    const applyLoadedTrades = async (rawTrades) => {
      const trades = (Array.isArray(rawTrades) ? rawTrades : []).map((t) => hydrateTradeCompositeFields(t));
      window.cachedTrades = trades;
      cachedTrades = trades;

      await renderDashboardFilters(trades);
      if (currentView === 'dashboard') {
        renderDashboardWithFilters({ skipCalendar });
      } else {
        loadStats();
      }

      if (activeTradePanelDate && document.getElementById('tradePanel')?.classList.contains('open')) {
        openTradePanel(activeTradePanelDate);
      }
      refreshHistoryHeight();
    };

    if (preloadedTrades !== undefined) {
      await applyLoadedTrades(preloadedTrades);
    } else if (!backend?.getTrades) {
      return;
    } else if (
      typeof backend.getTradesLocal === 'function' &&
      typeof backend.syncTradesFromSupabase === 'function'
    ) {
      const localTrades = await backend.getTradesLocal();
      await applyLoadedTrades(localTrades);

      try {
        const syncResult = await backend.syncTradesFromSupabase();
        if (syncResult && Array.isArray(syncResult.trades)) {
          await applyLoadedTrades(syncResult.trades);
        }
      } catch (err) {
        console.log('Supabase unavailable, using local cache');
        if (err) console.warn(err);
      }
    } else {
      const trades = await backend.getTrades();
      await applyLoadedTrades(trades);
    }
  } finally {
    isSyncing = false;
  }

  // Una sola vez por arranque y en segundo plano: sube a la nube las imágenes que aún estaban
  // solo en local. No se espera (void) para no retrasar el pintado del dashboard.
  void migrateLocalTradeImagesToStorage();
}

async function renderDashboard() {
  const tradeList = document.getElementById('tradeList');
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarHeader = document.getElementById('calendarHeader');
  if (tradeList) tradeList.innerHTML = '';
  if (calendarGrid) calendarGrid.innerHTML = '';
  if (calendarHeader) calendarHeader.innerHTML = '';
  await loadTrades();
}

async function saveTrade() {
  console.log('🧠 saveTrade INICIO');

  normalizePnlByResult();
  if (isTradeCompositeEnabled('create')) recalculateTradeCompositeTotals('create');

  const pnlInput = document.getElementById('pnl').value;

  const parsedPnl =
    pnlInput !== '' && pnlInput !== null
      ? parseMoneyInput(pnlInput)
      : null;

  let grossPnl = parsedPnl !== null && parsedPnl !== undefined ? parsedPnl : 0;

  let lotSize =
    Number((document.getElementById('lotaje') || document.getElementById('lotSize'))?.value) || 0;
  let fee = getTradeCommissionCalc({ lotSize, grossPnl, form: 'create' });
  let commission = fee.commission;
  let pnlNet = fee.netPnl;

  console.log('🧠 DEBUG PNL:', {
    raw: pnlInput,
    parsed: parsedPnl,
    grossPnl,
    commission,
    pnlNet,
    type: typeof parsedPnl
  });

  const trade = {
    date: document.getElementById('date').value,
    asset: document.getElementById('asset').value,
    result: document.getElementById('result').value,
    be_after_result:
      String(document.getElementById('result')?.value || '').toUpperCase() === 'BE'
        ? sanitizeBeAfterResult(
            document.getElementById('beAfterResult')?.value || document.getElementById('tradeBeAfterResult')?.value
          )
        : null,

    pnl: grossPnl,

    strategy: document.getElementById('strategy').value,
    account: document.getElementById('account').value,

    lotaje: parseFloat((document.getElementById('lotaje') || document.getElementById('lotSize'))?.value) || 0,
    commission,
    pnl_net: pnlNet,

    entry_time: document.getElementById('entryTime')?.value || null,
    exit_time: document.getElementById('exitTime')?.value || null,

    direction: document.getElementById('direction')?.value || '',
    custom_metrics: collectTradeCustomMetrics('create'),

    image_before: isPersistentImagePath(createBeforeImagePath) ? createBeforeImagePath : null,
    image_after: isPersistentImagePath(createAfterImagePath) ? createAfterImagePath : null,
    beforeImage: isPersistentImagePath(createBeforeImagePath) ? createBeforeImagePath : '',
    afterImage: isPersistentImagePath(createAfterImagePath) ? createAfterImagePath : ''
  };

  // La dirección es obligatoria: sin ella no se pueden separar estadísticas de compras y ventas.
  if (!trade.direction) {
    showToast(t('direction_required', 'Indica si el trade es de compra o de venta'), 'error');
    document.getElementById('direction')?.focus();
    return;
  }

  const compositeMerge = appendCompositeFieldsToTradePayload(trade, 'create');
  if (compositeMerge.error) {
    if (compositeMerge.error === 'NO_LEGS') {
      showToast('Añade al menos una entrada', 'error');
    } else {
      showToast('Revisa los PnL de las entradas parciales', 'error');
    }
    return;
  }
  Object.assign(trade, compositeMerge);
  grossPnl = Number(trade.pnl) || 0;
  lotSize = Number(trade.lotaje) || lotSize;
  fee = getTradeCommissionCalc({ lotSize, grossPnl, trade, form: 'create' });
  commission = fee.commission;
  pnlNet = fee.netPnl;
  trade.commission = commission;
  trade.pnl_net = pnlNet;

  console.log('🧠 TRADE ENVIADO DESDE RENDERER:', trade);

  const validationTrade = { ...trade, user_id: localStorage.getItem('user_id') };
  const validationErr = validateTrade(validationTrade);
  if (validationErr) {
    showToast(validationErr, 'error');
    return;
  }

  const backend = getBackendApi();

  console.log('🔌 Backend obtenido:', backend);

  if (!backend || !backend.addTrade) {
    console.error('❌ Backend no disponible');
    return;
  }

  console.log('🚀 Llamando a backend.addTrade');

  try {
    const offlineActive = isOfflineModeActive() || !(await checkInternetConnection().catch(() => false));

    if (!offlineActive) {
      if (!(await ensureUserReady())) {
        console.log('⛔ ensureUserReady bloqueó el guardado');
        return;
      }
    }

    let result = offlineActive && backend.addTradeOffline
      ? await backend.addTradeOffline(trade)
      : await backend.addTrade(trade);

    if (result?.error === 'NO_USER_ID') {
      console.warn('🔁 Reintentando tras sync de user_id...');
      await ensureUserReady();

      const retryResult = await backend.addTrade(trade);

      if (!retryResult?.success) {
        console.error('❌ Error tras reintento:', retryResult);
        return;
      }

      result = retryResult;
    }

    console.log('📥 Resultado backend:', result);

    if (result?.success) {
      console.log('✅ Trade guardado correctamente');
      if (result.id) rememberOwnInsertedTradeId(result.id);
      addRecentPair(trade.asset);
      showToast(offlineActive ? 'Trade guardado (pendiente de sync)' : 'Trade guardado', 'success');
      document.getElementById('beforeImage').value = '';
      document.getElementById('afterImage').value = '';
      createBeforeImagePath = '';
      createAfterImagePath = '';
      await updateImagePreview('beforeImagePreview', 'openBeforeImageBtnCreate', '');
      await updateImagePreview('afterImagePreview', 'openAfterImageBtnCreate', '');
      recalculateCreateNetPnl();
      await loadTrades();
      await resetNewTradeForm();
      showView('dashboard');
    } else {
      console.error('❌ Backend respondió sin success');
      console.error('🧨 RESULTADO COMPLETO:', result);

      if (result?.error) {
        console.error('🧨 ERROR RAW:', result.error);
        console.error('🧨 ERROR STRING:', JSON.stringify(result.error, null, 2));
      }
    }
  } catch (err) {
    console.error('❌ Error en addTrade:', err);
  }
}

async function saveEditedTrade() {
  if (!(await ensureUserReady())) return;

  const id = Number(document.getElementById('editTradeId')?.value);
  if (!Number.isFinite(id)) {
    showToast('ID de trade inválido', 'error');
    return;
  }

  const calc = recalculateEditNetPnl();
  const backend = getBackendApi();

  if (!backend?.updateTrade) {
    showToast('API de edición no disponible', 'error');
    return;
  }

  let grossPnl = Number(document.getElementById('editPnl')?.value) || 0;
  let lots = Number(document.getElementById('editLotSize')?.value) || 0;
  const accountForCommission = getSelectedAccount('editAccount');
  const commissionPerLot = Number(accountForCommission?.commissionPerLot) || 0;
  let commission = Number(calc?.commission ?? 0) || 0;
  let pnlNet = grossPnl - commission;
  const existingTrade =
    (Array.isArray(window.cachedTrades) ? window.cachedTrades : cachedTrades).find((t) => Number(t.id) === id) || null;

  console.log('EDIT TRADE COMMISSION DEBUG', {
    grossPnl,
    lots,
    commissionPerLot,
    commission,
    pnlNet,
    previousPnl: existingTrade?.pnl,
    previousPnlNet: existingTrade?.pnl_net,
    previousCommission: existingTrade?.commission
  });

  const payload = {
    id,
    client_uuid: existingTrade?.client_uuid || null,
    date: document.getElementById('editDate')?.value || '',
    asset: document.getElementById('editAsset')?.value || '',
    strategy: document.getElementById('editStrategy')?.value || '',
    result: document.getElementById('editResult')?.value || '',
    be_after_result:
      String(document.getElementById('editResult')?.value || '').toUpperCase() === 'BE'
        ? sanitizeBeAfterResult(document.getElementById('editBeAfterResult')?.value)
        : null,
    account: document.getElementById('editAccount')?.value || '',

    pnl: grossPnl,
    pnl_net: pnlNet,

    lotaje: Number(document.getElementById('editLotSize')?.value) || 0,
    lotSize: Number(document.getElementById('editLotSize')?.value) || 0,

    commission,

    entry_time: document.getElementById('editEntryTime')?.value || null,
    exit_time: document.getElementById('editExitTime')?.value || null,

    direction: document.getElementById('editDirection')?.value || '',
    custom_metrics: collectTradeCustomMetrics('edit'),

    image_before: isPersistentImagePath(editBeforeImagePath) ? editBeforeImagePath : null,
    image_after: isPersistentImagePath(editAfterImagePath) ? editAfterImagePath : null,
    beforeImage: isPersistentImagePath(editBeforeImagePath) ? editBeforeImagePath : '',
    afterImage: isPersistentImagePath(editAfterImagePath) ? editAfterImagePath : ''
  };

  if (!payload.direction) {
    showToast(t('direction_required', 'Indica si el trade es de compra o de venta'), 'error');
    document.getElementById('editDirection')?.focus();
    return;
  }

  const compositeMerge = appendCompositeFieldsToTradePayload(payload, 'edit');
  if (compositeMerge.error) {
    if (compositeMerge.error === 'NO_LEGS') {
      showToast('Añade al menos una entrada', 'error');
    } else {
      showToast('Revisa los PnL de las entradas parciales', 'error');
    }
    return;
  }
  Object.assign(payload, compositeMerge);
  grossPnl = Number(payload.pnl) || 0;
  lots = Number(payload.lotaje) || lots;
  const feeEdit = getTradeCommissionCalc({ lotSize: lots, grossPnl, trade: payload, form: 'edit' });
  commission = feeEdit.commission;
  pnlNet = feeEdit.netPnl;
  payload.commission = commission;
  payload.pnl_net = pnlNet;
  payload.is_composite_position = Boolean(payload.is_composite_position);
  payload.position_legs = parsePositionLegs(payload.position_legs ?? []);

  console.log('✏️ Payload updateTrade:', payload);
  console.log('[updateTrade] payload position_legs (UI)', payload.position_legs?.length ?? 0);

  const result = await backend.updateTrade(payload);

  console.log('📥 Resultado updateTrade:', result);

  if (!result?.success) {
    const errObj = result?.error;
    const errMsg =
      typeof errObj === 'string'
        ? errObj
        : errObj?.message || errObj?.code || errObj?.details || 'No se pudo guardar el cambio';
    console.error('[updateTrade] failed', { id, strategy: payload.strategy, error: errObj });
    console.error('[updateTrade] error detail:', JSON.stringify(errObj, null, 2));
    showToast(`No se pudo guardar: ${errMsg}`, 'error');
    return;
  }

  if (result?.pendingUpdate || result?.offline) {
    console.log('[updateTrade] saved locally, sync pending', { id, pendingUpdate: result.pendingUpdate, offline: result.offline });
  }

  const updatedTrade = result.data || payload;

  const normalizedForCache = {
    ...updatedTrade,
    id,
    lotaje: Number(updatedTrade.lotaje ?? payload.lotaje ?? 0) || 0,
    lotSize: Number(updatedTrade.lotaje ?? payload.lotaje ?? 0) || 0,
    pnl: Number(updatedTrade.pnl ?? payload.pnl ?? 0) || 0,
    pnl_net: Number(updatedTrade.pnl_net ?? payload.pnl_net ?? payload.pnl ?? 0) || 0,
    commission: Number(updatedTrade.commission ?? payload.commission ?? 0) || 0,
    beforeImage: updatedTrade.image_before ?? payload.beforeImage ?? '',
    afterImage: updatedTrade.image_after ?? payload.afterImage ?? '',
    image_before: updatedTrade.image_before ?? payload.image_before ?? null,
    image_after: updatedTrade.image_after ?? payload.image_after ?? null,
    is_composite_position: Boolean(
      payload.is_composite_position ?? updatedTrade.is_composite_position
    ),
    position_legs: parsePositionLegs(payload.position_legs ?? updatedTrade.position_legs ?? []),
  };
  Object.assign(normalizedForCache, hydrateTradeCompositeFields(normalizedForCache));

  const replaceInCache = (list) =>
    (Array.isArray(list) ? list : []).map((item) =>
      Number(item.id) === id ? { ...item, ...normalizedForCache } : item
    );

  cachedTrades = replaceInCache(cachedTrades);
  window.cachedTrades = replaceInCache(window.cachedTrades);

  showToast('Trade actualizado', 'success');

  closeEditTradeModal();

  const freshList =
    typeof backend.getTradesLocal === 'function'
      ? await backend.getTradesLocal()
      : replaceInCache(Array.isArray(window.cachedTrades) ? window.cachedTrades : cachedTrades);
  await loadTrades(Array.isArray(freshList) ? freshList : replaceInCache(cachedTrades));

  renderDashboardWithFilters?.();

  if (currentView !== 'dashboard') {
    showView('dashboard');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  if (window.__tradingJournalInitialized) return;
  window.__tradingJournalInitialized = true;

  // Antes de checkAuth (que puede redirigir o tardar): así la franja de arrastre existe desde
  // el primer pintado y la ventana nunca queda sin forma de moverse.
  setupIntegratedTitleBar();
  injectBacktestingProStyles();
  const isAuth = await checkAuth();
  if (isAuth && window.electronAPI?.setUserId) {
    const uid = window.currentUser?.id || localStorage.getItem('user_id');
    await window.electronAPI.setUserId(uid);
  }

  const resetStrategyBtn = document.getElementById('resetStrategyBtn');
  const resetAccountBtn = document.getElementById('resetAccountBtn');
  const addTradeBtn = document.getElementById('addTradeBtn');
  const basicModeBtn = document.getElementById('basicModeBtn');
  const proModeBtn = document.getElementById('proModeBtn');
  const accountSelect = document.getElementById('account');
  const editAccountSelect = document.getElementById('editAccount');
  const pnlInput = document.getElementById('pnl');
  const lotSizeInput = document.getElementById('lotSize');
  const editPnlInput = document.getElementById('editPnl');
  const editLotSizeInput = document.getElementById('editLotSize');
  const prevMonthBtn = document.getElementById('prevMonth') || document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonth') || document.getElementById('nextMonthBtn');
  const themeToggleInput = document.getElementById('themeToggle');
  const kpiCards = document.querySelectorAll('.kpi-card');
  const toggleWeekendInput = document.getElementById('toggleWeekend');
  const excludeBEInput = document.getElementById('excludeBE');
  const calendarTitle = document.getElementById('calendarTitle');
  const dateModal = document.getElementById('dateModal');
  const dayModal = document.getElementById('dayModal');
  const tradePanel = document.getElementById('tradePanel');
  const closePanelBtn = document.getElementById('closePanel');
  const closeDayModalBtn = document.getElementById('closeDayModalBtn');
  const closeModalBtn = document.getElementById('closeModal');
  const prevYearBtn = document.getElementById('prevYear');
  const nextYearBtn = document.getElementById('nextYear');
  const saveEditTradeBtn = document.getElementById('saveEditTradeBtn') || document.getElementById('updateTradeBtn');
  const closeEditModalBtn = document.getElementById('closeEditModalBtn');
  initLanguageSwitcher();
  loadLanguage(detectUserLanguage()).catch((error) => {
    console.error('Error cargando idioma', error);
  });

  if (isAuth) {
    loadUserInfo().catch((error) => {
      console.error('Error cargando usuario', error);
    });
    if (!isOfflineModeActive()) {
      subscribeToTradesRealtime();
    } else {
      console.log('📴 Realtime omitido en modo offline');
    }
    updateOfflineBanner();
  }

  // Estado de sync desde main (no bloquea UI). Indicador persistente + reintento periódico,
  // para que un fallo de sincronización (p.ej. una tabla de Supabase que aún no existe) nunca
  // vuelva a pasar desapercibido en silencio.
  try {
    if (window.syncAPI?.onStatusChanged) {
      window.syncAPI.onStatusChanged((payload) => {
        const state = String(payload?.state || '');
        const pending = Number(payload?.pending || 0) || 0;
        const failed = Number(payload?.failed || 0) || 0;
        applySyncHealthState(state, { pending, failed });
      });
    }
  } catch (err) {
    console.warn('No se pudo inicializar listener de sync status:', err);
  }
  initSyncHealthIndicator();
  startSyncHealthAutoRetry();
  startRemoteRefreshSafetyNet();
  watchSupabaseTokenRefresh();

  window.addEventListener('online', async () => {
    console.log('🌐 Conexión recuperada');
    if (!isAppAuthenticated) return;

    if (isOfflineModeActive()) {
      try {
        const user = await getCurrentUserSafe();
        if (user?.id) {
          console.log('🔄 Sesión Supabase válida tras reconectar');
          setOfflineMode(false);
          await syncSupabaseSessionWithMain();
          subscribeToTradesRealtime();
          updateOfflineBanner();
          setTimeout(() => {
            const backend = getBackendApi();
            if (backend?.syncPendingChanges) backend.syncPendingChanges().catch(() => {});
          }, 0);
          if (typeof loadTrades === 'function') loadTrades();
          showToast?.('Conexión recuperada. Sincronizando...', 'success');
        } else {
          showToast?.('Conexión recuperada, pero la sesión online ha caducado. Inicia sesión cuando puedas.', 'warning');
        }
      } catch (err) {
        console.warn('No se pudo refrescar sesión online:', err);
        showToast?.('Conexión recuperada pero Supabase no responde. Sigue en modo offline.', 'warning');
      }
    }
  });

  window.addEventListener('offline', () => {
    console.log('📴 Conexión perdida');
    if (!isAppAuthenticated) return;
    setOfflineMode(true);
    updateOfflineBanner();
    showToast?.('Sin conexión. Datos cargados desde la cache local.', 'warning');
  });

  const handleLogout = async () => {
    unsubscribeTradesRealtime();

    await logout();

    clearAuthUserCache();
    window.currentUser = null;

    if (window.electronAPI?.setUserId) {
      await window.electronAPI.setUserId(null);
    }

    isAppAuthenticated = false;
    // Se vacía TODO lo que quedó en memoria del usuario que sale. Antes solo se limpiaban las
    // cuentas, las estrategias y los trades reales: si otra persona iniciaba sesión sin cerrar
    // la aplicación, podía ver por un momento el backtesting y la gestión del anterior, hasta
    // que cada vista recargaba sus datos.
    realAccountsCache = [];
    realStrategiesCache = [];
    realStrategiesByName = new Map();
    cachedTrades = [];
    window.cachedTrades = [];
    cachedBacktestingTrades = [];
    cachedBacktestingSessions = [];
    cachedBacktestingMetrics = [];
    backtestingSettings = emptyBacktestingSettings();
    backtestingSettingsLoaded = false;
    withdrawalsCache = [];
    expensesCache = [];
    expensePropsCache = [];
    customExpenseCategoriesCache = null;
    expenseCategoryIdsByName = new Map();
    selectedBacktestingSessionIds = ['all'];
    activeBacktestingSessionId = null;
    selectedDashboardAccounts = new Set(['ALL']);
    selectedDashboardStrategies = new Set(['ALL']);
    void renderDashboardFilters([]);
    lastInsertedIds.clear();

    const tradeList = document.getElementById('tradeList');
    if (tradeList) tradeList.innerHTML = '';

    showLoginModal();

    console.log('🚪 Logout realizado correctamente');
  };

  initSidebar({
    activeView: getViewFromHash(),
    mode: 'spa',
    onSpaView: showView,
    onThemeChange: (theme) => {
      applyTheme(theme);
      if (currentView === 'stats') applyStatsFilters();
    },
    refreshIcons: refreshLucideIcons,
    getUserEmail: async () => {
      if (window.currentUser?.email) return window.currentUser.email;
      try {
        if (isOnline() && !isOfflineModeActive()) {
          const user = await getCurrentUserSafe();
          if (user?.email) return user.email;
        }
      } catch (err) {
        console.warn('Sidebar getUserEmail:', err);
      }
      return getLastOfflineUser()?.email || '';
    },
    onProfile: () => {
      showProfileModal().catch(console.error);
    },
    onLogout: handleLogout
  });

  initAccountStrategyModals();
  initSettingsAccountsTabs();
  initWithdrawalsUI();
  initExpensesUI();
  initManagementTabs();
  initBacktestingViewTabs();
  const tradeScheduleInputs = [
    ['strategy', 'entryTime', 'exitTime', 'date'],
    ['editStrategy', 'editEntryTime', 'editExitTime', 'editDate'],
  ];
  tradeScheduleInputs.forEach(([strategyId, entryId, exitId, dateId]) => {
    [strategyId, entryId, exitId, dateId].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.scheduleHintBound) return;
      el.dataset.scheduleHintBound = '1';
      el.addEventListener('change', () => {
        if (id.startsWith('edit')) {
          updateTradeScheduleHints({
            strategyId: 'editStrategy',
            entryId: 'editEntryTime',
            exitId: 'editExitTime',
            noticeId: 'editTradeScheduleNotice',
            warnId: 'editTradeScheduleWarning',
            dateId: 'editDate',
          });
        } else {
          updateTradeScheduleHints();
        }
      });
    });
  });
  if (resetStrategyBtn) resetStrategyBtn.onclick = () => {
    deleteTradesByStrategyAction().catch((error) => {
      console.error('Error borrando trades por estrategia', error);
      showToast(t('error_delete_bulk_strategy'), 'error');
    });
  };
  if (resetAccountBtn) resetAccountBtn.onclick = () => {
    deleteTradesByAccountAction().catch((error) => {
      console.error('Error borrando trades por cuenta', error);
      showToast(t('error_delete_bulk_account'), 'error');
    });
  };
  if (saveEditTradeBtn) saveEditTradeBtn.onclick = saveEditedTrade;
  if (closeEditModalBtn) closeEditModalBtn.onclick = closeEditTradeModal;

  const saveTradeButton = document.getElementById('saveBtn') || document.getElementById('saveTradeBtn');
  if (saveTradeButton) {
    saveTradeButton.addEventListener('click', async () => {
      console.log('GUARDAR CLICK');
      await saveTrade();
    });
  }

  if (addTradeBtn) addTradeBtn.onclick = () => showView('trade');

  const realBeSelect = ensureBeAfterResultField({
    resultId: 'result',
    selectId: 'beAfterResult',
    wrapperId: 'beAfterResultWrapper',
    selectClass: 'form-select',
    labelText: 'Después del BE'
  });
  const editBeSelect = ensureBeAfterResultField({
    resultId: 'editResult',
    selectId: 'editBeAfterResult',
    labelText: 'Después del BE'
  });
  const btBeSelect = ensureBeAfterResultField({
    resultId: 'btResult',
    selectId: 'btBeAfterResult',
    labelText: 'Después del BE'
  });
  [realBeSelect, editBeSelect, btBeSelect].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener('change', () => {
      const clean = sanitizeBeAfterResult(sel.value);
      sel.value = clean || '';
    });
  });

  document.getElementById('backtestingPrevMonth')?.addEventListener('click', prevBacktestingMonth);
  document.getElementById('backtestingNextMonth')?.addEventListener('click', nextBacktestingMonth);
  document.getElementById('backtestingGoLastTrade')?.addEventListener('click', goToLastBacktestingTrade);
  document.getElementById('backtestingGoToday')?.addEventListener('click', goToBacktestingToday);

  const btKpiToggle = document.getElementById('btKpiToggle');
  const btKpiSection = document.getElementById('btKpiSection');
  if (btKpiToggle && btKpiSection && !btKpiToggle.dataset.bound) {
    btKpiToggle.dataset.bound = 'true';
    btKpiToggle.addEventListener('click', () => {
      btKpiSection.classList.toggle('open');
      btKpiToggle.setAttribute('aria-expanded', btKpiSection.classList.contains('open') ? 'true' : 'false');
    });
  }

  document.getElementById('btClearBacktestForm')?.addEventListener('click', () => clearBacktestForm());
  document.getElementById('btRecalcOpen')?.addEventListener('click', () => openBacktestRecalcModal());
  // --- Etiquetas de sesión (modal crear/editar, mismo patrón que estrategias) ---
  document.getElementById('openBtSessionTagModalBtn')?.addEventListener('click', () => {
    openBtSessionTagModal(null);
  });
  document.getElementById('closeBtSessionTagModal')?.addEventListener('click', closeBtSessionTagModal);
  document.getElementById('cancelBtSessionTagBtn')?.addEventListener('click', closeBtSessionTagModal);
  document.getElementById('btSessionTagModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'btSessionTagModalOverlay') closeBtSessionTagModal();
  });
  document.getElementById('addBtSession')?.addEventListener('click', () => {
    void saveBtSessionTagFromModal();
  });

  // --- Métricas personalizadas (modal crear/editar) ---
  document.getElementById('openBtMetricModalBtn')?.addEventListener('click', () => {
    openBtMetricModal(null);
  });
  document.getElementById('closeBtMetricModal')?.addEventListener('click', closeBtMetricModal);
  document.getElementById('cancelBtMetricBtn')?.addEventListener('click', closeBtMetricModal);
  document.getElementById('btMetricModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'btMetricModalOverlay') closeBtMetricModal();
  });

  ensureBtStrategyModalScheduleListeners();
  document.getElementById('openBtStrategyModalBtn')?.addEventListener('click', () => {
    openBacktestingStrategyModal(null);
  });
  document.getElementById('closeBtStrategyModal')?.addEventListener('click', () => closeBacktestingStrategyModal());
  document.getElementById('cancelBtStrategyBtn')?.addEventListener('click', () => closeBacktestingStrategyModal());
  document.getElementById('saveBtStrategyBtn')?.addEventListener('click', () => {
    void saveBacktestingStrategyFromModal();
  });
  document.getElementById('btStrategyModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'btStrategyModalOverlay') closeBacktestingStrategyModal();
  });
  document.getElementById('btStrategy')?.addEventListener('change', () => {
    const name = document.getElementById('btStrategy')?.value || '';
    const strategy = getBacktestingStrategies().find((s) => s.name === name);

    if (!strategy) return;

    const riskInput = document.getElementById('btRisk');

    if (riskInput && (!riskInput.value || Number(riskInput.value) === 0)) {
      const auto = getBacktestingStrategyRiskEuroForForm(strategy);
      if (auto !== '') riskInput.value = auto;
    }

    applyBacktestingAutoPnlIfUnset();
    syncBacktestingPnlFromResult();
    updateBacktestingDerivedRFields();
  });
  document.getElementById('btNewSessionBtn')?.addEventListener('click', () => {
    void (async () => {
      await loadBacktestingSettings();
      openBacktestingSessionModal(null);
    })();
  });
  document.getElementById('closeBacktestingSessionModal')?.addEventListener('click', () => closeBacktestingSessionModal());
  document.getElementById('cancelBacktestingSessionBtn')?.addEventListener('click', () => closeBacktestingSessionModal());
  document.getElementById('saveBacktestingSessionBtn')?.addEventListener('click', () => {
    void saveBacktestingSessionFromModal();
  });
  document.querySelectorAll('#btSessionModalOverlay [data-range]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyBacktestingSessionQuickRange(btn.getAttribute('data-range'));
    });
  });
  document.getElementById('btSessionModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'btSessionModalOverlay') closeBacktestingSessionModal();
  });
  document.getElementById('btMetricAddBtn')?.addEventListener('click', async () => {
    const api = getBackendApi();
    if (!api?.addBacktestingMetric || !api?.updateBacktestingMetric) return;
    const name = document.getElementById('btMetricNameInput')?.value?.trim();
    if (!name) {
      showToast('Indica un nombre de métrica', 'error');
      return;
    }
    const description = document.getElementById('btMetricDescInput')?.value?.trim() || '';
    const metric_type = document.getElementById('btMetricTypeInput')?.value || 'checkbox';
    const is_active = document.getElementById('btMetricActiveInput')?.checked !== false;
    const base = { name, description, metric_type, is_active, sort_order: 0 };
    let result;
    if (editingBtMetricId) {
      result = await api.updateBacktestingMetric({ ...base, id: editingBtMetricId });
    } else {
      result = await api.addBacktestingMetric(base);
    }
    if (!result?.success) {
      console.error('❌ Error guardando métrica backtesting:', result?.error || result);
      showToast(
        typeof result?.error === 'string'
          ? result.error
          : result?.error?.message || 'No se pudo guardar la métrica',
        'error'
      );
      return;
    }
    showToast('Métrica guardada', 'success');
    closeBtMetricModal();
    await loadBacktestingMetrics();
    renderBtMetricsConfigList();
    renderBacktestingCustomMetricFields({});
    rerenderBacktestingLocal();
  });
  document.getElementById('backtestingConfigView')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.config-chip-remove');
    if (!btn) return;
    const key = btn.dataset.btKey;
    const enc = btn.dataset.btVal;
    if (key == null || enc === undefined) return;
    try {
      void removeBacktestingItem(key, decodeURIComponent(enc));
    } catch (_) {}
  });
  document.getElementById('btSaveBacktest')?.addEventListener('click', async () => {
    const msg = document.getElementById('btFormMsg');
    const setMsg = (text, ok) => {
      if (!msg) return;
      msg.textContent = text;
      msg.className = ok ? 'form-hint success' : 'form-hint error';
    };
    if (!(await ensureUserReady())) return;
    const backend = getBackendApi();
    if (!backend?.addBacktestTrade || !backend?.updateBacktestTrade) {
      setMsg('API backtesting no disponible', false);
      return;
    }

    const tradeDate = document.getElementById('btDate')?.value || '';
    if (!isDateInsideBacktestingSessionRange(tradeDate)) {
      showToast('La fecha está fuera del rango de la sesión seleccionada', 'error');
      setMsg('Fecha fuera del rango de la sesión', false);
      return;
    }

    let session_id = null;

    if (activeBacktestingSessionId) {
      session_id = Number(activeBacktestingSessionId);
    }
    const assetVal = document.getElementById('btAsset')?.value?.trim() || '';
    const dirVal = document.getElementById('btDirection')?.value || 'LONG';
    const entryNorm =
      Number(String(document.getElementById('btEntry')?.value ?? '').replace(',', '.')) || 0;
    // Nota: aquí NO se llama a syncBacktestingResultFromPnl(). Esa función deriva el
    // Resultado (TP/SL/BE) a partir del PnL estimado, y si el usuario deja "Gestión" vacía
    // (precio entrada/SL/TP/riesgo) el PnL estimado es 0 -> forzaba el Resultado a BE aunque
    // el usuario hubiera elegido manualmente TP o SL en el desplegable. "Gestión" es opcional:
    // el Resultado elegido a mano se respeta tal cual, y solo se normaliza el signo del PnL
    // para que cuadre con ese resultado (syncBacktestingPnlFromResult).
    syncBacktestingPnlFromResult();
    updateBacktestingDerivedRFields();
    const btResult = document.getElementById('btResult')?.value || 'BE';
    const pnlMoney = getBacktestingEstimatedPnlMoney();
    const btPnlFinal = normalizeBacktestingPnlByResult(pnlMoney, btResult);
    const payload = {
      date: document.getElementById('btDate')?.value || '',
      asset: assetVal,
      strategy: document.getElementById('btStrategy')?.value || '',
      session: document.getElementById('btSession')?.value || '',
      session_id,
      custom_metrics: {
        ...collectBacktestingCustomMetrics(),
        risk_eur: Number(document.getElementById('btRisk')?.value) || 0
      },
      direction: dirVal,
      result: btResult,
      be_after_result:
        String(btResult || '').toUpperCase() === 'BE'
          ? sanitizeBeAfterResult(document.getElementById('btBeAfterResult')?.value)
          : null,
      entry_price: entryNorm,
      stop_loss: resolveBacktestingPriceForSave('btSl', 'btSlMode', entryNorm, dirVal, assetVal),
      take_profit: resolveBacktestingPriceForSave('btTp', 'btTpMode', entryNorm, dirVal, assetVal),
      rr_planned: Number(document.getElementById('btRrPlanned')?.value) || 0,
      rr_result: 0,
      pnl: btPnlFinal,
      notes: document.getElementById('btNotes')?.value.trim() || '',
      entry_time: normalizeBtTimeField(document.getElementById('btEntryTime')?.value),
      exit_time: normalizeBtTimeField(document.getElementById('btExitTime')?.value),
      image_before: isPersistentImagePath(btBeforeImagePath) ? btBeforeImagePath : null,
      image_after: isPersistentImagePath(btAfterImagePath) ? btAfterImagePath : null
    };
    payload.rr_result = getBacktestingTradeRValue(payload);
    const payloadEditId = Number(editingBacktestingTradeId);
    try {
      let result;
      if (Number.isFinite(payloadEditId) && payloadEditId > 0) {
        result = await backend.updateBacktestTrade({ ...payload, id: payloadEditId });
      } else {
        result = await backend.addBacktestTrade(payload);
      }
      if (!result?.success) {
        setMsg(result?.error?.message || 'No se pudo guardar', false);
        return;
      }
      setMsg('Guardado correctamente', true);
      if (payload.asset) addRecentBtPair(payload.asset);
      const reloaded = await backend.getBacktestTrades();
      cachedBacktestingTrades = Array.isArray(reloaded) ? reloaded : [];

      console.log('✅ Backtesting trades recargados desde Supabase:', cachedBacktestingTrades.length);

      rerenderBacktestingLocal();
      renderBacktestingSessionCards();

      await refreshBacktestingView({ skipTradeFetch: true });
      // Reinicio parcial: mantiene día, par, estrategia, cuenta, sesión y riesgo/RR para poder
      // encadenar operaciones sin volver a rellenar lo mismo en cada una.
      resetBacktestFormForNextTrade();
    } catch (e) {
      console.error(e);
      setMsg(String(e?.message || e), false);
    }
  });

  if (basicModeBtn) basicModeBtn.onclick = () => {
    setMode('basic');
    applyModeUI();
    recalculateCreateNetPnl();
    recalculateEditNetPnl();
    if (currentView === 'dashboard') loadTrades();
  };
  if (proModeBtn) proModeBtn.onclick = () => {
    setMode('pro');
    applyModeUI();
    updateCreateDerivedFields();
    recalculateCreateNetPnl();
    recalculateEditNetPnl();
    if (currentView === 'dashboard') loadTrades();
  };

  accountSelect?.addEventListener('change', () => {
    updateCreateDerivedFields();
    recalculateCreateNetPnl();
  });
  ensureTradeCompositeFormListeners();
  document.getElementById('editPnl')?.addEventListener('input', () => {
    if (isTradeCompositeEnabled('edit')) return;
    recalculateEditNetPnl();
  });
  document.getElementById('pnl')?.addEventListener('input', () => {
    if (isTradeCompositeEnabled('create')) return;
    recalculateCreateNetPnl();
  });

  document.getElementById('result')?.addEventListener('change', () => {
    normalizePnlByResult();
    refreshPnlPresetButtons();
    recalculateCreateNetPnl();
  });
  document.getElementById('editResult')?.addEventListener('change', () => {
    void ensureBeAfterResultField({
      resultId: 'editResult',
      selectId: 'editBeAfterResult',
      labelText: 'Después del BE'
    });
    recalculateEditNetPnl();
  });
  document.getElementById('btResult')?.addEventListener('change', () => {
    void ensureBeAfterResultField({
      resultId: 'btResult',
      selectId: 'btBeAfterResult',
      labelText: 'Después del BE'
    });
  });
  editAccountSelect?.addEventListener('change', recalculateEditNetPnl);
  pnlInput?.addEventListener('input', () => {
    recalculateCreateNetPnl();
  });
  pnlInput?.addEventListener('blur', () => {
    normalizePnlByResult();
  });
  lotSizeInput?.addEventListener('input', recalculateCreateNetPnl);
  editPnlInput?.addEventListener('input', recalculateEditNetPnl);
  // Al salir del campo se ajusta el signo al resultado, igual que en el formulario de creación.
  editPnlInput?.addEventListener('blur', normalizeEditPnlByResult);
  editLotSizeInput?.addEventListener('input', recalculateEditNetPnl);

  const beforeInput = document.getElementById('beforeImage');
  beforeInput?.addEventListener('click', async (event) => {
    event.preventDefault();

    const savedPath = await selectTradeImagePersistently();
    if (!savedPath) return;

    createBeforeImagePath = savedPath;
    await updateImagePreview('beforeImagePreview', 'openBeforeImageBtnCreate', createBeforeImagePath);
  });

  const afterInput = document.getElementById('afterImage');
  afterInput?.addEventListener('click', async (event) => {
    event.preventDefault();

    const savedPath = await selectTradeImagePersistently();
    if (!savedPath) return;

    createAfterImagePath = savedPath;
    await updateImagePreview('afterImagePreview', 'openAfterImageBtnCreate', createAfterImagePath);
  });

  // Capturas del formulario de Backtesting (mismo flujo que en los trades reales: el archivo se
  // copia a userData/trade-images y solo se guarda la ruta).
  document.getElementById('btBeforeImage')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const savedPath = await selectTradeImagePersistently();
    if (!savedPath) return;
    btBeforeImagePath = savedPath;
    await updateImagePreview('btBeforeImagePreview', 'openBtBeforeImageBtn', btBeforeImagePath);
  });
  document.getElementById('btAfterImage')?.addEventListener('click', async (event) => {
    event.preventDefault();
    const savedPath = await selectTradeImagePersistently();
    if (!savedPath) return;
    btAfterImagePath = savedPath;
    await updateImagePreview('btAfterImagePreview', 'openBtAfterImageBtn', btAfterImagePath);
  });
  const editBeforeInput = document.getElementById('editBeforeImage');
  editBeforeInput?.addEventListener('click', async (event) => {
    event.preventDefault();

    const savedPath = await selectTradeImagePersistently();
    if (!savedPath) return;

    editBeforeImagePath = savedPath;
    await updateImagePreview('editBeforeImagePreview', 'openBeforeImageBtn', editBeforeImagePath);
  });

  const editAfterInput = document.getElementById('editAfterImage');
  editAfterInput?.addEventListener('click', async (event) => {
    event.preventDefault();

    const savedPath = await selectTradeImagePersistently();
    if (!savedPath) return;

    editAfterImagePath = savedPath;
    await updateImagePreview('editAfterImagePreview', 'openAfterImageBtn', editAfterImagePath);
  });

  // Arrastrar y soltar en los seis campos de imagen (trade nuevo, edición y backtesting).
  // Fuera de esas zonas, soltar un archivo no debe hacer nada: por defecto Electron lo abriría
  // en la ventana y se perdería la aplicación.
  ['dragover', 'drop'].forEach((evt) => {
    document.addEventListener(evt, (event) => {
      if (!event.target?.closest?.('.field[data-drop-bound="true"]')) event.preventDefault();
    });
  });

  // Botones de exportar. Se montan desde JS para no repetir el mismo bloque de HTML en cada
  // apartado; el informe se construye en el momento de pulsar, con los filtros que haya puestos.
  const withdrawalFilterBar = document
    .getElementById('withdrawalFilterAccount')
    ?.closest('.wd-filter-bar');
  mountExportButtons(withdrawalFilterBar, 'exportWithdrawals', buildManagementExportReport);

  const expenseFilterBar = document
    .getElementById('expenseFilterAccount')
    ?.closest('.wd-filter-bar');
  mountExportButtons(expenseFilterBar, 'exportExpenses', buildManagementExportReport);

  mountExportButtons(
    document.querySelector('#dashboardView .dashboard-filter-row'),
    'exportTrades',
    buildTradesExportReport
  );

  mountExportButtons(
    document.querySelector('#backtestingView .backtesting-filter-bar'),
    'exportBacktesting',
    buildBacktestingExportReport
  );

  // Compartir resultados por enlace: junto a los botones de exportar, que es donde el usuario
  // ya busca "sacar esto de la app".
  const btExportGroup = document.getElementById('exportBacktesting');
  if (btExportGroup && !document.getElementById('btShareBtn')) {
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.id = 'btShareBtn';
    shareBtn.className = 'button button-cancel export-btn';
    shareBtn.innerHTML = '<i data-lucide="share-2"></i><span>Compartir</span>';
    shareBtn.addEventListener('click', () => void openBacktestShareModal());
    btExportGroup.appendChild(shareBtn);
    void refreshLucideIcons();
  }

  initTradeImageDropZone('beforeImage', async (ref) => {
    createBeforeImagePath = ref;
    await updateImagePreview('beforeImagePreview', 'openBeforeImageBtnCreate', createBeforeImagePath);
  });
  initTradeImageDropZone('afterImage', async (ref) => {
    createAfterImagePath = ref;
    await updateImagePreview('afterImagePreview', 'openAfterImageBtnCreate', createAfterImagePath);
  });
  initTradeImageDropZone('editBeforeImage', async (ref) => {
    editBeforeImagePath = ref;
    await updateImagePreview('editBeforeImagePreview', 'openBeforeImageBtn', editBeforeImagePath);
  });
  initTradeImageDropZone('editAfterImage', async (ref) => {
    editAfterImagePath = ref;
    await updateImagePreview('editAfterImagePreview', 'openAfterImageBtn', editAfterImagePath);
  });
  initTradeImageDropZone('btBeforeImage', async (ref) => {
    btBeforeImagePath = ref;
    await updateImagePreview('btBeforeImagePreview', 'openBtBeforeImageBtn', btBeforeImagePath);
  });
  initTradeImageDropZone('btAfterImage', async (ref) => {
    btAfterImagePath = ref;
    await updateImagePreview('btAfterImagePreview', 'openBtAfterImageBtn', btAfterImagePath);
  });

  if (prevMonthBtn) prevMonthBtn.onclick = () => prevMonth();
  if (nextMonthBtn) nextMonthBtn.onclick = () => nextMonth();
  if (themeToggleInput) {
    themeToggleInput.onchange = () => {
      const nextTheme = themeToggleInput.checked ? 'light' : 'dark';
      localStorage.setItem('theme', nextTheme);
      applyTheme(nextTheme);
      if (activeKPIType) renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, getDashboardFilteredTrades());
    };
  }
  kpiCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('#dashboardReturnMode')) return;
      onKpiClick(card.getAttribute('data-type'));
    });
  });
  toggleWeekendInput?.addEventListener('change', (event) => {
    showWeekend = Boolean(event.target.checked);
    renderCalendar(currentYear, currentMonth, true, getDashboardFilteredTrades());
  });
  if (excludeBEInput) {
    excludeBEInput.checked = isExcludeBEEnabled();
    excludeBEInput.onchange = (event) => {
      localStorage.setItem('excludeBE', String(Boolean(event.target.checked)));
      loadStats();
      const ft = getDashboardFilteredTrades();
      updateKpiCards(ft, currentMonth, currentYear);
      if (Array.isArray(ft) && ft.length) updateDashboardMetrics(ft);
      if (activeKPIType) renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, ft);
    };
  }
  updateWinrateInfoLabel();
  if (calendarTitle) calendarTitle.onclick = openDateModal;
  if (closeModalBtn) closeModalBtn.onclick = closeDateModal;
  if (prevYearBtn) prevYearBtn.onclick = () => {
    selectedYear -= 1;
    loadMonths();
  };
  if (nextYearBtn) nextYearBtn.onclick = () => {
    selectedYear += 1;
    loadMonths();
  };
  dateModal?.addEventListener('click', (event) => {
    if (event.target === dateModal) closeDateModal();
  });
  if (closeDayModalBtn) closeDayModalBtn.onclick = closeDayModal;
  if (closePanelBtn) closePanelBtn.onclick = closeTradePanel;
  const cancelDeleteBtn = document.getElementById('cancelDelete');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  const confirmModalCloseBtn = document.getElementById('confirmModalClose');
  if (cancelDeleteBtn) {
    cancelDeleteBtn.onclick = () => {
      closeTradeDeleteConfirmModal();
    };
  }
  if (confirmModalCloseBtn) {
    confirmModalCloseBtn.onclick = () => {
      closeTradeDeleteConfirmModal();
    };
  }
  if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
      if (!tradeToDelete) return;
      const id = tradeToDelete;
      const row = tradeToDeleteRow;
      tradeToDelete = null;
      tradeToDeleteRow = null;
      document.getElementById('confirmModal')?.classList.remove('active');
      try {
        await deleteTradeFromPanel(id, row);
      } catch (error) {
        console.error('Error eliminando trade', error);
        showToast(t('error_delete'), 'error');
      }
    };
  }
  const confirmModalEl = document.getElementById('confirmModal');
  if (confirmModalEl) {
    confirmModalEl.addEventListener('click', (e) => {
      if (e.target === confirmModalEl) {
        closeTradeDeleteConfirmModal();
      }
    });
  }
  tradePanel?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const deleteBtn = event.target.closest('.trade-panel-delete, .delete-btn');
    if (deleteBtn) {
      event.stopPropagation();
      const card = deleteBtn.closest('.trade-panel-card, .trade-row');
      const id = deleteBtn.getAttribute('data-id') || card?.getAttribute('data-id');
      if (!id) return;
      openDeleteModal(id, card);
      return;
    }
    const editBtn = event.target.closest('.trade-panel-edit');
    if (editBtn) {
      event.stopPropagation();
      const tradeId = editBtn.getAttribute('data-id');
      if (!tradeId) return;
      closeTradePanel();
      openTradeForEdit(Number(tradeId));
      return;
    }
  });
  dayModal?.addEventListener('click', (event) => {
    if (event.target === dayModal) closeDayModal();
  });

  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) dateInput.value = getTodayDateString();

  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  void (async () => {
    await loadStrategies();
    await loadAccounts();
  })();
  initCustomSelects();
  initAssetCombobox();
  // Selectores propios en TODOS los campos de fecha/hora: los nativos de Chromium no se pueden
  // tematizar y rompían la coherencia visual de la app.
  ['date', 'editDate', 'btDate', 'btSessionStartDate', 'btSessionEndDate',
   'withdrawalFilterFrom', 'withdrawalFilterTo', 'expenseFilterFrom', 'expenseFilterTo']
    .forEach((id) => initTradeDatepicker(id));
  ['entryTime', 'exitTime', 'editEntryTime', 'editExitTime', 'btEntryTime', 'btExitTime']
    .forEach((id) => initTradeTimepicker(id));
  applyModeUI();
  updateCreateDerivedFields();
  recalculateCreateNetPnl();
  initHistoryAccordion();
  refreshLucideIcons();
  initDashboardReturnModeControl();
  showView(getViewFromHash());
});

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  if (!event.target.closest('.dashboard-multiselect')) {
    document.querySelectorAll('.dashboard-multiselect.open').forEach((el) => {
      el.classList.remove('open');
    });
  }
  if (!event.target.closest('.custom-select')) {
    closeAllCustomSelects();
  }
  // El popup abierto cuelga del <body>, así que ya no está dentro de .custom-datepicker:
  // hay que contemplarlo aparte o pulsar en el calendario (cambiar de mes, por ejemplo) lo
  // cerraría.
  if (!event.target.closest('.custom-datepicker') && !event.target.closest('.datepicker-popup')) {
    closeTradeDatepicker();
  }
  if (!event.target.closest('.custom-timepicker')) {
    closeTradeTimepickers();
  }
});

// El popup del timepicker usa position:fixed (para escapar del overflow:hidden de la tarjeta
// "Nueva operación"), así que no sigue al trigger si la página hace scroll; lo más simple y
// robusto es cerrarlo en cuanto haya scroll en cualquier contenedor (capture:true detecta el
// scroll interno de paneles con su propio overflow, no solo el de la ventana). Importante:
// excluir el scroll que ocurre DENTRO del propio popup (las columnas de horas/minutos son
// scrollables), si no, el simple gesto de desplazarse para elegir una hora lo cerraría solo.
window.addEventListener(
  'scroll',
  (event) => {
    if (event.target instanceof Element && event.target.closest('.custom-timepicker')) return;
    closeTradeTimepickers();
  },
  true
);
window.addEventListener('resize', () => closeTradeTimepickers());

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeTradeDatepicker();
    closeTradeTimepickers();
    assetComboboxState?.closePanel?.();
    backtestingAssetComboboxState?.closePanel?.();
    document.querySelectorAll('.dashboard-multiselect.open').forEach((el) => {
      el.classList.remove('open');
    });
  }
});

window.addEventListener('app:languagechanged', () => {
  updateWinrateInfoLabel();
  customDatepickerRoots.forEach((root) => root.refreshDatepickerI18n?.());
  tradeTimepickerRoots.forEach((root) => root.refreshTimepickerI18n?.());
  void (async () => {
    await loadStrategies();
    await loadAccounts();
    refreshAssetComboboxAfterI18n();
    initCustomSelects();
    await renderDashboardFilters(cachedTrades);
    renderCalendarFromState(true, getDashboardFilteredTrades());
    if (activeKPIType) renderKpiExpandedChart(activeKPIType, currentMonth, currentYear, getDashboardFilteredTrades());
    if (currentView === 'backtesting') {
      void refreshBacktestingView().catch(console.error);
    }
    if (currentView === 'backtestingConfig') {
      void (async () => {
        await loadBacktestingSettings();
        await loadBacktestingMetrics();
        renderBtMetricsConfigList();
      })().catch(console.error);
    }
    refreshLucideIcons();
  })();
});