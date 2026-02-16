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
  // Gateway IPC removed — all WS handled by src/services/gateway.ts
  artifact: {
    open: (data: { type: string; title: string; content: string }) => Promise<{ success: boolean; error?: string }>;
  };
  device: {
    getIdentity: () => Promise<{ deviceId: string; publicKey: string }>;
    sign: (params: {
      nonce?: string;
      clientId: string;
      clientMode: string;
      role: string;
      scopes: string[];
      token: string;
    }) => Promise<{
      deviceId: string;
      publicKey: string;
      signature: string;
      signedAt: number;
      nonce?: string;
    }>;
  };
  image: {
    save: (src: string, suggestedName: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  };
  video: {
    save: (src: string, suggestedName: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
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
    read: (filePath: string) => Promise<string | null>;
  };
  memory: {
    browse: () => Promise<string | null>;
    readLocal: (dirPath: string) => Promise<{ success: boolean; files: any[]; error?: string }>;
  };
  pairing: {
    getToken: () => Promise<string | null>;
    saveToken: (token: string) => Promise<{ success: boolean }>;
    requestPairing: (httpBaseUrl: string) => Promise<{ code: string; deviceId: string }>;
    poll: (httpBaseUrl: string, deviceId: string) => Promise<{ status: string; token?: string }>;
  };
}

declare global {
  interface Window {
    aegis: AegisAPI;
  }
}

export {};
