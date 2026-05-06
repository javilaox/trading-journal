/** Formato visible DD-MM-YYYY (no altera valores ISO guardados). */

export function formatDateEs(dateValue) {
  if (!dateValue) return '—';

  const raw = String(dateValue).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-');
    return `${day}-${month}-${year}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw.replaceAll('/', '-');
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return raw;

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();

  return `${day}-${month}-${year}`;
}

export function formatDateRangeEs(startDate, endDate) {
  return `${formatDateEs(startDate)} → ${formatDateEs(endDate)}`;
}
