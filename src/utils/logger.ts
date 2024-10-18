enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

let currentLogLevel: LogLevel = LogLevel.INFO;

function setLogLevel(level: LogLevel): void {
  if (Object.values(LogLevel).includes(level)) {
    currentLogLevel = level;
  } else {
    console.error('无效的日志级别');
  }
}

function log(level: LogLevel, message: string): void {
  if (level >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    console.log(`[${timestamp}] [${levelName}] ${message}`);
  }
}

function debug(message: string): void {
  log(LogLevel.DEBUG, message);
}

function info(message: string): void {
  log(LogLevel.INFO, message);
}

function warn(message: string): void {
  log(LogLevel.WARN, message);
}

function error(message: string): void {
  log(LogLevel.ERROR, message);
}

export {
  LogLevel,
  setLogLevel,
  debug,
  info,
  warn,
  error
};

setLogLevel(LogLevel.DEBUG);
