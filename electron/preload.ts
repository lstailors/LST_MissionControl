import { contextBridge, ipcRenderer } from 'electron';

// ═══════════════════════════════════════════════════════════
// AEGIS Desktop — Preload Bridge
// ═══════════════════════════════════════════════════════════

const api = {
  // ── Window Controls ──
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // ── Config ──
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (config: any) => ipcRenderer.invoke('config:save', config),
  },

  // ── Gateway ──
  gateway: {
    connect: () => ipcRenderer.invoke('gateway:connect'),
    send: (message: string, attachments?: any[]) =>
      ipcRenderer.invoke('gateway:send', message, attachments),
    sendToSession: (sessionKey: string, message: string, attachments?: any[]) =>
      ipcRenderer.invoke('gateway:sendToSession', sessionKey, message, attachments),
    getSessions: () => ipcRenderer.invoke('gateway:getSessions'),
    getHistory: (sessionKey: string, limit?: number) =>
      ipcRenderer.invoke('gateway:getHistory', sessionKey, limit),
    status: () => ipcRenderer.invoke('gateway:status'),

    // Events from gateway
    onMessage: (cb: (msg: any) => void) => {
      ipcRenderer.on('gateway:message', (_e, msg) => cb(msg));
    },
    onStreamChunk: (cb: (chunk: any) => void) => {
      ipcRenderer.on('gateway:stream-chunk', (_e, chunk) => cb(chunk));
    },
    onStreamEnd: (cb: (msg: any) => void) => {
      ipcRenderer.on('gateway:stream-end', (_e, msg) => cb(msg));
    },
    onStatusChange: (cb: (status: any) => void) => {
      ipcRenderer.on('gateway:status', (_e, status) => cb(status));
    },
  },

  // ── Screenshot ──
  screenshot: {
    capture: () => ipcRenderer.invoke('screenshot:capture'),
    getWindows: () => ipcRenderer.invoke('screenshot:windows'),
    captureWindow: (id: string) => ipcRenderer.invoke('screenshot:captureWindow', id),
  },

  // ── Files ──
  file: {
    openDialog: () => ipcRenderer.invoke('file:openDialog'),
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    openSharedFolder: () => ipcRenderer.invoke('file:openSharedFolder'),
  },

  // ── Voice ──
  voice: {
    save: (filename: string, base64: string) =>
      ipcRenderer.invoke('voice:save', filename, base64),
    read: (filePath: string) =>
      ipcRenderer.invoke('voice:read', filePath),
  },
};

contextBridge.exposeInMainWorld('aegis', api);

// Type declaration for renderer
export type AegisAPI = typeof api;

console.log('🛡️ AEGIS Preload v3.0 ready');
