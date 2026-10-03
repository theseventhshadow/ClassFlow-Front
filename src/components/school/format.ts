/** Las fechas "YYYY-MM-DD" se leen como fecha local; new Date() las tomaría en UTC y restaría un día en Chile. */
export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly ? new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | null): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

/** Fecha local de hoy en formato YYYY-MM-DD (para inputs type="date" y la API). */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatScore(score?: number | null): string {
  return score == null ? '—' : score.toFixed(1);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
