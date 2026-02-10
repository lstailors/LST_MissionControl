// AEGIS Desktop — Global Type Declarations

interface AegisAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  config: {
    get: () => Promise<any>;
    save: (config: any) => Promise<{ success: boolean }>;
  };
  gateway: {
    connect: () => Promise<{ success: boolean }>;
    send: (message: string, attachments?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    sendToSession: (sessionKey: string, message: string, attachments?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>;
    getSessions: () => Promise<{ success: boolean; data?: any; error?: string }>;
    getHistory: (sessionKey: string, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>;
    status: () => Promise<{ connected: boolean; connecting: boolean; error?: string }>;
    onMessage: (cb: (msg: any) => void) => void;
    onStreamChunk: (cb: (chunk: any) => void) => void;
    onStreamEnd: (cb: (msg: any) => void) => void;
    onStatusChange: (cb: (status: any) => void) => void;
  };
  screenshot: {
    capture: () => Promise<{ success: boolean; data?: string; error?: string }>;
    getWindows: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
    captureWindow: (id: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    captureSourceStream?: (sourceId: string) => Promise<string | null>;
    getSources?: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
  };
  file: {
    openDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    read: (path: string) => Promise<{
      name: string;
      path: string;
      base64: string;
      mimeType: string;
      isImage: boolean;
      size: number;
    } | null>;
    openSharedFolder: () => Promise<void>;
  };
  voice: {
    save: (filename: string, base64: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    aegis: AegisAPI;
  }
}

export {};
