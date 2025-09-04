type EventHandler = (...args: any[]) => void;
type EventType = 'mesh-clicked' | 'mouseup' | 'mousemove' | 'mouseleave' | 'resize' | 'click' | 'mouse-down' | 'mouse-up' | 'mouse-wheel'

class EventManager {
  private static instance: EventManager;
  private events: Map<string, EventHandler[]>;
  private handlers: Record<string, EventHandler> = {};

  private constructor() {
    this.events = new Map();
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  public on(eventName: string, handler: EventHandler): void {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    this.events.get(eventName)!.push(handler);
  }

  public off(eventName: string, handler: EventHandler): void {
    const handlers = this.events.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  public emit(eventName: string, ...args: any[]): void {
    const handlers = this.events.get(eventName);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }
  public add(eventType: EventType, handler: EventHandler) {
    this.remove(eventType);
    this.handlers[eventType] = handler;
    window.addEventListener(eventType, handler);
  }

  public remove(eventType: EventType) {
    if (this.handlers[eventType]) {
      window.removeEventListener(eventType, this.handlers[eventType]);
      delete this.handlers[eventType];
    }
  }
}

export const eventManager = EventManager.getInstance();