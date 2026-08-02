import { registerPlugin } from '@wordpress/plugins';
import {
    PluginDocumentSettingPanel as EditorPanel,
    store as editorStore,
} from '@wordpress/editor';
import { PluginDocumentSettingPanel as EditPostPanel } from '@wordpress/edit-post';
import {
    Button,
    CheckboxControl,
    ExternalLink,
    Notice,
    RadioControl,
    TextControl,
    TextareaControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEntityProp } from '@wordpress/core-data';
import { useEffect, useState } from '@wordpress/element';
import { store as noticesStore } from '@wordpress/notices';
import { __, sprintf } from '@wordpress/i18n';
import { detectBrowser } from './browser';
import {
    getSubscriptionToken,
    sendTestNotification,
} from './test-notification';
import { getEditorBootstrap, notificationDefaults } from './post-notification';

// PluginDocumentSettingPanel moved from @wordpress/edit-post to
// @wordpress/editor in WP 6.6; the plugin supports 6.0+, so take whichever
// package this WordPress actually exports it from.
const DocumentSettingPanel = EditorPanel || EditPostPanel;

const PANEL_NAME = 'notifypress-notification';

// The shipped @wordpress/editor types only describe a handful of selectors,
// so narrow the store to the ones this panel reads.
interface EditorSelectors {
    getCurrentPostId: () => number;
    getCurrentPostType: () => string;
    getEditedPostAttribute: ( attribute: string ) => string;
    isCurrentPostPublished: () => boolean;
}

// The panel's slice of post meta — registered in
// Fynolab\NotifyPress\Services\NewPost\PostNotification.
interface PostMeta {
    _notifypress_send?: boolean;
    _notifypress_title?: string;
    _notifypress_message?: string;
    [ key: string ]: unknown;
}

