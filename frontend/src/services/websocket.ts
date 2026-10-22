import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthToken, API_ORIGIN } from './api';

interface Registration {
  destination: string;
  callback: (message: any) => void;
  sub?: StompSubscription;
}

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  // Every subscription is remembered, so it is automatically restored after a reconnect
  private registry: Map<number, Registration> = new Map();
  private nextId = 1;
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  public connect(onConnected?: () => void) {
    const token = getAuthToken();
    if (!token) return;

    if (this.client) {
      if (this.isConnected && onConnected) onConnected();
      return;
    }

    const socketFactory = () => new SockJS(`${API_ORIGIN}/ws`);

    this.client = new Client({
      webSocketFactory: socketFactory,
      connectHeaders: {
        Authorization: `Bearer ${getAuthToken() || token}`,
      },
      // refresh the token on every (re)connect attempt
      beforeConnect: () => {
        const fresh = getAuthToken();
        if (fresh && this.client) {
          this.client.connectHeaders = { Authorization: `Bearer ${fresh}` };
        }
      },
      debug: () => {},
      reconnectDelay: 2000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.isConnected = true;
      // (Re)create every subscription on the fresh connection
      this.registry.forEach((reg) => this.activate(reg));
      this.notifyConnectionState(true);
      if (onConnected) onConnected();
    };

    this.client.onWebSocketClose = () => {
      if (this.isConnected) {
        this.isConnected = false;
        this.registry.forEach((reg) => {
          reg.sub = undefined;
        });
        this.notifyConnectionState(false);
      }
    };

    this.client.onStompError = (frame) => {
      console.warn('STOMP error:', frame.headers['message'], frame.body);
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      this.registry.clear();
      this.notifyConnectionState(false);
    }
  }

  /** Force a quick reconnect check (e.g. phone just woke up). */
  public ensureConnected() {
    if (this.client && !this.isConnected && !this.client.active) {
      this.client.activate();
    }
  }

  public get connected() {
    return this.isConnected;
  }

  public onConnectionChange(cb: (connected: boolean) => void) {
    this.connectionCallbacks.push(cb);
    cb(this.isConnected);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter((c) => c !== cb);
    };
  }

  private notifyConnectionState(state: boolean) {
    this.connectionCallbacks.forEach((cb) => cb(state));
  }

  private activate(reg: Registration) {
    if (!this.client || !this.isConnected) return;
    try {
      reg.sub?.unsubscribe();
    } catch {
      // ignore
    }
    reg.sub = this.client.subscribe(reg.destination, (message: IMessage) => {
      let payload: any;
      try {
        payload = JSON.parse(message.body);
      } catch {
        payload = message.body;
      }
      reg.callback(payload);
    });
  }

  public subscribe(destination: string, callback: (payload: any) => void): () => void {
    const id = this.nextId++;
    const reg: Registration = { destination, callback };
    this.registry.set(id, reg);
    this.activate(reg);

    return () => {
      this.registry.delete(id);
      try {
        reg.sub?.unsubscribe();
      } catch {
        // ignore
      }
    };
  }

  public send(destination: string, body: any) {
    if (this.client && this.isConnected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }
}

export const wsService = new WebSocketService();
