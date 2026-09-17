import { useId } from "react";
import { MdErrorOutline } from "react-icons/md";

/** A Ghana mobile subscriber number is 9 digits after the +233 / leading-0 prefix. */
const SUBSCRIBER_LENGTH = 9;

/**
 * Reduce any Ghana phone form to its 9-digit subscriber part.
 * Accepts "0241234567", "241234567", "+233 24 123 4567", "00233241234567",
 * "0233241234567" — i.e. every form `isValidGhanaPhone` and `ghanaPhoneDigits`
 * already tolerate.
 *
 * @param {string} raw
 * @returns {string} Up to 9 digits, no prefix, no separators.
 */
function toSubscriberDigits(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  let previous;
  do {
    previous = digits;
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("233")) digits = digits.slice(3);
    else if (digits.startsWith("0")) digits = digits.slice(1);
  } while (digits !== previous);
  return digits.slice(0, SUBSCRIBER_LENGTH);
}

/**
 * GhanaPhoneInput — phone field with a fixed +233 country block.
 * Ports ui/prototype/src/components/common/GhanaPhoneInput.tsx to JSX.
 *
 * ## Value contract
 * - `value` (in): any Ghana phone form. The component normalises it for
 *   display, so passing `"0241234567"`, `"241234567"`, `"+233 24 123 4567"`
 *   or `"233241234567"` all render as `241234567` behind the `+233` block.
 * - `onChange` (out): `(nextValue: string, event: ChangeEvent) => void`.
 *   `nextValue` is **digits only, national form with the leading zero** —
 *   e.g. `"0241234567"` — or `""` when the field is empty. While the user is
 *   still typing it is a partial of the same shape (`"0"`, `"02"`, `"0241"`).
 *
 *   That is the exact form the existing helpers already accept:
 *   `isValidGhanaPhone("0241234567") === true` (matches `^0[25]\d{8}$`) and
 *   `ghanaPhoneDigits("0241234567") === "241234567"`. Call sites keep their
 *   current validation and submission logic unchanged; they may still call
 *   `.trim()` on it harmlessly.
 *
 *   The second argument is the original change event, so handlers written as
 *   `(_, e) => update({ [e.target.name]: ... })` keep working.
 *
 * @param {object} props
 * @param {string} props.value                        Current phone value, any Ghana form.
 * @param {(nextValue: string, event: object) => void} props.onChange
 * @param {string} [props.label='Phone Number']       Visible label rendered above the field.
 * @param {string} [props.error]                      Inline error message; also sets aria-invalid.
 * @param {string} [props.helpText='We will send your confirmation and reminder via SMS']
 *   Shown only when there is no error. Pass `null` to hide.
 * @param {boolean} [props.required=true]             Renders the red asterisk and sets `required`.
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.id]                         Defaults to a generated id.
 * @param {string} [props.name='phoneNumber']
 * @param {string} [props.placeholder='24 123 4567']
 * @param {string} [props.autoComplete='tel-national']
 * @param {string} [props.className='']               Applied to the outer wrapper.
 * @returns {JSX.Element}
 */
export function GhanaPhoneInput({
  value,
  onChange,
  label = "Phone Number",
  error,
  helpText = "We will send your confirmation and reminder via SMS",
  required = true,
  disabled = false,
  id,
  name = "phoneNumber",
  placeholder = "24 123 4567",
  autoComplete = "tel-national",
  className = "",
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || `ghana-phone-${generatedId}`;
  const messageId = `${inputId}-message`;

  const subscriber = toSubscriberDigits(value);

  const handleChange = (event) => {
    const digits = toSubscriberDigits(event.target.value);
    onChange?.(digits ? `0${digits}` : "", event);
  };

  return (
    <div className={`w-full space-y-1.5 text-left ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-primary">
        {label} {required && <span className="text-error">*</span>}
      </label>

      <div
        className={`flex items-stretch border transition-all ${
          error
            ? "border-error bg-error-soft"
            : "border-border-input bg-surface focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
        }`}
      >
        <div className="flex shrink-0 items-center gap-1.5 border-r border-clinic-border bg-surface-secondary px-3.5 py-2.5 text-xs font-semibold text-primary select-none">
          <span aria-hidden="true">🇬🇭</span>
          <span>+233</span>
        </div>
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          maxLength={SUBSCRIBER_LENGTH}
          required={required}
          disabled={disabled}
          value={subscriber}
          onChange={handleChange}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helpText ? messageId : undefined}
          className="w-full bg-transparent px-3.5 py-2.5 text-sm font-normal text-primary placeholder:text-text-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          {...rest}
        />
      </div>

      {error ? (
        <p
          id={messageId}
          role="alert"
          className="flex items-center gap-1 pt-0.5 text-xs font-medium text-error"
        >
          <MdErrorOutline size={14} className="shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helpText ? (
        <p id={messageId} className="text-xs font-normal text-text-muted">
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

export default GhanaPhoneInput;
