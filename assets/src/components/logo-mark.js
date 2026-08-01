/**
 * The NotifyPress "Signal" brand mark (dot + two broadcast arcs).
 *
 * Draws with `currentColor` so it inherits the surrounding text color,
 * e.g. white inside a `bg-primary text-primary-foreground` tile.
 */
export default function LogoMark( { className = 'h-6 w-6' } ) {
	return (
		<svg
			viewBox="0 0 48 48"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={ className }
			role="img"
			aria-label="NotifyPress"
		>
			<circle cx="17" cy="31" r="8.5" fill="currentColor" />
			<path
				d="M 32.94 26.73 A 16.5 16.5 0 0 0 21.27 15.06"
				stroke="currentColor"
				strokeWidth="5"
				strokeLinecap="round"
			/>
			<path
				d="M 41.43 22.11 A 26 26 0 0 0 25.89 6.57"
				stroke="currentColor"
				strokeWidth="5"
				strokeLinecap="round"
				opacity="0.55"
			/>
		</svg>
	);
}
