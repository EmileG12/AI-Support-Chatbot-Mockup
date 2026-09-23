export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s()-]{6,19}$/;

export function validateContactDetails(input: Partial<ContactDetails>): string | null {
  const name = input.name?.trim();
  const email = input.email?.trim();
  const phone = input.phone?.trim();

  if (!name) return "name is required";
  if (!email || !EMAIL_PATTERN.test(email)) return "a valid email is required";
  if (!phone || !PHONE_PATTERN.test(phone)) return "a valid phone number is required";

  return null;
}
