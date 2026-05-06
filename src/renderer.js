import { supabase } from './supabase.js';
import { login, register, logout } from './auth.js';
import { validateTrade } from './services/validators.js';
/** Fechas visibles DD-MM-YYYY — implementación en `./dateDisplay.js`. */
import { formatDateEs, formatDateRangeEs } from './dateDisplay.js';

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
  margin-top:clamp(18px,2.2vw,26px);
}
#backtestingView .dashboard-container>.pro-backtesting-shell>.bt-section:first-child,
#backtestingView .pro-section:first-of-type{margin-top:0}
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
#backtestingView .bt-kpi-toolbar{display:flex;justify-content:flex-start;margin-bottom:14px}
#backtestingView .bt-kpi-hero-row{display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:12px;margin-bottom:12px}
#backtestingView .bt-kpi-mini-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:12px}
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
#backtestingView .bt-result-pill-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
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
@media(max-width:1250px){
  #backtestingView .bt-kpi-hero-row{grid-template-columns:1fr}
  #backtestingView .bt-kpi-mini-row{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:700px){
  #backtestingView .bt-kpi-mini-row,
  #backtestingView .bt-result-pill-row{grid-template-columns:1fr}
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
#backtestingView .bt-day-trade-card{border:1px solid var(--border);background:rgba(15,23,42,.22);border-radius:14px;padding:12px}
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
#backtestingView .bt-day-trade-actions{display:flex;justify-content:flex-end;margin-top:10px}
#backtestingView .bt-day-trade-edit{height:32px;padding:0 12px;border-radius:10px;border:1px solid rgba(34,197,94,.28);background:rgba(34,197,94,.10);color:var(--green);font-weight:800;cursor:pointer}
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
    .subscribe();

  return tradesRealtimeChannel;
}

function unsubscribeTradesRealtime() {
  clearTimeout(realtimeTimeout);
  realtimeTimeout = null;
  if (tradesRealtimeChannel) {
    supabase.removeChannel(tradesRealtimeChannel);
    tradesRealtimeChannel = null;
  }
}

async function loadUserInfo() {
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email || 'No autenticado';

  const el = document.getElementById('user-email');
  if (el) el.textContent = email;
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

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

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

    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email;

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

    if (authMode === 'register') {
      const user = await register(email, password);
      if (!user) {
        loginErrorEl().textContent = 'Error al crear cuenta (mín 6 caracteres)';
        if (loginBtn) {
          loginBtn.disabled = false;
          updateAuthModeUI();
        }
        authTabs.forEach((tab) => { tab.disabled = false; });
        return;
      }
      loginErrorEl().textContent = 'Cuenta creada. Ahora puedes iniciar sesión.';
      authMode = 'login';
      if (loginBtn) loginBtn.disabled = false;
      authTabs.forEach((tab) => { tab.disabled = false; });
      updateAuthModeUI();
      return;
    }

    const user = await login(email, password);

    if (!user) {
      loginErrorEl().textContent = 'Credenciales incorrectas';
      if (loginBtn) {
        loginBtn.disabled = false;
        updateAuthModeUI();
      }
      authTabs.forEach((tab) => { tab.disabled = false; });
      return;
    }

    window.currentUser = { id: user.id, email: user.email };

    await migrateGlobalRealDataToUserScopedStorage();
    await syncRealListsFromStorage();

    await syncSupabaseSessionWithMain();

    isAppAuthenticated = true;

    modal.style.opacity = '0';
    modal.style.transform = 'scale(0.95)';

    setTimeout(() => {
      modal.remove();

      loadUserInfo().catch((err) => console.error('loadUserInfo', err));

      void (async () => {
        await loadStrategies();
        await loadAccounts();

        if (typeof loadTrades === 'function') loadTrades();
        if (typeof loadStats === 'function') loadStats();
      })();

      subscribeToTradesRealtime();

      console.log('🚀 App lista tras login');
    }, 200);
  };
}

async function checkAuth() {
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    console.log('🔒 Usuario no autenticado');
    window.currentUser = null;
    isAppAuthenticated = false;
    showLoginModal();
    return false;
  }

  console.log('🔓 Usuario autenticado:', data.user.email);
  window.currentUser = { id: data.user.id, email: data.user.email };
  if (data.user.id) {
    localStorage.setItem('user_id', data.user.id);
    console.log('✅ user_id sincronizado con sesión:', data.user.id);
  }
  await migrateGlobalRealDataToUserScopedStorage();
  await syncRealListsFromStorage();
  isAppAuthenticated = true;
  await syncSupabaseSessionWithMain();
  return true;
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

ChartJS.register(...registerables);
if (typeof window.Chart === 'undefined') {
  window.Chart = ChartJS;
}
console.log('Chart disponible:', typeof window.Chart);

/** Caché en memoria de listas reales (sincronizada desde localStorage scoped por usuario). */
let realAccountsCache = [];
let realStrategiesCache = [];

async function getCurrentUserIdSafe() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Usuario no autenticado', error);
    return null;
  }

  return user.id;
}

/**
 * Clave localStorage para datos privados del usuario.
 * Sin sesión devuelve null (no se usa clave compartida ni "_anonymous" para datos privados).
 */
async function getUserScopedStorageKey(baseKey) {
  const userId = await getCurrentUserIdSafe();

  if (!userId) {
    console.warn('No hay usuario, no se cargan cuentas/estrategias reales en localStorage');
    return null;
  }

  return `${baseKey}_${userId}`;
}

/**
 * Migra claves globales antiguas a claves scoped por usuario.
 * Solo permitido para el propietario histórico; luego limpia claves globales.
 */
async function migrateGlobalRealDataToUserScopedStorage() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
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

  // Limpieza de legado global: evita exposición cruzada entre usuarios.
  localStorage.removeItem('accounts');
  localStorage.removeItem('trading_accounts');
  localStorage.removeItem('real_accounts');
  localStorage.removeItem('strategies');
  localStorage.removeItem('trading_strategies');
  localStorage.removeItem('real_strategies');

  localStorage.setItem(migrationFlag, 'true');
}

