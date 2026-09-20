import $ from 'jquery';
import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar } from '@wordpress/edit-post';
import { PanelBody, Button } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';

interface TriggerNotificationResponse {
    success: boolean;
    data: string;
}

const TriggerNotificationSidebar = () => {
    const currentPostId = useSelect( ( select ) => {
        return select( 'core/editor' ).getCurrentPostId();
    } );

    const [ isSending, setIsSending ] = useState( false );

    const handleClick = () => {
        setIsSending( true );

        $.ajax( {
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'notifypress_notifier_trigger_notification',
                post_id: currentPostId,
                nonce: notifypress.nonce,
            },
            success: ( response: TriggerNotificationResponse ) => {
                if ( response.success ) {
                    // Show a notice.
                    wp.data
                        .dispatch( 'core/notices' )
                        .createNotice( 'success', response.data, {
                            isDismissible: true,
                            type: 'snackbar',
                        } );
                } else {
                    wp.data
                        .dispatch( 'core/notices' )
                        .createNotice( 'error', response.data, {
                            isDismissible: true,
                            type: 'snackbar',
                        } );
                }
            },
            error: () => {
                wp.data
                    .dispatch( 'core/notices' )
                    .createNotice(
                        'error',
                        'Error occurred while triggering notification.',
                        {
                            isDismissible: true,
                            type: 'snackbar',
                        }
                    );
            },
        } ).always( () => {
            setIsSending( false );
        } );
    };

    return (
        <PluginSidebar
            name="trigger-notification-sidebar"
            title="NotifyPress"
            icon="megaphone"
        >
            <PanelBody initialOpen={ true }>
                <Button
                    isPrimary
                    onClick={ handleClick }
                    isBusy={ isSending }
                    disabled={ isSending }
                >
                    Trigger Notification
                </Button>
            </PanelBody>
        </PluginSidebar>
    );
};

registerPlugin( 'trigger-notification-plugin', {
    render: TriggerNotificationSidebar,
    icon: 'bell',
} );
