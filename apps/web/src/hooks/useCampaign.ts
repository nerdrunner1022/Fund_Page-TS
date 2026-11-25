import useSWR from 'swr';
import { api } from '../lib/api';
import type { Campaign } from '../types';

export const CAMPAIGN_SLUG =
  import.meta.env.VITE_CAMPAIGN_SLUG ?? 'zahira-college-land-fund';

export function useCampaign() {
  const { data, error, isLoading, mutate } = useSWR<Campaign>(
    `campaign:${CAMPAIGN_SLUG}`,
    () => api.getCampaign(CAMPAIGN_SLUG),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );

  return { campaign: data, error, isLoading, refresh: mutate };
}
