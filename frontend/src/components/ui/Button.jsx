/**
 * Button — Clinical Brutalism action primitive.
 * Ports ui/prototype/src/components/common/Button.tsx to JSX.
 *
 * Sharp corners (0px radius), token-driven colours, minimum 44px tap target.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children            Button label.
 * @param {'primary'|'secondary'|'accent'|'destructive'|'outline'|'tertiary'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.fullWidth=false]           Stretch to the container width.
 * @param {React.ReactNode} [props.icon]              A react-icons element, e.g. <FaArrowRight />.
 * @param {'left'|'right'} [props.iconPosition='left']
 * @param {boolean} [props.loading=false]             Shows a spinner and blocks interaction.
 * @param {string} [props.loadingText='Please wait...']
 * @param {boolean} [props.disabled=false]
 * @param {'button'|'submit'|'reset'} [props.type='button'] Ignored when `as` is set.
 * @param {React.ElementType} [props.as]              Render as another element, e.g. react-router's Link.
 * @param {string} [props.className='']               Appended last so callers can override.
 * @returns {JSX.Element}
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  iconPosition = "left",
  loading = false,
  loadingText = "Please wait...",
  disabled = false,
  type = "button",
  as: Component = "button",
  className = "",
  ...rest
}) {
  const isInactive = disabled || loading;

  const baseStyles =
    "inline-flex items-center justify-center font-semibold select-none transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "min-h-11 gap-1.5 px-3 py-2 text-xs",
    md: "min-h-11 gap-2 px-4 py-2.5 text-sm",
    lg: "min-h-12 gap-2.5 px-6 py-3.5 text-sm md:text-base",
  };

  const variantStyles = {
    primary:
      "border border-primary bg-primary text-white shadow-xs hover:bg-primary-hover active:bg-primary-active",
    secondary:
      "border border-clinic-border bg-surface text-primary shadow-xs hover:border-border-strong hover:bg-surface-secondary active:bg-surface-active",
    accent:
      "border border-accent bg-accent text-white shadow-xs hover:bg-accent-hover active:bg-accent-active",
    destructive:
      "border border-error-border-soft bg-surface text-error hover:border-error hover:bg-error-soft active:bg-error-active focus-visible:outline-error",
    outline:
      "border border-clinic-border bg-transparent text-primary hover:border-primary hover:bg-surface-secondary",
    tertiary:
      "min-h-0 border-0 bg-transparent p-0 text-primary underline-offset-4 shadow-none hover:text-accent hover:underline",
  };

  const classes = [
    baseStyles,
    variant === "tertiary" ? "" : sizeStyles[size],
    variantStyles[variant] || variantStyles.primary,
    fullWidth ? "w-full" : "",
    isInactive && Component !== "button" ? "pointer-events-none opacity-40" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const elementProps =
    Component === "button"
      ? { type, disabled: isInactive }
      : { "aria-disabled": isInactive || undefined };

  return (
    <Component className={classes} {...elementProps} {...rest}>
      {loading ? (
        <>
          <span
            className="mr-1 inline-block h-4 w-4 animate-spin border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{children}</span>
          {icon && iconPosition === "right" && (
            <span className="inline-flex shrink-0 items-center" aria-hidden="true">
              {icon}
            </span>
          )}
        </>
      )}
    </Component>
  );
}

export default Button;
