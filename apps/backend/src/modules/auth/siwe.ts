import { getAddress, verifyMessage } from 'ethers';
import { z } from 'zod';
import { AppError } from '../../core/errors/app-error.js';

/**
 * 按 SIWE 协议约束服务端真正依赖的字段。
 * 这里不追求完整镜像规范，只覆盖当前登录流程需要验证的内容。
 */
const ParsedSiweSchema = z.object({
  domain: z.string().min(1),
  address: z.string().min(1),
  statement: z.string().optional(),
  uri: z.string().url(),
  version: z.literal('1'),
  chainId: z.number().int().positive(),
  nonce: z.string().min(8),
  issuedAt: z.string().datetime(),
  expirationTime: z.string().datetime().optional(),
  notBefore: z.string().datetime().optional(),
  requestId: z.string().optional(),
  resources: z.array(z.string()).default([]),
});

export type ParsedSiweMessage = z.infer<typeof ParsedSiweSchema>;

const FIELD_MAP: Record<string, keyof Omit<ParsedSiweMessage, 'resources' | 'statement'>> = {
  URI: 'uri',
  Version: 'version',
  'Chain ID': 'chainId',
  Nonce: 'nonce',
  'Issued At': 'issuedAt',
  'Expiration Time': 'expirationTime',
  'Not Before': 'notBefore',
  'Request ID': 'requestId',
};

/**
 * 解析 EIP-4361 文本消息。
 * 由于客户端最终签名的是字符串，因此服务端需要显式按协议格式拆解。
 */
export function parseSiweMessage(message: string): ParsedSiweMessage {
  const normalized = message.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const firstLineSuffix = ' wants you to sign in with your Ethereum account:';

  if (lines.length < 6 || !lines[0]?.endsWith(firstLineSuffix)) {
    throw new AppError(400, 'Invalid SIWE message header', 'INVALID_SIWE_MESSAGE');
  }

  const domain = lines[0].slice(0, -firstLineSuffix.length).trim();
  const address = lines[1]?.trim();
  if (!address) {
    throw new AppError(400, 'SIWE message missing address', 'INVALID_SIWE_MESSAGE');
  }

  const fieldStartIndex = lines.findIndex((line, index) => index >= 2 && /^[A-Za-z][A-Za-z ]*: /.test(line));
  if (fieldStartIndex === -1) {
    throw new AppError(400, 'SIWE message missing body fields', 'INVALID_SIWE_MESSAGE');
  }

  const statementLines = lines.slice(2, fieldStartIndex);
  while (statementLines[0] === '') {
    statementLines.shift();
  }
  while (statementLines[statementLines.length - 1] === '') {
    statementLines.pop();
  }

  const rawFields: Record<string, unknown> = {
    domain,
    address,
  };

  for (let index = fieldStartIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;

    if (line === 'Resources:') {
      const resources: string[] = [];
      for (let resourceIndex = index + 1; resourceIndex < lines.length; resourceIndex += 1) {
        const resourceLine = lines[resourceIndex];
        if (!resourceLine?.startsWith('- ')) {
          index = resourceIndex - 1;
          break;
        }
        resources.push(resourceLine.slice(2).trim());
        index = resourceIndex;
      }
      rawFields.resources = resources;
      continue;
    }

    const fieldMatch = /^([A-Za-z][A-Za-z ]*): (.+)$/.exec(line);
    if (!fieldMatch) continue;

    const rawFieldName = fieldMatch[1];
    const rawValue = fieldMatch[2];
    if (!rawFieldName || !rawValue) continue;

    const mappedName = FIELD_MAP[rawFieldName];
    if (!mappedName) continue;
    rawFields[mappedName] = mappedName === 'chainId' ? Number(rawValue) : rawValue.trim();
  }

  if (statementLines.length > 0) {
    rawFields.statement = statementLines.join('\n');
  }

  try {
    rawFields.address = getAddress(address);
  } catch {
    throw new AppError(400, 'SIWE message address is invalid', 'INVALID_SIWE_ADDRESS');
  }

  const parsed = ParsedSiweSchema.safeParse(rawFields);
  if (!parsed.success) {
    throw new AppError(400, 'SIWE message schema validation failed', 'INVALID_SIWE_MESSAGE', parsed.error.flatten());
  }

  return parsed.data;
}

/**
 * 校验钱包签名是否真的对应消息中的地址。
 */
export function verifySiweSignature(message: string, signature: string) {
  try {
    return getAddress(verifyMessage(message, signature));
  } catch {
    throw new AppError(401, 'Signature verification failed', 'INVALID_SIGNATURE');
  }
}

/**
 * 生成标准化 SIWE 消息，主要供测试或服务端辅助场景使用。
 */
export function buildSiweMessage(input: {
  domain: string;
  address: string;
  uri: string;
  statement: string;
  version: '1';
  chainId: number;
  nonce: string;
  issuedAt: string;
}) {
  return [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    input.address,
    '',
    input.statement,
    '',
    `URI: ${input.uri}`,
    `Version: ${input.version}`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
  ].join('\n');
}
