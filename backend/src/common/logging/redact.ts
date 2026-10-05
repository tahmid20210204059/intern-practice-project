const PATTERNS: Array<[RegExp, string]> = [
  [/(bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[redacted]'],
  [/gsk_[A-Za-z0-9]+/g, '[redacted]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]'],
  [/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/gi, '$1[redacted]@'],
  [/(password|passwd|token|secret|authorization|api[_-]?key|passwordHash|refreshToken)(["'\s]*[:=]["'\s]*)[^\s,"'}]+/gi, '$1$2[redacted]'],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]'],
];

export function redactSensitive(value: string, maxLength = 500): string {
  let result = value;
  for (const [pattern, replacement] of PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result.length > maxLength ? `${result.slice(0, maxLength)}...` : result;
}