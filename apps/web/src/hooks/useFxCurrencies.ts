import useSWR from 'swr';
import { api } from '../lib/api';
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '../types';

/** Cached on the CDN for an hour; the local list keeps the form usable offline. */
export function useFxCurrencies(): SupportedCurrency[] {
  const { data } = useSWR('fx:currencies', () => api.getFxCurrencies(), {
    revalidateOnFocus: false,
  });
  return data?.currencies ?? [...SUPPORTED_CURRENCIES];
}
