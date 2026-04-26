const BRAZILIAN_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const INPUT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseBrazilianDateIfNeeded(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.trim();
  if (!raw) return "";
  if (INPUT_DATE_REGEX.test(raw)) return raw;

  const match = raw.match(BRAZILIAN_DATE_REGEX);
  if (!match) return raw;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function formatDateForInput(value: string | Date | null | undefined): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }

  const normalized = parseBrazilianDateIfNeeded(value);
  if (INPUT_DATE_REGEX.test(normalized)) return normalized;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function formatDateForDisplay(value: string | Date | null | undefined): string {
  const input = formatDateForInput(value);
  if (!input) return "";
  const [year, month, day] = input.split("-");
  return `${day}/${month}/${year}`;
}

export function normalizeDateBeforeSubmit(value: string | null | undefined): string | undefined {
  const input = formatDateForInput(value);
  return input || undefined;
}
