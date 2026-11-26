import { Controller, Get, Header, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  currencyAmountSchema,
  donationCurrencySchema,
} from '../common/donation-input';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FxService } from './fx.service';
import { FxQuote, SUPPORTED_CURRENCIES } from './fx.types';

const quoteQuerySchema = z
  .object({
    amount: currencyAmountSchema,
    currency: donationCurrencySchema,
  })
  .strict();

type QuoteQuery = z.infer<typeof quoteQuerySchema>;

@Controller('fx')
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('currencies')
  @Header('Cache-Control', 'public, max-age=3600')
  currencies() {
    return { currencies: [...SUPPORTED_CURRENCIES] };
  }

  /** A rate preview only; donations are converted again by the server. */
  @Get('quote')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Header('Cache-Control', 'no-store')
  quote(
    @Query(new ZodValidationPipe(quoteQuerySchema)) query: QuoteQuery,
  ): Promise<FxQuote> {
    return this.fx.quote(query.amount, query.currency);
  }
}
