/**
 * "Test notification" — sends the panel's current copy to the one subscriber
 * this browser is, via the `notifypress_send_test_notification` AJAX action.
 */

const SUBSCRIPTION_TOKEN_KEY = 'notifypress-SubscriptionToken';

/**
 * The subscription token the widget stored when this browser subscribed.
 *
 * @return {string} The token, or an empty string if this browser never subscribed.
 */
export const getSubscriptionToken = (): string => {
    try {
        return window.localStorage.getItem( SUBSCRIPTION_TOKEN_KEY ) || '';
    } catch ( error ) {
        return '';
    }
};

interface TestNotificationArgs {
    postId: number;
    title: string;
    message: string;
}

interface TestNotificationResult {
    success: boolean;
    message: string;
}

interface AjaxResponse {
    success?: boolean;
    data?: string;
}

export const sendTestNotification = async ( {
    postId,
    title,
    message,
}: TestNotificationArgs ): Promise< TestNotificationResult > => {
    const bootstrap = window.notifypress || {};
    const body = new window.FormData();

    body.append( 'action', 'notifypress_send_test_notification' );
    body.append( 'nonce', bootstrap.nonce || '' );
    body.append( 'post_id', String( postId ) );
    body.append( 'title', title );
    body.append( 'message', message );
    body.append( 'subscriber_token', getSubscriptionToken() );

    try {
        const response = await window.fetch( bootstrap.ajaxUrl || '', {
            method: 'POST',
            credentials: 'same-origin',
            body,
        } );
        const payload = ( await response.json() ) as AjaxResponse;

        return {
            success: Boolean( payload.success ),
            message:
                payload.data ||
                ( payload.success
                    ? 'Test notification sent to this browser.'
                    : 'Could not send the test notification.' ),
        };
    } catch ( error ) {
        return {
            success: false,
            message: 'Could not reach the site to send the test notification.',
        };
    }
};
