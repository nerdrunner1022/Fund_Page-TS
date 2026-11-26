import {
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { useFxCurrencies } from '../hooks/useFxCurrencies';
import { useFxQuote } from '../hooks/useFxQuote';
import { useI18n } from '../providers/I18nProvider';
import { api } from '../lib/api';
import {
  CURRENCY_LABELS,
  formatEnteredAmount,
} from '../lib/currency';
import { formatMajor, formatRupees, isValidAmount } from '../lib/money';
import {
  buildWhatsAppUrl,
  formatPhone,
  SECONDARY_WHATSAPP_NUMBERS,
} from '../lib/wa';
import type { CampaignCopy, SupportedCurrency } from '../types';

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 100000];

interface FieldErrors {
  amount?: string;
  currency?: string;
  name?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export function DonationForm({
  copy,
  slug,
  whatsappNumber,
}: {
  copy: CampaignCopy;
  slug: string;
  whatsappNumber: string;
}) {
  const { t } = useI18n();
  const currencies = useFxCurrencies();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>('LKR');
  const { quote, error: fxError, loading: fxLoading } = useFxQuote(
    amount,
    currency,
  );
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [reference, setReference] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const trimmed = amount.trim();

    if (!trimmed) {
      next.amount = t.amountRequired;
    } else if (!isValidAmount(trimmed)) {
      next.amount =
        Number(trimmed) > 10_000_000
          ? currency === 'LKR'
            ? t.amountOutOfRange
            : t.amountRange
          : currency === 'LKR'
            ? t.amountInvalid
            : t.amountInvalidGeneric;
    } else if (currency !== 'LKR' && !quote) {
      next.currency = fxLoading ? t.converting : fxError ?? t.conversionNote;
    }

    if (name.trim().length > 120) {
      next.name = t.nameTooLong;
    }

    return next;
  }

  const message = useMemo(() => {
    let amountLabel = '...';
    if (isValidAmount(amount.trim())) {
      if (currency === 'LKR') {
        amountLabel = formatMajor(Number(amount));
      } else if (quote) {
        amountLabel = `${formatEnteredAmount(amount.trim(), currency)} (≈ ${formatRupees(quote.amountMinor)})`;
      } else {
        amountLabel = formatEnteredAmount(amount.trim(), currency);
      }
    }
    const base = copy.message
      .replace('{a}', amountLabel)
      .replace('{n}', name.trim() || '...');
    return reference ? `${base} Ref: ${reference}.` : base;
  }, [amount, currency, quote, name, copy.message, reference]);

  const href = useMemo(
    () => buildWhatsAppUrl(whatsappNumber, message),
    [whatsappNumber, message],
  );

