export const formatNumber = ( value?: string | number | null ) => {
    const number = Number( String( value ).replace( /,/g, '' ) );

    if ( Number.isNaN( number ) ) {
        return value || '0';
    }

    return new Intl.NumberFormat( 'en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    } ).format( number );
};

const SHORT_MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const pad = ( value: number ) => String( value ).padStart( 2, '0' );

/**
 * The viewer's IANA timezone, e.g. "Asia/Dhaka". Falls back to UTC when the
 * browser cannot say.
 */
export const browserTimeZone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch ( error ) {
        return 'UTC';
    }
};

/**
 * Parses an ISO 8601 instant (with an offset) from the API. Returns null for
 * empty or unparseable values.
 * @param value
 */
export const parseInstant = ( value?: string | null ): Date | null => {
    if ( ! value ) {
        return null;
    }

    const date = new Date( value );

    return Number.isNaN( date.getTime() ) ? null : date;
};

/**
 * Parses a "YYYY-MM-DD" calendar day (or the first 10 characters of a longer
 * string) as a local Date at midnight. Never use new Date( 'YYYY-MM-DD' ),
 * which is UTC midnight and lands on the previous day west of UTC.
 * @param value
 */
export const parseLocalDay = ( value?: string | null ): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec( value || '' );

    if ( ! match ) {
        return null;
    }

    return new Date(
        Number( match[ 1 ] ),
        Number( match[ 2 ] ) - 1,
        Number( match[ 3 ] )
    );
};

/**
 * Local calendar day of a Date as "YYYY-MM-DD".
 * @param date
 */
export const toLocalDayKey = ( date: Date ): string =>
    `${ date.getFullYear() }-${ pad( date.getMonth() + 1 ) }-${ pad(
        date.getDate()
    ) }`;

/**
 * The exact instant for a local date and "HH:mm" time, as ISO 8601 with the
 * browser's offset for that date (DST-correct), e.g. "2026-11-20T10:00:00-05:00".
 * @param date
 * @param time
 */
export const toInstant = ( date: Date, time: string ): string => {
    const [ hours, minutes ] = time.split( ':' ).map( Number );
    const local = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hours || 0,
        minutes || 0,
        0
    );
    const offset = -local.getTimezoneOffset();
    const sign = offset < 0 ? '-' : '+';
    const absolute = Math.abs( offset );

    return `${ toLocalDayKey( local ) }T${ pad( local.getHours() ) }:${ pad(
        local.getMinutes()
    ) }:00${ sign }${ pad( Math.floor( absolute / 60 ) ) }:${ pad(
        absolute % 60
    ) }`;
};

/**
 * Splits an ISO instant into local "YYYY-MM-DD" and "HH:mm" for form prefill.
 * @param iso
 */
export const instantToLocalParts = (
    iso?: string | null
): { date: string; time: string } => {
    const date = parseInstant( iso );

    if ( ! date ) {
        return { date: '', time: '' };
    }

    return {
        date: toLocalDayKey( date ),
        time: `${ pad( date.getHours() ) }:${ pad( date.getMinutes() ) }`,
    };
};

/**
 * "05 Nov 2026" in the viewer's timezone. Three-letter months, like PHP's "M".
 * @param value
 * @param fallback
 */
export const formatDate = ( value?: string | null, fallback = '—' ) => {
    const date = parseInstant( value );

    if ( ! date ) {
        return fallback;
    }

    return `${ pad( date.getDate() ) } ${
        SHORT_MONTHS[ date.getMonth() ]
    } ${ date.getFullYear() }`;
};

/**
 * "Nov 5, 2026, 3:00 PM" in the viewer's timezone.
 * @param value
 * @param fallback
 */
export const formatDateTime = ( value?: string | null, fallback = '—' ) => {
    const date = parseInstant( value );

    if ( ! date ) {
        return fallback;
    }

    return new Intl.DateTimeFormat( 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    } ).format( date );
};

/**
 * "3:00 PM" in the viewer's timezone.
 * @param value
 * @param fallback
 */
export const formatTime = ( value?: string | null, fallback = '—' ) => {
    const date = parseInstant( value );

    if ( ! date ) {
        return fallback;
    }

    return new Intl.DateTimeFormat( 'en-US', { timeStyle: 'short' } ).format(
        date
    );
};
