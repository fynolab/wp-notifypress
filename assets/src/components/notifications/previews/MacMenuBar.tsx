const MacMenuBar = () => (
    <div
        className="flex items-center justify-between px-3 py-[4px]"
        style={ {
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(12px)',
        } }
    >
        <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2">
            <svg width="20" height="11" viewBox="0 0 24 12" fill="none">
                <rect
                    x="0.75"
                    y="0.75"
                    width="20.5"
                    height="10.5"
                    rx="2.25"
                    stroke="#333"
                    strokeOpacity="0.7"
                    strokeWidth="1.5"
                />
                <rect
                    x="2.5"
                    y="2.5"
                    width="14"
                    height="7"
                    rx="1"
                    fill="#333"
                    fillOpacity="0.7"
                />
                <path
                    d="M22.5 4.5v3a1.5 1.5 0 0 0 0-3z"
                    fill="#333"
                    fillOpacity="0.5"
                />
            </svg>
            <svg width="15" height="12" viewBox="0 0 20 16" fill="none">
                <circle
                    cx="10"
                    cy="14"
                    r="1.5"
                    fill="#333"
                    fillOpacity="0.75"
                />
                <path
                    d="M6.1 10.1a5.5 5.5 0 0 1 7.78 0"
                    stroke="#333"
                    strokeOpacity="0.75"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <path
                    d="M2.5 6.5a10.5 10.5 0 0 1 15 0"
                    stroke="#333"
                    strokeOpacity="0.55"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
                <path
                    d="M0 3a15 15 0 0 1 20 0"
                    stroke="#333"
                    strokeOpacity="0.35"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            </svg>
            <svg width="11" height="11" viewBox="0 0 18 18" fill="none">
                <circle
                    cx="7.5"
                    cy="7.5"
                    r="5.5"
                    stroke="#333"
                    strokeOpacity="0.75"
                    strokeWidth="1.7"
                />
                <line
                    x1="11.7"
                    y1="11.7"
                    x2="16"
                    y2="16"
                    stroke="#333"
                    strokeOpacity="0.75"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                />
            </svg>
            <span className="text-[10px] font-medium leading-none text-gray-700">
                9:41 AM
            </span>
        </div>
    </div>
);

export default MacMenuBar;
