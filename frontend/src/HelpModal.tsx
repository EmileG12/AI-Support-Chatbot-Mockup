import { useState } from "react";
import "./HelpModal.css";

/** A single "how this demo works" reference, shown from a small "?" button in
 * every page's header. Content is one shared write-up rather than per-page
 * snippets, since a reviewer clicking between pages benefits from seeing the
 * whole flow (customer chat -> handoff -> staff views) in one place. */
export function HelpModal() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button className="help-trigger" onClick={() => setIsOpen(true)} aria-label="How to use this demo">
        ? How to use this demo
      </button>
    );
  }

  return (
    <div className="help-overlay" onClick={() => setIsOpen(false)}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>How to use this demo</h2>
          <button className="help-close" onClick={() => setIsOpen(false)} aria-label="Close">
            ×
          </button>
        </div>

        <div className="help-modal-body">
          <p>
            This is a mockup ISP support chatbot ("Fenmoor Telecom"): customers chat in on the
            homepage, an AI classifies what they need and logs a ticket or sales lead, and staff
            work that queue from dedicated dashboards. Everything below is safe to try —
            it's all demo/local data.
          </p>

          <h3>1. Customer chat (this page)</h3>
          <p>
            Pick <strong>existing issue</strong> or <strong>plans/pricing</strong> when the chat
            starts. The AI will ask a few questions, then confirm your contact details before
            logging a <strong>ticket</strong> (support) or <strong>lead</strong> (sales) — shown
            inline once created. Describe a similar issue in two separate chats to see the
            duplicate-ticket check flag a possible match.
          </p>

          <h3>2. Working-hours live handoff</h3>
          <p>
            Toggle <strong>Working hours</strong> above the chat (Customer View) to switch from a
            fully autonomous AI to a queue-and-handoff model, closer to a real support desk. The
            badge next to it shows which mode you're currently in:
          </p>
          <ul>
            <li>Once a customer's contact details are confirmed, they're queued instead of the AI continuing.</li>
            <li>
              With working hours on, the <strong>Staff View</strong> panel shows the live chat
              queue — click <strong>Join</strong> on a queued customer to chat with them live,
              alongside an AI-drafted ticket/lead summary that updates as they keep typing.
              (The queue is hidden while working hours are off.)
            </li>
            <li>Edit the draft and create the ticket/lead yourself, or click <strong>Issue resolved</strong> to have the AI summarize the whole conversation for you to review and accept.</li>
          </ul>

          <h3>3. Staff dashboards</h3>
          <p>
            Use the header links to switch between <strong>Customer Support Staff Tickets</strong>{" "}
            and <strong>Customer Sales Staff Leads</strong>. Filter by status/category/priority,
            click a row to see the full chat transcript and details, and override the AI's
            category/priority/status. A ⚠ marks tickets the system thinks may duplicate an
            existing open one — the ticket detail panel lets you compare and resolve it.
          </p>
        </div>
      </div>
    </div>
  );
}
