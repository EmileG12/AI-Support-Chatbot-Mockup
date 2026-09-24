export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  isAccountHolder: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s()-]{6,19}$/;
const POSTCODE_PATTERN = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/;

export function validateContactDetails(input: Partial<ContactDetails>): string | null {
  const name = input.name?.trim();
  const email = input.email?.trim();
  const phone = input.phone?.trim();
  const address = input.address?.trim();
  const postcode = input.postcode?.trim();

  if (!name) return "name is required";
  if (!email || !EMAIL_PATTERN.test(email)) return "a valid email is required";
  if (!phone || !PHONE_PATTERN.test(phone)) return "a valid phone number is required";
  if (!address) return "address is required";
  if (!postcode || !POSTCODE_PATTERN.test(postcode)) return "a valid postcode is required";
  if (typeof input.isAccountHolder !== "boolean") return "whether the customer is the account holder is required";

  return null;
}
