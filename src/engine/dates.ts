import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

export function toDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return parseISO(iso + "T00:00:00");
  return parseISO(iso);
}

export function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function todayYmd(now = new Date()): string {
  return ymd(now);
}

export function addTermMonths(startIso: string, months: number): string {
  return ymd(addMonths(toDate(startIso), months));
}

export function remainingDays(fromIso: string, toIso: string): number {
  return differenceInCalendarDays(toDate(toIso), toDate(fromIso));
}

export function actualDays(fromIso: string, toIso: string): number {
  return Math.max(0, differenceInCalendarDays(toDate(toIso), toDate(fromIso)));
}

export function formatViDate(iso: string): string {
  try {
    return format(toDate(iso), "dd/MM/yyyy");
  } catch {
    return iso;
  }
}
