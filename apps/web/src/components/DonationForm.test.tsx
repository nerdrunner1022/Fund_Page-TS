import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { I18nProvider } from '../providers/I18nProvider';
import {
  SUPPORTED_CURRENCIES,
  type CampaignCopy,
} from '../types';
import { DonationForm } from './DonationForm';

vi.mock('../lib/api', () => ({
  api: {
    createDonation: vi.fn(),
    getFxCurrencies: vi.fn(),
    getFxQuote: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const createDonation = vi.mocked(api.createDonation);
const getFxCurrencies = vi.mocked(api.getFxCurrencies);
const getFxQuote = vi.mocked(api.getFxQuote);

const copy = {
  chooseAmount: 'Choose any amount',
  name: 'Your name',
  amountPlaceholder: 'Amount in Rs.',
  sendSlip: 'Send slip on WhatsApp',
  whatsappNote: 'This page does not collect money.',
  message: 'I have donated {a}. Name: {n}. Slip attached.',
} as CampaignCopy;

function renderForm() {
  return render(
    <I18nProvider>
      <DonationForm
        copy={copy}
        slug="zahira-college-land-fund"
        whatsappNumber="94772976911"
      />
    </I18nProvider>,
  );
}

describe('DonationForm', () => {
  let openedLinks: string[];

  beforeEach(() => {
    openedLinks = [];
    createDonation.mockReset();
    getFxCurrencies.mockReset();
    getFxQuote.mockReset();
    getFxCurrencies.mockResolvedValue({ currencies: [...SUPPORTED_CURRENCIES] });
    getFxQuote.mockResolvedValue({
      currency: 'USD',
      sourceAmountMinor: '1000',
      amountMinor: '250000',
      rate: '0.004',
    });
    createDonation.mockResolvedValue({
      id: '1',
      referenceCode: 'ZCLF-ABC23',
      amountMinor: '500000',
      currency: 'LKR',
      sourceAmountMinor: '500000',
      fxRate: '1',
      donorName: null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => callback());
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        openedLinks.push(this.href);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('blocks invalid amounts before opening WhatsApp', async () => {
    renderForm();
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'LKR (Rs.)' })).toBeTruthy(),
    );
    const cta = screen.getByRole('link', { name: copy.sendSlip });

    fireEvent.click(cta);

    expect(createDonation).not.toHaveBeenCalled();
    expect(openedLinks).toHaveLength(0);
    expect(screen.getByRole('alert').textContent).toContain(
      'Enter an amount to send with your slip.',
    );
  });

  it('records a rupee declaration and opens WhatsApp with the reference', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(copy.chooseAmount, { selector: 'input' }), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByLabelText(copy.name), {
      target: { value: 'Test Donor' },
    });
    fireEvent.click(screen.getByRole('link', { name: copy.sendSlip }));

    await waitFor(() => {
      expect(createDonation).toHaveBeenCalledWith('zahira-college-land-fund', {
        amount: '5000',
        currency: 'LKR',
        donorName: 'Test Donor',
      });
    });

    await waitFor(() => {
      expect(openedLinks).toHaveLength(1);
      const url = decodeURIComponent(openedLinks[0]);
      expect(url).toContain('https://wa.me/94772976911');
      expect(url).toContain('Rs. 5,000');
      expect(url).toContain('Ref: ZCLF-ABC23');
    });
  });

  it('previews a live conversion and records the foreign declaration', async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText('Donation currency'), {
      target: { value: 'USD' },
    });
    fireEvent.change(screen.getByLabelText(copy.chooseAmount, { selector: 'input' }), {
      target: { value: '10' },
    });

    await waitFor(
      () => {
        expect(getFxQuote).toHaveBeenCalledWith(
          'USD',
          '10',
          expect.any(AbortSignal),
        );
        expect(screen.getByText(/About Rs\. 2,500/)).toBeTruthy();
      },
      { timeout: 2000 },
    );

    fireEvent.click(screen.getByRole('link', { name: copy.sendSlip }));

    await waitFor(() => {
      expect(createDonation).toHaveBeenCalledWith('zahira-college-land-fund', {
        amount: '10',
        currency: 'USD',
      });
    });
    await waitFor(() => {
      const url = decodeURIComponent(openedLinks[0]);
      expect(url).toContain('USD 10.00 (≈ Rs. 2,500)');
      expect(url).toContain('Ref: ZCLF-ABC23');
    });
  });
});
