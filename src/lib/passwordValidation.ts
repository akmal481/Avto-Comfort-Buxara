// Common weak passwords blocklist (subset)
const WEAK = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890",
  "qwerty", "qwerty123", "password", "password1", "password123",
  "111111", "000000", "abc123", "abcdef", "iloveyou", "admin",
  "admin123", "welcome", "letmein", "monkey", "dragon", "sunshine",
  "princess", "azerty", "0000", "1111", "555555", "666666", "777777",
  "888888", "999999", "121212", "987654321",
]);

export type PwStrength = "weak" | "medium" | "strong";

export function validatePassword(pw: string): { ok: boolean; error?: string } {
  if (!pw || pw.length < 6) return { ok: false, error: "Parol kamida 6 ta belgidan iborat bo'lsin" };
  if (pw.length > 72) return { ok: false, error: "Parol juda uzun (max 72)" };
  if (WEAK.has(pw.toLowerCase())) return { ok: false, error: "Parol juda oddiy" };
  const hasLetter = /[a-zA-Zа-яА-ЯЎўҚқҒғҲҳ]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  if (!hasLetter || !hasDigit) return { ok: false, error: "Parol harf va raqam bo'lsin" };
  // Repeating chars check (e.g. aaaaaa, 111111)
  if (/^(.)\1+$/.test(pw)) return { ok: false, error: "Parol juda oddiy" };
  return { ok: true };
}

export function passwordStrength(pw: string): PwStrength {
  if (!pw) return "weak";
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (WEAK.has(pw.toLowerCase())) return "weak";
  if (score <= 2) return "weak";
  if (score === 3) return "medium";
  return "strong";
}
