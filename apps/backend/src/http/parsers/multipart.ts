import type { IncomingMessage } from 'node:http';
import { Busboy, type BusboyFileStream } from '@fastify/busboy';
import { AppError } from '../../core/errors/app-error.js';

export type ParsedMultipartFile = {
  fieldName: string;
  filename: string;
  mimeType: string;
  encoding: string;
  size: number;
  buffer: Buffer;
};

export type ParsedMultipartPayload = {
  fields: Record<string, string>;
  file: ParsedMultipartFile | null;
};

type ParseMultipartOptions = {
  maxFileSizeBytes: number;
  maxFields?: number;
};

/**
 * 解析单文件 multipart/form-data 请求。
 * 当前后端上传能力比较聚焦，因此显式限制为 1 个文件，避免协议能力失控。
 */
export async function parseMultipart(
  request: IncomingMessage,
  options: ParseMultipartOptions,
): Promise<ParsedMultipartPayload> {
  const contentType = request.headers['content-type'];
  if (!contentType?.includes('multipart/form-data')) {
    throw new AppError(400, 'Expected multipart/form-data request', 'INVALID_MULTIPART_REQUEST');
  }

  return await new Promise<ParsedMultipartPayload>((resolve, reject) => {
    const fields: Record<string, string> = {};
    let parsedFile: ParsedMultipartFile | null = null;
    let rejected = false;

    const fail = (error: AppError) => {
      if (rejected) return;
      rejected = true;
      reject(error);
    };

    const busboy = new Busboy({
      headers: {
        ...request.headers,
        'content-type': contentType,
      },
      limits: {
        files: 1,
        fields: options.maxFields ?? 20,
        fileSize: options.maxFileSizeBytes,
      },
    });

    busboy.on('file', (fieldName: string, stream: BusboyFileStream, filename: string, encoding: string, mimeType: string) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let limitReached = false;

      stream.on('limit', () => {
        limitReached = true;
      });

      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (!limitReached) {
          chunks.push(Buffer.from(chunk));
        }
      });

      stream.on('end', () => {
        if (limitReached) {
          fail(new AppError(413, 'Uploaded file exceeds server limit', 'FILE_TOO_LARGE'));
          return;
        }

        parsedFile = {
          fieldName,
          filename,
          mimeType,
          encoding,
          size,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on('field', (fieldName: string, value: string) => {
      fields[fieldName] = value;
    });

    busboy.on('filesLimit', () => {
      fail(new AppError(400, 'Only a single file upload is supported', 'TOO_MANY_FILES'));
    });

    busboy.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Multipart parser error';
      fail(new AppError(400, message, 'MULTIPART_PARSE_FAILED'));
    });

    busboy.on('finish', () => {
      if (rejected) return;
      resolve({
        fields,
        file: parsedFile,
      });
    });

    request.pipe(busboy);
  });
}