/** Lee localStorage scoped y actualiza realAccountsCache / realStrategiesCache. */
async function syncRealListsFromStorage() {
  const userId = await getCurrentUserIdSafe();
  if (!userId) {
    realAccountsCache = [];
    realStrategiesCache = [];
    return;
  }

  await migrateGlobalRealDataToUserScopedStorage();

  const ak = await getUserScopedStorageKey('real_accounts');
  const sk = await getUserScopedStorageKey('real_strategies');
  if (ak) console.log('Real accounts storage key:', ak);
  if (sk) console.log('Real strategies storage key:', sk);

  try {
    realAccountsCache = ak
      ? getStoredList(ak)
          .map((row) => normalizeAccount(row))
          .filter((account) => account.name)
      : [];
    realStrategiesCache = sk ? getStoredList(sk).filter(Boolean) : [];
  } catch (e) {
    console.warn('syncRealListsFromStorage', e);
    realAccountsCache = [];
    realStrategiesCache = [];
  }
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
let btResultCollapsed = true;
/** Unidad de riesgo en el modal Nueva/Editar estrategia (`'eur'` | `'percent'`). */
let btStrategyRiskUnit = 'eur';

let backtestingSettings = {
  accounts: [],
  strategies: [],
  assets: [],
  sessions: [],
  default_account: '',
  default_strategy: '',
  default_asset: '',
  default_risk: 100,
  default_rr: 2
};

/** Filtros dashboard multiselect (solo vista; datos completos en cachedTrades). */
let selectedDashboardAccounts = new Set(['ALL']);
let selectedDashboardStrategies = new Set(['ALL']);

/** @type {string | null} */
let editingSettingsStrategy = null;
/** @type {string | null} */
let editingSettingsAccount = null;
/** @type {number | null} */
let editingBtMetricId = null;
let kpiExpandedChartInstance = null;
let activeKPIType = null;
let createBeforeImagePath = '';
let createAfterImagePath = '';
let editBeforeImagePath = '';
let editAfterImagePath = '';
let tradeDatepickerRoot = null;
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

  return source.filter((trade) => {
    const accountValue = trade.account || '';
    const strategyValue = trade.strategy || '';

    const accountOk = allAccounts || selectedDashboardAccounts.has(accountValue);
    const strategyOk = allStrategies || selectedDashboardStrategies.has(strategyValue);

    return accountOk && strategyOk;
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

  const isAll = selectedSet.has('ALL') || selectedSet.size === 0;

  const selectedLabels = isAll
    ? escapeHtmlChipText(allLabel)
    : options
        .filter((opt) => selectedSet.has(opt))
        .map((opt) => escapeHtmlChipText(opt))
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
      ${options
        .map(
          (opt) => `
      <label class="dashboard-multiselect-option">
        <input type="checkbox" value="${escapeAttrChip(opt)}" ${!isAll && selectedSet.has(opt) ? 'checked' : ''}>
        <span>${escapeHtmlChipText(opt)}</span>
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

  const tradeList = Array.isArray(trades) ? trades : [];

  const configuredAccounts =
    typeof getAccounts === 'function' ? getAccounts().map((acc) => acc.name).filter(Boolean) : [];
  const tradeAccounts = [...new Set(tradeList.map((t) => t.account).filter(Boolean))];
  const accounts = [...new Set([...configuredAccounts, ...tradeAccounts])].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );

  const configuredStrategies = realStrategiesCache.filter(Boolean);
  const tradeStrategies = [...new Set(tradeList.map((t) => t.strategy).filter(Boolean))];
  const strategies = [...new Set([...configuredStrategies, ...tradeStrategies])].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  );

  pruneDashboardFilterSelections(accounts, strategies);

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

    if (Number(trade.commission) > 0) {
      const meta = document.createElement('span');
      meta.className = 'meta-line';
      meta.textContent = `${t('commission_line')}: ${Number(trade.commission).toFixed(2)}€`;
      li.appendChild(meta);
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

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.body.classList.toggle('light', isLight);
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.checked = isLight;
  updateThemeIcon();
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
}

function formatIsoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIsoDate(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month: month - 1, day };
}

function initTradeDatepicker(inputId = 'date') {
  const nativeInput = document.getElementById(inputId);
  if (!nativeInput || nativeInput.dataset.customDatepickerBound === 'true') return;

  nativeInput.dataset.customDatepickerBound = 'true';
  nativeInput.classList.add('native-date-hidden');

  const custom = document.createElement('div');
  custom.className = 'custom-datepicker';
  custom.innerHTML = `
    <button type="button" class="datepicker-trigger">
      <span class="datepicker-trigger-label"></span>
      <span class="datepicker-trigger-arrow">v</span>
    </button>
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

  const trigger = custom.querySelector('.datepicker-trigger');
  const triggerLabel = custom.querySelector('.datepicker-trigger-label');
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
    triggerLabel.textContent = value ? formatDateToDisplay(value) : t('select_date');
    custom.classList.toggle('has-value', Boolean(value));
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

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = !custom.classList.contains('open');
    closeAllCustomSelects();
    closeTradeDatepicker();
    if (!willOpen) return;
    syncViewWithValue();
    renderDays();
    custom.classList.add('open');
    popup?.scrollTo?.(0, 0);
  });

  prevBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    state.viewMonth -= 1;
    if (state.viewMonth < 0) {
      state.viewMonth = 11;
      state.viewYear -= 1;
    }
    renderDays();
  });

  nextBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    state.viewMonth += 1;
    if (state.viewMonth > 11) {
      state.viewMonth = 0;
      state.viewYear += 1;
    }
    renderDays();
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

  syncViewWithValue();
  syncLabel();
  if (todayBtn) todayBtn.textContent = t('today');
  if (clearBtn) clearBtn.textContent = t('clear');
}

