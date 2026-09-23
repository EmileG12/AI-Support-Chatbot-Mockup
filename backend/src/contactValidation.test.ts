import { describe, it, expect } from "vitest";
import { validateContactDetails } from "./contactValidation.js";

const VALID = { name: "Jane Doe", email: "jane@example.com", phone: "+44 7700 900000" };

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
});
