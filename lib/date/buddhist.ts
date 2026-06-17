/**
 * Buddhist-era (พ.ศ.) presentation helpers. Storage is ALWAYS UTC `timestamptz`;
 * พ.ศ. and Asia/Bangkok are presentation-only. Never store BE years.
 */
export const APP_TZ = "Asia/Bangkok";

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/** e.g. "14 มิถุนายน 2569" */
export function formatThaiDate(
  input: DateInput,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  }).format(toDate(input));
}

/** e.g. "17 มิ.ย. 69" — compact form for small screens. */
export function formatThaiDateShort(input: DateInput): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(toDate(input));
}

/** e.g. "14 มิ.ย. 2569 15:10 น." */
export function formatThaiDateTime(input: DateInput): string {
  const date = formatThaiDate(input, { month: "short" });
  const time = formatThaiTime(input);
  return `${date} ${time} น.`;
}

/** 24-hour clock in Bangkok time, e.g. "15:10" */
export function formatThaiTime(input: DateInput): string {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(toDate(input));
}

/** Buddhist-era year for the given instant in Bangkok time, e.g. 2569. */
export function buddhistYear(input: DateInput): number {
  const y = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: APP_TZ,
    year: "numeric",
  }).format(toDate(input));
  return Number(y.replace(/\D/g, ""));
}
