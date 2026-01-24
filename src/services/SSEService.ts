// Seenn React Native SDK - SSE Service
// MIT License - Open Source

import EventEmitter from 'eventemitter3';
import { ConnectionException } from '../errors/SeennException';
import type { ConnectionState, SSEEvent, SSEEventType } from '../types';

export interface SSEServiceConfig {
  url: string;
  apiKey?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  debug?: boolean;
}

export class SSEService extends EventEmitter {
  private config: SSEServiceConfig;
  private xhr: XMLHttpRequest | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private buffer = '';
  private lastEventId: string | null = null;

  constructor(config: SSEServiceConfig) {
    super();
    this.config = {
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      debug: false,
      ...config,
    };
  }

  connect(userId: string): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      this.log('Already connected or connecting');
      return;
    }

    this.setConnectionState('connecting');
    this.log(`Connecting to SSE: ${this.config.url}`);

    try {
      this.xhr = new XMLHttpRequest();

      const url = new URL(this.config.url);
      url.searchParams.set('userId', userId);
      if (this.lastEventId) {
        url.searchParams.set('lastEventId', this.lastEventId);
      }

      this.xhr.open('GET', url.toString(), true);
      this.xhr.setRequestHeader('Accept', 'text/event-stream');
      this.xhr.setRequestHeader('Cache-Control', 'no-cache');

      if (this.config.apiKey) {
        this.xhr.setRequestHeader('Authorization', `Bearer ${this.config.apiKey}`);
      }

      // Handle progress (incoming data)
      this.xhr.onprogress = () => {
        if (!this.xhr) return;

        const text = this.xhr.responseText;
        const newData = text.substring(this.buffer.length);
        this.buffer = text;

        if (newData) {
          this.parseSSEData(newData);
        }
      };

      // Handle connection open
      this.xhr.onreadystatechange = () => {
        if (!this.xhr) return;

        if (this.xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
          if (this.xhr.status === 200) {
            this.setConnectionState('connected');
            this.reconnectAttempts = 0;
            this.log('SSE connected');
            this.startHeartbeatMonitor();
          } else {
            this.handleError(new ConnectionException(`HTTP ${this.xhr.status}`));
          }
        }
      };

      // Handle errors
      this.xhr.onerror = () => {
        this.handleError(new ConnectionException('Network error'));
      };

      // Handle connection close
      this.xhr.onloadend = () => {
        this.log('SSE connection closed');
        this.cleanup();

        if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
          this.scheduleReconnect(userId);
        } else {
          this.setConnectionState('disconnected');
        }
      };

      this.xhr.send();
    } catch (error) {
      this.handleError(new ConnectionException('Failed to establish connection', error));
    }
  }

  disconnect(): void {
    this.log('Disconnecting SSE');
    this.config.reconnect = false;
    this.cleanup();
    this.setConnectionState('disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private parseSSEData(data: string): void {
    const lines = data.split('\n');
    let event: Partial<SSEEvent> = {};

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event.event = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        try {
          event.data = JSON.parse(line.substring(5).trim());
        } catch {
          event.data = line.substring(5).trim();
        }
      } else if (line.startsWith('id:')) {
        event.id = line.substring(3).trim();
        this.lastEventId = event.id;
      } else if (line === '') {
        // Empty line = end of event
        if (event.event) {
          this.handleSSEEvent(event as SSEEvent);
          event = {};
        }
      }
    }
  }

  private handleSSEEvent(event: SSEEvent): void {
    this.log(`SSE event: ${event.event}`, event.data);

    // Reset heartbeat timeout on any event
    this.resetHeartbeatTimeout();

    // Emit event
    this.emit(event.event as SSEEventType, event.data);
  }

  private startHeartbeatMonitor(): void {
    // Expect heartbeat every 15 seconds
    // Timeout after 30 seconds (2x heartbeat interval)
    this.resetHeartbeatTimeout();
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      this.log('Heartbeat timeout - reconnecting');
      this.cleanup();
      if (this.connectionState === 'connected') {
        this.scheduleReconnect(this.lastEventId || '');
      }
    }, 30000); // 30 seconds
  }

  private scheduleReconnect(userId: string): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    const delay = Math.min(
      this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000 // max 30 seconds
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect(userId);
    }, delay);
  }

  private cleanup(): void {
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    this.buffer = '';
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChange', state);
      this.log(`Connection state: ${state}`);
    }
  }

  private handleError(error: ConnectionException): void {
    this.log('SSE error:', error.message);
    this.emit('error', error);
    this.cleanup();
  }

  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[SeennSSE] ${message}`, data || '');
    }
  }
}
