import { contextBridge, ipcRenderer } from 'electron';

// ═══════════════════════════════════════════════════════════
// L&S Mission Control — Preload Bridge
// ═══════════════════════════════════════════════════════════

// Read installer language from process.argv (passed via additionalArguments in main.ts)
// This works in sandbox mode — no fs/path needed
const langArg = process.argv.find(a => a.startsWith('--installer-lang='));
const installerLanguage: string | null = langArg ? langArg.split('=')[1] : null;

const api = {
  // ── Installer Language (sync, available immediately) ──
  installerLanguage,

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

  // Gateway IPC removed — all WS communication handled by src/services/gateway.ts (renderer-side)

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

  // ── Pairing (Auto-Pair with Gateway) ──
  pairing: {
    getToken: () => ipcRenderer.invoke('pairing:get-token'),
    saveToken: (token: string) => ipcRenderer.invoke('pairing:save-token', token),
    requestPairing: (httpBaseUrl: string) => ipcRenderer.invoke('pairing:request', httpBaseUrl),
    poll: (httpBaseUrl: string, deviceId: string) => ipcRenderer.invoke('pairing:poll', httpBaseUrl, deviceId),
  },

  // ── Artifacts Preview ──
  artifact: {
    open: (data: { type: string; title: string; content: string }) =>
      ipcRenderer.invoke('artifact:open', data),
  },

  // ── Image Save ──
  image: {
    save: (src: string, suggestedName: string) =>
      ipcRenderer.invoke('image:save', src, suggestedName),
  },

  // ── Integrated Terminal (PTY) ──
  terminal: {
    create: (opts?: { cols?: number; rows?: number; cwd?: string }) =>
      ipcRenderer.invoke('pty:create', opts),
    write: (id: string, data: string) =>
      ipcRenderer.invoke('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.invoke('pty:resize', id, cols, rows),
    kill: (id: string) =>
      ipcRenderer.invoke('pty:kill', id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_e: any, id: string, data: string) => callback(id, data);
      ipcRenderer.on('pty:data', handler);
      return () => { ipcRenderer.removeListener('pty:data', handler); };
    },
    onExit: (callback: (id: string, exitCode: number, signal?: number) => void) => {
      const handler = (_e: any, id: string, exitCode: number, signal?: number) => callback(id, exitCode, signal);
      ipcRenderer.on('pty:exit', handler);
      return () => { ipcRenderer.removeListener('pty:exit', handler); };
    },
  },

  // ── Auto-Update ──
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onAvailable: (cb: (info: any) => void) => {
      ipcRenderer.on('update:available', (_e, info) => cb(info));
    },
    onUpToDate: (cb: () => void) => {
      ipcRenderer.on('update:up-to-date', () => cb());
    },
    onProgress: (cb: (progress: any) => void) => {
      ipcRenderer.on('update:progress', (_e, p) => cb(p));
    },
    onDownloaded: (cb: () => void) => {
      ipcRenderer.on('update:downloaded', () => cb());
    },
    onError: (cb: (msg: string) => void) => {
      ipcRenderer.on('update:error', (_e, msg) => cb(msg));
    },
  },

  // ── Native Notifications ──
  notify: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),

  // ── Device Identity (Ed25519 for Gateway auth) ──
  device: {
    getIdentity: () => ipcRenderer.invoke('device:getIdentity'),
    sign: (params: {
      nonce?: string;
      clientId: string;
      clientMode: string;
      role: string;
      scopes: string[];
      token: string;
    }) => ipcRenderer.invoke('device:sign', params),
  },
};

contextBridge.exposeInMainWorld('aegis', api);

// Type declaration for renderer
export type AegisAPI = typeof api;

console.log('L&S Mission Control Preload v5.4 ready');
