const API_BASE = '/api/v1';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE;
  }

  getToken() {
    return localStorage.getItem('access_token');
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  setTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return this.handleResponse(retryResponse);
        }
        this.clearTokens();
        window.location.hash = '#/login';
        return null;
      }

      return this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async handleResponse(response) {
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!response.ok) {
      const error = new Error(data.detail || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async register(email, password, full_name) {
    const data = await this.post('/auth/register', { email, password, full_name });
    return data;
  }

  async login(email, password) {
    const data = await this.post('/auth/login', { email, password });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async getMe() {
    return this.get('/auth/me');
  }

  async getProfile() {
    return this.get('/profile');
  }

  async updateProfile(data) {
    return this.put('/profile', data);
  }

  async getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  async startInterview(config) {
    return this.post('/interviews/start', config);
  }

  async getInterviews(page = 1, perPage = 10) {
    return this.get(`/interviews?page=${page}&per_page=${perPage}`);
  }

  async getInterview(id) {
    return this.get(`/interviews/${id}`);
  }

  async sendMessage(sessionId, content) {
    return this.post(`/interviews/${sessionId}/messages`, { content });
  }

  async getMessages(sessionId) {
    return this.get(`/interviews/${sessionId}/messages`);
  }

  async endInterview(sessionId) {
    return this.post(`/interviews/${sessionId}/end`);
  }

  async getReport(sessionId) {
    return this.get(`/reports/${sessionId}`);
  }
}

window.api = new ApiClient();
