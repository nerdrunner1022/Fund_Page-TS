import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { isValidAmount } from '../lib/money';
import type { FxQuote, SupportedCurrency } from '../types';

const DEBOUNCE_MS = 350;

function toMinor(input: string): string {
  const [major, fraction = ''] = input.split('.');
  return (BigInt(major) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}

/** Live conversion preview. The server repeats the conversion on submission. */
export function useFxQuote(amount: string, currency: SupportedCurrency) {
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuote(null);
    setError(null);
    setLoading(false);

    const trimmed = amount.trim();
    if (!isValidAmount(trimmed)) return;

    if (currency === 'LKR') {
      const minor = toMinor(trimmed);
      setQuote({
        currency: 'LKR',
        sourceAmountMinor: minor,
        amountMinor: minor,
        rate: '1',
      });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void api
        .getFxQuote(currency, trimmed, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setQuote(result);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setQuote(null);
          setError(cause instanceof Error ? cause.message : 'Live conversion failed.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [amount, currency]);

  return { quote, error, loading };
}
