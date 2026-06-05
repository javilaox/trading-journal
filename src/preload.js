const { contextBridge, ipcRenderer } = require('electron');

console.log('PRELOAD OK');

const api = {
  addTrade: (trade) => ipcRenderer.invoke('add-trade', trade),
  addTradeOffline: (trade) => ipcRenderer.invoke('add-trade-offline', trade),
  getTrades: () => ipcRenderer.invoke('get-trades'),
  getTradesLocal: () => ipcRenderer.invoke('get-trades-local'),
  syncTradesFromSupabase: () => ipcRenderer.invoke('sync-trades-from-supabase'),
  getSyncPendingCount: () => ipcRenderer.invoke('get-sync-pending-count'),
  syncPendingChanges: () => ipcRenderer.invoke('sync-pending-changes'),
  pullRemoteData: () => ipcRenderer.invoke('pull-remote-data'),
  getRealAccountsLocal: () => ipcRenderer.invoke('get-real-accounts-local'),
  getRealStrategiesLocal: () => ipcRenderer.invoke('get-real-strategies-local'),
  addRealAccountLocal: (account) => ipcRenderer.invoke('add-real-account-local', account),
  updateRealAccountLocal: (account) => ipcRenderer.invoke('update-real-account-local', account),
  deleteRealAccountLocal: (clientUuidOrName) => ipcRenderer.invoke('delete-real-account-local', clientUuidOrName),
  addRealStrategyLocal: (strategy) => ipcRenderer.invoke('add-real-strategy-local', strategy),
  updateRealStrategyLocal: (strategy) => ipcRenderer.invoke('update-real-strategy-local', strategy),
  deleteRealStrategyLocal: (clientUuidOrName) => ipcRenderer.invoke('delete-real-strategy-local', clientUuidOrName),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getTrade: (id) => ipcRenderer.invoke('get-trade', id),
  updateTrade: (trade) => ipcRenderer.invoke('update-trade', trade),
  copyTradeImage: (filePath) => ipcRenderer.invoke('copy-trade-image', filePath),
  selectAndCopyTradeImage: () => ipcRenderer.invoke('select-and-copy-trade-image'),
  readTradeImage: (filePath) => ipcRenderer.invoke('read-trade-image', filePath),
  deleteTrade: (id) => ipcRenderer.invoke('delete-trade', id),
  restoreDeletedTrade: (payload) => ipcRenderer.invoke('restore-deleted-trade', payload),
  deleteTradesByStrategy: (strategyName) => ipcRenderer.invoke('delete-trades-by-strategy', strategyName),
  deleteTradesByAccount: (accountName) => ipcRenderer.invoke('delete-trades-by-account', accountName),
  updateTradesStrategy: (oldName, newName) =>
    ipcRenderer.invoke('update-trades-strategy', oldName, newName),
  updateTradesAccount: (oldName, newName) =>
    ipcRenderer.invoke('update-trades-account', oldName, newName),
  addBacktestTrade: (trade) => ipcRenderer.invoke('add-backtest-trade', trade),
  getBacktestTrades: () => ipcRenderer.invoke('get-backtest-trades'),
  updateBacktestTrade: (trade) => ipcRenderer.invoke('update-backtest-trade', trade),
  deleteBacktestTrade: (id) => ipcRenderer.invoke('delete-backtest-trade', id),
  getBacktestingSettings: () => ipcRenderer.invoke('get-backtesting-settings'),
  saveBacktestingSettings: (settings) => ipcRenderer.invoke('save-backtesting-settings', settings),
  getBacktestingSessions: () => ipcRenderer.invoke('get-backtesting-sessions'),
  addBacktestingSession: (session) => ipcRenderer.invoke('add-backtesting-session', session),
  updateBacktestingSession: (session) => ipcRenderer.invoke('update-backtesting-session', session),
  deleteBacktestingSession: (sessionId) => ipcRenderer.invoke('delete-backtesting-session', sessionId),
  getBacktestingMetrics: () => ipcRenderer.invoke('get-backtesting-metrics'),
  addBacktestingMetric: (metric) => ipcRenderer.invoke('add-backtesting-metric', metric),
  updateBacktestingMetric: (metric) => ipcRenderer.invoke('update-backtesting-metric', metric),
  deleteBacktestingMetric: (metricId) => ipcRenderer.invoke('delete-backtesting-metric', metricId),
  setSupabaseSession: (session) => ipcRenderer.invoke('set-supabase-session', session),
  getCurrentUserId: () => ipcRenderer.invoke('get-current-user-id')
};

