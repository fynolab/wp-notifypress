import $ from 'jquery';
import './scss/global.scss';

import bellIcon from '../images/bell.png';

type SubscriptionAction = 'subscribe' | 'unsubscribe';

interface AjaxResponse< T > {
    success: boolean;
    data: T;
}

interface SubscriptionResponse {
    token: string;
    active: string;
    premium_user: string;
}

interface RecentNotification {
    target_url?: string;
    title?: string;
}

interface ServiceWorkerNotificationMessage {
    targetUrl?: string;
    title?: string;
}

class NotifyPressPrompt {
    subscriptionButtonTitle: string = 'Subscribe';
    subscriptionStatusText: string =
        'You are not subscribed to push notifications';
    buttonClass: string = 'primary';

    constructor() {
        if ( this.isActive() && this.getToken() ) {
            this.subscriptionButtonTitle = 'Unsubscribe';
            this.subscriptionStatusText =
                'You are subscribed to push notifications';
            this.buttonClass = 'warning';
        }
    }

    togglePrompt(): void {
        $( '.notifypress-trigger, .notifypress-prompt-close' ).on(
            'click',
            () => {
                $( '.notifypress-prompt' ).fadeToggle();
            }
        );
    }

    getToken(): string {
        return localStorage.getItem( 'notifypress-SubscriptionToken' ) || '';
    }

    isActive(): boolean {
        return (
            localStorage.getItem( 'notifypress-SubscriptionActive' ) === 'true'
        );
    }

    isPremiumUser(): boolean {
        return localStorage.getItem( 'notifypress-IsPremiumUser' ) === 'true';
    }

    updateSubscription(): void {
        $( '.notifypress-update-subscription' ).on( 'click', async () => {
            if ( this.getToken() && this.isActive() ) {
                this.sendRequest( 'unsubscribe' );
                return;
            }

            const permission = await this.requestNotificationPermission();

            if ( ! permission ) {
                // Permission denial needs immediate browser feedback because subscription cannot continue.
                // eslint-disable-next-line no-alert
                alert(
                    'You have denied the notification permission. Please allow the notification permission to subscribe to the push notifications.'
                );
                return;
            }

            this.sendRequest( 'subscribe' );
        } );
    }

    renderPromptWrapper(): void {
        const promptWrapper = $( `
      <div id="notifypress-prompt-wrapper">
         <div class="notifypress-prompt">
         <span class="notifypress-prompt-close">X</span>
            <p class="recent-notifications">Recent Notifications</p>
            <div class="notifications"></div>
            <div class="footer">
               <p class="subscription-status">${
                   this.subscriptionStatusText
               }</p>
               <button class="${
                   this.buttonClass
               } notifypress-update-subscription">${
                   this.subscriptionButtonTitle
               }</button>
               ${
                   ! this.isPremiumUser()
                       ? '<p class="by-notifypress"><span>by</span> NotifyPress</p>'
                       : ''
               }
            </div>
         </div>
         <button class="notifypress-trigger">
              <img src="${ bellIcon }" alt="Bell Icon" />
         </button>
      </div>
     ` );

        $( 'body' ).append( promptWrapper );
    }

    sendRequest( actionType: SubscriptionAction ): void {
        const button = $( '.notifypress-update-subscription' );

        button.prop( 'disabled', true );
        button.text(
            actionType === 'subscribe' ? 'Subscribing...' : 'Unsubscribing...'
        );

        $.post( notifypressGlobal.ajaxUrl, {
            action: 'notifypress_update_subscription',
            nonce: notifypressGlobal.nonce,
            subscriptionToken: this.getToken(),
            active: actionType === 'subscribe' ? 'true' : 'false',
        } ).done( ( response: AjaxResponse< SubscriptionResponse > ) => {
            if ( response.success ) {
                button.prop( 'disabled', false );
                localStorage.setItem(
                    'notifypress-SubscriptionToken',
                    response.data.token
                );
                localStorage.setItem(
                    'notifypress-SubscriptionActive',
                    response.data.active
                );
                localStorage.setItem(
                    'notifypress-IsPremiumUser',
                    response.data.premium_user
                );

                if ( actionType === 'subscribe' ) {
                    this.getRecentNotifications();
                    button.text( 'Unsubscribe' );
                    button.addClass( 'warning' );
                    button.removeClass( 'success' );
                    $( '.subscription-status' ).text(
                        'You are subscribed to push notifications'
                    );
                }

                if ( actionType === 'unsubscribe' ) {
                    button.text( 'Subscribe' );
                    button.addClass( 'success' );
                    button.removeClass( 'warning' );
                    $( '.notifications' ).empty();
                    $( '.subscription-status' ).text(
                        'You are not subscribed to push notifications'
                    );

                    setTimeout( () => {
                        $( '.notifypress-prompt' ).fadeOut();
                    }, 2000 );
                }
            }
        } );
    }

    getRecentNotifications(): void {
        if ( ! this.isActive() ) {
            return;
        }

        $.get( notifypressGlobal.ajaxUrl, {
            action: 'notifypress_get_recent_notifications',
            nonce: notifypressGlobal.nonce,
        } ).done( ( response: AjaxResponse< RecentNotification[] > ) => {
            if ( response.success ) {
                const notifications = response?.data;
                const notificationsWrapper = $( '.notifications' );

                notifications?.forEach( ( notification ) => {
                    notificationsWrapper.append(
                        `<a class="notification" target="_blank" rel="noopener noreferrer" href="${ notification?.target_url }">${ notification?.title }</a>`
                    );
                } );
            }
        } );
    }

    updateNotificationsOnNewMessage(): void {
        if ( ! ( 'serviceWorker' in navigator ) ) {
            return;
        }

        navigator.serviceWorker.addEventListener( 'message', ( event ) => {
            const data = event.data as ServiceWorkerNotificationMessage;
            const notificationsWrapper = $( '.notifications' );

            // When remove the oldest notification and add the new one.
            // Show slide in effect. So that user can see a new notification is added.
            if ( notificationsWrapper.children().length > 2 ) {
                notificationsWrapper.prepend(
                    `<a class="notification" target="_blank" rel="noopener noreferrer" href="${ data?.targetUrl }">${ data?.title }</a>`
                );
                $( notificationsWrapper.children().last() ).slideUp(
                    500,
                    () => {
                        $( notificationsWrapper.children().last() ).remove();
                    }
                );
            } else {
                notificationsWrapper.prepend(
                    `<a class="notification" target="_blank" rel="noopener noreferrer" href="${ data?.targetUrl }">${ data?.title }</a>`
                );
            }

            // Update the clicks count.
            // this.updateClicksCount(data);
        } );
    }

    async requestNotificationPermission(): Promise< boolean > {
        if ( 'Notification' in window && navigator.serviceWorker ) {
            // Check current permission status
            if ( Notification.permission === 'granted' ) {
                return true;
            }

            if ( Notification.permission === 'denied' ) {
                return false;
            }

            try {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            } catch ( error ) {
                return false; // Error occurred
            }
        } else {
            return false; // Notifications or service worker not supported
        }
    }

    run(): void {
        this.renderPromptWrapper();
        this.togglePrompt();
        this.updateSubscription();
        this.getRecentNotifications();
        this.updateNotificationsOnNewMessage();
    }
}

$( document ).ready( function () {
    new NotifyPressPrompt().run();
} );
