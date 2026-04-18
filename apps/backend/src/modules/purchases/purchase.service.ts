import { AppError } from '../../core/errors/app-error.js';
import { mapPurchaseRecord } from './purchase.mapper.js';
import { purchaseRepository } from './purchase.repository.js';
import type { UpsertPurchaseInput } from './purchase.schemas.js';

export class PurchaseService {
  async upsertPurchase(buyerUserId: string, input: UpsertPurchaseInput) {
    const release = await purchaseRepository.findReleaseById(input.releaseId);
    if (!release) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }

    const purchase = await purchaseRepository.upsertForBuyer(buyerUserId, input);
    return mapPurchaseRecord(purchase);
  }
}

export const purchaseService = new PurchaseService();
