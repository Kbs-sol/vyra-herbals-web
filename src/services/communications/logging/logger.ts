/**
 * Lightweight structured console logger.
 * Replace the console.* calls here with your existing app-wide logger
 * (e.g. pino/winston) if one already exists in the repo — this exists so
 * the module has zero new dependencies out of the box.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel(): LogLevel {
  const configured = (process.env.WHATSAPP_LOG_LEVEL as LogLevel) ?? 'info';
  return LEVEL_ORDER[configured] !== undefined ? configured : 'info';
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.WHATSAPP_LOG_TO_CONSOLE === 'false') return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];
}

function emit(level: LogLevel, action: string, data: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'communications',
    action,
    ...data,
  };
  const line = JSON.stringify(entry);
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

export const logger = {
  debug: (action: string, data: Record<string, unknown> = {}) => emit('debug', action, data),
  info: (action: string, data: Record<string, unknown> = {}) => emit('info', action, data),
  warn: (action: string, data: Record<string, unknown> = {}) => emit('warn', action, data),
  error: (action: string, data: Record<string, unknown> = {}) => emit('error', action, data),
};
