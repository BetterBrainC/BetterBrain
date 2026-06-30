/**
 * Buddhist-era (พ.ศ.) presentation helpers. Storage is ALWAYS UTC `timestamptz`;
 * พ.ศ. and Asia/Bangkok are presentation-only. Never store BE years.
 */
export const APP_TZ = "Asia/Bangkok";

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Canonical app-wide date format: "14 มิ.ย. 2569" (day · short month · พ.ศ. year).
 * Used everywhere a date is shown — keep ONE format across the whole system.
 * Pass opts to override only for special cases (e.g. weekday-only greetings).
 */
export function formatThaiDate(
  input: DateInput,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  }).format(toDate(input));
}

/** e.g. "14 มิ.ย. 2569 13.10 น." */
export function formatThaiDateTime(input: DateInput): string {
  const date = formatThaiDate(input, { month: "short" });
  return `${date} ${formatThaiTime(input)}`;
}

/**
 * Bare 24-hour clock in Bangkok time, Thai dot style, e.g. "13.10" (no "น.").
 * Use for building time ranges; for a standalone time use formatThaiTime.
 */
export function formatThaiClock(input: DateInput): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(toDate(input))
    .replace(":", ".");
}

/** Standalone Thai time, e.g. "13.10 น." (dot separator + น. suffix). */
export function formatThaiTime(input: DateInput): string {
  return `${formatThaiClock(input)} น.`;
}

/** Buddhist-era year for the given instant in Bangkok time, e.g. 2569. */
export function buddhistYear(input: DateInput): number {
  const y = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: APP_TZ,
    year: "numeric",
  }).format(toDate(input));
  return Number(y.replace(/\D/g, ""));
}
