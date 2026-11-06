/** Mirrors the API password policy (8+ chars, upper, lower, digit). Returns a message or null if OK. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "At least 8 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Include an uppercase letter, a lowercase letter, and a digit.";
  return null;
}
