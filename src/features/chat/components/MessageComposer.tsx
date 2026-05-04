import type { KeyboardEvent } from "react";

interface MessageComposerProps {
  draft: string;
  isSending: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => Promise<void> | void;
}

export default function MessageComposer({
  draft,
  isSending,
  error,
  onDraftChange,
  onSend,
}: MessageComposerProps) {
  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await onSend();
    }
  };

  return (
    <footer className="border-t border-[#e0e0dc] bg-white p-3">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-[#e0e0dc] bg-[#f7f7f5] p-2">
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            rows={3}
            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-[#1c1c1c] 
outline-none placeholder:text-[#a0a0a0]"
          />
          <div className="mt-2 flex items-center justify-between px-2 pb-1">
            <span className="text-[11px] text-[#a0a0a0]">
              Enter to send · Shift+Enter for new line
            </span>
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={isSending}
              className="rounded-full bg-[#14a800] px-4 py-1.5 text-xs font-semibold 
text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </footer>
  );
}