function refreshCustomSelectForNative(nativeSelect) {
  if (!nativeSelect || nativeSelect.tagName !== 'SELECT') return;
  if (
    nativeSelect.id === 'asset' ||
    nativeSelect.id === 'btAsset' ||
    nativeSelect.id === 'btDirection' ||
    nativeSelect.id === 'btAccount' ||
    nativeSelect.closest('#btSessionModalOverlay')
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
      select.id === 'btAccount' ||
      select.closest('#btSessionModalOverlay') ||
      select.closest('#btStrategyModalOverlay')
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

function normalizeAccount(account) {
  if (typeof account === 'string') {
    return { name: account, capital: 0, commissionPerLot: 0, freeSwap: false };
  }
  return {
    name: (account?.name || '').trim(),
    capital: Number(account?.capital) || 0,
    commissionPerLot: Number(account?.commissionPerLot) || 0,
    freeSwap: Boolean(account?.freeSwap)
  };
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

  const arr = Array.isArray(strategies) ? strategies.filter(Boolean) : [];
  saveStoredList(key, arr);
  realStrategiesCache = arr;
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

  return result.path;
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
  await syncRealListsFromStorage();
  const strategies = realStrategiesCache;
  fillSelect('strategy', strategies, 'placeholder_select_strategy');
  fillSelect('settingsStrategy', strategies, 'placeholder_select_strategy');
  fillSelect('editStrategy', strategies, 'placeholder_select_strategy');
  fillSelect('resetStrategySelect', strategies, 'placeholder_select_strategy');
  if (currentView === 'dashboard') {
    await renderDashboardFilters(cachedTrades);
    renderDashboardWithFilters({ skipCalendar: true });
  }
}

function resetStrategyForm() {
  editingSettingsStrategy = null;
  const input = document.getElementById('newStrategy');
  if (input) {
    input.value = '';
    input.removeAttribute('data-editing');
    input.placeholder = t('placeholder_new_strategy');
  }
  const sel = document.getElementById('settingsStrategy');
  if (sel) sel.value = '';
  document.getElementById('settingsStrategyCard')?.classList.remove('is-editing');
  const cancelBtn = document.getElementById('cancelStrategyEditBtn');
  if (cancelBtn) cancelBtn.hidden = true;
  const addBtn = document.getElementById('addStrategyBtn');
  if (addBtn) addBtn.textContent = t('add_strategy');
}

function onSettingsStrategyChange() {
  const strategySelect = document.getElementById('settingsStrategy');
  const input = document.getElementById('newStrategy');
  const value = strategySelect?.value;
  if (!value) {
    resetStrategyForm();
    return;
  }
  editingSettingsStrategy = value;
  if (input) {
    input.value = value;
    input.setAttribute('data-editing', '1');
    input.placeholder = t('placeholder_editing_strategy');
  }
  document.getElementById('settingsStrategyCard')?.classList.add('is-editing');
  const cancelBtn = document.getElementById('cancelStrategyEditBtn');
  if (cancelBtn) cancelBtn.hidden = false;
  const addBtn = document.getElementById('addStrategyBtn');
  if (addBtn) addBtn.textContent = t('save_changes');
}

async function updateStrategyName(oldName, newName) {
  const o = String(oldName || '').trim();
  const n = String(newName || '').trim();
  if (!o || !n) return false;
  await syncRealListsFromStorage();
  const strategies = [...realStrategiesCache];
  if (!strategies.includes(o)) return false;
  if (n !== o && strategies.includes(n)) {
    showToast(t('error_duplicate_strategy_name'), 'error');
    return false;
  }

  if (o !== n) {
    const backend = getBackendApi();
    if (backend?.updateTradesStrategy) {
      const res = await backend.updateTradesStrategy(o, n);
      if (!res?.success && !res?.skipped) {
        showToast(t('error_rename_trades_remote'), 'error');
        return false;
      }
    }
  }

  const updated = strategies.map((s) => (s === o ? n : s));
  await saveRealStrategiesList(updated);
  return true;
}

async function saveOrUpdateStrategy() {
  const input = document.getElementById('newStrategy');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  if (editingSettingsStrategy) {
    if (value === editingSettingsStrategy) {
      showToast(t('no_changes_to_save'), 'success');
      return;
    }
    const ok = await updateStrategyName(editingSettingsStrategy, value);
    if (!ok) return;
    resetStrategyForm();
    await loadStrategies();
    const sel = document.getElementById('settingsStrategy');
    if (sel) sel.value = value;
    await loadTrades();
    showToast(t('saved_changes'), 'success');
    return;
  }

  await syncRealListsFromStorage();
  const strategies = [...realStrategiesCache];
  if (strategies.includes(value)) {
    showToast(t('error_duplicate_strategy_name'), 'error');
    return;
  }
  strategies.push(value);
  await saveRealStrategiesList(strategies);
  resetStrategyForm();
  await loadStrategies();
  const sel = document.getElementById('settingsStrategy');
  if (sel) sel.value = value;
  showToast(t('saved_changes'), 'success');
}

function addStrategy() {
  saveOrUpdateStrategy().catch((err) => console.error(err));
}

function deleteStrategy() {
  void (async () => {
    const strategySelect = document.getElementById('settingsStrategy') || document.getElementById('strategy');
    if (!strategySelect?.value) return;
    const removed = strategySelect.value;
    await syncRealListsFromStorage();
    const strategies = realStrategiesCache.filter((item) => item !== removed);
    await saveRealStrategiesList(strategies);
    if (editingSettingsStrategy === removed) resetStrategyForm();
    await loadStrategies();
    showToast(t('saved_changes'));
  })();
}

async function loadAccounts() {
  await syncRealListsFromStorage();
  const accountNames = getAccounts().map((account) => account.name);
  fillSelect('account', accountNames, 'placeholder_select_account');
  fillSelect('settingsAccount', accountNames, 'placeholder_select_account');
  fillSelect('editAccount', accountNames, 'placeholder_select_account');
  fillSelect('resetAccountSelect', accountNames, 'placeholder_select_account');
  refreshPnlPresetButtons();
  if (currentView === 'dashboard') {
    await renderDashboardFilters(cachedTrades);
    renderDashboardWithFilters({ skipCalendar: true });
  }
}

function resetAccountForm() {
  editingSettingsAccount = null;
  const nameInput = document.getElementById('newAccount');
  const capitalInput = document.getElementById('newAccountCapital');
  const commissionInput = document.getElementById('newAccountCommission');
  const freeSwapInput = document.getElementById('newAccountFreeSwap');
  if (nameInput) {
    nameInput.value = '';
    nameInput.removeAttribute('data-editing');
    nameInput.placeholder = t('placeholder_account_name');
  }
  if (capitalInput) capitalInput.value = '';
  if (commissionInput) commissionInput.value = '';
  if (freeSwapInput) freeSwapInput.checked = false;
  const accountSelect = document.getElementById('settingsAccount');
  if (accountSelect) accountSelect.value = '';
  document.getElementById('settingsAccountCard')?.classList.remove('is-editing');
  const cancelBtn = document.getElementById('cancelAccountEditBtn');
  if (cancelBtn) cancelBtn.hidden = true;
  const addBtn = document.getElementById('addAccountBtn');
  if (addBtn) addBtn.textContent = t('add_account');
}

function onSettingsAccountChange() {
  const accountSelect = document.getElementById('settingsAccount');
  const name = accountSelect?.value;
  if (!name) {
    resetAccountForm();
    return;
  }
  const account = getAccounts().find((a) => a.name === name);
  if (!account) return;
  editingSettingsAccount = account.name;
  const nameInput = document.getElementById('newAccount');
  const capitalInput = document.getElementById('newAccountCapital');
  const commissionInput = document.getElementById('newAccountCommission');
  const freeSwapInput = document.getElementById('newAccountFreeSwap');
  if (nameInput) {
    nameInput.value = account.name;
    nameInput.setAttribute('data-editing', '1');
    nameInput.placeholder = t('placeholder_editing_account');
  }
  if (capitalInput) capitalInput.value = String(account.capital ?? '');
  if (commissionInput) commissionInput.value = String(account.commissionPerLot ?? '');
  if (freeSwapInput) freeSwapInput.checked = Boolean(account.freeSwap);
  document.getElementById('settingsAccountCard')?.classList.add('is-editing');
  const cancelBtn = document.getElementById('cancelAccountEditBtn');
  if (cancelBtn) cancelBtn.hidden = false;
  const addBtn = document.getElementById('addAccountBtn');
  if (addBtn) addBtn.textContent = t('save_changes');
}

async function saveOrUpdateAccount() {
  const nameInput = document.getElementById('newAccount');
  const capitalInput = document.getElementById('newAccountCapital');
  const commissionInput = document.getElementById('newAccountCommission');
  const freeSwapInput = document.getElementById('newAccountFreeSwap');
  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) return;

  const payload = {
    name,
    capital: Number(capitalInput?.value) || 0,
    commissionPerLot: Number(commissionInput?.value) || 0,
    freeSwap: Boolean(freeSwapInput?.checked)
  };

  if (editingSettingsAccount) {
    const accounts = getAccounts();
    const taken = accounts.some(
      (a) => a.name === name && a.name !== editingSettingsAccount
    );
    if (taken) {
      showToast(t('error_duplicate_account_name'), 'error');
      return;
    }

    if (name !== editingSettingsAccount) {
      const backend = getBackendApi();
      if (backend?.updateTradesAccount) {
        const res = await backend.updateTradesAccount(editingSettingsAccount, name);
        if (!res?.success && !res?.skipped) {
          showToast(t('error_rename_trades_remote'), 'error');
          return;
        }
      }
    }

    const updatedList = accounts.map((a) =>
      a.name === editingSettingsAccount ? normalizeAccount(payload) : a
    );
    await saveAccounts(updatedList);
    resetAccountForm();
    await loadAccounts();
    const sel = document.getElementById('settingsAccount');
    if (sel) sel.value = name;
    updateCreateDerivedFields();
    await loadTrades();
    showToast(t('saved_changes'), 'success');
    return;
  }

  const accounts = getAccounts();
  if (accounts.some((a) => a.name === name)) {
    showToast(t('error_duplicate_account_name'), 'error');
    return;
  }
  accounts.push(
    normalizeAccount({
      name: payload.name,
      capital: payload.capital,
      commissionPerLot: payload.commissionPerLot,
      freeSwap: payload.freeSwap
    })
  );
  await saveAccounts(accounts);
  resetAccountForm();
  await loadAccounts();
  const sel = document.getElementById('settingsAccount');
  if (sel) sel.value = name;
  updateCreateDerivedFields();
  showToast(t('saved_changes'), 'success');
}

function addAccount() {
  saveOrUpdateAccount().catch((err) => console.error(err));
}

function deleteAccount() {
  void (async () => {
    const selected =
      document.getElementById('settingsAccount')?.value || document.getElementById('account')?.value;
    if (!selected) return;
    if (editingSettingsAccount === selected) resetAccountForm();
    await saveAccounts(getAccounts().filter((account) => account.name !== selected));
    await loadAccounts();
    updateCreateDerivedFields();
    showToast(t('saved_changes'));
  })();
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
  const result = await backend.deleteTradesByStrategy(strategy);
  const deletedCount = Number(result?.deleted || 0);
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
  const result = await backend.deleteTradesByAccount(account);
  const deletedCount = Number(result?.deleted || 0);
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

function navigateTo(page) {
  const target = String(page || '').toLowerCase();
  const isFileProtocol = window.location.protocol === 'file:';
  if (!target) return;

  if (isFileProtocol) {
    window.location.href = `${target}.html`;
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

  if (target === 'trade' || target === 'config' || target === 'backtesting' || target === 'backtestingconfig') {
    const fragment = target === 'backtestingconfig' ? 'backtestingconfig' : target;
    window.location.href = `${window.location.origin}/main_window#${fragment}`;
    return;
  }

  window.location.href = `${window.location.origin}/${target}`;
}

function getViewFromHash() {
  const hash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (hash === 'backtestingconfig') return 'backtestingConfig';
  if (hash === 'trade' || hash === 'config' || hash === 'dashboard' || hash === 'backtesting') return hash;
  return 'dashboard';
}

function showView(viewId) {
  normalizeSidebarStructure();
  const views = ['dashboard', 'trade', 'config', 'backtesting', 'backtestingConfig'];
  currentView = views.includes(viewId) ? viewId : 'dashboard';
  if (currentView !== 'dashboard') closeTradePanel();

  ['dashboard', 'trade', 'config', 'backtesting', 'backtestingConfig'].forEach((v) => {
    const el = document.getElementById(`${v}View`);
    if (el) el.style.display = v === currentView ? 'block' : 'none';
  });

  document.getElementById('btnDashboard')?.classList.toggle('active', currentView === 'dashboard');
  document.getElementById('btnTrade')?.classList.toggle('active', currentView === 'trade');
  document.getElementById('btnConfig')?.classList.toggle('active', currentView === 'config');
  document.getElementById('btnBacktesting')?.classList.toggle('active', currentView === 'backtesting');
  document.getElementById('btnBacktestingConfig')?.classList.toggle('active', currentView === 'backtestingConfig');
  document.getElementById('btnStats')?.classList.toggle('active', false);

  if (currentView === 'dashboard') renderDashboard();
  if (currentView === 'trade') {
    const presetDate = sessionStorage.getItem(NEW_TRADE_DATE_KEY);
    void resetNewTradeForm(presetDate || null).catch(console.error);
    applyPresetTradeDateIfAny();
  }
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
  setTimeout(() => {
    normalizeSidebarStructure();
    console.log('Sidebar normalized after view render');
  }, 0);

  console.log('Vista actual:', currentView);
}
window.navigateTo = navigateTo;
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
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  sidebar.classList.toggle('closed');
  refreshLucideIcons();
}

function getSidebarActionButton(target) {
  const normalized = String(target || '').toLowerCase();
  if (!normalized) return null;
  return (
    document.getElementById(`btn${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`) ||
    document.querySelector(`[onclick*="navigateTo('${normalized}')"]`) ||
    document.querySelector(`[onclick*='navigateTo("${normalized}")']`)
  );
}

function getSidebarSectionByLabel(label) {
  const expected = String(label || '').trim().toUpperCase();
  if (!expected) return null;
  const sections = Array.from(document.querySelectorAll('#sidebar .sidebar-section'));
  return (
    sections.find((section) => {
      const title = section.querySelector('.sidebar-title, .sidebar-label, h2, h3');
      return String(title?.textContent || '').trim().toUpperCase() === expected;
    }) || null
  );
}

function normalizeSidebarStructure() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const btnConfig = getSidebarActionButton('config');
  const btnStats = getSidebarActionButton('stats');
  const btnTrade = getSidebarActionButton('trade');

  if (!btnConfig) return;
  if (!btnConfig.id) btnConfig.id = 'btnConfig';
  if (btnStats && !btnStats.id) btnStats.id = 'btnStats';
  if (btnTrade && !btnTrade.id) btnTrade.id = 'btnTrade';

  const wrapperSelector = 'li, .sidebar-item, .nav-item, .menu-item, .item';
  const configNode = btnConfig.closest(wrapperSelector) || btnConfig;
  const targetNode = (btnStats || btnTrade)?.closest(wrapperSelector) || btnStats || btnTrade;
  const realSection = getSidebarSectionByLabel('REAL');
  const systemSection = getSidebarSectionByLabel('SISTEMA');

  if (targetNode && configNode && configNode !== targetNode) {
    targetNode.parentElement?.insertBefore(configNode, targetNode.nextSibling);
  }

  if (realSection && configNode && configNode.parentElement !== realSection) {
    if (targetNode && targetNode.parentElement === realSection) {
      realSection.insertBefore(configNode, targetNode.nextSibling);
    } else {
      realSection.appendChild(configNode);
    }
  }

  if (systemSection && configNode.parentElement === systemSection && realSection) {
    realSection.appendChild(configNode);
  }
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
  const mode = getMode();
  const grossPnl = parseMoneyInput(document.getElementById('pnl')?.value);
  const lotSize = Number(document.getElementById('lotSize')?.value) || 0;
  const account = getSelectedAccount('account');
  const commission = mode === 'pro' ? lotSize * (account?.commissionPerLot || 0) : 0;
  const netPnl = grossPnl - commission;

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

function initAssetCombobox() {
  const assetSelect = document.getElementById('asset');
  if (assetSelect) {
    const existingCustom = assetSelect.nextElementSibling;
    if (existingCustom && existingCustom.classList.contains('custom-select')) {
      existingCustom.remove();
    }
  }
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
  const mode = getMode();
  const grossPnl = Number(document.getElementById('editPnl')?.value) || 0;
  const lotSize = Number(document.getElementById('editLotSize')?.value) || 0;
  const account = getSelectedAccount('editAccount');
  const commission = mode === 'pro' ? lotSize * (account?.commissionPerLot || 0) : 0;
  const accountCapital = account ? Number(account.capital) || 0 : 0;
  const editCommission = document.getElementById('editCommission');
  const editAccountCapital = document.getElementById('editAccountCapital');
  if (editCommission) editCommission.value = commission.toFixed(2);
  if (editAccountCapital) editAccountCapital.value = accountCapital.toFixed(2);
  return { commission, netPnl: grossPnl - commission, accountCapital };
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
      if (pnl > 0) {
        cell.classList.add('day-profit');
        const intensity = Math.min(Math.abs(pnl) / 500, 1);
        cell.style.background = `rgba(34,197,94,${Math.max(intensity, 0.15)})`;
      } else if (pnl < 0) {
        cell.classList.add('day-loss');
        const intensity = Math.min(Math.abs(pnl) / 500, 1);
        cell.style.background = `rgba(239,68,68,${Math.max(intensity, 0.15)})`;
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

  if (beforeEl) beforeEl.value = '';
  if (afterEl) afterEl.value = '';

  createBeforeImagePath = '';
  createAfterImagePath = '';

  await updateImagePreview('beforeImagePreview', 'openBeforeImageBtnCreate', '');
  await updateImagePreview('afterImagePreview', 'openAfterImageBtnCreate', '');

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

function renderTradePanel(trades) {
  const container = document.getElementById('tradePanelList');
  if (!container) return;
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (!safeTrades.length) {
    container.innerHTML = `<div class="trade-panel-empty">${t('no_trades_day')}</div>`;
    return;
  }

  container.innerHTML = safeTrades.map((trade) => {
    console.log('🧾 Render trade row:', trade.id, trade.asset);
    const pnl = getTradeRealPnl(trade);
    const valueClass = pnl >= 0 ? 'green' : 'red';
    return `
      <div class="trade-row" data-id="${trade.id}">
        <div class="trade-info">
          <strong>${trade.asset || '-'}</strong>
          <span class="trade-meta">${trade.strategy || '-'} · ${trade.result || 'BE'}</span>
          <span class="trade-value ${valueClass}">${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}€</span>
        </div>
        <button class="delete-btn icon-btn danger" type="button" data-id="${trade.id}" aria-label="${t('delete_trade')}">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');
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
  if (!backend?.addTrade) {
    showToast(t('error_api_undo'), 'error');
    return;
  }
  if (!(await ensureUserReady())) return;
  const userId = localStorage.getItem('user_id');
  let result = await backend.addTrade({ ...lastDeletedTrade, user_id: userId });
  if (result?.error === 'NO_USER_ID') {
    console.log('🔁 Retrying after syncing user_id...');
    await ensureUserReady();
    const userIdRetry = localStorage.getItem('user_id');
    result = await backend.addTrade({ ...lastDeletedTrade, user_id: userIdRetry });
  }
  if (!result?.success) {
    showToast(t('error_api_undo'), 'error');
    return;
  }
  if (result.id) rememberOwnInsertedTradeId(result.id);
  removeUndoToast();
  lastDeletedTrade = null;
  await loadTrades();
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
  if (!api?.deleteTrade || !api?.getTrades) {
    showToast(t('error_api_delete_trade'), 'error');
    return;
  }

  const id = Number(tradeId);
  const trade = (Array.isArray(cachedTrades) ? cachedTrades : []).find((item) => Number(item.id) === id);
  if (!trade) return;
  lastDeletedTrade = { ...trade };

  if (rowElement) rowElement.remove();
  cachedTrades = cachedTrades.filter((item) => Number(item.id) !== id);
  window.cachedTrades = cachedTrades;
  renderTradePanel(getTradesByDate(activeTradePanelDate));

  deletingTradeInProgress = true;
  try {
    const result = await api.deleteTrade(id);

    if (!result?.success && result?.error !== 'NOT_FOUND') {
      showToast('Error al eliminar trade', 'error');
      await loadTrades();
      if (activeTradePanelDate) openTradePanel(activeTradePanelDate);
      return;
    }

    const rawList = await (window.api || window.electronAPI).getTrades();
    const updatedTrades = Array.isArray(rawList) ? rawList : [];

    if (typeof cachedTrades !== 'undefined') {
      cachedTrades = updatedTrades;
    }
    window.cachedTrades = updatedTrades;

    if (typeof trades !== 'undefined') {
      trades = updatedTrades;
    }

    console.log('🗑 Eliminado ID:', tradeId);
    console.log('📦 Trades actualizados:', updatedTrades);

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

  } catch (error) {
    console.error('ERROR EN CALENDARIO:', error);
  }
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

function prepareBacktestingSimulationHooks(filteredTrades) {
  const el = document.getElementById('btRrCompare');
  if (!el) return;
  const n = Array.isArray(filteredTrades) ? filteredTrades.length : 0;
  el.textContent =
    n === 0
      ? 'Sin datos filtrados'
      : `Preparado (${n} ops). Comparativa 2R vs 3R y rangos temporales en próxima iteración.`;
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
  renderBeAdvancedStatsCard({
    hostId: 'backtestingView',
    blockId: 'beAdvancedStatsBacktesting',
    title: 'BE Avanzado (Backtesting)',
    trades: (Array.isArray(filtered) ? filtered : []).map((tr) => ({
      ...tr,
      pnl: getBacktestingTradePnlEuros(tr)
    }))
  });
  prepareBacktestingSimulationHooks(filtered);
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

      const session = cachedBacktestingSessions.find((s) => Number(s.id) === id);

      if (session) {
        const startKey = (session.start_date || '').slice(0, 10);
        selectedBacktestingDate = startKey;

        const dateInput = document.getElementById('btDate');
        if (dateInput && startKey) {
          dateInput.value = startKey;
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
          if (riskInput) {
            const auto = getBacktestingStrategyRiskEuroForForm(strategyConfig);
            if (auto !== '') riskInput.value = auto;
          }
        }

        refreshBacktestingFormUiWidgets();

        if (session.start_date) {
          const d = new Date(`${String(session.start_date).slice(0, 10)}T12:00:00`);
          if (!Number.isNaN(+d)) {
            backtestingCurrentMonth = d.getMonth();
            backtestingCurrentYear = d.getFullYear();
          }
        }
      }

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

function analyzeCheckboxMetric(trades, metricName) {
  const subset = trades.filter((t) => parseTradeCustomMetrics(t)[metricName] === true);
  const n = subset.length;
  if (!n) {
    return { n: 0, winrate: '0.0', pnl: 0, sumR: 0, avgRr: '0.00' };
  }
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
  const winrate = wrN ? ((wins / wrN) * 100).toFixed(1) : '0.0';
  const avgRr = (sumR / n).toFixed(2);
  return { n, winrate, pnl, sumR, avgRr };
}

function renderBacktestingMetricAnalysis(filtered) {
  const tbody = document.getElementById('btMetricAnalysisBody');
  if (!tbody) return;
  const checkboxes = (cachedBacktestingMetrics || []).filter((m) => m.is_active && m.metric_type === 'checkbox');
  tbody.innerHTML = '';
  if (!checkboxes.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="muted">No hay métricas checkbox activas. Configúralas en Config. Backtesting.</td>`;
    tbody.appendChild(tr);
    return;
  }
  checkboxes.forEach((m) => {
    const a = analyzeCheckboxMetric(filtered, m.name);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtmlAssetLabel(m.name)}</td><td>${a.n}</td><td>${a.winrate}%</td><td>${a.pnl >= 0 ? '+' : ''}${a.pnl.toFixed(2)}€</td><td>${a.sumR >= 0 ? '+' : ''}${a.sumR.toFixed(2)}R</td><td>${a.avgRr}</td>`;
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
      selectedBacktestingDate = dateStr;
      const dInput = document.getElementById('btDate');
      if (dInput) dInput.value = dateStr;
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
    btResultCollapsed = true;
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
  </div>`;
    wrap.appendChild(card);
  });
  bindBacktestingDayTradeEditHandlers();
  void refreshLucideIcons();
}

function ensureSelectHasValue(selectEl, value) {
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
  op.textContent = v;
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
    active: o.active !== false,
    risk_per_trade: riskPerTradeStored
  };
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
}

function ensureBtStrategyRiskUnitToggleBound() {
  if (document.documentElement.dataset.btStrategyRiskToggleBound === 'true') return;
  document.documentElement.dataset.btStrategyRiskToggleBound = 'true';
  const toggle = document.getElementById('btStrategyRiskUnitToggle');
  if (!toggle) return;
  toggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-unit]');
    if (!btn) return;
    btStrategyRiskUnit = btn.dataset.unit === 'percent' ? 'percent' : 'eur';
    syncBtStrategyRiskUnitToggleUi();
  });
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

  syncBtStrategyRiskUnitToggleUi();

  overlay.classList.add('active');
  void refreshLucideIcons();
}

