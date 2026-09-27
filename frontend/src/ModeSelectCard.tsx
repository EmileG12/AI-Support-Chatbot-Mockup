import { useState } from "react";
import type { ChatMode } from "./types";

interface ModeSelectCardProps {
  onSelect: (mode: ChatMode) => void;
  isSubmitting: boolean;
}

export function ModeSelectCard({ onSelect, isSubmitting }: ModeSelectCardProps) {
  const [selected, setSelected] = useState<ChatMode | null>(null);

  return (
    <div className="message message-assistant mode-select-message">
      <div className="mode-select-options">
        <label className="mode-select-option">
          <input
            type="radio"
            name="chat-mode"
            value="support"
            checked={selected === "support"}
            onChange={() => setSelected("support")}
            disabled={isSubmitting}
          />
          Customer Support
        </label>
        <label className="mode-select-option">
          <input
            type="radio"
            name="chat-mode"
            value="sales"
            checked={selected === "sales"}
            onChange={() => setSelected("sales")}
            disabled={isSubmitting}
          />
          Customer Sales
        </label>
      </div>
      <button
        type="button"
        className="mode-select-continue"
        onClick={() => selected && onSelect(selected)}
        disabled={isSubmitting || !selected}
      >
        Continue
      </button>
    </div>
  );
}
