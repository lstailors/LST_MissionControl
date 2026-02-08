// ═══════════════════════════════════════════════════════════
// Gateway WebSocket Client — Browser-side
// Protocol: OpenClaw Gateway WS v3
//
// Events:
//   event="chat" → payload.state: "delta"|"final"|"error"|"aborted"
//   payload.message.content: string | [{type:"text",text:"..."}]
// ═══════════════════════════════════════════════════════════

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface MediaInfo {
  mediaUrl?: string;
  mediaType?: string;
}

export interface GatewayCallbacks {
  onMessage: (msg: ChatMessage) => void;
  onStreamChunk: (messageId: string, content: string, media?: MediaInfo) => void;
  onStreamEnd: (messageId: string, content: string, media?: MediaInfo) => void;
  onStatusChange: (status: { connected: boolean; connecting: boolean; error?: string }) => void;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

class GatewayService {
  private ws: WebSocket | null = null;
  private connected = false;
  private connecting = false;
  private callbacks: GatewayCallbacks | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private msgCounter = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private maxReconnects = 10;

  // Current streaming state
  private currentRunId: string | null = null;
  private currentStreamContent: string = '';

  private url = '';
  private token = '';

  // ── Setup ──

  setCallbacks(cb: GatewayCallbacks) {
    this.callbacks = cb;
  }

  // ── Extract text from content (string or content blocks array) ──
  private extractText(content: any): string {
    if (typeof content === 'string') return content;
    if (content == null) return '';
    if (Array.isArray(content)) {
      return content
        .map((block: any) => {
          if (typeof block === 'string') return block;
          if (block?.type === 'text' && typeof block.text === 'string') return block.text;
          if (typeof block?.text === 'string') return block.text;
          return '';
        })
        .join('');
    }
    if (typeof content === 'object') {
      if (typeof content.text === 'string') return content.text;
      if (typeof content.content === 'string') return content.content;
      if (Array.isArray(content.content)) return this.extractText(content.content);
      return JSON.stringify(content);
    }
    return String(content);
  }

  // ── Extract text from a message object ──
  private extractMessageText(msg: any): string {
    if (!msg) return '';
    const content = msg.content;
    return this.extractText(content);
  }

  // ── Connect ──

  connect(url: string, token: string) {
    this.url = url;
    this.token = token;

    if (this.ws && (this.connected || this.connecting)) return;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connecting = true;
    this.emitStatus();

    console.log('[GW] Connecting:', url);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[GW] Open — sending handshake');
      this.sendHandshake();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('[GW] Parse error:', e);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[GW] Closed:', event.code, event.reason);
      this.connected = false;
      this.connecting = false;
      this.ws = null;
      this.emitStatus();
      this.scheduleReconnect();
    };

    this.ws.onerror = (event) => {
      console.error('[GW] Error:', event);
      this.connecting = false;
      this.emitStatus({ error: 'Connection error' });
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = this.maxReconnects;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connecting = false;
    this.emitStatus();
  }

  // ── Handshake ──

  private sendHandshake() {
    const id = this.nextId();

    this.registerCallback(id, {
      resolve: (response: any) => {
        console.log('[GW] Handshake response:', JSON.stringify(response).substring(0, 200));
        if (response.ok !== false && (response.payload?.type === 'hello-ok' || response.type === 'hello-ok')) {
          console.log('[GW] ✅ Connected!');
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempt = 0;
          this.emitStatus();
        } else {
          const err = response.error?.message || JSON.stringify(response);
          console.error('[GW] ❌ Handshake failed:', err);
          this.connected = false;
          this.connecting = false;
          this.emitStatus({ error: err });
        }
      },
      reject: (err: any) => {
        console.error('[GW] ❌ Handshake rejected:', err);
        this.connecting = false;
        this.emitStatus({ error: String(err) });
      },
    });

    this.send({
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
        auth: { token: this.token },
        locale: 'ar-SA',
        userAgent: 'aegis-desktop/3.0.0',
      },
    });
  }

  // ── Send Message ──

