type CardCollapseButtonProps = {
  onClick: () => void;
  ariaLabel: string;
};

export function CardCollapseButton({
  onClick,
  ariaLabel,
}: CardCollapseButtonProps) {
  return (
    <button
      type="button"
      className="section-editor-collapse"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="section-editor-collapse-icon"
      >
        <path
          d="M6 14l6-6 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
