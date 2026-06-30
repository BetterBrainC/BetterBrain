import { formatThaiDate, formatThaiTime } from "@/lib/date/buddhist";

type DateValue = Date | string | number;

/**
 * Buddhist-era date in the canonical app format: "17 มิ.ย. 2569". Pure (no hooks)
 * so it works in both server and client trees. Use this everywhere a date is
 * shown to the user, so the whole system reads one consistent format.
 */
export function ThaiDate({ value, className }: { value: DateValue; className?: string }) {
  return <span className={className}>{formatThaiDate(value)}</span>;
}

/** Date + time shown as separate parts (date responsive, 24h Bangkok time). */
export function ThaiDateTime({ value, className }: { value: DateValue; className?: string }) {
  return (
    <span className={className}>
      <ThaiDate value={value} /> <span className="tabular-nums">{formatThaiTime(value)}</span>
    </span>
  );
}
