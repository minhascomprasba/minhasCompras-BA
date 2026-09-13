interface InfoTooltipProps {
  content: string;
  title?: string;
  align?: 'left' | 'right';
}

export function InfoTooltip({ content, title, align = 'left' }: InfoTooltipProps) {
  return (
    <button
      type="button"
      className="info-tip"
      aria-label={title ? `Mais informações: ${title}` : 'Mais informações'}
    >
      <span className="info-tip-icon" aria-hidden="true">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
      <span
        className={`info-tip-bubble${align === 'right' ? ' info-tip-bubble--right' : ''}`}
        role="tooltip"
      >
        {title ? <strong>{title}</strong> : null}
        {content}
      </span>
    </button>
  );
}