  function openWhatsApp(targetMessage: string): void {
    const link = document.createElement('a');
    link.href = buildWhatsAppUrl(whatsappNumber, targetMessage);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleSend(event: MouseEvent<HTMLAnchorElement>): void {
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    // Intercept navigation so the declaration is recorded first: the reference
    // must be in the message the organiser receives with the slip.
    event.preventDefault();

    if (inFlight.current) return;
    if (reference) {
      openWhatsApp(message);
      return;
    }

    inFlight.current = true;
    setStatus('saving');

    void api
      .createDonation(slug, {
        amount: amount.trim(),
        currency,
        ...(name.trim() ? { donorName: name.trim() } : {}),
      })
      .then((response) => {
        setReference(response.referenceCode);
        setStatus('saved');
        openWhatsApp(`${message} Ref: ${response.referenceCode}.`);
      })
      .catch(() => {
        setStatus('failed');
        // Never block the donor: the slip can still be sent without a reference.
        openWhatsApp(message);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }

  const errorItems = [
    errors.amount ? { id: 'amtin', message: errors.amount } : null,
    errors.currency ? { id: 'curin', message: errors.currency } : null,
    errors.name ? { id: 'namein', message: errors.name } : null,
  ].filter((item): item is { id: string; message: string } => item !== null);

  return (
    <div className="give">
      <label htmlFor="amtin">{copy.chooseAmount}</label>

      <label htmlFor="curin" className="currency-label">
        {t.currencyLabel}
      </label>
      <select
        id="curin"
        className="currency-select"
        value={currency}
        onChange={(event) => {
          setCurrency(event.target.value as SupportedCurrency);
          setReference(null);
          setStatus('idle');
          setErrors((current) => ({
            ...current,
            amount: undefined,
            currency: undefined,
          }));
        }}
        aria-invalid={errors.currency ? true : undefined}
        aria-describedby={errors.currency ? 'cur-error' : undefined}
      >
        {currencies.map((code) => (
          <option key={code} value={code}>
            {CURRENCY_LABELS[code]}
          </option>
        ))}
      </select>
      {errors.currency && (
        <p className="field-error" id="cur-error">
          {errors.currency}
        </p>
      )}

      {errorItems.length > 0 && (
        <div
          ref={errorSummaryRef}
          className="error-summary"
          role="alert"
          tabIndex={-1}
          aria-labelledby="error-title"
        >
          <h3 id="error-title">{t.errorSummaryTitle}</h3>
          <ul>
            {errorItems.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="quick" aria-label={copy.chooseAmount}>
        {QUICK_AMOUNTS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setAmount(String(value));
              setReference(null);
              setStatus('idle');
              setErrors((current) => ({
                ...current,
                amount: undefined,
                currency: undefined,
              }));
            }}
            aria-pressed={amount === String(value)}
          >
            {value.toLocaleString('en-US')}
          </button>
        ))}
      </div>

      <input
        id="amtin"
        type="number"
        inputMode="decimal"
        min="1"
        max="10000000"
        step="0.01"
        value={amount}
        placeholder={copy.amountPlaceholder}
        onChange={(event) => {
          setAmount(event.target.value);
          setReference(null);
          setStatus('idle');
          setErrors((current) => ({
            ...current,
            amount: undefined,
            currency: undefined,
          }));
        }}
        aria-invalid={errors.amount ? true : undefined}
        aria-describedby={
          errors.amount
            ? 'amt-error fx-note'
            : isValidAmount(amount.trim())
              ? 'fx-note'
              : undefined
        }
      />
      {errors.amount && (
        <p className="field-error" id="amt-error">
          {errors.amount}
        </p>
      )}
      {isValidAmount(amount.trim()) && (
        <p className="note conversion" id="fx-note" aria-live="polite">
          {currency !== 'LKR' && fxLoading
            ? t.converting
            : currency !== 'LKR' && fxError
              ? fxError
              : currency !== 'LKR' && quote
                ? t.convertedEstimate.replace(
                    '{amount}',
                    formatRupees(quote.amountMinor),
                  )
                : t.conversionNote}
        </p>
      )}

      <label htmlFor="namein" className="name-label">
        {copy.name}
      </label>
      <input
        id="namein"
        type="text"
        autoComplete="name"
        maxLength={120}
        value={name}
        placeholder={copy.name}
        onChange={(event) => {
          setName(event.target.value);
          setErrors((current) => ({ ...current, name: undefined }));
        }}
        aria-invalid={errors.name ? true : undefined}
        aria-describedby={errors.name ? 'name-error' : undefined}
      />
      {errors.name && (
        <p className="field-error" id="name-error">
          {errors.name}
        </p>
      )}

      <a
        id="wa"
        className="cta"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleSend}
        aria-describedby="wa-note"
      >
        {copy.sendSlip}
      </a>

      <p className="note" id="wa-note">
        {copy.whatsappNote}
      </p>

      {status !== 'idle' && (
        <p className="note status" role="status" aria-live="polite">
          {status === 'saving'
            ? t.recording
            : status === 'saved' && reference
              ? t.recorded.replace('{ref}', reference)
              : t.recordFailed}
        </p>
      )}

      <p className="note">
        {t.whatsappLabel}:{' '}
        {SECONDARY_WHATSAPP_NUMBERS.map((number) => (
          <a
            key={number}
            className="phone-link"
            href={buildWhatsAppUrl(number, message)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {formatPhone(number)}
          </a>
        ))}
      </p>
    </div>
  );
}
