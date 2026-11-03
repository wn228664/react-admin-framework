const isDev = process.env.NODE_ENV === 'development';
export default {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
