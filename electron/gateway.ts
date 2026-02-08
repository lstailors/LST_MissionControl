// eslint-disable-next-line @typescript-eslint/no-var-requires
const WS = require('ws');

// ═══════════════════════════════════════════════════════════
// Gateway WebSocket Client
// ═══════════════════════════════════════════════════════════

interface GatewayOptions {
  url: string;
  token: string;
  onMessage: (msg: ChatMessage) => void;
  onStreamChunk: (chunk: StreamChunk) => void;
  onStreamEnd: (msg: ChatMessage) => void;
  onStatusChange: (status: ConnectionStatus) => void;
  onNotification: (data: { text: string }) => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sessionKey?: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
}

export interface StreamChunk {
  sessionKey: string;
  messageId: string;
  content: string;
  done: boolean;
}

export interface Attachment {
  mimeType: string;
  content: string; // base64
  fileName: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  sessionKey?: string;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}

export class GatewayClient {
  private ws: any = null;
  private options: GatewayOptions;
  private connected = false;
  private connecting = false;
  private messageId = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 10;
  private currentStreamContent = new Map<string, string>(); // messageId -> accumulated content

  constructor(options: GatewayOptions) {
    this.options = options;
  }

  // ── Connect ──

  connect(): void {
    if (this.ws && (this.connected || this.connecting)) return;

    this.connecting = true;
    this.emitStatus();

    console.log('[Gateway] Connecting to:', this.options.url);

    // Set origin to match gateway host (required for Control UI auth)
    const httpOrigin = this.options.url.replace('ws://', 'http://').replace('wss://', 'https://').replace(/\/$/, '');
    this.ws = new WS(this.options.url, {
      maxPayload: 100 * 1024 * 1024,
      headers: {
        Origin: httpOrigin,
      },
    });

    this.ws.on('open', () => {
      console.log('[Gateway] ✅ WebSocket open, sending handshake...');
      this.sendHandshake();
    });

    this.ws.on('message', (data: any) => {
      try {
        const raw = data.toString();
        console.log('[Gateway] 📨 Received:', raw.substring(0, 200));
        const msg = JSON.parse(raw);
        this.handleMessage(msg);
      } catch (e) {
        console.error('[Gateway] Parse error:', e);
      }
    });

    this.ws.on('close', (code: number, reason: any) => {
      console.log(`[Gateway] 🔌 Closed: ${code} ${reason}`);
      this.connected = false;
      this.connecting = false;
      this.ws = null;
      this.emitStatus();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err: any) => {
      console.error('[Gateway] ❌ Error:', err.message);
      this.connecting = false;
      this.emitStatus({ error: err.message });
    });

    this.ws.on('unexpected-response', (_req: any, res: any) => {
      console.error('[Gateway] ❌ Unexpected response:', res.statusCode, res.statusMessage);
      this.connecting = false;
      this.emitStatus({ error: `HTTP ${res.statusCode}: ${res.statusMessage}` });
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = this.maxReconnectAttempts; // Prevent reconnect
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connecting = false;
  }

  // ── Handshake ──

  private sendHandshake(): void {
    const id = this.nextId();
    const msg = {
      type: 'req',
      id,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openclaw-control-ui',
          version: '3.0.0',
          platform: 'windows',
          mode: 'ui',
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: ['streaming'],
        commands: [],
        permissions: {},
        auth: { token: this.options.token },
        locale: 'ar-SA',
        userAgent: 'aegis-desktop/3.0.0',
      },
    };

    this.registerCallback(id, {
      resolve: (response: any) => {
        console.log('[Gateway] Handshake response:', JSON.stringify(response).substring(0, 300));
        if (response.ok !== false && (response.payload?.type === 'hello-ok' || response.type === 'hello-ok')) {
          console.log('[Gateway] ✅ Handshake successful!');
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempt = 0;
          this.emitStatus();
        } else {
          const errMsg = response.error?.message || response.payload?.error || JSON.stringify(response);
          console.error('[Gateway] ❌ Handshake failed:', errMsg);
          this.connected = false;
          this.connecting = false;
          this.emitStatus({ error: 'Handshake failed: ' + errMsg });
        }
      },
      reject: (err: any) => {
        console.error('[Gateway] ❌ Handshake rejected:', err.message);
        this.connecting = false;
        this.emitStatus({ error: err.message });
      },
    });

    console.log('[Gateway] 📤 Sending handshake:', JSON.stringify(msg).substring(0, 300));
    this.send(msg);
  }

  // ── Send Message ──

  async sendMessage(
    message: string,
    attachments?: Attachment[],
    sessionKey = 'agent:main:main'
  ): Promise<any> {
    return this.request('chat.send', {
      sessionKey,
      message,
      idempotencyKey: `aegis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...(attachments?.length ? { attachments } : {}),
    });
  }

  // ── Sessions ──

  async getSessions(): Promise<any> {
    return this.request('sessions.list', { messageLimit: 1 });
  }

  async getHistory(sessionKey: string, limit = 50): Promise<any> {
    return this.request('sessions.history', { sessionKey, limit, includeTools: false });
  }

  // ── Status ──

  getStatus(): ConnectionStatus {
    return {
      connected: this.connected,
      connecting: this.connecting,
    };
  }

  // ── Internal ──

  private async request(method: string, params: any): Promise<any> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to gateway');
    }

    return new Promise((resolve, reject) => {
      const id = this.nextId();
      this.registerCallback(id, { resolve, reject });
      this.send({ type: 'req', id, method, params });
    });
  }

  private registerCallback(
    id: string,
    handlers: { resolve: (v: any) => void; reject: (e: any) => void }
  ): void {
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(id);
      handlers.reject(new Error('Request timeout'));
    }, 120000); // 2 minute timeout for long responses

    this.pendingRequests.set(id, { ...handlers, timeout });
  }

  private handleMessage(msg: any): void {
    // Response to a request
    if (msg.type === 'res' && msg.id) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(msg.id);
        if (msg.ok !== false) {
          pending.resolve(msg.payload ?? msg);
        } else {
          pending.reject(new Error(msg.error?.message || 'Request failed'));
        }
      }
      return;
    }

    // Events (chat messages, streaming, etc.)
    if (msg.type === 'event') {
      this.handleEvent(msg);
    }
  }

  private handleEvent(msg: any): void {
    const event = msg.event || msg.payload?.event || '';
    const payload = msg.payload || {};

    // Streaming chunk
    if (event === 'chat.stream' || event === 'stream.chunk' || payload.type === 'stream-chunk') {
      const chunk: StreamChunk = {
        sessionKey: payload.sessionKey || 'agent:main:main',
        messageId: payload.messageId || payload.id || '',
        content: payload.chunk || payload.content || payload.text || '',
        done: payload.done || false,
      };

      // Accumulate content
      const key = chunk.messageId || chunk.sessionKey;
      const accumulated = (this.currentStreamContent.get(key) || '') + chunk.content;
      this.currentStreamContent.set(key, accumulated);

      this.options.onStreamChunk({
        ...chunk,
        content: accumulated, // Send accumulated content
      });

      if (chunk.done) {
        this.currentStreamContent.delete(key);
      }
      return;
    }

    // Stream end
    if (event === 'chat.stream.end' || event === 'stream.end' || payload.type === 'stream-end') {
      const key = payload.messageId || payload.sessionKey || 'agent:main:main';
      this.currentStreamContent.delete(key);

      this.options.onStreamEnd({
        id: payload.messageId || payload.id || Date.now().toString(),
        role: 'assistant',
        content: payload.text || payload.content || payload.message || '',
        timestamp: new Date().toISOString(),
        sessionKey: payload.sessionKey,
      });
      return;
    }

    // Complete message (non-streaming)
    if (
      event === 'chat.message' ||
      event === 'chat.reply' ||
      event.includes('chat') ||
      payload.type === 'chat-message'
    ) {
      const text = payload.text || payload.content || payload.message || '';
      if (!text) return;

      const chatMsg: ChatMessage = {
        id: payload.messageId || payload.id || Date.now().toString(),
        role: payload.role || 'assistant',
        content: text,
        timestamp: payload.timestamp || new Date().toISOString(),
        sessionKey: payload.sessionKey,
      };

      this.options.onMessage(chatMsg);
      this.options.onNotification({ text });
      return;
    }
  }

  private send(msg: any): void {
    if (this.ws && this.ws.readyState === WS.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private nextId(): string {
    return `aegis-${Date.now()}-${++this.messageId}`;
  }

  private emitStatus(extra?: Partial<ConnectionStatus>): void {
    this.options.onStatusChange({
      connected: this.connected,
      connecting: this.connecting,
      ...extra,
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
    this.reconnectAttempt++;

    console.log(`[Gateway] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
