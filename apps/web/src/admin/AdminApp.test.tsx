import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { I18nProvider } from '../providers/I18nProvider';
import { SUPPORTED_CURRENCIES, type AdminDonation } from '../types';
import { AdminApp } from './AdminApp';
import { adminApi, getToken } from './adminApi';

vi.mock('./adminApi', () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
  adminApi: {
    login: vi.fn(),
    list: vi.fn(),
    verify: vi.fn(),
    reject: vi.fn(),
    addManual: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  api: {
    getFxCurrencies: vi.fn(),
    getFxQuote: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const getFxCurrencies = vi.mocked(api.getFxCurrencies);
const getFxQuote = vi.mocked(api.getFxQuote);
const login = vi.mocked(adminApi.login);
const list = vi.mocked(adminApi.list);
const verify = vi.mocked(adminApi.verify);
const addManual = vi.mocked(adminApi.addManual);
const update = vi.mocked(adminApi.update);
const remove = vi.mocked(adminApi.remove);
const token = vi.mocked(getToken);

const pending: AdminDonation = {
  id: 'd1',
  referenceCode: 'ZCLF-ABC23',
  donorName: 'Test Donor',
  amountMinor: '500000',
  currency: 'LKR',
  sourceAmountMinor: '500000',
  fxRate: '1',
  bankRef: 'TXN-123',
  slipUrl: 'https://example.org/slip.jpg',
  donatedOn: null,
  message: null,
  status: 'pending',
  verifiedBy: null,
  createdAt: new Date().toISOString(),
  confirmedAt: null,
};

const foreign: AdminDonation = {
  ...pending,
  id: 'd2',
  referenceCode: 'ZCLF-FX99',
  amountMinor: '250000',
  currency: 'USD',
  sourceAmountMinor: '1000',
  fxRate: '0.004',
};

function renderAdmin() {
  return render(
    <I18nProvider>
      <AdminApp />
    </I18nProvider>,
  );
}

describe('AdminApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFxCurrencies.mockResolvedValue({ currencies: [...SUPPORTED_CURRENCIES] });
    getFxQuote.mockResolvedValue({
      currency: 'USD',
      sourceAmountMinor: '1000',
      amountMinor: '250000',
      rate: '0.004',
    });
    token.mockReturnValue(null);
    login.mockResolvedValue();
    list.mockResolvedValue({ items: [pending], nextCursor: null });
    verify.mockResolvedValue({});
    addManual.mockResolvedValue({});
    update.mockResolvedValue({});
    remove.mockResolvedValue({ id: 'd1', status: 'pending' });
  });

  it('loads pending donations immediately after signing in', async () => {
    renderAdmin();

    fireEvent.change(screen.getByLabelText('Admin email'), {
      target: { value: 'admin@example.org' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'a-strong-password' },
    });
    token.mockReturnValue('fake-jwt');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(list).toHaveBeenCalledWith('pending');
      expect(screen.getByRole('button', { name: 'Verify' })).toBeTruthy();
    });
  });

  it('loads pending donations on mount when a session token exists', async () => {
    token.mockReturnValue('fake-jwt');
    renderAdmin();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Verify' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => {
      expect(verify).toHaveBeenCalledWith('d1');
    });
  });

  it('edits a record from the list, including its amount and status', async () => {
    token.mockReturnValue('fake-jwt');
    renderAdmin();
    await waitFor(() => expect(screen.getByLabelText('Edit ZCLF-ABC23')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Edit ZCLF-ABC23'));
    await waitFor(() => expect(screen.getByLabelText('Status')).toBeTruthy());

    fireEvent.change(screen.getAllByLabelText('Amount')[1], {
      target: { value: '7500' },
    });
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'confirmed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({
          amount: '7500',
          currency: 'LKR',
          status: 'confirmed',
          donorName: 'Test Donor',
          bankRef: 'TXN-123',
        }),
      );
      expect(screen.getByText('Donation updated.')).toBeTruthy();
    });
  });

  it('adds a verified transfer in a foreign currency', async () => {
    token.mockReturnValue('fake-jwt');
    renderAdmin();
    await waitFor(() => expect(screen.getByLabelText('Amount')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('Currency'), {
      target: { value: 'USD' },
    });
    fireEvent.change(screen.getByLabelText('Bank reference'), {
      target: { value: 'TXN-FX' },
    });

    await waitFor(
      () => expect(screen.getByText('About Rs. 2,500 in rupees')).toBeTruthy(),
      { timeout: 2000 },
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Add verified donation' }),
    );

    await waitFor(() => {
      expect(addManual).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '10',
          currency: 'USD',
          bankRef: 'TXN-FX',
        }),
      );
    });
  });

  it('edits a foreign-currency record using its original amount', async () => {
    token.mockReturnValue('fake-jwt');
    list.mockResolvedValue({ items: [foreign], nextCursor: null });
    renderAdmin();
    await waitFor(() =>
      expect(screen.getByLabelText('Edit ZCLF-FX99')).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText('Edit ZCLF-FX99'));
    await waitFor(
      () =>
        expect(
          (screen.getAllByLabelText('Amount')[1] as HTMLInputElement).value,
        ).toBe('10'),
    );
    await waitFor(
      () => expect(screen.getByText('About Rs. 2,500 in rupees')).toBeTruthy(),
      { timeout: 2000 },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        'd2',
        expect.objectContaining({ amount: '10', currency: 'USD' }),
      );
    });
  });

  it('deletes a record only after confirmation', async () => {
    token.mockReturnValue('fake-jwt');
    renderAdmin();
    await waitFor(() => expect(screen.getByLabelText('Delete ZCLF-ABC23')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Delete ZCLF-ABC23'));
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith('d1');
      expect(screen.getByText('Donation deleted.')).toBeTruthy();
    });
  });
});
