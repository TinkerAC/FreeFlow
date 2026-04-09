import { Router } from 'express';
import { AppError } from '../../lib/app-error.js';
import { parseMultipart } from '../../lib/multipart.js';
import { env } from '../../config/env.js';
import { PinataFieldSchema } from './pinata.schemas.js';
import { pinataService } from './pinata.service.js';
import { attachSession } from '../auth/session.middleware.js';
import { requireAuth } from '../auth/require-auth.js';

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
    const keyvalues = parsedFields.keyvalues
      ? JSON.parse(parsedFields.keyvalues) as Record<string, string>
      : undefined;

    const uploadInput = {
      buffer: parsedMultipart.file.buffer,
      filename: parsedMultipart.file.filename,
      mimeType: parsedMultipart.file.mimeType,
      displayName: parsedFields.name ?? parsedMultipart.file.filename,
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
