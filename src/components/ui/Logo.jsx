export function Logo({ size = 28, className = "" }) {
  return (
    <img
      src="/favicon-light.svg"
      width={size}
      height={size}
      className={`brand-logo ${className}`.trim()}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}
