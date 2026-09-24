import { describe, it, expect } from "vitest";
import { validateContactDetails } from "./contactValidation.js";

const VALID = {
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "+44 7700 900000",
  address: "1 High Street",
  postcode: "SW1A 1AA",
  isAccountHolder: true,
};

describe("validateContactDetails", () => {
  it("returns null for valid details", () => {
    expect(validateContactDetails(VALID)).toBeNull();
  });

  it("rejects a missing or blank name", () => {
    expect(validateContactDetails({ ...VALID, name: "" })).toMatch(/name/);
    expect(validateContactDetails({ ...VALID, name: "   " })).toMatch(/name/);
    expect(validateContactDetails({ ...VALID, name: undefined })).toMatch(/name/);
  });

  it("rejects a malformed email", () => {
    expect(validateContactDetails({ ...VALID, email: "not-an-email" })).toMatch(/email/);
    expect(validateContactDetails({ ...VALID, email: "" })).toMatch(/email/);
  });

  it("rejects a malformed phone number", () => {
    expect(validateContactDetails({ ...VALID, phone: "abc" })).toMatch(/phone/);
    expect(validateContactDetails({ ...VALID, phone: "123" })).toMatch(/phone/);
  });

  it("accepts a UK landline-style and mobile-style number", () => {
    expect(validateContactDetails({ ...VALID, phone: "01223 123456" })).toBeNull();
    expect(validateContactDetails({ ...VALID, phone: "+447700900000" })).toBeNull();
  });

  it("rejects a missing or blank address", () => {
    expect(validateContactDetails({ ...VALID, address: "" })).toMatch(/address/);
    expect(validateContactDetails({ ...VALID, address: "   " })).toMatch(/address/);
  });

  it("rejects a malformed postcode", () => {
    expect(validateContactDetails({ ...VALID, postcode: "not a postcode" })).toMatch(/postcode/);
    expect(validateContactDetails({ ...VALID, postcode: "" })).toMatch(/postcode/);
  });

  it("accepts common UK postcode formats", () => {
    expect(validateContactDetails({ ...VALID, postcode: "SW1A 1AA" })).toBeNull();
    expect(validateContactDetails({ ...VALID, postcode: "M11AE" })).toBeNull();
  });

  it("rejects a non-boolean isAccountHolder", () => {
    expect(validateContactDetails({ ...VALID, isAccountHolder: undefined })).toMatch(/account holder/);
  });

  it("accepts isAccountHolder: false", () => {
    expect(validateContactDetails({ ...VALID, isAccountHolder: false })).toBeNull();
  });
});
