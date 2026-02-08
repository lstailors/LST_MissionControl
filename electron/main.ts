import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  desktopCapturer,
  Notification,
  Tray,
  Menu,
  nativeImage,
  shell,
  globalShortcut,
  clipboard,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { createTray } from './tray';

// ═══════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════

const CONFIG_PATH = path.join(app.getPath('userData'), 'aegis-config.json');
const isDev = !app.isPackaged;

interface AegisConfig {
  gatewayUrl: string;
  gatewayToken: string;
  sharedFolder: string;
  compressImages: boolean;
  maxImageSize: number;
  startWithWindows: boolean;
  theme: 'dark' | 'light' | 'system';
  globalHotkey: string;
  fontSize: number;
}

let config: AegisConfig = {
  gatewayUrl: 'ws://127.0.0.1:18789',
  gatewayToken: '',
  sharedFolder: 'D:\\clawdbot-shared',
  compressImages: true,
  maxImageSize: 1920,
  startWithWindows: false,
  theme: 'dark',
  globalHotkey: 'Alt+Space',
  fontSize: 14,
};

function loadConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      config = { ...config, ...data };
      // Backward compatibility with v2 config keys
      if (data.gatewayWsUrl && !data.gatewayUrl) {
        config.gatewayUrl = data.gatewayWsUrl;
      }
      if (data.controlUiUrl && !data.gatewayUrl) {
        config.gatewayUrl = data.controlUiUrl.replace('http', 'ws');
      }
    }
    console.log('[Config] Loaded:', CONFIG_PATH);
    console.log('[Config] Gateway URL:', config.gatewayUrl);
    console.log('[Config] Token:', config.gatewayToken ? '***set***' : '***empty***');
  } catch (e) {
    console.error('[Config] Load error:', e);
  }
}

