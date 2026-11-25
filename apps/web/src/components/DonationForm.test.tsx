import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { I18nProvider } from '../providers/I18nProvider';
import type { CampaignCopy } from '../types';
import { DonationForm } from './DonationForm';

vi.mock('../lib/api', () => ({
  api: { createDonation: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const createDonation = vi.mocked(api.createDonation);

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
    createDonation.mockResolvedValue({
      id: '1',
      referenceCode: 'ZCLF-ABC23',
      amountMinor: '500000',
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
  });

  it('blocks invalid amounts before opening WhatsApp', () => {
    renderForm();
    const cta = screen.getByRole('link', { name: copy.sendSlip });

    fireEvent.click(cta);

    expect(createDonation).not.toHaveBeenCalled();
    expect(openedLinks).toHaveLength(0);
    expect(screen.getByRole('alert').textContent).toContain(
      'Enter an amount to send with your slip.',
    );
  });

  it('records a declaration and opens WhatsApp with the reference', async () => {
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
});
