import { useState, type FormEvent } from "react";
import type { ContactDetails } from "./types";

interface ContactFormProps {
  initial: ContactDetails;
  onSubmit: (details: ContactDetails) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function ContactForm({ initial, onSubmit, onCancel, isSubmitting, error }: ContactFormProps) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [isAccountHolder, setIsAccountHolder] = useState(initial.isAccountHolder);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      postcode: postcode.trim(),
      isAccountHolder,
    });
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} required />
      </label>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </label>
      <label>
        Phone
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </label>
      <label>
        Address
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </label>
      <label>
        Postcode
        <input
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={isAccountHolder}
          onChange={(e) => setIsAccountHolder(e.target.checked)}
          disabled={isSubmitting}
        />
        I am the account holder
      </label>

      {error && <div className="error-banner">{error}</div>}

      <div className="contact-form-actions">
        <button type="submit" disabled={isSubmitting}>
          Save details
        </button>
        <button type="button" className="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
