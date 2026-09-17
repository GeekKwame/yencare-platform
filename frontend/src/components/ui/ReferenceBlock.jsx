import { useCallback, useEffect, useRef, useState } from "react";
import { MdCheck, MdContentCopy, MdVolumeUp } from "react-icons/md";
import { speakableReference, speakText } from "../../lib/clinicSpeech";

/**
 * ReferenceBlock — the appointment reference code, the largest object on the
 * confirmation screen.
 * Ports ui/prototype/src/components/common/ReferenceBlock.tsx to JSX.
 *
 * Uses the locked reference-code type treatment (700 weight, 0.1em tracking via
 * the `tracking-reference` token) and reuses the existing speech helpers in
 * src/lib/clinicSpeech.js rather than re-implementing them.
 *
 * @param {object} props
 * @param {string} props.code                 The reference code, e.g. "YC-4K2M".
 * @param {string} [props.title='Appointment Reference Code'] Micro-caps label above the code.
 * @param {string} [props.subtext='Show this reference code when you arrive at the reception desk']
 *   Supporting copy below the code. Pass `null` to hide.
 * @param {'lg'|'xl'} [props.size='xl']       'xl' scales the code up on desktop.
 * @param {boolean} [props.showCopy=true]     Show the copy-to-clipboard action.
 * @param {boolean} [props.showSpeak=true]    Show the speak-aloud action.
 * @param {boolean} [props.showSpokenHint=true] Show the "Say: Y C four K two M" line.
 * @param {string} [props.className='']       Appended last.
 * @returns {JSX.Element}
 */
export function ReferenceBlock({
  code,
  title = "Appointment Reference Code",
  subtext = "Show this reference code when you arrive at the reception desk",
  size = "xl",
  showCopy = true,
  showSpeak = true,
  showSpokenHint = true,
  className = "",
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);
  const spoken = speakableReference(code);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(code ?? ""));
    } catch {
      /* Clipboard is unavailable (insecure origin or denied) — the code is still selectable. */
    }
    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const actionClasses =
    "cursor-pointer border border-clinic-border bg-surface p-2 text-primary transition-all hover:border-primary hover:bg-clinic-bg active:scale-95";

  return (
    <div
      className={`my-4 w-full border border-clinic-border bg-surface-secondary p-5 text-center md:p-6 ${className}`}
    >
      <div className="type-label-micro mb-2 flex items-center justify-center gap-1.5 text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        <span>{title}</span>
      </div>

      <div className="flex items-center justify-center gap-3">
        <span
          className={`font-bold text-primary tracking-reference select-all ${
            size === "xl" ? "text-3xl md:text-4xl" : "text-2xl"
          }`}
        >
          {code}
        </span>

        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className={actionClasses}
            title="Copy reference code"
            aria-label="Copy reference code"
          >
            {copied ? (
              <MdCheck size={18} aria-hidden="true" />
            ) : (
              <MdContentCopy size={18} aria-hidden="true" />
            )}
          </button>
        )}

        {showSpeak && (
          <button
            type="button"
            onClick={() => speakText(`${spoken}.`)}
            className={actionClasses}
            title="Speak reference code"
            aria-label="Speak reference code"
          >
            <MdVolumeUp size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Copied confirmation, announced politely rather than only shown as an icon swap. */}
      <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-accent">
        {copied ? "Reference code copied" : ""}
      </p>

      {showSpokenHint && spoken && (
        <p className="text-xs font-medium tracking-wide text-accent">Say: {spoken}</p>
      )}

      {subtext && (
        <p className="mx-auto mt-1.5 max-w-sm text-xs font-normal text-text-muted">{subtext}</p>
      )}
    </div>
  );
}

export default ReferenceBlock;
