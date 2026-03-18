export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayString(): string {
  return formatDateLocal(new Date());
}

export function normalizeDateString(raw: string | Date | null | undefined): string {
  if (!raw) return todayString();
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return todayString();
  return formatDateLocal(d);
}

export function toDateObject(raw: string | Date | null | undefined): Date {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}
