import { useId } from 'react';
import type { SVGProps } from 'react';

const SafariIcon = ( props: SVGProps< SVGSVGElement > ) => {
    const baseId = useId().replace( /:/g, '' );
    const safariGradientId = `${ baseId }-safari-bg`;

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 63 63"
            width={ 63 }
            height={ 63 }
            fill="none"
            { ...props }
        >
            <defs>
                <linearGradient
                    id={ safariGradientId }
                    x1="0"
                    y1="0"
                    x2="63"
                    y2="63"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0" stopColor="#1a8cff" />
                    <stop offset="1" stopColor="#0055d4" />
                </linearGradient>
            </defs>
            <circle cx="31.5" cy="31.5" r="31.5" fill={ `url(#${ safariGradientId })` } />
            <circle
                cx="31.5"
                cy="31.5"
                r="28"
                fill="none"
                stroke="white"
                strokeOpacity="0.25"
                strokeWidth="1"
            />
            <polygon points="31.5,31.5 39,14 34,30" fill="#ff3b30" />
            <polygon points="31.5,31.5 24,49 29,33" fill="white" />
            <circle cx="31.5" cy="31.5" r="2" fill="white" />
            { [ 0, 45, 90, 135, 180, 225, 270, 315 ].map( ( angle, index ) => {
                const rad = ( angle * Math.PI ) / 180;
                const inner = 24;
                const outer = index % 2 === 0 ? 27 : 25.5;

                return (
                    <line
                        key={ angle }
                        x1={ 31.5 + inner * Math.sin( rad ) }
                        y1={ 31.5 - inner * Math.cos( rad ) }
                        x2={ 31.5 + outer * Math.sin( rad ) }
                        y2={ 31.5 - outer * Math.cos( rad ) }
                        stroke="white"
                        strokeOpacity="0.7"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                    />
                );
            } ) }
        </svg>
    );
};

export default SafariIcon;