  async sendMessage(message: string, attachments?: any[], sessionKey = 'agent:main:main'): Promise<any> {
    // Gateway expects: { type, mimeType, content (base64 string), fileName }
    // content = raw base64 (NOT data URI) — Gateway normalizes it internally
    const gwAttachments = attachments?.map((att) => {
      // Strip data URI prefix if present — Gateway wants raw base64
      let rawBase64 = att.content || '';
      if (rawBase64.startsWith('data:')) {
        rawBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
      }
      return {
        type: att.mimeType?.startsWith('image/') ? 'image' : 'file',
        mimeType: att.mimeType,
        content: rawBase64,
        fileName: att.fileName || 'file',
      };
    });

    return this.request('chat.send', {
      sessionKey,
      message,
      idempotencyKey: `aegis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...(gwAttachments?.length ? { attachments: gwAttachments } : {}),
    });
  }

  // ── Sessions & History ──

  async getSessions(): Promise<any> {
    return this.request('sessions.list', {});
  }

  async getHistory(sessionKey: string, limit = 200): Promise<any> {
    return this.request('chat.history', { sessionKey, limit });
  }

  // ── Abort (Stop) ──

  async abortChat(sessionKey = 'agent:main:main'): Promise<any> {
    return this.request('chat.abort', { sessionKey });
  }

  // ── Session Status (token usage) ──

  async getSessionStatus(sessionKey = 'agent:main:main'): Promise<any> {
    return this.request('sessions.list', {});
  }

  // ── Status ──

  getStatus() {
    return { connected: this.connected, connecting: this.connecting };
  }

  // ── Internal ──

  private async request(method: string, params: any): Promise<any> {
    if (!this.ws || !this.connected) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const id = this.nextId();
      this.registerCallback(id, { resolve, reject });
      this.send({ type: 'req', id, method, params });
    });
  }

  private registerCallback(id: string, handlers: { resolve: (v: any) => void; reject: (e: any) => void }) {
    const timer = setTimeout(() => {
      this.pendingRequests.delete(id);
      handlers.reject('Request timeout');
    }, 120000);
    this.pendingRequests.set(id, { ...handlers, timer });
  }

  private handleMessage(msg: any) {
    // Response
    if (msg.type === 'res' && msg.id) {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(msg.id);
        if (msg.ok !== false) {
          pending.resolve(msg.payload ?? msg);
        } else {
          pending.reject(msg.error?.message || 'Request failed');
        }
      }
      return;
    }

    // Event
    if (msg.type === 'event') {
      this.handleEvent(msg);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Event Handler — OpenClaw Protocol
  //
  // Gateway sends: { type:"event", event:"chat", payload: {
  //   state: "delta" | "final" | "error" | "aborted",
  //   message: { role, content },  // content: string | [{type:"text",text:"..."}]
  //   sessionKey, runId
  // }}
  //
  // "delta" = streaming update (accumulated content, NOT a chunk)
  // "final" = complete, fetch full history
  // ═══════════════════════════════════════════════════════════
  private handleEvent(msg: any) {
    const event = msg.event || '';
    const p = msg.payload || {};

    // Only handle "chat" events
    if (event !== 'chat') {
      console.log('[GW] Non-chat event:', event);
      return;
    }

    const state = p.state || '';
    const runId = p.runId || '';
    let messageText = this.extractMessageText(p.message);

    // Extract mediaUrl from payload fields
    let mediaUrl = p.mediaUrl || p.message?.mediaUrl || (p.mediaUrls?.length ? p.mediaUrls[0] : undefined);
    let mediaType = p.mediaType || p.message?.mediaType || undefined;

    // Also extract MEDIA: paths/URLs from message content (OpenClaw TTS format)
    // Formats:
    //   MEDIA:http://localhost:5050/audio/xxx.mp3   (HTTP URL — preferred)
    //   MEDIA:/host-d/clawdbot-shared/voice/xxx.mp3 (shared folder path)
    //   MEDIA:/tmp/tts-xxx/voice-123.mp3            (sandbox path — needs conversion)
    const mediaMatch = messageText.match(/MEDIA:(https?:\/\/[^\s]+|\/[^\s]+|[A-Z]:\\[^\s]+)/);
    if (mediaMatch) {
      let mediaPath = mediaMatch[1];
      mediaType = mediaType || 'audio';
      // Remove the MEDIA: line from displayed text
      messageText = messageText.replace(/\n?MEDIA:[^\s]+\n?/g, '').trim();

      if (!mediaUrl) {
        if (/^https?:\/\//.test(mediaPath)) {
          // HTTP URL — use directly (Edge TTS server or any HTTP source)
          mediaUrl = mediaPath;
          console.log('[GW] 🔊 Media URL (HTTP):', mediaUrl);
        } else {
          // File path — resolve via Electron IPC
          mediaUrl = `aegis-media:${mediaPath}`;
          console.log('[GW] 🔊 Media path:', mediaPath);
        }
      }
    }

    const media: MediaInfo | undefined = mediaUrl ? { mediaUrl, mediaType } : undefined;

    console.log('[GW] Chat event — state:', state, 'runId:', runId?.substring(0, 12), 'text length:', messageText.length);

    // Use runId as the message ID for streaming
    const mId = runId || `msg-${Date.now()}`;

    switch (state) {
      case 'delta': {
        // Streaming update — content is ACCUMULATED (not a chunk)
        // Only update if the new content is longer (protocol sends full accumulated text)
        if (messageText.length >= this.currentStreamContent.length) {
          this.currentStreamContent = messageText;
          this.currentRunId = mId;
          // Pass media if present (usually comes with final, but check delta too)
          this.callbacks?.onStreamChunk(mId, messageText, media);
        }
        break;
      }

      case 'final': {
        // Message complete — use the final text or what we accumulated
        const finalText = messageText || this.currentStreamContent;
        this.currentStreamContent = '';
        this.currentRunId = null;
        this.callbacks?.onStreamEnd(mId, finalText, media);
        break;
      }

      case 'error': {
        const errorText = p.errorMessage || 'حدث خطأ';
        this.currentStreamContent = '';
        this.currentRunId = null;
        this.callbacks?.onStreamEnd(mId, `⚠️ ${errorText}`);
        break;
      }

      case 'aborted': {
        this.currentStreamContent = '';
        this.currentRunId = null;
        this.callbacks?.onStreamEnd(mId, this.currentStreamContent || '⏹️ تم الإيقاف');
        break;
      }

      default:
        console.log('[GW] Unknown chat state:', state);
    }
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private nextId(): string {
    return `aegis-${Date.now()}-${++this.msgCounter}`;
  }

  private emitStatus(extra?: { error?: string }) {
    this.callbacks?.onStatusChange({
      connected: this.connected,
      connecting: this.connecting,
      ...extra,
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempt >= this.maxReconnects) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
    this.reconnectAttempt++;
    console.log(`[GW] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
    this.reconnectTimer = setTimeout(() => this.connect(this.url, this.token), delay);
  }
}

// Singleton
export const gateway = new GatewayService();
