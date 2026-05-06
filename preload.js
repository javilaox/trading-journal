const { contextBridge, ipcRenderer } = require('electron');

const api = {
  addTrade: (trade) => ipcRenderer.invoke('add-trade', trade),
  getTrades: () => ipcRenderer.invoke('get-trades'),
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
  setSupabaseSession: (session) => ipcRenderer.invoke('set-supabase-session', session)
};

contextBridge.exposeInMainWorld('api', api);

contextBridge.exposeInMainWorld('electronAPI', {
  ...api,
  setUserId: (userId) => {
    ipcRenderer.send('set-user-id', userId);
  }
});