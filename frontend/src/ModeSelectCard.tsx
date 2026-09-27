import type { ChatMode } from "./types";

interface ModeSelectCardProps {
  onSelect: (mode: ChatMode) => void;
  isSubmitting: boolean;
}

export function ModeSelectCard({ onSelect, isSubmitting }: ModeSelectCardProps) {
  return (
    <div className="mode-select-card">
      <div className="mode-select-actions">
        <button type="button" onClick={() => onSelect("support")} disabled={isSubmitting}>
          Customer Support
        </button>
        <button type="button" className="secondary" onClick={() => onSelect("sales")} disabled={isSubmitting}>
          Customer Sales
        </button>
      </div>
    </div>
  );
}
