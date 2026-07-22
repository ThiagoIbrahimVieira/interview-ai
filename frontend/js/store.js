class Store {
  constructor() {
    this.state = {};
    this.listeners = new Map();
  }

  set(key, value) {
    this.state[key] = value;
    this.notify(key);
  }

  get(key) {
    return this.state[key];
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  notify(key) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(this.state[key]));
    }
  }
}

window.store = new Store();
