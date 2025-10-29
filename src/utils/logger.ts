import winston from 'winston';

const { combine, timestamp, json, printf, colorize } = winston.format;

// 判断是否为开发环境
const isDevelopment = process.env.NODE_ENV !== 'production';

// 关键：这是我们为“开发环境”设计的易读格式
const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  // printf 是最关键的部分，它定义了日志的最终格式
  printf(({ level, message, timestamp, context, ...metadata }) => {
    let log = `${timestamp} [${level}]`;

    // 关键！如果 context (我们的 scope) 存在，就格式化它
    if (context) {
      log += ` [${context}]`;
    }

    log += `: ${message}`;

    // 附加任何其他元数据 (例如 logger.info('msg', { userId: 123 }))
    const extraMeta = JSON.stringify(metadata);
    if (extraMeta !== '{}') {
      log += ` ${extraMeta}`;
    }

    return log;
  }),
);

// 生产环境的格式：纯 JSON (包含 context)
const prodFormat = combine(
  timestamp(),
  json(), // JSON 格式会自动包含 'context' 和所有其他元数据
);

// 创建你的 Root Logger
const rootLogger = winston.createLogger({
  // 根据环境设置级别
  level: isDevelopment ? 'debug' : 'info',

  // 根据环境设置格式
  format: isDevelopment ? devFormat : prodFormat,

  // 定义 Transports (输出目标)
  transports: [
    // 总是输出到控制台
    new winston.transports.Console(),

    // 仅在生产环境中输出到文件
    !isDevelopment && new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    !isDevelopment && new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ].filter(Boolean), // 过滤掉开发环境中的 false 值
});


export default rootLogger;