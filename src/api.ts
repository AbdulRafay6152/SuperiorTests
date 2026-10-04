// ============================================================
// SuperiorTests — API Client
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('auth_token');
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ============================================================
// Auth API
// ============================================================

export const authAPI = {
  async signup(email: string, name: string, password: string) {
    const data = await fetchAPI('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    });
    setToken(data.token);
    return data.user;
  },

  async login(email: string, password: string) {
    const data = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data.user;
  },

  async getMe() {
    return fetchAPI('/auth/me');
  },

  async updateProfile(data: { name?: string; email?: string }) {
    return fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return fetchAPI('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async requestPasswordReset(email: string) {
    return fetchAPI('/auth/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async confirmPasswordReset(token: string, newPassword: string) {
    return fetchAPI('/auth/reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
};

// ============================================================
// Tests API
// ============================================================

export const testsAPI = {
  async list() {
    return fetchAPI('/tests');
  },

  async create(name: string) {
    return fetchAPI('/tests', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async get(id: string) {
    return fetchAPI(`/tests/${id}`);
  },

  async getBySlug(slug: string) {
    return fetchAPI(`/tests/slug/${slug}`);
  },

  async update(id: string, data: any) {
    return fetchAPI(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async publish(id: string) {
    return fetchAPI(`/tests/${id}/publish`, { method: 'PATCH' });
  },

  async unpublish(id: string) {
    return fetchAPI(`/tests/${id}/unpublish`, { method: 'PATCH' });
  },

  async delete(id: string) {
    return fetchAPI(`/tests/${id}`, { method: 'DELETE' });
  },

  async getResults(id: string) {
    return fetchAPI(`/tests/${id}/results`);
  },
};

// ============================================================
// Attempts API
// ============================================================

export const attemptsAPI = {
  async start(data: {
    testSlug: string;
    takerName: string;
    takerFatherName: string;
    takerEmail?: string;
    takerStudentId?: string;
    passcode?: string;
  }) {
    return fetchAPI('/attempts/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async saveProgress(attemptId: string, answers: any[]) {
    return fetchAPI('/attempts/progress', {
      method: 'POST',
      body: JSON.stringify({ attemptId, answers }),
    });
  },

  async submit(data: {
    attemptId: string;
    answers: any[];
    antiCheatEvents?: any[];
  }) {
    return fetchAPI('/attempts/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logAntiCheat(attemptId: string, type: string, details?: string) {
    return fetchAPI('/attempts/anti-cheat', {
      method: 'POST',
      body: JSON.stringify({ attemptId, type, details }),
    });
  },

  async resume(attemptId: string) {
    return fetchAPI(`/attempts/${attemptId}/resume`, { method: 'PATCH' });
  },
};
