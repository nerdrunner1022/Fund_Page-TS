import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useFxCurrencies } from '../hooks/useFxCurrencies';
import { useFxQuote } from '../hooks/useFxQuote';
import { CURRENCY_LABELS, formatMinorAmount } from '../lib/currency';
import { formatRupees } from '../lib/money';
import { useI18n } from '../providers/I18nProvider';
import type {
  AdminDonation,
  DonationStatus,
  Lang,
  SupportedCurrency,
} from '../types';
import {
  adminApi,
  clearToken,
  getToken,
  type DonationUpdateInput,
  type ManualDonationInput,
} from './adminApi';

interface Labels {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  signIn: string;
  signingIn: string;
  logout: string;
  pending: string;
  confirmed: string;
  declined: string;
  addTitle: string;
  amount: string;
  currency: string;
  converted: string;
  donorName: string;
  bankRef: string;
  slipUrl: string;
  donatedOn: string;
  addButton: string;
  adding: string;
  reference: string;
  bank: string;
  date: string;
  status: string;
  verifiedBy: string;
  actions: string;
  verify: string;
  reject: string;
  slip: string;
  edit: string;
  editingTitle: string;
  save: string;
  saving: string;
  cancel: string;
  delete: string;
  confirmDelete: string;
  donorMessage: string;
  updateNotice: string;
  deleteNotice: string;
  empty: string;
  loading: string;
  publicPage: string;
}

const LABELS: Record<Lang, Labels> = {
  en: {
    title: 'Donation review',
    subtitle: 'Zahira College, Trincomalee – land fund',
    email: 'Admin email',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    logout: 'Sign out',
    pending: 'Pending',
    confirmed: 'Verified',
    declined: 'Rejected',
    addTitle: 'Add a transfer already seen on the statement',
    amount: 'Amount',
    currency: 'Currency',
    converted: 'About {amount} in rupees',
    donorName: 'Donor name (optional)',
    bankRef: 'Bank reference',
    slipUrl: 'Slip link (optional)',
    donatedOn: 'Date (YYYY-MM-DD)',
    addButton: 'Add verified donation',
    adding: 'Adding…',
    reference: 'Reference',
    bank: 'Bank ref.',
    date: 'Date',
    status: 'Status',
    verifiedBy: 'Handled by',
    actions: 'Actions',
    verify: 'Verify',
    reject: 'Reject',
    slip: 'Slip',
    edit: 'Edit',
    editingTitle: 'Edit donation',
    save: 'Save changes',
    saving: 'Saving…',
    cancel: 'Cancel',
    delete: 'Delete',
    confirmDelete: 'Confirm delete',
    donorMessage: 'Message (optional)',
    updateNotice: 'Donation updated.',
    deleteNotice: 'Donation deleted.',
    empty: 'Nothing in this list.',
    loading: 'Loading donations…',
    publicPage: 'Public page',
  },
  ta: {
    title: 'நன்கொடை மதிப்பாய்வு',
    subtitle: 'ஸாஹிரா கல்லூரி, திருகோணமலை – நில நிதி',
    email: 'நிர்வாகி மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    signIn: 'உள்நுழைய',
    signingIn: 'உள்நுழையும் நிலை…',
    logout: 'வெளியேறு',
    pending: 'நிலுவையில்',
    confirmed: 'சரிபார்க்கப்பட்டது',
    declined: 'நிராகரிக்கப்பட்டது',
    addTitle: 'வங்கி கணக்கில் காணப்பட்ட பரிமாற்றத்தைச் சேர்',
    amount: 'தொகை',
    currency: 'நாணயம்',
    converted: 'ரூபாயில் சுமார் {amount}',
    donorName: 'நன்கொடையாளர் (விரும்பினால்)',
    bankRef: 'வங்கி குறிப்பு',
    slipUrl: 'ரசீது இணைப்பு (விரும்பினால்)',
    donatedOn: 'தேதி (YYYY-MM-DD)',
    addButton: 'சரிபார்க்கப்பட்ட நன்கொடை சேர்',
    adding: 'சேர்க்கிறது…',
    reference: 'குறிப்பு',
    bank: 'வங்கி குறிப்பு',
    date: 'தேதி',
    status: 'நிலை',
    verifiedBy: 'கையாண்டவர்',
    actions: 'செயல்கள்',
    verify: 'சரிபார்',
    reject: 'நிராகரி',
    slip: 'ரசீது',
    edit: 'திருத்து',
    editingTitle: 'நன்கொடையைத் திருத்து',
    save: 'மாற்றங்களைச் சேமி',
    saving: 'சேமிக்கிறது…',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    confirmDelete: 'நீக்கத்தை உறுதிப்படுத்து',
    donorMessage: 'செய்தி (விரும்பினால்)',
    updateNotice: 'நன்கொடை புதுப்பிக்கப்பட்டது.',
    deleteNotice: 'நன்கொடை நீக்கப்பட்டது.',
    empty: 'இந்தப் பட்டியலில் எதுவும் இல்லை.',
    loading: 'நன்கொடைகள் ஏற்றப்படுகிறது…',
    publicPage: 'பொது பக்கம்',
  },
};

