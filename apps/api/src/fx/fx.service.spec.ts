import { FxService, convertToLkrMinor } from './fx.service';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as unknown as Response;
}

const rates = {
  LKR: 1,
  USD: 0.004,
  EUR: 0.002,
  GBP: 0.003,
  AED: 0.011,
  SAR: 0.01,
  QAR: 0.01,
  CAD: 0.005,
  AUD: 0.006,
  INR: 0.35,
  MYR: 0.018,
  SGD: 0.005,
};

const rateBody = { result: 'success', base_code: 'LKR', rates };

describe('FxService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('converts a foreign amount to exact LKR minor units', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(rateBody));
    const service = new FxService();

    const quote = await service.quote('10', 'USD');

    expect(quote).toEqual({
      currency: 'USD',
      sourceAmountMinor: '1000',
      amountMinor: '250000',
      rate: '0.004',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches rates for later quotes', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse(rateBody));
    const service = new FxService();

    await service.quote('10', 'USD');
    const second = await service.quote('20', 'EUR');

    expect(second.amountMinor).toBe('1000000');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch a rate for LKR', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const service = new FxService();

    const quote = await service.quote('2500.50', 'LKR');

    expect(quote).toEqual({
      currency: 'LKR',
      sourceAmountMinor: '250050',
      amountMinor: '250050',
      rate: '1',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported currencies and out-of-range conversions', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(rateBody));
    const service = new FxService();

    await expect(service.quote('10', 'JPY')).rejects.toThrow(
      'Unsupported currency.',
    );
    await expect(service.quote('50000', 'USD')).rejects.toThrow(
      'after conversion',
    );
  });

  it('rejects a malformed provider response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(jsonResponse({ result: 'success', rates: {} }));
    const service = new FxService();

    await expect(service.quote('10', 'USD')).rejects.toThrow(
      'Currency rates could not be read.',
    );
  });

  it('rounds minor units without floating-point drift', () => {
    expect(convertToLkrMinor(1000n, '0.004')).toBe(250000n);
  });
});
