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
  memory: {
    browse: () => ipcRenderer.invoke('memory:browse'),
    readLocal: (dirPath: string) => ipcRenderer.invoke('memory:readLocal', dirPath),
  },
  screenshot: {
    capture: () => ipcRenderer.invoke('screenshot:capture'),
    getWindows: () => ipcRenderer.invoke('screenshot:windows'),
    captureWindow: (id: string) => ipcRenderer.invoke('screenshot:captureWindow', id),
    // Real capture using Screen Capture API (MediaStream)
    captureSourceStream: async (sourceId: string): Promise<string | null> => {
      try {
        const stream = await (navigator.mediaDevices as any).getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              maxWidth: 1920,
              maxHeight: 1080,
            },
          },
        });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        // Wait a frame for the video to render
        await new Promise((r) => setTimeout(r, 100));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        // Cleanup
        stream.getTracks().forEach((t: any) => t.stop());
        video.remove();
        return canvas.toDataURL('image/png');
      } catch (err) {
        console.error('[Screenshot] MediaStream capture failed:', err);
        return null;
      }
    },
    // getSources via main process IPC (desktopCapturer not available in preload)
    getSources: () => ipcRenderer.invoke('screenshot:windows'),
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
