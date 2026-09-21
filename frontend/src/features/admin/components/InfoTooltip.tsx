import { useEffect, useRef, useState } from 'react';

const TOOLTIP_MAX_WIDTH = 280;

interface InfoTooltipProps {
  content: string;
  title?: string;
  align?: 'left' | 'right';
}

export function InfoTooltip({ content, title, align }: InfoTooltipProps) {
  const [flip, setFlip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const decide = () => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const bubbleWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth * 0.72);
      setFlip(rect.left + bubbleWidth > window.innerWidth);
    };
    decide();
    window.addEventListener('resize', decide);
    return () => window.removeEventListener('resize', decide);
  }, []);

  const forceRight = align === 'right';
  const bubbleClass = forceRight || flip ? 'info-tip-bubble info-tip-bubble--right' : 'info-tip-bubble';

  return (
    <button
      ref={buttonRef}
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
      <span className={bubbleClass} role="tooltip">
        {title ? <strong>{title}</strong> : null}
        {content}
      </span>
    </button>
  );
}