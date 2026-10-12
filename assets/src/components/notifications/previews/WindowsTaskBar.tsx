const WindowsTaskBar = () => (
    <div
        className="flex items-center justify-between px-3 py-[5px]"
        style={ {
            background: 'rgba(20,20,30,0.85)',
            backdropFilter: 'blur(20px)',
        } }
    >
        <svg width="14" height="14" viewBox="0 0 88 88" fill="none">
            <rect x="0" y="0" width="40" height="40" rx="4" fill="#F25022" />
            <rect x="48" y="0" width="40" height="40" rx="4" fill="#7FBA00" />
            <rect x="0" y="48" width="40" height="40" rx="4" fill="#00A4EF" />
            <rect x="48" y="48" width="40" height="40" rx="4" fill="#FFB900" />
        </svg>
        <div
            className="flex items-center gap-1.5 rounded px-2 py-0.5"
            style={ { background: 'rgba(255,255,255,0.1)' } }
        >
            <svg width="10" height="10" viewBox="0 0 18 18" fill="none">
                <circle
                    cx="7.5"
                    cy="7.5"
                    r="5.5"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.7"
                />
                <line
                    x1="11.7"
                    y1="11.7"
                    x2="16"
                    y2="16"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                />
            </svg>
            <span className="text-[9px] leading-none text-white/50">
                Search
            </span>
        </div>
        <div className="flex items-center gap-2">
            <svg width="13" height="11" viewBox="0 0 20 16" fill="none">
                <circle
                    cx="10"
                    cy="14"
                    r="1.5"
                    fill="white"
                    fillOpacity="0.75"
                />
                <path
                    d="M6.1 10.1a5.5 5.5 0 0 1 7.78 0"
                    stroke="white"
                    strokeOpacity="0.75"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <path
                    d="M2.5 6.5a10.5 10.5 0 0 1 15 0"
                    stroke="white"
                    strokeOpacity="0.5"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <path
                    d="M0 3a15 15 0 0 1 20 0"
                    stroke="white"
                    strokeOpacity="0.3"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
            <svg width="12" height="11" viewBox="0 0 20 18" fill="none">
                <path
                    d="M3 6.5H1a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2l4 3.5V3L3 6.5z"
                    fill="white"
                    fillOpacity="0.7"
                />
                <path
                    d="M14 3.5a8 8 0 0 1 0 11M11 6a4.5 4.5 0 0 1 0 6"
                    stroke="white"
                    strokeOpacity="0.7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </svg>
            <svg width="18" height="10" viewBox="0 0 24 12" fill="none">
                <rect
                    x="0.75"
                    y="0.75"
                    width="20.5"
                    height="10.5"
                    rx="2.25"
                    stroke="white"
                    strokeOpacity="0.65"
                    strokeWidth="1.5"
                />
                <rect
                    x="2.5"
                    y="2.5"
                    width="14"
                    height="7"
                    rx="1"
                    fill="white"
                    fillOpacity="0.65"
                />
                <path
                    d="M22.5 4.5v3a1.5 1.5 0 0 0 0-3z"
                    fill="white"
                    fillOpacity="0.45"
                />
            </svg>
            <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] font-medium text-white/80">
                    9:41 AM
                </span>
                <span className="mt-[1px] text-[8px] text-white/50">
                    2/26/2026
                </span>
            </div>
        </div>
    </div>
);

export default WindowsTaskBar;
