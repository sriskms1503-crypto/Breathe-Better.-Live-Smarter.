interface LogoProps {
  onClick?: () => void;
  light?: boolean;
}

export function Logo({ onClick, light = false }: LogoProps) {
  const content = (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="30"
        height="30"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="36" height="36" rx="10" fill={light ? '#1D3E5E' : '#102A43'} />
        <path
          d="M8 21.5C11.2 17.2 14.5 15.2 18.2 15.2C21.9 15.2 24.4 17.8 28 13.5"
          stroke="#38BDF8"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M8 25.5C11.5 22.3 14.8 21 18.5 21C22.2 21 24.8 22.6 28 19.2"
          stroke="#20C997"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="26.5" cy="11" r="2.2" fill="#20C997" />
      </svg>
      <span
        className={`font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 ${
          light ? 'text-white' : 'text-[#102A43]'
        }`}
      >
        AIRWISE AI
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] rounded-lg"
        aria-label="AIRWISE AI Home"
      >
        {content}
      </button>
    );
  }

  return content;
}