const NotificationPanel = () => {
    const bootstrap = getEditorBootstrap();
    const {
        postId,
        postType,
        postTitle,
        postContent,
        postExcerpt,
        isPublished,
    } = useSelect( ( select ) => {
        const editor = select( editorStore ) as unknown as EditorSelectors;

        return {
            postId: editor.getCurrentPostId(),
            postType: editor.getCurrentPostType(),
            postTitle: editor.getEditedPostAttribute( 'title' ),
            postContent: editor.getEditedPostAttribute( 'content' ),
            postExcerpt: editor.getEditedPostAttribute( 'excerpt' ),
            isPublished: editor.isCurrentPostPublished(),
        };
    } );

    const [ meta, setMeta ] = useEntityProp< PostMeta >(
        'postType',
        postType,
        'meta'
    );
    const { createNotice } = useDispatch( noticesStore );
    const [ isSending, setIsSending ] = useState( false );
    const [ hasSubscription, setHasSubscription ] = useState( true );

    useEffect( () => {
        setHasSubscription( Boolean( getSubscriptionToken() ) );
    }, [] );

    // Post types the site excluded from post notifications never notify, so
    // showing the panel there would promise something that can't happen.
    if ( ! postType || ! bootstrap.postTypes.includes( postType ) ) {
        return null;
    }

    const defaults = notificationDefaults(
        {
            title: postTitle,
            content: postContent,
            excerpt: postExcerpt,
        },
        bootstrap
    );

    const shouldSend = meta?._notifypress_send ?? true;
    const title = meta?._notifypress_title || '';
    const message = meta?._notifypress_message || '';
    const previewTitle = title || defaults.title;
    const previewMessage = message || defaults.message;

    const updateMeta = ( next: PostMeta ) => {
        setMeta( { ...meta, ...next } );
    };

    const handleTest = async () => {
        setIsSending( true );

        const result = await sendTestNotification( {
            postId,
            title: previewTitle,
            message: previewMessage,
        } );

        setIsSending( false );
        setHasSubscription( Boolean( getSubscriptionToken() ) );

        createNotice( result.success ? 'success' : 'error', result.message, {
            isDismissible: true,
            type: 'snackbar',
        } );
    };

    return (
        <DocumentSettingPanel
            name={ PANEL_NAME }
            title={ __( 'NotifyPress', 'notifypress' ) }
            icon="megaphone"
            className="notifypress-panel"
        >
            { bootstrap.connected ? null : (
                <Notice status="warning" isDismissible={ false }>
                    { __(
                        'This site is not connected to NotifyPress yet, so nothing will be sent.',
                        'notifypress'
                    ) }{ ' ' }
                    <ExternalLink href={ bootstrap.settingsUrl }>
                        { __( 'Connect the site', 'notifypress' ) }
                    </ExternalLink>
                </Notice>
            ) }

            { bootstrap.connected && ! bootstrap.enabled ? (
                <Notice status="warning" isDismissible={ false }>
                    { __(
                        'Post notifications are turned off site-wide, so publishing will not send one.',
                        'notifypress'
                    ) }{ ' ' }
                    <ExternalLink href={ bootstrap.settingsUrl }>
                        { __( 'Turn them on', 'notifypress' ) }
                    </ExternalLink>
                </Notice>
            ) : null }

            <CheckboxControl
                label={ __( 'Send Push Notification', 'notifypress' ) }
                help={
                    isPublished
                        ? __(
                              'This post is already published — these values apply the next time it is published, and to test notifications.',
                              'notifypress'
                          )
                        : __(
                              'Notify your subscribers when this post is published.',
                              'notifypress'
                          )
                }
                checked={ Boolean( shouldSend ) }
                onChange={ ( value ) =>
                    updateMeta( { _notifypress_send: value } )
                }
            />

            { shouldSend ? (
                <>
                    <TextControl
                        label={ __( 'Notification title', 'notifypress' ) }
                        value={ title }
                        placeholder={ defaults.title }
                        maxLength={ bootstrap.titleMax }
                        help={ sprintf(
                            /* translators: 1: characters used, 2: maximum characters. */
                            __(
                                '%1$d/%2$d characters. Leave blank to use the post title.',
                                'notifypress'
                            ),
                            ( title || defaults.title ).length,
                            bootstrap.titleMax
                        ) }
                        onChange={ ( value ) =>
                            updateMeta( { _notifypress_title: value } )
                        }
                    />

                    <TextareaControl
                        label={ __( 'Notification message', 'notifypress' ) }
                        value={ message }
                        placeholder={ defaults.message }
                        rows={ 3 }
                        maxLength={ bootstrap.messageMax }
                        help={ sprintf(
                            /* translators: 1: characters used, 2: maximum characters. */
                            __(
                                '%1$d/%2$d characters. Leave blank to use the post excerpt.',
                                'notifypress'
                            ),
                            ( message || defaults.message ).length,
                            bootstrap.messageMax
                        ) }
                        onChange={ ( value ) =>
                            updateMeta( { _notifypress_message: value } )
                        }
                    />

                    <RadioControl
                        className="notifypress-panel__audience"
                        label={ __( 'Audience', 'notifypress' ) }
                        selected="all"
                        options={ [
                            {
                                label: __(
                                    'Send to all subscribers',
                                    'notifypress'
                                ),
                                value: 'all',
                            },
                        ] }
                        onChange={ () => undefined }
                    />

                    <div className="notifypress-preview">
                        <p className="notifypress-preview__heading">
                            { __( 'Notification preview', 'notifypress' ) }
                        </p>
                        <div className="notifypress-preview__card">
                            <p className="notifypress-preview__browser">
                                <span
                                    className="notifypress-preview__browser-dot"
                                    aria-hidden="true"
                                />
                                { detectBrowser() }
                            </p>
                            <p className="notifypress-preview__title">
                                { previewTitle }
                            </p>
                            <p className="notifypress-preview__message">
                                { previewMessage }
                            </p>
                            <p className="notifypress-preview__host">
                                { bootstrap.siteHost }
                            </p>
                            <p className="notifypress-preview__action">
                                { __( 'Close', 'notifypress' ) }
                            </p>
                        </div>
                    </div>

                    { hasSubscription ? null : (
                        <p className="notifypress-panel__hint">
                            { __(
                                'Subscribe to push notifications on the front end of this site to send yourself a test.',
                                'notifypress'
                            ) }
                        </p>
                    ) }

                    <Button
                        variant="secondary"
                        onClick={ handleTest }
                        isBusy={ isSending }
                        disabled={ isSending || ! bootstrap.connected }
                    >
                        { __( 'Test notification', 'notifypress' ) }
                    </Button>
                </>
            ) : null }
        </DocumentSettingPanel>
    );
};

registerPlugin( 'notifypress-notification-panel', {
    render: NotificationPanel,
    icon: 'megaphone',
} );
