/**
 * Truncate an id to x chars.
 * @param fullId
 * @param length
 * @returns {string}
 */
function short(fullId, length) {
  if (!fullId) {
    return "";
  }
  return fullId.substring(0, length);
}

/**
 * Formate a dateTime for display.
 * @param dateStr
 * @returns {string}
 */
function dateTime(dateStr) {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return new Intl.DateTimeFormat([], options).format(date);
}

/**
 * Formate a date for display.
 * @param dateStr
 * @returns {string}
 */
function date(dateStr) {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  };
  return new Intl.DateTimeFormat([], options).format(date);
}

/**
 * Register all global properties (replacing filters).
 */
function registerGlobalProperties(app) {
  app.config.globalProperties.$filters = {
    short,
    dateTime,
    date,
  };
}

export { registerGlobalProperties, short, dateTime, date };
