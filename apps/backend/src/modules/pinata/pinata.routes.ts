import { Router } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { parseMultipart } from '../../http/parsers/multipart.js';
import { attachSession } from '../../security/session/attach-session.js';
import { requireAuth } from '../../security/session/require-auth.js';
import { PinataFieldSchema } from './pinata.schemas.js';
import { pinataService } from './pinata.service.js';

function parseKeyvalues(rawKeyvalues?: string) {
  if (!rawKeyvalues) return undefined;

  try {
    const parsed = JSON.parse(rawKeyvalues) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('keyvalues must be a JSON object');
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    throw new AppError(400, 'keyvalues must be a valid JSON object', 'INVALID_KEYVALUES');
  }
}

/**
 * Pinata 文件上传模块的 HTTP 入口。
 */
export const pinataRouter = Router();

pinataRouter.use(attachSession);

pinataRouter.get('/config', (_req, res) => {
  res.json({
    ok: true,
    data: pinataService.getPublicConfig(),
  });
});

pinataRouter.post('/files', requireAuth, async (req, res, next) => {
  try {
    const parsedMultipart = await parseMultipart(req, {
      maxFileSizeBytes: env.uploadMaxFileSizeBytes,
    });

    if (!parsedMultipart.file) {
      throw new AppError(400, 'No file was uploaded', 'FILE_REQUIRED');
    }

    const parsedFields = PinataFieldSchema.parse(parsedMultipart.fields);
    const keyvalues = parseKeyvalues(parsedFields.keyvalues);

    const uploadInput = {
      buffer: parsedMultipart.file.buffer,
      filename: parsedMultipart.file.filename,
      mimeType: parsedMultipart.file.mimeType,
      displayName: parsedFields.name ?? parsedMultipart.file.filename,
      uploaderUserId: req.authSession!.userId,
      ...(keyvalues ? { keyvalues } : {}),
    };

    const uploadedFile = await pinataService.uploadFile(uploadInput);

    res.status(201).json({
      ok: true,
      data: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
});
