import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { pinataRepository } from './pinata.repository.js';

type UploadInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  displayName: string;
  keyvalues?: Record<string, string>;
  uploaderUserId: string;
};

type PinataUploadResponse = {
  cid: string;
  id?: string;
  name?: string;
  size?: number;
  mime_type?: string;
  mimeType?: string;
  created_at?: string;
  createdAt?: string;
};

export class PinataService {
  getPublicConfig() {
    return {
      apiMode: 'server-controlled',
      gatewayBaseUrl: env.pinataGatewayBaseUrl,
      network: env.pinataNetwork,
      groupIdConfigured: !!env.pinataGroupId,
      maxFileSizeBytes: env.uploadMaxFileSizeBytes,
    };
  }

  async uploadFile(input: UploadInput) {
    const fileBytes = Uint8Array.from(input.buffer);
    const formData = new FormData();
    formData.append('network', env.pinataNetwork);
    formData.append('name', input.displayName);
    formData.append(
      'file',
      new Blob([fileBytes], { type: input.mimeType || 'application/octet-stream' }),
      input.filename,
    );

    if (input.keyvalues && Object.keys(input.keyvalues).length > 0) {
      formData.append('keyvalues', JSON.stringify(input.keyvalues));
    }

    if (env.pinataGroupId) {
      formData.append('group_id', env.pinataGroupId);
    }

    const response = await fetch(env.pinataApiBaseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.pinataJwt}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => null) as { data?: PinataUploadResponse; error?: unknown } | null;
    if (!response.ok) {
      throw new AppError(
        502,
        'Pinata upload failed',
        'PINATA_UPLOAD_FAILED',
        payload?.error ?? payload,
      );
    }

    const result = payload?.data ?? payload;
    const typedResult = result as PinataUploadResponse | null;
    const cid = typedResult?.cid;
    if (!cid) {
      throw new AppError(502, 'Pinata response missing cid', 'PINATA_RESPONSE_INVALID', payload);
    }

    const uploadedFile = {
      cid,
      id: typedResult?.id ?? null,
      name: typedResult?.name ?? input.displayName,
      size: typedResult?.size ?? input.buffer.byteLength,
      mimeType: typedResult?.mimeType ?? typedResult?.mime_type ?? input.mimeType,
      createdAt: typedResult?.createdAt ?? typedResult?.created_at ?? new Date().toISOString(),
      gatewayUrl: `${env.pinataGatewayBaseUrl.replace(/\/$/, '')}/${cid}`,
    };

    await pinataRepository.recordStorageObject({
      uploaderUserId: input.uploaderUserId,
      cid: uploadedFile.cid,
      pinataId: uploadedFile.id,
      name: uploadedFile.name,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimeType,
      gatewayUrl: uploadedFile.gatewayUrl,
      network: env.pinataNetwork,
      ...(env.pinataGroupId ? { groupId: env.pinataGroupId } : {}),
    });

    return uploadedFile;
  }
}

export const pinataService = new PinataService();