contextBridge.exposeInMainWorld('api', {
  addTrade: api.addTrade,
  addTradeOffline: api.addTradeOffline,
  getTrades: api.getTrades,
  getTradesLocal: api.getTradesLocal,
  syncTradesFromSupabase: api.syncTradesFromSupabase,
  getSyncPendingCount: api.getSyncPendingCount,
  syncPendingChanges: api.syncPendingChanges,
  pullRemoteData: api.pullRemoteData,
  getRealAccountsLocal: api.getRealAccountsLocal,
  getRealStrategiesLocal: api.getRealStrategiesLocal,
  addRealAccountLocal: api.addRealAccountLocal,
  updateRealAccountLocal: api.updateRealAccountLocal,
  deleteRealAccountLocal: api.deleteRealAccountLocal,
  addRealStrategyLocal: api.addRealStrategyLocal,
  updateRealStrategyLocal: api.updateRealStrategyLocal,
  deleteRealStrategyLocal: api.deleteRealStrategyLocal,
  getStats: api.getStats,
  getTrade: api.getTrade,
  updateTrade: api.updateTrade,
  copyTradeImage: api.copyTradeImage,
  selectAndCopyTradeImage: api.selectAndCopyTradeImage,
  readTradeImage: api.readTradeImage,
  deleteTrade: api.deleteTrade,
  restoreDeletedTrade: api.restoreDeletedTrade,
  deleteTradesByStrategy: api.deleteTradesByStrategy,
  deleteTradesByAccount: api.deleteTradesByAccount,
  updateTradesStrategy: api.updateTradesStrategy,
  updateTradesAccount: api.updateTradesAccount,
  addBacktestTrade: api.addBacktestTrade,
  getBacktestTrades: api.getBacktestTrades,
  updateBacktestTrade: api.updateBacktestTrade,
  deleteBacktestTrade: api.deleteBacktestTrade,
  getBacktestingSettings: api.getBacktestingSettings,
  saveBacktestingSettings: api.saveBacktestingSettings,
  getBacktestingSessions: api.getBacktestingSessions,
  addBacktestingSession: api.addBacktestingSession,
  updateBacktestingSession: api.updateBacktestingSession,
  deleteBacktestingSession: api.deleteBacktestingSession,
  getBacktestingMetrics: api.getBacktestingMetrics,
  addBacktestingMetric: api.addBacktestingMetric,
  updateBacktestingMetric: api.updateBacktestingMetric,
  deleteBacktestingMetric: api.deleteBacktestingMetric,
  setSupabaseSession: api.setSupabaseSession,
  getCurrentUserId: api.getCurrentUserId,
  getSyncPendingCount: api.getSyncPendingCount
});

// Compatibilidad: mantener API existente para no romper funcionalidades actuales.
contextBridge.exposeInMainWorld('electronAPI', {
  ...api,
  setUserId: (userId) => {
    ipcRenderer.send('set-user-id', userId);
  }
});

contextBridge.exposeInMainWorld('syncAPI', {
  onStatusChanged: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('sync-status-changed', listener);
    return () => ipcRenderer.removeListener('sync-status-changed', listener);
  }
});

contextBridge.exposeInMainWorld('authAPI', {
  getUserId: () => localStorage.getItem('user_id')
});
