export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

export const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
export const strengthColors = [
  "bg-muted",
  "bg-red-500",
  "bg-yellow-500",
  "bg-blue-500",
  "bg-[#1db954]",
];
