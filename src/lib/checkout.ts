// Shared by the one-page checkout: contact validation and demo reference.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `MYK-${Array.from(bytes, (b) => REF_CHARS[b % REF_CHARS.length]).join("")}`;
}

export function contactErrors(name: string, email: string): { name: string | null; email: string | null } {
  return {
    name: name.trim() ? null : "Enter your name.",
    email: EMAIL_RE.test(email.trim()) ? null : "Enter a valid email address.",
  };
}