function closeBacktestingStrategyModal() {
  document.getElementById('btStrategyModalOverlay')?.classList.remove('active');
}

async function saveBacktestingStrategyFromModal() {
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

  const payload = {
    id: id || crypto.randomUUID(),
    name,
    risk_value: riskValue,
    risk_unit: riskUnit,
    rr,
    notes,
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
    const result = await api.saveBacktestingSettings(backtestingSettings);

    if (!result?.success) {
      showToast('No se pudo guardar la estrategia', 'error');
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
    const result = await api.saveBacktestingSettings(backtestingSettings);

    if (!result?.success) {
      showToast('No se pudo eliminar la estrategia', 'error');
      return;
    }
  }

  renderBacktestingSettings();
  populateBacktestingSessionModalForm();
  populateBacktestingSelects();

  showToast('Estrategia eliminada', 'success');
}

async function loadBacktestingSettings() {
  const api = getBackendApi();
  if (!api?.getBacktestingSettings) return;
  try {
    const result = await api.getBacktestingSettings();
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
        default_rr: Number.isFinite(drr) && drr > 0 ? drr : 2
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

  const result = await api.saveBacktestingSettings(backtestingSettings);

  if (!result?.success) {
    showToast('No se pudo guardar configuración backtesting', 'error');
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
    const result = await api.saveBacktestingSettings(backtestingSettings);

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
    const result = await api.saveBacktestingSettings(backtestingSettings);
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
    span.appendChild(document.createTextNode(item));
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
            hidden.value = btn.dataset.value;
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

  document.getElementById('btPnlMode')?.addEventListener('change', onHintAndR);
  document.getElementById('btRisk')?.addEventListener('input', updateBacktestingDerivedRFields);
  document.getElementById('btRisk')?.addEventListener('change', updateBacktestingDerivedRFields);
}

function clearBacktestForm() {
  editingBacktestingTradeId = null;
  btManagementCollapsed = true;
  btResultCollapsed = true;
  const hid = document.getElementById('btEditId');
  if (hid) hid.value = '';
  const saveBtn = document.getElementById('btSaveBacktest');
  if (saveBtn) saveBtn.textContent = t('bt_save_operation', 'Guardar operación');
  const today = getTodayDateString();
  const ids = [
    ['btDate', today],
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
  const msg = document.getElementById('btFormMsg');
  if (msg) {
    msg.textContent = '';
    msg.className = 'form-hint';
  }
  refreshBacktestingFormUiWidgets();
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
}

function rerenderBacktestingLocal() {
  const filtered = getFilteredBacktestingTrades();
  renderBacktestingMetrics(filtered);
  renderBacktestingPairTable(filtered);
  renderBacktestingMetricAnalysis(filtered);
  renderBacktestingCalendar(backtestingCurrentYear, backtestingCurrentMonth);
  renderBacktestingDayTrades();
  initBacktestingIncludeBeSwitch();
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
  document.querySelectorAll('#btSessionModalOverlay .custom-select').forEach((el) => el.remove());
  document.querySelectorAll('#btSessionModalOverlay select').forEach((select) => {
    if (select.id !== 'btAsset') select.classList.remove('native-select-hidden');
  });
  const title = document.getElementById('btSessionModalTitle');
  const hid = document.getElementById('btSessionEditId');
  if (sessionId) {
    const sess = (cachedBacktestingSessions || []).find((s) => Number(s.id) === Number(sessionId));
    if (title) title.textContent = 'Editar sesión de backtesting';
    if (hid) hid.value = String(sessionId);
    if (sess) {
      const setv = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.value = v ?? '';
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
      if (el) el.value = '';
    });
    const st = document.getElementById('btSessionStatus');
    if (st) st.value = 'in_progress';
    btSessionSelectedPairs = [];
    syncBtSessionPairMultiSelectUI();
    document.getElementById('btSessionPairMultiSelect')?.classList.remove('open');
    applyBacktestingSessionQuickRange('1m');
  }
  ov.classList.add('active');
  void refreshLucideIcons();
}

function closeBacktestingSessionModal() {
  document.getElementById('btSessionModalOverlay')?.classList.remove('active');
}

async function saveBacktestingSessionFromModal() {
  if (!(await ensureUserReady())) return;
  await syncSupabaseSessionWithMain();
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
    activeBacktestingSessionId = savedId;
    selectedBacktestingSessionIds = [String(savedId)];
    initBacktestingSessionFilter();
  }

  renderBacktestingSessionCards();
  rerenderBacktestingLocal();
}

async function deleteBacktestingSessionById(sessionId) {
  const id = Number(sessionId);
  if (!Number.isFinite(id) || id <= 0) return;
  const okSession = await showConfirmModal({
    title: 'Eliminar sesión',
    message:
      '¿Seguro que quieres eliminar esta sesión de backtesting? Los trades asociados quedarán sin sesión.',
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
      editingBtMetricId = mid;
      const n = document.getElementById('btMetricNameInput');
      const d = document.getElementById('btMetricDescInput');
      const t = document.getElementById('btMetricTypeInput');
      const a = document.getElementById('btMetricActiveInput');
      if (n) n.value = m.name;
      if (d) d.value = m.description || '';
      if (t) t.value = m.metric_type;
      if (a) a.checked = m.is_active !== false;
      document.getElementById('btMetricAddBtn') && (document.getElementById('btMetricAddBtn').textContent = 'Guardar cambios');
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
  if (!Number.isFinite(id) || id <= 0) {
    console.warn('⚠️ ID de trade inválido para editar:', tradeId);
    return;
  }

  let trade = null;

  // 1. Fuente principal: cache actual cargada desde Supabase
  const source = Array.isArray(window.cachedTrades) ? window.cachedTrades : cachedTrades;
  trade = source.find((item) => Number(item.id) === id) || null;

  // 2. Fallback: backend/local solo si no está en cache
  if (!trade) {
    const backend = getBackendApi();

    if (backend?.getTrade) {
      try {
        trade = await backend.getTrade(id);
      } catch (err) {
        console.warn('⚠️ getTrade falló:', err);
      }
    }
  }

  if (!trade) {
    console.error('❌ No se encontró trade para editar:', id);
    showToast('No se pudo abrir el trade para editar', 'error');
    return;
  }

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
  setValue('editDate', toInputDate(trade.date || ''));
  setValue('editAsset', trade.asset || '');
  setValue('editStrategy', trade.strategy || '');
  setValue('editResult', trade.result || '');
  setValue('editBeAfterResult', sanitizeBeAfterResult(trade.be_after_result) || '');
  setValue('editAccount', trade.account || '');

  const lotValue = Number(trade.lotSize ?? trade.lotaje ?? 0) || 0;
  setValue('editLotSize', String(lotValue));

  const grossStored = Number(trade.pnl ?? 0) || 0;
  setValue('editPnl', String(grossStored));

  editBeforeImagePath = trade.image_before || trade.beforeImage || '';
  editAfterImagePath = trade.image_after || trade.afterImage || '';

  await updateImagePreview('editBeforeImagePreview', 'openBeforeImageBtn', editBeforeImagePath);
  await updateImagePreview('editAfterImagePreview', 'openAfterImageBtn', editAfterImagePath);

  if (typeof recalculateEditNetPnl === 'function') {
    recalculateEditNetPnl();
  }

  ['editAsset', 'editStrategy', 'editResult', 'editAccount'].forEach((selectId) => {
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
    let trades;
    if (preloadedTrades !== undefined) {
      trades = Array.isArray(preloadedTrades) ? preloadedTrades : [];
    } else if (!backend?.getTrades) {
      return;
    } else {
      trades = await backend.getTrades();
    }
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
  } finally {
    isSyncing = false;
  }
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

  const pnlInput = document.getElementById('pnl').value;

  const parsedPnl =
    pnlInput !== '' && pnlInput !== null
      ? parseMoneyInput(pnlInput)
      : null;

  const grossPnl = parsedPnl !== null && parsedPnl !== undefined ? parsedPnl : 0;

  const mode = getMode();
  const lotSize =
    Number((document.getElementById('lotaje') || document.getElementById('lotSize'))?.value) || 0;
  const account = getSelectedAccount('account');
  const commission = mode === 'pro' ? lotSize * (Number(account?.commissionPerLot) || 0) : 0;
  const pnlNet = grossPnl - commission;

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

    image_before: isPersistentImagePath(createBeforeImagePath) ? createBeforeImagePath : null,
    image_after: isPersistentImagePath(createAfterImagePath) ? createAfterImagePath : null,
    beforeImage: isPersistentImagePath(createBeforeImagePath) ? createBeforeImagePath : '',
    afterImage: isPersistentImagePath(createAfterImagePath) ? createAfterImagePath : ''
  };

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
    if (!(await ensureUserReady())) {
      console.log('⛔ ensureUserReady bloqueó el guardado');
      return;
    }

    let result = await backend.addTrade(trade);

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
      showToast('Trade guardado', 'success');
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
  if (!Number.isFinite(id) || id <= 0) {
    showToast('ID de trade inválido', 'error');
    return;
  }

  const calc = recalculateEditNetPnl();
  const backend = getBackendApi();

  if (!backend?.updateTrade) {
    showToast('API de edición no disponible', 'error');
    return;
  }

  const grossPnl = Number(document.getElementById('editPnl')?.value) || 0;
  const lots = Number(document.getElementById('editLotSize')?.value) || 0;
  const accountForCommission = getSelectedAccount('editAccount');
  const commissionPerLot = Number(accountForCommission?.commissionPerLot) || 0;
  const commission = Number(calc?.commission ?? 0) || 0;
  const pnlNet = grossPnl - commission;
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

    image_before: isPersistentImagePath(editBeforeImagePath) ? editBeforeImagePath : null,
    image_after: isPersistentImagePath(editAfterImagePath) ? editAfterImagePath : null,
    beforeImage: isPersistentImagePath(editBeforeImagePath) ? editBeforeImagePath : '',
    afterImage: isPersistentImagePath(editAfterImagePath) ? editAfterImagePath : ''
  };

  console.log('✏️ Payload updateTrade:', payload);

  const result = await backend.updateTrade(payload);

  console.log('📥 Resultado updateTrade:', result);

  if (!result?.success) {
    console.error('❌ No se pudo actualizar trade:', result);

    if (result?.error) {
      console.error('❌ Error updateTrade RAW:', result.error);
      console.error('❌ Error updateTrade STRING:', JSON.stringify(result.error, null, 2));
    }

    showToast('No se pudo guardar el cambio', 'error');
    return;
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
    image_after: updatedTrade.image_after ?? payload.image_after ?? null
  };

  const replaceInCache = (list) =>
    (Array.isArray(list) ? list : []).map((item) =>
      Number(item.id) === id ? { ...item, ...normalizedForCache } : item
    );

  cachedTrades = replaceInCache(cachedTrades);
  window.cachedTrades = replaceInCache(window.cachedTrades);

  showToast('Trade actualizado', 'success');

  closeEditTradeModal();

  await loadTrades();

  renderDashboardWithFilters?.();

  if (currentView !== 'dashboard') {
    showView('dashboard');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  if (window.__tradingJournalInitialized) return;
  window.__tradingJournalInitialized = true;

  injectBacktestingProStyles();
  const isAuth = await checkAuth();
  if (isAuth && window.electronAPI?.setUserId) {
    const { data } = await supabase.auth.getUser();
    const uid = localStorage.getItem('user_id') || data?.user?.id;
    await window.electronAPI.setUserId(uid);
  }

  const addStrategyBtn = document.getElementById('addStrategyBtn');
  const deleteStrategyBtn = document.getElementById('deleteStrategyBtn');
  const addAccountBtn = document.getElementById('addAccountBtn');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const resetStrategyBtn = document.getElementById('resetStrategyBtn');
  const resetAccountBtn = document.getElementById('resetAccountBtn');
  const addTradeBtn = document.getElementById('addTradeBtn');
  const btnDashboard = document.getElementById('btnDashboard');
  const btnTrade = document.getElementById('btnTrade');
  const btnConfig = document.getElementById('btnConfig');
  const btnStats = document.getElementById('btnStats');
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
  const toggleBtn = document.getElementById('toggleSidebar');

  initLanguageSwitcher();
  loadLanguage(detectUserLanguage()).catch((error) => {
    console.error('Error cargando idioma', error);
  });

  if (isAuth) {
    loadUserInfo().catch((error) => {
      console.error('Error cargando usuario', error);
    });
    subscribeToTradesRealtime();
  }

  document.getElementById('profile-btn')?.addEventListener('click', () => {
    showProfileModal().catch(console.error);
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    unsubscribeTradesRealtime();

    await logout();

    window.currentUser = null;

    if (window.electronAPI?.setUserId) {
      await window.electronAPI.setUserId(null);
    }

    isAppAuthenticated = false;
    realAccountsCache = [];
    realStrategiesCache = [];
    cachedTrades = [];
    window.cachedTrades = [];
    selectedDashboardAccounts = new Set(['ALL']);
    selectedDashboardStrategies = new Set(['ALL']);
    void renderDashboardFilters([]);
    lastInsertedIds.clear();

    const emailEl = document.getElementById('user-email');
    if (emailEl) emailEl.textContent = '';

    const tradeList = document.getElementById('tradeList');
    if (tradeList) tradeList.innerHTML = '';

    showLoginModal();

    console.log('🚪 Logout realizado correctamente');
  });

  if (addStrategyBtn) addStrategyBtn.onclick = addStrategy;
  if (deleteStrategyBtn) deleteStrategyBtn.onclick = deleteStrategy;
  if (addAccountBtn) addAccountBtn.onclick = addAccount;
  if (deleteAccountBtn) deleteAccountBtn.onclick = deleteAccount;
  document.getElementById('settingsStrategy')?.addEventListener('change', onSettingsStrategyChange);
  document.getElementById('settingsAccount')?.addEventListener('change', onSettingsAccountChange);
  document.getElementById('cancelStrategyEditBtn')?.addEventListener('click', resetStrategyForm);
  document.getElementById('cancelAccountEditBtn')?.addEventListener('click', resetAccountForm);
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

  if (toggleBtn) toggleBtn.onclick = toggleSidebar;
  if (btnDashboard) btnDashboard.onclick = () => showView('dashboard');
  if (btnTrade) btnTrade.onclick = () => showView('trade');
  if (btnConfig) btnConfig.onclick = () => showView('config');
  const btnBacktesting = document.getElementById('btnBacktesting');
  if (btnBacktesting) btnBacktesting.onclick = () => showView('backtesting');
  const btnBacktestingConfig = document.getElementById('btnBacktestingConfig');
  if (btnBacktestingConfig) btnBacktestingConfig.onclick = () => showView('backtestingConfig');
  if (btnStats) btnStats.onclick = () => navigateTo('stats');
  if (addTradeBtn) addTradeBtn.onclick = () => showView('trade');
  normalizeSidebarStructure();
  setTimeout(() => {
    normalizeSidebarStructure();
    console.log('Sidebar normalized after view render');
  }, 0);

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
  document.getElementById('addBtSession')?.addEventListener('click', () => {
    void addBacktestingItem('sessions', 'btSessionInput');
  });
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
    editingBtMetricId = null;
    const addBtn = document.getElementById('btMetricAddBtn');
    if (addBtn) addBtn.textContent = 'Añadir métrica';
    const n = document.getElementById('btMetricNameInput');
    const d = document.getElementById('btMetricDescInput');
    if (n) n.value = '';
    if (d) d.value = '';
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
    syncBacktestingResultFromPnl();
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
      notes: document.getElementById('btNotes')?.value.trim() || ''
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
      clearBacktestForm();
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
    const deleteBtn = event.target.closest('.delete-btn');
    if (deleteBtn) {
      event.stopPropagation();
      const row = deleteBtn.closest('.trade-row');
      const id = deleteBtn.getAttribute('data-id') || row?.getAttribute('data-id');
      if (!id) return;
      openDeleteModal(id, row);
      return;
    }
    const row = event.target.closest('.trade-row');
    if (!row) return;
    const tradeId = row.getAttribute('data-id');
    if (!tradeId) return;
    closeTradePanel();
    openTradeForEdit(Number(tradeId));
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
  initTradeDatepicker('date');
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
  if (!event.target.closest('.custom-datepicker')) {
    closeTradeDatepicker();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeTradeDatepicker();
    assetComboboxState?.closePanel?.();
    backtestingAssetComboboxState?.closePanel?.();
    document.querySelectorAll('.dashboard-multiselect.open').forEach((el) => {
      el.classList.remove('open');
    });
  }
});

window.addEventListener('app:languagechanged', () => {
  updateWinrateInfoLabel();
  tradeDatepickerRoot?.refreshDatepickerI18n?.();
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