function saveConfig(newConfig: Partial<AegisConfig>): void {
  config = { ...config, ...newConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  app.setLoginItemSettings({
    openAtLogin: config.startWithWindows,
    path: app.getPath('exe'),
  });
}

// ═══════════════════════════════════════════════════════════
// Window
// ═══════════════════════════════════════════════════════════

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 600,
    minHeight: 500,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    transparent: false,
    backgroundColor: '#0a0a14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: isDev,  // Disable in production (file:// needs to connect to ws://localhost)
    },
    show: false,
  });

  // Allow loading external images (Wikipedia, Cloudinary, etc.)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "img-src 'self' data: blob: https: http:; " +
          "media-src 'self' data: blob: https: http:; " +
          "connect-src 'self' ws: wss: http: https:; " +
          "font-src 'self' data: https:;"
        ],
      },
    });
  });

  // Load Vite dev server or built files
  if (isDev) {
    console.log('[Window] Loading dev server: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('[Window] Loading:', indexPath);

    // For file:// protocol, disable webSecurity so WebSocket can connect
    // (CSP headers don't apply to file:// loads)
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, Origin: 'http://127.0.0.1:18789' } });
    });

    mainWindow.loadFile(indexPath);
  }

  // ── Right-click Context Menu (Copy/Paste/Cut/Select All) ──
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const { editFlags, isEditable, selectionText, linkURL } = params;

    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    if (linkURL) {
      menuItems.push({
        label: '🔗 فتح الرابط',
        click: () => shell.openExternal(linkURL),
      });
      menuItems.push({
        label: '📋 نسخ الرابط',
        click: () => clipboard.writeText(linkURL),
      });
      menuItems.push({ type: 'separator' });
    }

    if (isEditable) {
      menuItems.push({
        label: 'قص',
        accelerator: 'CmdOrCtrl+X',
        enabled: editFlags.canCut,
        role: 'cut',
      });
    }

    if (selectionText || isEditable) {
      menuItems.push({
        label: 'نسخ',
        accelerator: 'CmdOrCtrl+C',
        enabled: editFlags.canCopy,
        role: 'copy',
      });
    }

    if (isEditable) {
      menuItems.push({
        label: 'لصق',
        accelerator: 'CmdOrCtrl+V',
        enabled: editFlags.canPaste,
        role: 'paste',
      });
    }

    if (isEditable || selectionText) {
      menuItems.push({ type: 'separator' });
      menuItems.push({
        label: 'تحديد الكل',
        accelerator: 'CmdOrCtrl+A',
        role: 'selectAll',
      });
    }

    if (menuItems.length > 0) {
      const contextMenu = Menu.buildFromTemplate(menuItems);
      contextMenu.popup({ window: mainWindow! });
    }
  });

  // Show window gracefully
  mainWindow.once('ready-to-show', () => {
    console.log('[Window] Ready to show');
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Log load errors
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('[Window] Failed to load:', code, desc);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Window] Loaded successfully');
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

// Gateway connection is handled by React renderer (browser WebSocket)

// ═══════════════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════════════

function setupIPC(): void {
  // ── Window Controls ──
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
    return mainWindow?.isMaximized();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  // ── Config ──
  ipcMain.handle('config:get', () => {
    // Check for installer language file on first run
    let installerLang: string | undefined;
    try {
      const langFile = path.join(process.resourcesPath, 'language.txt');
      const fs = require('fs');
      if (fs.existsSync(langFile)) {
        installerLang = fs.readFileSync(langFile, 'utf-8').trim();
      }
    } catch { /* ignore */ }
    return { ...config, configPath: CONFIG_PATH, ...(installerLang ? { installerLanguage: installerLang } : {}) };
  });
  ipcMain.handle('config:save', (_e, newConfig: Partial<AegisConfig>) => {
    saveConfig(newConfig);
    return { success: true };
  });

  // Gateway is handled by React renderer — these are no-op stubs to prevent IPC errors
  ipcMain.handle('gateway:connect', () => ({ success: true, info: 'Handled by renderer' }));
  ipcMain.handle('gateway:send', () => ({ success: true }));
  ipcMain.handle('gateway:sendToSession', () => ({ success: true }));
  ipcMain.handle('gateway:getSessions', () => ({ success: true, data: [] }));
  ipcMain.handle('gateway:getHistory', () => ({ success: true, data: [] }));
  ipcMain.handle('gateway:status', () => ({ connected: false, connecting: false }))

  // ── Screenshot ──
  ipcMain.handle('screenshot:capture', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      if (sources.length > 0) {
        return { success: true, data: sources[0].thumbnail.toDataURL() };
      }
      return { success: false, error: 'No screen found' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('screenshot:windows', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 400, height: 280 },
        fetchWindowIcons: true,
      });
      // Return all windows (including AEGIS Desktop)
      return sources
        .filter((s) => s.thumbnail && !s.thumbnail.isEmpty())
        .map((s) => ({
          id: s.id,
          name: s.name,
          thumbnail: s.thumbnail.toDataURL(),
        }));
    } catch (err: any) {
      return [];
    }
  });

  ipcMain.handle('screenshot:captureWindow', async (_e, windowId: string) => {
    try {
      // For AEGIS own window, use native capture
      const ownWindowId = `window:${mainWindow!.getMediaSourceId()}`;
      if (windowId === ownWindowId || windowId.includes(String(mainWindow!.id))) {
        // Capture own window via webContents
        const img = await mainWindow!.webContents.capturePage();
        return { success: true, data: img.toDataURL() };
      }

      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      const source = sources.find((s) => s.id === windowId);
      if (source) {
        return { success: true, data: source.thumbnail.toDataURL() };
      }

      // Fallback: try capturePage for own window
      return { success: false, error: 'Window not found' };
    } catch (err: any) {
      // Last resort: try capturePage
      try {
        const img = await mainWindow!.webContents.capturePage();
        return { success: true, data: img.toDataURL() };
      } catch {
        return { success: false, error: err.message };
      }
    }
  });

  // ── Files ──
  ipcMain.handle('file:openDialog', async () => {
    return dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'multiSelections'],
    });
  });

  ipcMain.handle('file:read', async (_e, filePath: string) => {
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
        '.ogg': 'audio/ogg', '.mp4': 'video/mp4',
      };
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
      return {
        name: path.basename(filePath),
        path: filePath,
        base64: data.toString('base64'),
        mimeType: mimeMap[ext] || 'application/octet-stream',
        isImage,
        size: data.length,
      };
    } catch (err: any) {
      return null;
    }
  });

  // ── Shared Folder ──
  ipcMain.handle('file:openSharedFolder', () => {
    if (!fs.existsSync(config.sharedFolder)) {
      fs.mkdirSync(config.sharedFolder, { recursive: true });
    }
    shell.openPath(config.sharedFolder);
  });

  // ── Voice Recording — Save to shared folder ──
  ipcMain.handle('voice:save', async (_e, filename: string, base64: string) => {
    try {
      const voiceDir = path.join(config.sharedFolder, 'voice');
      if (!fs.existsSync(voiceDir)) {
        fs.mkdirSync(voiceDir, { recursive: true });
      }
      const filePath = path.join(voiceDir, filename);
      fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
      console.log('[Voice] Saved:', filePath, `(${Math.round(base64.length * 0.75 / 1024)}KB)`);
      return filePath;
    } catch (err: any) {
      console.error('[Voice] Save error:', err.message);
      return null;
    }
  });

  ipcMain.handle('voice:read', async (_e, filePath: string) => {
    try {
      // Support both absolute paths and shared folder relative paths
      let resolvedPath = filePath;

      // If it's a relative filename, look in shared voice folder
      if (!path.isAbsolute(filePath)) {
        resolvedPath = path.join(config.sharedFolder, 'voice', filePath);
      }

      if (!fs.existsSync(resolvedPath)) {
        console.error('[Voice] File not found:', resolvedPath);
        return null;
      }

      const buffer = fs.readFileSync(resolvedPath);
      const base64 = buffer.toString('base64');
      console.log('[Voice] Read:', resolvedPath, `(${Math.round(buffer.length / 1024)}KB)`);
      return base64;
    } catch (err: any) {
      console.error('[Voice] Read error:', err.message);
      return null;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Global Hotkey
// ═══════════════════════════════════════════════════════════

function registerHotkey(): void {
  try {
    globalShortcut.unregisterAll();
    if (config.globalHotkey) {
      globalShortcut.register(config.globalHotkey, () => {
        if (mainWindow?.isVisible() && mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow?.show();
          mainWindow?.focus();
        }
      });
    }
  } catch (e) {
    console.error('[Hotkey] Registration failed:', e);
  }
}

// ═══════════════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════════════

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    loadConfig();
    createWindow();
    setupIPC();
    tray = createTray(mainWindow!, app);
    registerHotkey();

    // Gateway connection is now handled by React renderer
    // No auto-connect from main process needed
  });
}

app.on('window-all-closed', () => {
  // Don't quit — we have tray icon
  console.log('[App] All windows closed — staying in tray');
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

console.log('🛡️ AEGIS Desktop v3.0 started');
