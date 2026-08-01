import { useId } from 'react';
import type { SVGProps } from 'react';

const FirefoxIcon = ( props: SVGProps< SVGSVGElement > ) => {
    const baseId = useId().replace( /:/g, '' );

    const ids = {
        a: `${ baseId }-a`,
        b: `${ baseId }-b`,
        c: `${ baseId }-c`,
        d: `${ baseId }-d`,
        e: `${ baseId }-e`,
        f: `${ baseId }-f`,
        g: `${ baseId }-g`,
        h: `${ baseId }-h`,
        i: `${ baseId }-i`,
        j: `${ baseId }-j`,
        k: `${ baseId }-k`,
        l: `${ baseId }-l`,
    };

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 82 82"
            width={ 82 }
            height={ 82 }
            { ...props }
        >
            <title>{ 'Firefox Browser logo' }</title>
            <defs>
                <radialGradient
                    id={ ids.b }
                    cx={ -7907 }
                    cy={ -8515 }
                    r={ 80.8 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.129 } stopColor="#ffbd4f" />
                    <stop offset={ 0.186 } stopColor="#ffac31" />
                    <stop offset={ 0.247 } stopColor="#ff9d17" />
                    <stop offset={ 0.283 } stopColor="#ff980e" />
                    <stop offset={ 0.403 } stopColor="#ff563b" />
                    <stop offset={ 0.467 } stopColor="#ff3750" />
                    <stop offset={ 0.71 } stopColor="#f5156c" />
                    <stop offset={ 0.782 } stopColor="#eb0878" />
                    <stop offset={ 0.86 } stopColor="#e50080" />
                </radialGradient>
                <radialGradient
                    id={ ids.c }
                    cx={ -7937 }
                    cy={ -8482 }
                    r={ 80.8 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.3 } stopColor="#960e18" />
                    <stop offset={ 0.351 } stopColor="#b11927" stopOpacity={ 0.74 } />
                    <stop offset={ 0.435 } stopColor="#db293d" stopOpacity={ 0.343 } />
                    <stop offset={ 0.497 } stopColor="#f5334b" stopOpacity={ 0.094 } />
                    <stop offset={ 0.53 } stopColor="#ff3750" stopOpacity={ 0 } />
                </radialGradient>
                <radialGradient
                    id={ ids.d }
                    cx={ -7927 }
                    cy={ -8533 }
                    r={ 58.53 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.132 } stopColor="#fff44f" />
                    <stop offset={ 0.252 } stopColor="#ffdc3e" />
                    <stop offset={ 0.506 } stopColor="#ff9d12" />
                    <stop offset={ 0.526 } stopColor="#ff980e" />
                </radialGradient>
                <radialGradient
                    id={ ids.e }
                    cx={ -7946 }
                    cy={ -8461 }
                    r={ 38.47 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.353 } stopColor="#3a8ee6" />
                    <stop offset={ 0.472 } stopColor="#5c79f0" />
                    <stop offset={ 0.669 } stopColor="#9059ff" />
                    <stop offset={ 1 } stopColor="#c139e6" />
                </radialGradient>
                <radialGradient
                    id={ ids.f }
                    cx={ -7936 }
                    cy={ -8492 }
                    r={ 20.4 }
                    gradientTransform="matrix(.972 -.235 .275 1.138 10090 7834)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.206 } stopColor="#9059ff" stopOpacity={ 0 } />
                    <stop offset={ 0.278 } stopColor="#8c4ff3" stopOpacity={ 0.064 } />
                    <stop offset={ 0.747 } stopColor="#7716a8" stopOpacity={ 0.45 } />
                    <stop offset={ 0.975 } stopColor="#6e008b" stopOpacity={ 0.6 } />
                </radialGradient>
                <radialGradient
                    id={ ids.g }
                    cx={ -7938 }
                    cy={ -8518 }
                    r={ 27.68 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0 } stopColor="#ffe226" />
                    <stop offset={ 0.121 } stopColor="#ffdb27" />
                    <stop offset={ 0.295 } stopColor="#ffc82a" />
                    <stop offset={ 0.502 } stopColor="#ffa930" />
                    <stop offset={ 0.732 } stopColor="#ff7e37" />
                    <stop offset={ 0.792 } stopColor="#ff7139" />
                </radialGradient>
                <radialGradient
                    id={ ids.h }
                    cx={ -7916 }
                    cy={ -8536 }
                    r={ 118.1 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.113 } stopColor="#fff44f" />
                    <stop offset={ 0.456 } stopColor="#ff980e" />
                    <stop offset={ 0.622 } stopColor="#ff5634" />
                    <stop offset={ 0.716 } stopColor="#ff3647" />
                    <stop offset={ 0.904 } stopColor="#e31587" />
                </radialGradient>
                <radialGradient
                    id={ ids.i }
                    cx={ -7927 }
                    cy={ -8523 }
                    r={ 86.5 }
                    gradientTransform="matrix(.105 .995 -.653 .069 -4685 8470)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0 } stopColor="#fff44f" />
                    <stop offset={ 0.06 } stopColor="#ffe847" />
                    <stop offset={ 0.168 } stopColor="#ffc830" />
                    <stop offset={ 0.304 } stopColor="#ff980e" />
                    <stop offset={ 0.356 } stopColor="#ff8b16" />
                    <stop offset={ 0.455 } stopColor="#ff672a" />
                    <stop offset={ 0.57 } stopColor="#ff3647" />
                    <stop offset={ 0.737 } stopColor="#e31587" />
                </radialGradient>
                <radialGradient
                    id={ ids.j }
                    cx={ -7938 }
                    cy={ -8508 }
                    r={ 73.72 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.137 } stopColor="#fff44f" />
                    <stop offset={ 0.48 } stopColor="#ff980e" />
                    <stop offset={ 0.592 } stopColor="#ff5634" />
                    <stop offset={ 0.655 } stopColor="#ff3647" />
                    <stop offset={ 0.904 } stopColor="#e31587" />
                </radialGradient>
                <radialGradient
                    id={ ids.k }
                    cx={ -7919 }
                    cy={ -8504 }
                    r={ 80.69 }
                    gradientTransform="translate(7974 8524)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.094 } stopColor="#fff44f" />
                    <stop offset={ 0.231 } stopColor="#ffe141" />
                    <stop offset={ 0.509 } stopColor="#ffaf1e" />
                    <stop offset={ 0.626 } stopColor="#ff980e" />
                </radialGradient>
                <linearGradient
                    id={ ids.a }
                    x1={ 70.79 }
                    x2={ 6.447 }
                    y1={ 12.39 }
                    y2={ 74.47 }
                    gradientTransform="translate(-1.3 -.004)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.048 } stopColor="#fff44f" />
                    <stop offset={ 0.111 } stopColor="#ffe847" />
                    <stop offset={ 0.225 } stopColor="#ffc830" />
                    <stop offset={ 0.368 } stopColor="#ff980e" />
                    <stop offset={ 0.401 } stopColor="#ff8b16" />
                    <stop offset={ 0.462 } stopColor="#ff672a" />
                    <stop offset={ 0.534 } stopColor="#ff3647" />
                    <stop offset={ 0.705 } stopColor="#e31587" />
                </linearGradient>
                <linearGradient
                    id={ ids.l }
                    x1={ 70.01 }
                    x2={ 15.27 }
                    y1={ 12.06 }
                    y2={ 66.81 }
                    gradientTransform="translate(-1.3 -.004)"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset={ 0.167 } stopColor="#fff44f" stopOpacity={ 0.8 } />
                    <stop offset={ 0.266 } stopColor="#fff44f" stopOpacity={ 0.634 } />
                    <stop offset={ 0.489 } stopColor="#fff44f" stopOpacity={ 0.217 } />
                    <stop offset={ 0.6 } stopColor="#fff44f" stopOpacity={ 0 } />
                </linearGradient>
            </defs>
            <path
                fill={ `url(#${ ids.a })` }
                d="M74.62 26.83c-1.684-4.052-5.1-8.427-7.775-9.81a40.27 40.27 0 0 1 3.925 11.76l.007.065c-4.382-10.92-11.81-15.33-17.88-24.92a47.099 47.099 0 0 1-.913-1.484 12.24 12.24 0 0 1-.427-.8 7.053 7.053 0 0 1-.578-1.535.1.1 0 0 0-.088-.1.138.138 0 0 0-.073 0c-.005 0-.013.009-.019.011s-.019.011-.028.015l.015-.026c-9.735 5.7-13.04 16.25-13.34 21.53a19.39 19.39 0 0 0-10.67 4.111 11.59 11.59 0 0 0-1-.758 17.97 17.97 0 0 1-.109-9.473 28.7 28.7 0 0 0-9.329 7.21h-.018c-1.536-1.947-1.428-8.367-1.34-9.708a6.928 6.928 0 0 0-1.294.687 28.22 28.22 0 0 0-3.788 3.245 33.84 33.84 0 0 0-3.623 4.347v.006-.007a32.73 32.73 0 0 0-5.2 11.74l-.052.256a61.89 61.89 0 0 0-.381 2.42c0 .029-.006.056-.009.085a36.94 36.94 0 0 0-.629 5.343v.2a38.76 38.76 0 0 0 76.95 6.554c.065-.5.118-.995.176-1.5a39.86 39.86 0 0 0-2.514-19.47zM29.95 57.17c.181.087.351.181.537.264l.027.017q-.282-.135-.564-.281zm40.828-28.314v-.037l.007.041z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.b })` }
                d="M74.62 26.83c-1.684-4.052-5.1-8.427-7.775-9.81a40.27 40.27 0 0 1 3.925 11.76v.037l.007.041a35.1 35.1 0 0 1-1.206 26.16c-4.442 9.531-15.19 19.3-32.02 18.82-18.18-.515-34.2-14.01-37.19-31.68-.545-2.787 0-4.2.274-6.465a28.88 28.88 0 0 0-.623 5.348v.2a38.76 38.76 0 0 0 76.95 6.554c.065-.5.118-.995.176-1.5a39.86 39.86 0 0 0-2.514-19.47z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.c })` }
                d="M74.62 26.83c-1.684-4.052-5.1-8.427-7.775-9.81a40.27 40.27 0 0 1 3.925 11.76v.037l.007.041a35.1 35.1 0 0 1-1.206 26.16c-4.442 9.531-15.19 19.3-32.02 18.82-18.18-.515-34.2-14.01-37.19-31.68-.545-2.787 0-4.2.274-6.465a28.88 28.88 0 0 0-.623 5.348v.2a38.76 38.76 0 0 0 76.95 6.554c.065-.5.118-.995.176-1.5a39.86 39.86 0 0 0-2.514-19.47z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.d })` }
                d="M55.78 31.38c.084.059.162.118.241.177a21.1 21.1 0 0 0-3.6-4.695C40.371 14.812 49.264.742 50.763.022L50.778 0c-9.735 5.7-13.04 16.25-13.34 21.53.452-.031.9-.069 1.362-.069a19.56 19.56 0 0 1 16.98 9.917z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.e })` }
                d="M38.82 33.79c-.064.964-3.47 4.289-4.661 4.289-11.02 0-12.81 6.667-12.81 6.667.488 5.614 4.4 10.24 9.129 12.68.216.112.435.213.654.312q.569.252 1.138.466a17.24 17.24 0 0 0 5.043.973c19.32.906 23.06-23.1 9.119-30.07a13.38 13.38 0 0 1 9.345 2.269 19.56 19.56 0 0 0-16.98-9.917c-.46 0-.91.038-1.362.069a19.39 19.39 0 0 0-10.67 4.111c.591.5 1.258 1.168 2.663 2.553 2.63 2.591 9.375 5.275 9.39 5.59z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.f })` }
                d="M38.82 33.79c-.064.964-3.47 4.289-4.661 4.289-11.02 0-12.81 6.667-12.81 6.667.488 5.614 4.4 10.24 9.129 12.68.216.112.435.213.654.312q.569.252 1.138.466a17.24 17.24 0 0 0 5.043.973c19.32.906 23.06-23.1 9.119-30.07a13.38 13.38 0 0 1 9.345 2.269 19.56 19.56 0 0 0-16.98-9.917c-.46 0-.91.038-1.362.069a19.39 19.39 0 0 0-10.67 4.111c.591.5 1.258 1.168 2.663 2.553 2.63 2.591 9.375 5.275 9.39 5.59z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.g })` }
                d="M24.96 24.36c.314.2.573.374.8.531a17.97 17.97 0 0 1-.109-9.473 28.7 28.7 0 0 0-9.329 7.21c.189-.005 5.811-.106 8.638 1.732z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.h })` }
                d="M35.46 7.01c-.264-.145-.531-.288-.8-.427q-.51-.263-1.028-.514c-.293-.142-.587-.284-.881-.423-.344-.161-.688-.319-1.034-.476a30.78 30.78 0 0 0-17.081 14.861l-.043.085-.049.1-.013.027q-.046.094-.091.188-.141.3-.274.606l-.02.044c-.095.217-.187.435-.278.654-.12.29-.237.58-.347.873a31.467 31.467 0 0 0 6.9 4.834c2.832-2.993 6.777-5.169 11.61-5.2a19.39 19.39 0 0 1 10.67 4.111c.009-1.506-.944-5.413-1.392-6.206-.253-.449-.814-1.214-.9-1.336a30.093 30.093 0 0 0-5.075-4.494 30.657 30.657 0 0 0-1.977-1.306z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.i })` }
                d="M35.46 7.01c-.264-.145-.531-.288-.8-.427q-.51-.263-1.028-.514c-.293-.142-.587-.284-.881-.423-.344-.161-.688-.319-1.034-.476a30.78 30.78 0 0 0-17.081 14.861l-.043.085-.049.1-.013.027q-.046.094-.091.188-.141.3-.274.606l-.02.044c-.095.217-.187.435-.278.654-.12.29-.237.58-.347.873a31.467 31.467 0 0 0 6.9 4.834c2.832-2.993 6.777-5.169 11.61-5.2a19.39 19.39 0 0 1 10.67 4.111c.009-1.506-.944-5.413-1.392-6.206-.253-.449-.814-1.214-.9-1.336a30.093 30.093 0 0 0-5.075-4.494 30.657 30.657 0 0 0-1.977-1.306z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.j })` }
                d="M29.13 21.88c-.337-.162-.675-.31-1.015-.454-.314-.132-.629-.26-.946-.384-.383-.15-.768-.289-1.155-.427a29.879 29.879 0 0 0-14.2 12.82q-.233.407-.452.825c-.146.277-.289.556-.425.839q-.105.21-.206.423c-.164.348-.315.7-.462 1.053a31.5 31.5 0 0 0 4.507 7.2 21.857 21.857 0 0 1 14.223-7.328c.386-.028.773-.046 1.161-.046a19.56 19.56 0 0 1 16.98 9.917q.129-.192.253-.387c.237-.374.464-.756.676-1.147a31.444 31.444 0 0 0 .064-6.172 31.351 31.351 0 0 0-19.948-16.778z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.k })` }
                d="M44.98 28.63q-.317-.338-.653-.659a31.401 31.401 0 0 0-15.1-6.09c-.287-.028-.575-.053-.863-.074-.386-.028-.773-.046-1.161-.046a21.857 21.857 0 0 0-14.223 7.328 31.636 31.636 0 0 0-2.9 4.152 31.488 31.488 0 0 0 5.008 13.24 22.365 22.365 0 0 1 10.48-5.3c.262-.056.526-.105.79-.15.35-.061.7-.111 1.051-.157.526-.069 1.054-.125 1.583-.154.388-.021.776-.038 1.164-.038a19.56 19.56 0 0 1 16.98 9.917c.13-.2.249-.4.37-.6a31.186 31.186 0 0 0-2.526-21.424z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
            <path
                fill={ `url(#${ ids.l })` }
                d="M35.46 7.01c-.264-.145-.531-.288-.8-.427q-.51-.263-1.028-.514c-.293-.142-.587-.284-.881-.423-.344-.161-.688-.319-1.034-.476a30.78 30.78 0 0 0-17.081 14.861l-.043.085-.049.1-.013.027q-.046.094-.091.188-.141.3-.274.606l-.02.044c-.095.217-.187.435-.278.654-.12.29-.237.58-.347.873a31.467 31.467 0 0 0 6.9 4.834c2.832-2.993 6.777-5.169 11.61-5.2a19.39 19.39 0 0 1 10.67 4.111c.009-1.506-.944-5.413-1.392-6.206-.253-.449-.814-1.214-.9-1.336a30.093 30.093 0 0 0-5.075-4.494 30.657 30.657 0 0 0-1.977-1.306z"
                transform="matrix(.98198 0 0 .98198 .697 .72)"
            />
        </svg>
    );
};

export default FirefoxIcon;
