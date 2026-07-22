const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE;
    if (typeof window !== "undefined" && this.baseURL === "/api/v1") {
      console.warn(
        "[InterviewAI] NEXT_PUBLIC_API_URL is not set. API calls will fail. " +
        "Set it in your Vercel dashboard environment variables to: " +
        "https://interviewai-backend.onrender.com/api/v1"
      );
    }
  }

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refresh_token");
  }

  setTokens(access: string, refresh: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  }

  clearTokens() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch (err) {
      throw new Error(
        "Network error: unable to reach the server. " +
        "Please check your connection or verify the API URL is configured correctly."
      );
    }

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.getToken()}`;
        try {
          const retryResponse = await fetch(url, { ...options, headers });
          return this.handleResponse(retryResponse);
        } catch {
          throw new Error("Network error during token refresh retry.");
        }
      }
      this.clearTokens();
      const error = new Error("Session expired. Please log in again.");
      (error as Error & { status: number }).status = 401;
      throw error;
    }

    return this.handleResponse(response);
  }

  async handleResponse(response: Response) {
    const text = await response.text();
    let data: unknown;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!response.ok) {
      const errData = data as { detail?: string };
      const error = new Error(errData?.detail || `Request failed (${response.status})`);
      (error as Error & { status: number }).status = response.status;
      (error as Error & { data: unknown }).data = data;
      throw error;
    }

    return data;
  }

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  get(endpoint: string) {
    return this.request(endpoint, { method: "GET" });
  }

  post(endpoint: string, body?: unknown) {
    return this.request(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put(endpoint: string, body?: unknown) {
    return this.request(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete(endpoint: string) {
    return this.request(endpoint, { method: "DELETE" });
  }

  async register(email: string, password: string, full_name: string) {
    return this.post("/auth/register", { email, password, full_name });
  }

  async login(email: string, password: string) {
    const data = await this.post("/auth/login", { email, password });
    const typed = data as { access_token: string; refresh_token: string };
    this.setTokens(typed.access_token, typed.refresh_token);
    return data;
  }

  async getMe() {
    return this.get("/auth/me");
  }

  async getProfile() {
    return this.get("/profile");
  }

  async updateProfile(profileData: unknown) {
    return this.put("/profile", profileData);
  }

  async getDashboardStats() {
    return this.get("/dashboard/stats");
  }

  async startInterview(config: unknown) {
    return this.post("/interviews/start", config);
  }

  async getInterviews(page = 1, perPage = 10) {
    return this.get(`/interviews?page=${page}&per_page=${perPage}`);
  }

  async getInterview(id: number) {
    return this.get(`/interviews/${id}`);
  }

  async sendMessage(sessionId: number, content: string) {
    return this.post(`/interviews/${sessionId}/messages`, { content });
  }

  async getMessages(sessionId: number) {
    return this.get(`/interviews/${sessionId}/messages`);
  }

  async endInterview(sessionId: number) {
    return this.post(`/interviews/${sessionId}/end`);
  }

  async getReport(sessionId: number) {
    return this.get(`/reports/${sessionId}`);
  }
}

export const api = new ApiClient();
