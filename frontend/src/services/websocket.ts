import { Client } from '@stomp/stompjs';
import type { IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuthToken, API_ORIGIN } from './api';

class WebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private pendingSubscriptions: Array<{ destination: string; callback: (message: any) => void }> = [];
  private connectionCallbacks: Array<(connected: boolean) => void> = [];

  public connect(onConnected?: () => void) {
    const token = getAuthToken();
    if (!token) return;

    if (this.client && this.isConnected) {
      if (onConnected) onConnected();
      return;
    }

    // Determine WS / SockJS endpoint
    const socketFactory = () => new SockJS(`${API_ORIGIN}/ws`);

    this.client = new Client({
      webSocketFactory: socketFactory,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: () => {},
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      this.isConnected = true;
      this.notifyConnectionState(true);

      // Process any pending subscriptions
      this.pendingSubscriptions.forEach(({ destination, callback }) => {
        this.doSubscribe(destination, callback);
      });
      this.pendingSubscriptions = [];

      if (onConnected) {
        onConnected();
      }
    };

    this.client.onDisconnect = () => {
      this.isConnected = false;
      this.notifyConnectionState(false);
      this.subscriptions.clear();
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
      this.notifyConnectionState(false);
      this.subscriptions.clear();
    }
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

  public subscribe(destination: string, callback: (payload: any) => void): () => void {
    if (!this.isConnected || !this.client) {
      this.pendingSubscriptions.push({ destination, callback });
      return () => {
        this.pendingSubscriptions = this.pendingSubscriptions.filter((s) => s.destination !== destination);
      };
    }

    return this.doSubscribe(destination, callback);
  }

  private doSubscribe(destination: string, callback: (payload: any) => void): () => void {
    if (!this.client || !this.isConnected) return () => {};

    // If already subscribed, return unsubscribe
    if (this.subscriptions.has(destination)) {
      this.subscriptions.get(destination)?.unsubscribe();
    }

    const sub = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const payload = JSON.parse(message.body);
        callback(payload);
      } catch (e) {
        callback(message.body);
      }
    });

    this.subscriptions.set(destination, sub);

    return () => {
      sub.unsubscribe();
      this.subscriptions.delete(destination);
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
