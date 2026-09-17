import {
  MdBlock,
  MdCalendarToday,
  MdCancel,
  MdCheckCircle,
  MdDirectionsWalk,
  MdHourglassEmpty,
  MdHowToReg,
  MdNotificationsActive,
  MdPersonOff,
  MdRadioButtonUnchecked,
  MdSchedule,
} from "react-icons/md";

/**
 * Status vocabulary. Labels are the locked strings from
 * ui/prototype/src/components/common/StatusBadge.tsx — do not reword them.
 *
 * Per the design lock, status is never communicated by colour alone: every
 * badge renders a dot + an icon + a human-readable label.
 */
const STATUS_CONFIG = {
  BOOKED: {
    label: "Booked · Not Checked In",
    Icon: MdCalendarToday,
    tone: "bg-surface-secondary text-text-secondary border-clinic-border",
    dot: "bg-text-muted",
  },
  CHECKED_IN: {
    label: "Arrived · Awaiting desk",
    Icon: MdHowToReg,
    tone: "bg-accent-soft text-accent border-accent-border",
    dot: "bg-accent",
  },
  WAITING: {
    label: "Waiting in Queue",
    Icon: MdSchedule,
    tone: "bg-warning-soft text-warning border-warning-border",
    dot: "bg-warning",
  },
  CALLED: {
    label: "Called · Ready",
    Icon: MdNotificationsActive,
    tone: "bg-accent-soft text-accent border-accent-border",
    dot: "bg-accent",
  },
  COMPLETED: {
    label: "Completed",
    Icon: MdCheckCircle,
    tone: "bg-accent-soft text-accent border-accent-border",
    dot: "bg-accent",
  },
  CANCELLED: {
    label: "Cancelled",
    Icon: MdCancel,
    tone: "bg-error-soft text-error border-error-border",
    dot: "bg-error",
  },
  NO_SHOW: {
    label: "No-Show",
    Icon: MdPersonOff,
    tone: "bg-noshow-soft text-noshow border-noshow-border",
    dot: "bg-noshow",
  },
  WALK_IN: {
    label: "Walk-In",
    Icon: MdDirectionsWalk,
    tone: "bg-walkin-soft text-walkin border-walkin-border",
    dot: "bg-walkin",
  },
  AVAILABLE: {
    label: "Available",
    Icon: MdRadioButtonUnchecked,
    tone: "bg-accent-soft text-accent border-accent-border",
    dot: "bg-accent",
  },
  FULL: {
    label: "Fully Booked",
    Icon: MdBlock,
    tone: "bg-surface-secondary text-text-muted border-clinic-border",
    dot: "bg-text-subtle",
  },
  PENDING: {
    label: "Pending",
    Icon: MdHourglassEmpty,
    tone: "bg-warning-soft text-warning border-warning-border",
    dot: "bg-warning",
  },
};

/**
 * StatusBadge — appointment status chip.
 * Ports ui/prototype/src/components/common/StatusBadge.tsx to JSX.
 *
 * Handles every backend appointment status plus the WALK_IN booking variant.
 * Walk-in is purple (#5B21B6 on #F3EEFF) and no-show is brown
 * (#8B5A2B on #FFF5EB) per the design lock — both via tokens, never blue.
 *
 * @param {object} props
 * @param {'BOOKED'|'CHECKED_IN'|'WAITING'|'CALLED'|'COMPLETED'|'CANCELLED'|'NO_SHOW'|'WALK_IN'|'AVAILABLE'|'FULL'|'PENDING'} props.status
 *   Unknown values fall back to the BOOKED treatment.
 * @param {string} [props.token]        Queue token; when set with status="WAITING" the label becomes "Waiting (A12)".
 * @param {'sm'|'md'} [props.size='md']
 * @param {string} [props.customLabel]  Overrides the locked label. Use sparingly.
 * @param {string} [props.className=''] Appended last.
 * @returns {JSX.Element}
 */
export function StatusBadge({
  status,
  token,
  size = "md",
  customLabel,
  className = "",
  ...rest
}) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.BOOKED;
  const { Icon } = config;

  let label = customLabel || config.label;
  if (!customLabel && status === "WAITING" && token) {
    label = `Waiting (${token})`;
  }

  const sizeClasses =
    size === "sm" ? "gap-1.5 px-2 py-0.5 text-[11px]" : "gap-1.5 px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center border font-medium tracking-wide select-none ${config.tone} ${sizeClasses} ${className}`}
      {...rest}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />
      <Icon className="shrink-0" size={13} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export default StatusBadge;
