// ═══════════════════════════════════════════════════════════
// Notification Service — Desktop notifications with sound
// ═══════════════════════════════════════════════════════════

export interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  tag?: string;
}

class NotificationService {
  private enabled = true;
  private soundEnabled = true;
  private dndMode = false;

  // Notification sound (short pleasant chime)
  private audioCtx: AudioContext | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  setDndMode(dnd: boolean) {
    this.dndMode = dnd;
  }

  isEnabled() { return this.enabled; }
  isSoundEnabled() { return this.soundEnabled; }
  isDndMode() { return this.dndMode; }

  // Play a pleasant notification chime using Web Audio API
  private playChime() {
    if (!this.soundEnabled || this.dndMode) return;

    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Two-tone chime (C5 → E5)
      const notes = [523.25, 659.25]; // C5, E5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
    } catch {
      // Silent fallback
    }
  }

  // Send a desktop notification
  notify(options: NotificationOptions) {
    if (!this.enabled || this.dndMode) return;

    // Play sound
    if (!options.silent) {
      this.playChime();
    }

    // System notification (Electron)
    if (window.aegis?.notify) {
      window.aegis.notify(options.title, options.body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: '/icon.png',
        tag: options.tag,
        silent: true, // We handle sound ourselves
      });
    }
  }

  // Check if window is focused
  isWindowFocused(): boolean {
    return document.hasFocus();
  }

  // Notify only if window is not focused
  notifyIfBackground(options: NotificationOptions) {
    if (!this.isWindowFocused()) {
      this.notify(options);
    }
  }

  // Request permission (for browser fallback)
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
}

export const notifications = new NotificationService();