const TABS: DonationStatus[] = ['pending', 'confirmed', 'declined'];

interface EditDraft {
  id: string;
  referenceCode: string;
  amount: string;
  currency: SupportedCurrency;
  donorName: string;
  bankRef: string;
  slipUrl: string;
  donatedOn: string;
  message: string;
  status: DonationStatus;
}

function majorAmount(minor: string): string {
  const value = BigInt(minor);
  const cents = value % 100n;
  return cents === 0n
    ? (value / 100n).toString()
    : `${value / 100n}.${cents.toString().padStart(2, '0')}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-LK', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(date);
}

export function AdminApp() {
  const { lang, t } = useI18n();
  const l = LABELS[lang];
  const currencies = useFxCurrencies();
  const [token, setToken] = useState<string | null>(() => getToken());
  const [status, setStatus] = useState<DonationStatus>('pending');
  const [items, setItems] = useState<AdminDonation[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manual, setManual] = useState<ManualDonationInput>({
    amount: '',
    currency: 'LKR',
    donorName: '',
    bankRef: '',
    slipUrl: '',
    donatedOn: '',
  });
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const manualFx = useFxQuote(manual.amount, manual.currency ?? 'LKR');
  const editFx = useFxQuote(editing?.amount ?? '', editing?.currency ?? 'LKR');

  const load = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const page = await adminApi.list(status);
      setItems(page.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load donations.');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(email, password);
      setToken(getToken());
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setItems([]);
    setNotice(null);
    setEditing(null);
    setConfirmDelete(null);
  }

  async function handleAction(
    action: 'verify' | 'reject',
    donation: AdminDonation,
  ) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === 'verify') await adminApi.verify(donation.id);
      else await adminApi.reject(donation.id);
      setNotice(
        `${donation.referenceCode}: ${action === 'verify' ? l.confirmed : l.declined}`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((manual.currency ?? 'LKR') !== 'LKR' && !manualFx.quote) {
      setError(
        manualFx.loading ? t.converting : manualFx.error ?? t.conversionNote,
      );
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const input: ManualDonationInput = {
        amount: manual.amount.trim(),
        currency: manual.currency ?? 'LKR',
        ...(manual.donorName?.trim()
          ? { donorName: manual.donorName.trim() }
          : {}),
        ...(manual.bankRef?.trim() ? { bankRef: manual.bankRef.trim() } : {}),
        ...(manual.slipUrl?.trim() ? { slipUrl: manual.slipUrl.trim() } : {}),
        ...(manual.donatedOn ? { donatedOn: manual.donatedOn } : {}),
      };
      await adminApi.addManual(input);
      setManual({
        amount: '',
        currency: 'LKR',
        donorName: '',
        bankRef: '',
        slipUrl: '',
        donatedOn: '',
      });
      setNotice(l.confirmed);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add donation.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(donation: AdminDonation) {
    setError(null);
    setNotice(null);
    setConfirmDelete(null);
    setEditing({
      id: donation.id,
      referenceCode: donation.referenceCode,
      amount: majorAmount(donation.sourceAmountMinor ?? donation.amountMinor),
      currency: (donation.currency ?? 'LKR') as SupportedCurrency,
      donorName: donation.donorName ?? '',
      bankRef: donation.bankRef ?? '',
      slipUrl: donation.slipUrl ?? '',
      donatedOn: donation.donatedOn ?? '',
      message: donation.message ?? '',
      status: donation.status,
    });
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (editing.currency !== 'LKR' && !editFx.quote) {
      setError(editFx.loading ? t.converting : editFx.error ?? t.conversionNote);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const input: DonationUpdateInput = {
        amount: editing.amount.trim(),
        currency: editing.currency,
        status: editing.status,
        donorName: editing.donorName.trim() || null,
        bankRef: editing.bankRef.trim() || null,
        slipUrl: editing.slipUrl.trim() || null,
        donatedOn: editing.donatedOn || null,
        message: editing.message.trim() || null,
      };
      await adminApi.update(editing.id, input);
      setEditing(null);
      setNotice(l.updateNotice);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update donation.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminApi.remove(id);
      setConfirmDelete(null);
      if (editing?.id === id) setEditing(null);
      setNotice(l.deleteNotice);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete donation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="page admin">
      <header className="admin-head">
        <div>
          <h1>{l.title}</h1>
          <p className="note">{l.subtitle}</p>
        </div>
        <div className="admin-head-links">
          <a className="phone-link" href="/">
            {l.publicPage}
          </a>
          {token && (
            <button type="button" className="link-button" onClick={handleLogout}>
              {l.logout}
            </button>
          )}
        </div>
      </header>

      <div aria-live="polite" className="admin-messages">
        {error && <p className="error-summary">{error}</p>}
        {notice && <p className="admin-notice">{notice}</p>}
      </div>

      {!token ? (
        <section className="admin-card" aria-label={l.signIn}>
          <form onSubmit={handleLogin} className="admin-form">
            <label>
              <span>{l.email}</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              <span>{l.password}</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit" className="cta" disabled={busy}>
              {busy ? l.signingIn : l.signIn}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="admin-card" aria-label={l.addTitle}>
            <h2>{l.addTitle}</h2>
            <form onSubmit={handleManual} className="admin-form admin-form-grid">
              <label>
                <span>{l.amount}</span>
                <input
                  required
                  inputMode="decimal"
                  value={manual.amount}
                  onChange={(event) =>
                    setManual({ ...manual, amount: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{l.currency}</span>
                <select
                  value={manual.currency ?? 'LKR'}
                  onChange={(event) =>
                    setManual({
                      ...manual,
                      currency: event.target.value as SupportedCurrency,
                    })
                  }
                >
                  {currencies.map((code) => (
                    <option key={code} value={code}>
                      {CURRENCY_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>
              {(manual.currency ?? 'LKR') !== 'LKR' && (
                <p className="note admin-span" role="status">
                  {manualFx.loading
                    ? t.converting
                    : manualFx.error ??
                      (manualFx.quote
                        ? l.converted.replace(
                            '{amount}',
                            formatRupees(manualFx.quote.amountMinor),
                          )
                        : '')}
                </p>
              )}
              <label>
                <span>{l.donorName}</span>
                <input
                  value={manual.donorName ?? ''}
                  onChange={(event) =>
                    setManual({ ...manual, donorName: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{l.bankRef}</span>
                <input
                  value={manual.bankRef ?? ''}
                  onChange={(event) =>
                    setManual({ ...manual, bankRef: event.target.value })
                  }
                />
              </label>
              <label>
                <span>{l.donatedOn}</span>
                <input
                  type="date"
                  value={manual.donatedOn ?? ''}
                  onChange={(event) =>
                    setManual({ ...manual, donatedOn: event.target.value })
                  }
                />
              </label>
              <label className="admin-span">
                <span>{l.slipUrl}</span>
                <input
                  type="url"
                  value={manual.slipUrl ?? ''}
                  onChange={(event) =>
                    setManual({ ...manual, slipUrl: event.target.value })
                  }
                />
              </label>
              <button type="submit" className="cta admin-span-left" disabled={busy}>
                {busy ? l.adding : l.addButton}
              </button>
            </form>
          </section>

          {editing && (
            <section className="admin-card" aria-label={l.editingTitle}>
              <h2>{l.editingTitle}</h2>
              <form onSubmit={handleEdit} className="admin-form admin-form-grid">
                <label>
                  <span>{l.reference}</span>
                  <input value={editing.referenceCode} readOnly />
                </label>
                <label>
                  <span>{l.amount}</span>
                  <input
                    required
                    inputMode="decimal"
                    value={editing.amount}
                    onChange={(event) =>
                      setEditing({ ...editing, amount: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{l.currency}</span>
                  <select
                    value={editing.currency}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        currency: event.target.value as SupportedCurrency,
                      })
                    }
                  >
                    {currencies.map((code) => (
                      <option key={code} value={code}>
                        {CURRENCY_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </label>
                {editing.currency !== 'LKR' && (
                  <p className="note admin-span" role="status">
                    {editFx.loading
                      ? t.converting
                      : editFx.error ??
                        (editFx.quote
                          ? l.converted.replace(
                              '{amount}',
                              formatRupees(editFx.quote.amountMinor),
                            )
                          : '')}
                  </p>
                )}
                <label>
                  <span>{l.status}</span>
                  <select
                    value={editing.status}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        status: event.target.value as DonationStatus,
                      })
                    }
                  >
                    {TABS.map((tab) => (
                      <option key={tab} value={tab}>
                        {l[tab]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{l.donorName}</span>
                  <input
                    value={editing.donorName}
                    onChange={(event) =>
                      setEditing({ ...editing, donorName: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{l.bankRef}</span>
                  <input
                    value={editing.bankRef}
                    onChange={(event) =>
                      setEditing({ ...editing, bankRef: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>{l.donatedOn}</span>
                  <input
                    type="date"
                    value={editing.donatedOn}
                    onChange={(event) =>
                      setEditing({ ...editing, donatedOn: event.target.value })
                    }
                  />
                </label>
                <label className="admin-span">
                  <span>{l.slipUrl}</span>
                  <input
                    type="url"
                    value={editing.slipUrl}
                    onChange={(event) =>
                      setEditing({ ...editing, slipUrl: event.target.value })
                    }
                  />
                </label>
                <label className="admin-span">
                  <span>{l.donorMessage}</span>
                  <input
                    maxLength={500}
                    value={editing.message}
                    onChange={(event) =>
                      setEditing({ ...editing, message: event.target.value })
                    }
                  />
                </label>
                <button type="submit" className="cta admin-span-left" disabled={busy}>
                  {busy ? l.saving : l.save}
                </button>
                <button
                  type="button"
                  className="link-button admin-cancel"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  {l.cancel}
                </button>
              </form>
            </section>
          )}

          <section className="admin-card" aria-label={l.title}>
            <div className="admin-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={status === tab}
                  className={status === tab ? 'admin-tab active' : 'admin-tab'}
                  onClick={() => {
                    setStatus(tab);
                    setNotice(null);
                    setEditing(null);
                    setConfirmDelete(null);
                  }}
                >
                  {l[tab]}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="note">{l.loading}</p>
            ) : items.length === 0 ? (
              <p className="note">{l.empty}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">{l.reference}</th>
                      <th scope="col">{l.donorName}</th>
                      <th scope="col">{l.amount}</th>
                      <th scope="col">{l.bank}</th>
                      <th scope="col">{l.date}</th>
                      <th scope="col">{l.status}</th>
                      <th scope="col">{l.verifiedBy}</th>
                      <th scope="col">{l.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((donation) => (
                      <tr key={donation.id}>
                        <td data-label={l.reference}>{donation.referenceCode}</td>
                        <td data-label={l.donorName}>
                          {donation.donorName ?? '—'}
                        </td>
                        <td data-label={l.amount}>
                          {formatRupees(donation.amountMinor)}
                          {donation.currency !== 'LKR' && (
                            <span className="admin-source">
                              {formatMinorAmount(
                                donation.sourceAmountMinor ?? donation.amountMinor,
                                donation.currency,
                              )}
                            </span>
                          )}
                        </td>
                        <td data-label={l.bank}>{donation.bankRef ?? '—'}</td>
                        <td data-label={l.date}>
                          {formatDate(donation.donatedOn ?? donation.createdAt)}
                        </td>
                        <td data-label={l.status}>{l[donation.status]}</td>
                        <td data-label={l.verifiedBy}>
                          {donation.verifiedBy ?? '—'}
                        </td>
                        <td data-label={l.actions}>
                          <div className="admin-actions">
                            {donation.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleAction('verify', donation)}
                                >
                                  {l.verify}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleAction('reject', donation)}
                                >
                                  {l.reject}
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              aria-label={`${l.edit} ${donation.referenceCode}`}
                              onClick={() => startEdit(donation)}
                            >
                              {l.edit}
                            </button>
                            {confirmDelete === donation.id ? (
                              <>
                                <button
                                  type="button"
                                  className="danger confirm-danger"
                                  disabled={busy}
                                  onClick={() => void handleDelete(donation.id)}
                                >
                                  {l.confirmDelete}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  {l.cancel}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="danger"
                                disabled={busy}
                                aria-label={`${l.delete} ${donation.referenceCode}`}
                                onClick={() => setConfirmDelete(donation.id)}
                              >
                                {l.delete}
                              </button>
                            )}
                            {donation.slipUrl && (
                              <a
                                href={donation.slipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {l.slip}
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
