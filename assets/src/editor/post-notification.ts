/**
 * Per-post notification defaults, mirroring
 * `Fynolab\NotifyPress\Services\NewPost\PostNotification` so the preview in the
 * editor matches what actually gets sent on publish.
 */

export interface EditorBootstrap {
    siteName: string;
    siteHost: string;
    titleMax: number;
    messageMax: number;
    postTypes: string[];
    enabled: boolean;
    connected: boolean;
    settingsUrl: string;
}

const FALLBACK: EditorBootstrap = {
    siteName: '',
    siteHost: '',
    titleMax: 50,
    messageMax: 100,
    postTypes: [],
    enabled: false,
    connected: false,
    settingsUrl: '',
};

export const getEditorBootstrap = (): EditorBootstrap => ( {
    ...FALLBACK,
    ...( ( window.notifypress?.editor || {} ) as Partial< EditorBootstrap > ),
} );

/**
 * Shorten text to a character budget without cutting a word in half — the JS
 * twin of `PostNotification::trim_to()`.
 *
 * @param {string} text   The text to shorten.
 * @param {number} length The maximum length.
 * @return {string} The shortened text.
 */
export const trimTo = ( text: string, length: number ): string => {
    const trimmed = text.trim();

    if ( trimmed.length <= length ) {
        return trimmed;
    }

    const cut = trimmed.slice( 0, length );
    const space = cut.lastIndexOf( ' ' );

    return (
        space > Math.floor( length / 2 ) ? cut.slice( 0, space ) : cut
    ).replace( /[\s,.;:-]+$/, '' );
};

const toPlainText = ( html: string ): string => {
    if ( ! html ) {
        return '';
    }

    // Blocks arrive as serialized markup; strip comment delimiters and tags
    // the same way wp_strip_all_tags()/strip_shortcodes() do server-side.
    return html
        .replace( /<!--[\s\S]*?-->/g, ' ' )
        .replace( /\[[^\]]*\]/g, ' ' )
        .replace( /<[^>]*>/g, ' ' )
        .replace( /&nbsp;/g, ' ' )
        .replace( /\s+/g, ' ' )
        .trim();
};

export interface PostFields {
    title?: string;
    content?: string;
    excerpt?: string;
}

/**
 * The title and message a post falls back to when the author hasn't written
 * their own.
 *
 * @param {PostFields}      post      The post's edited title/content/excerpt.
 * @param {EditorBootstrap} bootstrap The localized editor bootstrap.
 * @return {{title: string, message: string}} The default notification copy.
 */
export const notificationDefaults = (
    post: PostFields,
    bootstrap: EditorBootstrap
) => {
    const title = trimTo(
        toPlainText( post.title || '' ) || bootstrap.siteName,
        bootstrap.titleMax
    );
    const body =
        toPlainText( post.excerpt || '' ) || toPlainText( post.content || '' );

    return {
        title,
        message: trimTo( body || title, bootstrap.messageMax ),
    };
};
