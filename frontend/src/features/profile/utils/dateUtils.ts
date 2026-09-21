const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(value: string): string {
  if (!value) return 'Present';
  const [year, month] = value.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTHS[idx] ?? ''} ${year}`;
}
