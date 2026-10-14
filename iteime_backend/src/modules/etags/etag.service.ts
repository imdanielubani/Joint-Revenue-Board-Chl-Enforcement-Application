import type { ChlAdapter } from '../../integrations/chl/adapter.js';
import { AppError } from '../../shared/errors.js';

/** E-Tag receipts, from CHL. */
export class ETagService {
  constructor(private readonly chl: ChlAdapter) {}

  /** The receipt for a scanned E-Tag reference; 404 when CHL has none. */
  async receipt(reference: string) {
    const receipt = await this.chl.getETagReceipt(reference);
    if (!receipt) throw new AppError(404, 'E_TAG_NOT_FOUND', 'No E-Tag was found for this code.');
    return {
      eTagReference: receipt.eTagReference,
      plate: receipt.plate,
      status: receipt.status,
      issuedAt: receipt.issuedAt?.toISOString() ?? null,
      installedAt: receipt.installedAt?.toISOString() ?? null,
      details: receipt.details,
    };
  }
}
