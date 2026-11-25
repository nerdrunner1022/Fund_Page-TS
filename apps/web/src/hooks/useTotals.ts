import useSWR from 'swr';
import { api } from '../lib/api';
import { CAMPAIGN_SLUG } from './useCampaign';

/** Public totals only; the server caches the query for 30 seconds. */
export function useTotals() {
  const { data } = useSWR(
    `totals:${CAMPAIGN_SLUG}`,
    () => api.getTotals(CAMPAIGN_SLUG),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );
  return data ?? null;
}
