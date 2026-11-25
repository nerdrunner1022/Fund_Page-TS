import type { Campaign, CampaignTotals, PendingDonation } from '../types';

export const API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        // Only set this on requests with a body: a JSON Content-Type on GET
        // forces a CORS preflight on every poll.
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server.');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        message = body.message;
      }
    } catch {
      // Keep the status-based fallback message.
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getCampaign: (slug: string) =>
    request<Campaign>(`/campaigns/${encodeURIComponent(slug)}`),
  createDonation: (
    slug: string,
    body: { amount: string; donorName?: string; message?: string },
  ) =>
    request<PendingDonation>(
      `/campaigns/${encodeURIComponent(slug)}/donations`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  getTotals: (slug: string) =>
    request<CampaignTotals>(
      `/campaigns/${encodeURIComponent(slug)}/donations/totals`,
    ),
};
