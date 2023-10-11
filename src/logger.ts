import {createLogger, format, transports} from 'winston';
import TransportStream from 'winston-transport';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function defaultLogLevel() {
  if (isProduction()) {
    return 'info';
  }
  return 'debug';
}

function defaultTransports(): TransportStream[] {
  const trs: TransportStream[] = [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ];
  if (isProduction()) {
    trs.push(
      new transports.File({
        filename: 'info.log',
        level: 'info',
        format: format.json(),
      })
    );
  }
  return trs;
}

export const logger = createLogger({
  level: defaultLogLevel(),
  format: format.combine(format.timestamp(), format.errors({stack: true})),
  transports: [...defaultTransports()],
});
