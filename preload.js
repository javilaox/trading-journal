const { contextBridge, ipcRenderer } = require('electron');

const api = {
  addTrade: (trade) => ipcRenderer.invoke('add-trade', trade),
  addTradeOffline: (trade) => ipcRenderer.invoke('add-trade-offline', trade),
  getTrades: () => ipcRenderer.invoke('get-trades'),
  getTradesLocal: () => ipcRenderer.invoke('get-trades-local'),
  syncTradesFromSupabase: () => ipcRenderer.invoke('sync-trades-from-supabase'),
  getTrade: (id) => ipcRenderer.invoke('get-trade', id),
  updateTrade: (trade) => ipcRenderer.invoke('update-trade', trade),
  copyTradeImage: (filePath) => ipcRenderer.invoke('copy-trade-image', filePath),
  selectAndCopyTradeImage: () => ipcRenderer.invoke('select-and-copy-trade-image'),
  readTradeImage: (filePath) => ipcRenderer.invoke('read-trade-image', filePath),
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
};

contextBridge.exposeInMainWorld('api', api);

contextBridge.exposeInMainWorld('electronAPI', {
  ...api,
  setUserId: (userId) => {
    ipcRenderer.send('set-user-id', userId);
  }
});