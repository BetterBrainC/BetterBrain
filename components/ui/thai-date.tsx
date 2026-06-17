import { formatThaiDate, formatThaiDateShort, formatThaiTime } from "@/lib/date/buddhist";

type DateValue = Date | string | number;

/**
 * Buddhist-era date, responsive: "17 มิถุนายน 2569" on ≥sm, "17 มิ.ย. 69" on
 * small screens. Pure (no hooks) so it works in both server and client trees.
 * Use this everywhere a date is shown to the user.
 */
export function ThaiDate({ value, className }: { value: DateValue; className?: string }) {
  return (
    <span className={className}>
      <span className="hidden sm:inline">{formatThaiDate(value)}</span>
      <span className="sm:hidden">{formatThaiDateShort(value)}</span>
    </span>
  );
}

/** Date + time shown as separate parts (date responsive, 24h Bangkok time). */
export function ThaiDateTime({ value, className }: { value: DateValue; className?: string }) {
  return (
    <span className={className}>
      <ThaiDate value={value} /> <span className="tabular-nums">{formatThaiTime(value)} น.</span>
    </span>
  );
}
