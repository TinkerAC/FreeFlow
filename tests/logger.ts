//the Test Logger


import winston, { Logger } from 'winston';


export const testLogger: Logger = winston.createLogger(
  {
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
    ),
    transports: [
      new winston.transports.Console(),
    ],
  },
);