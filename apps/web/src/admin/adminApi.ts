import { API_BASE } from '../lib/api';
import { CAMPAIGN_SLUG } from '../hooks/useCampaign';
import type {
  AdminDonationPage,
  DonationStatus,
  SupportedCurrency,
} from '../types';

const TOKEN_KEY = 'zahira_admin_token';

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Session storage may be disabled; the token still works for this page load.
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors.
  }
}

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) clearToken();
    let message = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface ManualDonationInput {
  amount: string;
  currency?: SupportedCurrency;
  donorName?: string;
  bankRef?: string;
  slipUrl?: string;
  donatedOn?: string;
}

export interface DonationUpdateInput {
  amount: string;
  currency?: SupportedCurrency;
  status: DonationStatus;
  donorName: string | null;
  bankRef: string | null;
  slipUrl: string | null;
  donatedOn: string | null;
  message: string | null;
}

export const adminApi = {
  async login(email: string, password: string): Promise<void> {
    const result = await adminRequest<{ accessToken: string }>(
      '/admin/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    storeToken(result.accessToken);
  },

  list(status: DonationStatus): Promise<AdminDonationPage> {
    const query = new URLSearchParams({ status, limit: '50' });
    return adminRequest<AdminDonationPage>(
      `/admin/campaigns/${encodeURIComponent(CAMPAIGN_SLUG)}/donations?${query}`,
    );
  },

  verify(id: string): Promise<unknown> {
    return adminRequest(`/admin/donations/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
    });
  },

  reject(id: string): Promise<unknown> {
    return adminRequest(`/admin/donations/${encodeURIComponent(id)}/decline`, {
      method: 'POST',
    });
  },

  addManual(input: ManualDonationInput): Promise<unknown> {
    return adminRequest(
      `/admin/campaigns/${encodeURIComponent(CAMPAIGN_SLUG)}/donations`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  },

  update(id: string, input: DonationUpdateInput): Promise<unknown> {
    return adminRequest(`/admin/donations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<{ id: string; status: DonationStatus }> {
    return adminRequest(`/admin/donations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
