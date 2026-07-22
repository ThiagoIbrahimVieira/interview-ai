class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.params = {};

    window.addEventListener('hashchange', () => this.resolve());
    window.addEventListener('load', () => this.resolve());
  }

  route(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);

    for (const [pattern, handler] of Object.entries(this.routes)) {
      const patternParts = pattern.split('/').filter(Boolean);

      if (patternParts.length !== parts.length) continue;

      const params = {};
      let match = true;

      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          params[patternParts[i].slice(1)] = parts[i];
        } else if (patternParts[i] !== parts[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        this.params = params;
        this.currentRoute = pattern;
        handler(params);
        return;
      }
    }

    window.location.hash = '#/login';
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  }
}

window.router = new Router();
