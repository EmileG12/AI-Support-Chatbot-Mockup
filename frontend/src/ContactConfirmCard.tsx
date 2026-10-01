import type { ChatMode, ContactDetails } from "./types";

interface ContactConfirmCardProps {
  contact: ContactDetails;
  mode: ChatMode;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}

export function ContactConfirmCard({ contact, mode, onConfirm, onEdit, isSubmitting }: ContactConfirmCardProps) {
  return (
    <div className="contact-confirm-card">
      <dl>
        <dt>Name</dt>
        <dd>{contact.name}</dd>
        <dt>Email</dt>
        <dd>{contact.email}</dd>
        <dt>Phone</dt>
        <dd>{contact.phone}</dd>
        <dt>Address</dt>
        <dd>{contact.address}</dd>
        <dt>Postcode</dt>
        <dd>{contact.postcode}</dd>
        <dt>{mode === "sales" ? "Already have an account" : "Account holder"}</dt>
        <dd>{contact.isAccountHolder ? "Yes" : "No"}</dd>
      </dl>
      <div className="contact-confirm-actions">
        <button type="button" onClick={onConfirm} disabled={isSubmitting}>
          Yes, that's correct
        </button>
        <button type="button" className="secondary" onClick={onEdit} disabled={isSubmitting}>
          Edit details
        </button>
      </div>
    </div>
  );
}
