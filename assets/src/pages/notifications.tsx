import { Fragment } from 'react';
import { useEffect, useMemo, useState } from '@wordpress/element';
import {
    Link,
    Navigate,
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Ban,
    Bell,
    Calendar as CalendarIcon,
    CalendarClock,
    CheckCircle,
    ChevronRight,
    Clock,
    Edit3,
    Filter,
    ListFilter,
    Loader2,
    Plus,
    Repeat,
    Send,
    Upload,
    Users,
    XCircle,
    XIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '../components/utils';
import useLiveActivity, { trackOptimisticSend } from '../lib/use-live-activity';
import LiveActivityPanel from '../components/live-activity-panel';
import defaultBellIcon from '../../images/notification-icon.png';
import {
    Chip,
    CursorPager,
    EmptyState,
    PageHeader,
    SectionCard,
    StepTabs,
} from '../components/page-parts';
import type { ChipTone, Step } from '../components/page-parts';
import { CampaignInsights } from '../components/notifications/campaign-insights';
import {
    CHOICE_ROW,
    ChoiceIcon,
    ComposerPreview,
    SendOptionCard,
    SendOptionsUpgrade,
} from '../components/notifications/composer-parts';
import {
    formatCount,
    formatRelativeDate,
    formatSentAt,
} from '../components/dashboard/format';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../components/ui/tooltip';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../components/ui/popover';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent } from '../components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TimePicker } from '../components/ui/time-picker';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { laravelRequest } from '../lib/api';
import {
    formatDateInput,
    formatTimeInput,
    toScheduleTimestamp,
} from '../lib/format';
import { ui } from '../lib/admin-ui';
import type {
    LaravelCollection,
    LaravelResource,
    Notification,
    NotificationAnalytics,
    NotifyPressSettings,
    Segment,
} from '../types';

interface NotificationFormData {
    title: string;
    message: string;
    target_url: string;
    segment_id: string;
    icon_url: string;
    image_url: string;
    last_used_icon: boolean;
    last_used_image: boolean;
    scheduled_date: string;
    scheduled_time: string;
    frequency: string;
    time: string;
    days: number[];
    day_of_month: number;
    icon: File | null;
    image: File | null;
}

const notificationPlaceholder = {
    title: 'New Order',
    message: 'You have a new order from John Doe. Order Total: $100',
};

const defaultForm: NotificationFormData = {
    title: '',
    message: '',
    target_url: '',
    segment_id: '',
    icon_url: '',
    image_url: '',
    last_used_icon: false,
    last_used_image: false,
    scheduled_date: '',
    scheduled_time: '',
    frequency: 'daily',
    time: '',
    days: [],
    day_of_month: 1,
    icon: null,
    image: null,
};

const SEGMENTS_PER_PAGE = 100;

// Opt-in list flags: full titles and messages, and no welcome messages, as on
// the web campaign list. Part of the list's query key so the cache matches.
const LIST_PARAMS = { full_text: 1, exclude_welcome: 1 };

type CampaignRow = Notification & { next_run_at?: string | null };

type StatusType =
    | 'sending'
    | 'sent'
    | 'pending'
    | 'failed'
    | 'scheduled'
    | 'recurring'
    | 'cancelled';

function NoticeMessage( {
    message,
    status = 'info',
}: {
    message?: string;
    status?: string;
} ) {
    if ( ! message ) {
        return null;
    }

    return (
        <div
            className={ status === 'error' ? ui.noticeError : ui.noticeSuccess }
        >
            { message }
        </div>
    );
}

function toCount( value: unknown ): number {
    const count = Number( value || 0 );

    return Number.isFinite( count ) ? count : 0;
}

function normalizeAnalytics(
    notification: Notification
): Required< NotificationAnalytics > {
    let rawAnalytics = notification.analytics;

    if ( typeof rawAnalytics === 'string' ) {
        try {
            rawAnalytics = JSON.parse( rawAnalytics );
        } catch ( error ) {
            rawAnalytics = {};
        }
    }

    const analytics = ( rawAnalytics || {} ) as NotificationAnalytics;
    const browsers = {
        chrome: toCount( analytics.browsers?.chrome ?? notification.chrome ),
        firefox: toCount( analytics.browsers?.firefox ?? notification.firefox ),
        safari: toCount( analytics.browsers?.safari ?? notification.safari ),
        edge: toCount( analytics.browsers?.edge ?? notification.edge ),
        opera: toCount( analytics.browsers?.opera ?? notification.opera ),
        other: toCount( analytics.browsers?.other ?? notification.other ),
    };
    const devices = {
        desktop: toCount( analytics.devices?.desktop ?? notification.desktop ),
        mobile: toCount( analytics.devices?.mobile ?? notification.mobile ),
        tablet: toCount( analytics.devices?.tablet ?? notification.tablet ),
    };
    const views =
        toCount( analytics.views ?? notification.views ) ||
        Object.values( browsers ).reduce(
            ( total, value ) => total + value,
            0
        );
    const clicks = toCount( analytics.clicks ?? notification.clicks );
    let clickThroughRate = 0;

    if ( analytics.click_through_rate !== undefined ) {
        clickThroughRate = toCount( analytics.click_through_rate );
    } else if ( views && clicks ) {
        clickThroughRate = Math.round( ( clicks / views ) * 100 );
    }

    return {
        views,
        clicks,
        click_through_rate: clickThroughRate,
        browsers,
        devices,
    };
}

const STATUS: Record<
    StatusType,
    { label: string; tone: ChipTone; icon: JSX.Element }
> = {
    sending: {
        label: 'Sending…',
        tone: 'primary',
        icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden />,
    },
    sent: {
        label: 'Sent',
        tone: 'success',
        icon: <CheckCircle className="h-3 w-3" aria-hidden />,
    },
    pending: {
        label: 'Pending',
        tone: 'neutral',
        icon: <Clock className="h-3 w-3" aria-hidden />,
    },
    failed: {
        label: 'Failed',
        tone: 'danger',
        icon: <XCircle className="h-3 w-3" aria-hidden />,
    },
    scheduled: {
        label: 'Scheduled',
        tone: 'primary',
        icon: <CalendarClock className="h-3 w-3" aria-hidden />,
    },
    recurring: {
        label: 'Recurring',
        tone: 'violet',
        icon: <Repeat className="h-3 w-3" aria-hidden />,
    },
    cancelled: {
        label: 'Cancelled',
        tone: 'warning',
        icon: <Ban className="h-3 w-3" aria-hidden />,
    },
};

const FILTERS: { value: string; label: string; icon: JSX.Element }[] = [
    {
        value: 'all',
        label: 'All statuses',
        icon: <ListFilter className="h-4 w-4 text-muted-foreground" />,
    },
    {
        value: 'sent',
        label: 'Sent',
        icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
    },
    {
        value: 'pending',
        label: 'Pending',
        icon: <Clock className="h-4 w-4 text-muted-foreground" />,
    },
    {
        value: 'failed',
        label: 'Failed',
        icon: <XCircle className="h-4 w-4 text-red-600" />,
    },
    {
        value: 'scheduled',
        label: 'Scheduled',
        icon: <CalendarClock className="h-4 w-4 text-primary" />,
    },
    {
        value: 'recurring',
        label: 'Recurring',
        icon: <Repeat className="h-4 w-4 text-violet-600" />,
    },
    {
        value: 'cancelled',
        label: 'Cancelled',
        icon: <Ban className="h-4 w-4 text-amber-600" />,
    },
];

const TEXT_TONES: Record< ChipTone, string > = {
    success: 'text-emerald-700',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    primary: 'text-primary',
    violet: 'text-violet-700',
    neutral: 'text-muted-foreground',
};

const TILE_TONES: Record< ChipTone, string > = {
    success: 'bg-emerald-600/10 text-emerald-700',
    danger: 'bg-red-600/10 text-red-700',
    warning: 'bg-amber-500/10 text-amber-700',
    primary: 'bg-primary/10 text-primary',
    violet: 'bg-violet-500/10 text-violet-700',
    neutral: 'bg-muted text-muted-foreground',
};

const SEND_VIA_LABELS: Record< string, string > = {
    'rest-api': 'REST API',
    web: 'Web',
    mobile: 'Mobile',
    wordpress: 'WordPress',
};

function statusOf( notification: CampaignRow ): StatusType {
    const status = notification.status || 'pending';

    return status in STATUS ? ( status as StatusType ) : 'pending';
}

function notificationRawDate( notification: CampaignRow ): string {
    switch ( statusOf( notification ) ) {
        case 'sent':
            return notification.sent_at || notification.created_at || '';
        case 'scheduled':
            return notification.scheduled_at || '';
        case 'recurring':
            return notification.next_run_at || notification.created_at || '';
        default:
            return notification.created_at || '';
    }
}

// The list is grouped by day; scheduled and recurring sends in the future sit
// under "Upcoming".
function dayGroup( notification: CampaignRow ): { key: string; label: string } {
    const date = new Date( notificationRawDate( notification ) );

    if ( Number.isNaN( date.getTime() ) ) {
        return { key: 'unknown', label: 'Undated' };
    }

    const now = new Date();

    if (
        date > now &&
        [ 'scheduled', 'recurring' ].includes( statusOf( notification ) )
    ) {
        return { key: 'upcoming', label: 'Upcoming' };
    }

    const startOfDay = ( value: Date ) =>
        new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate()
        ).getTime();
    const days = Math.round(
        ( startOfDay( now ) - startOfDay( date ) ) / 86400000
    );
    const key = String( startOfDay( date ) );

    if ( days === 0 ) {
        return { key, label: 'Today' };
    }

    if ( days === 1 ) {
        return { key, label: 'Yesterday' };
    }

    return {
        key,
        label: new Intl.DateTimeFormat( undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year:
                date.getFullYear() === now.getFullYear()
                    ? undefined
                    : 'numeric',
        } ).format( date ),
    };
}

function timeOf( notification: CampaignRow ): string {
    const date = new Date( notificationRawDate( notification ) );

    if ( Number.isNaN( date.getTime() ) ) {
        return '';
    }

    return new Intl.DateTimeFormat( undefined, {
        hour: 'numeric',
        minute: '2-digit',
    } ).format( date );
}

// What to show where the stats go, for campaigns without views.
function statusNote( notification: CampaignRow ): string {
    switch ( statusOf( notification ) ) {
        case 'sent':
            return 'No views yet';
        case 'sending':
            return 'Sending now…';
        case 'scheduled':
            return `Goes out ${ formatRelativeDate(
                notificationRawDate( notification )
            ) }`;
        case 'recurring':
            return `Next send ${ formatRelativeDate(
                notificationRawDate( notification )
            ) }`;
        case 'pending':
            return 'Draft, not sent yet';
        default:
            // Failed and cancelled already say so in the row's status.
            return '';
    }
}

function NotificationForm( {
    settings,
    notificationId,
    isMessage,
}: {
    settings: NotifyPressSettings;
    notificationId?: string;
    isMessage?: boolean;
} ) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const [ form, setForm ] = useState( () => ( {
        ...defaultForm,
        target_url: settings.connectedSite?.site_url || settings.siteUrl || '',
    } ) );
    const validSteps = isMessage
        ? [ 'compose' ]
        : [ 'compose', 'audience', 'send' ];
    const [ step, setStep ] = useState( () => {
        const tabFromUrl = searchParams.get( 'tab' );
        return tabFromUrl && validSteps.includes( tabFromUrl )
            ? tabFromUrl
            : 'compose';
    } );
    const goToStep = ( value: string ) => {
        setStep( value );
        setSearchParams(
            ( previous ) => {
                const next = new URLSearchParams( previous );
                next.set( 'tab', value );
                return next;
            },
            { replace: false }
        );
    };
    const [ draftId, setDraftId ] = useState( notificationId || '' );
    const [ sendOption, setSendOption ] = useState( 'now' );
    const [ iconTypeOption, setIconTypeOption ] = useState( 'default-icon' );
    const [ imageTypeOption, setImageTypeOption ] = useState( 'custom-image' );
    const [ notice, setNotice ] = useState( '' );
    const [ iconPreviewUrl, setIconPreviewUrl ] = useState( '' );
    const [ imagePreviewUrl, setImagePreviewUrl ] = useState( '' );

    const activeNotificationId = draftId || notificationId;

    // per_page=100 lists every segment, not just the API's default first 10.
    const segmentsQuery = useQuery( {
        queryKey: [ 'np-segments-all', settings.apiToken, SEGMENTS_PER_PAGE ],
        queryFn: () =>
            laravelRequest< LaravelCollection< Segment > >(
                settings,
                '/segments',
                { query: { per_page: SEGMENTS_PER_PAGE } }
            ),
    } );

    // Only the total matters: sending is blocked while the site has nobody
    // to notify. Unknown (loading or failed) never blocks.
    const subscribersCountQuery = useQuery( {
        queryKey: [ 'np-subscribers-total', settings.apiToken ],
        enabled: ! isMessage,
        queryFn: () =>
            laravelRequest< LaravelCollection< unknown > >(
                settings,
                '/subscribers',
                { query: { limit: 1 } }
            ),
    } );

    // Which send options the plan includes. Older app versions have no such
    // endpoint: while loading or on failure both stay allowed, the server
    // still refuses and the error notice explains why.
    const capabilitiesQuery = useQuery( {
        queryKey: [ 'np-notification-capabilities', settings.apiToken ],
        enabled: ! isMessage,
        retry: false,
        queryFn: () =>
            laravelRequest< {
                data?: { canSchedule?: boolean; canRecur?: boolean };
            } >( settings, '/notifications/capabilities' ),
    } );

    const lastUsedMediaQuery = useQuery( {
        queryKey: [ 'np-notifications-last-used-media', notificationId ],
        queryFn: () =>
            laravelRequest< {
                data: { icon_url: string; image_url: string };
            } >( settings, '/notifications/last-used-media', {
                query: notificationId ? { exclude: notificationId } : {},
            } ),
    } );

    const notificationQuery = useQuery( {
        queryKey: [ 'np-notification', notificationId ],
        enabled: Boolean( notificationId ),
        queryFn: () =>
            laravelRequest< LaravelResource< Notification > >(
                settings,
                `/notifications/${ notificationId }`
            ),
    } );

    // Message mode: reached via "Create message" (?message=1) or by editing
    // a notification whose purpose is automation_message.
    const isMessageMode =
        Boolean( isMessage ) ||
        notificationQuery.data?.data?.purpose === 'automation_message';

    useEffect( () => {
        const payload = notificationQuery.data?.data;

        if ( ! payload ) {
            return;
        }

        setForm( ( current ) => ( {
            ...current,
            title: payload.title || '',
            message: payload.message || '',
            target_url: payload.target_url || '',
            segment_id: payload.segment_id ? String( payload.segment_id ) : '',
            icon_url: payload.icon_url || '',
            image_url: payload.image_url || '',
            last_used_icon: false,
            last_used_image: false,
            scheduled_date: formatDateInput( payload.scheduled_at ),
            scheduled_time: formatTimeInput( payload.scheduled_at ),
        } ) );
        setDraftId( payload.id ? String( payload.id ) : notificationId || '' );
    }, [ notificationId, notificationQuery.data ] );

    useEffect( () => {
        if ( ! form.icon ) {
            setIconPreviewUrl( '' );
            return undefined;
        }

        const preview = URL.createObjectURL( form.icon );
        setIconPreviewUrl( preview );

        return () => URL.revokeObjectURL( preview );
    }, [ form.icon ] );

    useEffect( () => {
        if ( ! form.image ) {
            setImagePreviewUrl( '' );
            return undefined;
        }

        const preview = URL.createObjectURL( form.image );
        setImagePreviewUrl( preview );

        return () => URL.revokeObjectURL( preview );
    }, [ form.image ] );

    const saveMutation = useMutation( {
        mutationFn: async ( payload: NotificationFormData ) => {
            const body = new FormData();
            const recurringOnlyFields = [
                'frequency',
                'time',
                'days',
                'day_of_month',
            ];
            Object.entries( payload ).forEach( ( [ key, value ] ) => {
                if ( recurringOnlyFields.includes( key ) ) {
                    return;
                }

                if ( value === undefined || value === null || value === '' ) {
                    return;
                }

                if ( typeof value === 'boolean' ) {
                    body.append( key, value ? '1' : '0' );
                    return;
                }

                body.append( key, value );
            } );

            if ( activeNotificationId ) {
                body.append( '_method', 'PUT' );
            } else if ( isMessage ) {
                // Purpose is immutable after creation and distinguishes a
                // reusable automation message from a sendable campaign.
                body.append( 'purpose', 'automation_message' );
            }

            return laravelRequest< LaravelResource< Notification > >(
                settings,
                activeNotificationId
                    ? `/notifications/${ activeNotificationId }`
                    : '/notifications',
                {
                    method: 'POST',
                    body,
                }
            );
        },
        onSuccess: ( data ) => {
            const nextId = data?.data?.id || activeNotificationId;
            if ( nextId ) {
                setDraftId( String( nextId ) );
            }
            queryClient.invalidateQueries( {
                queryKey: [ 'np-notifications' ],
            } );
            // No "Draft saved." notice: saving is an automatic step between
            // the composer tabs, so moving to the next tab is the feedback.
            // Errors still show (see saveAndContinue / handleSubmit).
        },
        onError: ( error ) => setNotice( error.message ),
    } );

    const sendMutation = useMutation( {
        mutationFn: async () => {
            const payload = {
                title: form.title,
                message: form.message,
                target_url: form.target_url || undefined,
                icon_url: form.icon_url || undefined,
                image_url: form.image_url || undefined,
                segment_id: form.segment_id || undefined,
            };

            const response = await laravelRequest< {
                notification?: {
                    id?: number;
                    title?: string;
                    message?: string;
                };
                subscriber_total?: number;
            } >( settings, '/notifications/send', {
                method: 'POST',
                body: payload,
            } );

            if ( activeNotificationId ) {
                try {
                    await laravelRequest(
                        settings,
                        `/notifications/${ activeNotificationId }`,
                        { method: 'DELETE' }
                    );
                } catch ( error ) {
                    // Sending has already succeeded; stale draft cleanup should not block navigation.
                }
            }

            return response;
        },
        onSuccess: ( response ) => {
            // Show the send in Live Activity right away; a short send can
            // start and finish between two polls of the campaigns page.
            const sent = response?.notification;
            if ( sent?.id ) {
                trackOptimisticSend( queryClient, {
                    id: sent.id,
                    title: sent.title || form.title,
                    message: sent.message || form.message,
                    subscriberTotal: Number( response?.subscriber_total || 0 ),
                } );
            }
            queryClient.invalidateQueries( {
                queryKey: [ 'np-notifications' ],
            } );
            navigate( '/notifications' );
        },
        onError: ( error ) => setNotice( error.message ),
    } );

    const scheduleMutation = useMutation( {
        mutationFn: () =>
            laravelRequest(
                settings,
                `/notifications/${ activeNotificationId }/schedule`,
                {
                    method: 'POST',
                    body: {
                        scheduled_at: toScheduleTimestamp(
                            form.scheduled_date,
                            form.scheduled_time
                        ),
                    },
                }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries( {
                queryKey: [ 'np-notifications' ],
            } );
            navigate( '/notifications' );
        },
        onError: ( error ) => setNotice( error.message ),
    } );

    const recurringMutation = useMutation( {
        mutationFn: () =>
            laravelRequest(
                settings,
                `/notifications/${ activeNotificationId }/recurring-send`,
                {
                    method: 'POST',
                    body: {
                        frequency: form.frequency,
                        time: form.time,
                        days:
                            form.frequency === 'weekly' ? form.days : undefined,
                        day_of_month:
                            form.frequency === 'monthly'
                                ? form.day_of_month
                                : undefined,
                    },
                }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries( {
                queryKey: [ 'np-notifications' ],
            } );
            navigate( '/notifications' );
        },
        onError: ( error ) => setNotice( error.message ),
    } );

    const saveAndContinue = async ( nextStep: string ) => {
        setNotice( '' );
        try {
            await saveMutation.mutateAsync( form );
            goToStep( nextStep );
        } catch ( error ) {
            setNotice(
                error instanceof Error ? error.message : 'Request failed.'
            );
        }
    };

    const segments = segmentsQuery.data?.data || [];
    const lastUsedIcon = lastUsedMediaQuery.data?.data?.icon_url || '';
    const lastUsedImage = lastUsedMediaQuery.data?.data?.image_url || '';
    const previewIcon =
        iconPreviewUrl ||
        ( form.last_used_icon ? lastUsedIcon : '' ) ||
        form.icon_url ||
        null;

    const submitButtonLabel = ( () => {
        if ( isMessageMode ) {
            return notificationId ? 'Save message' : 'Create message';
        }

        if ( step !== 'send' ) {
            return 'Save & Continue';
        }

        switch ( sendOption ) {
            case 'now':
                return 'Send Now';
            case 'schedule':
                return 'Save Schedule';
            case 'recurring':
                return 'Save Recurring Send';
            default:
                return 'Save & Continue';
        }
    } )();

    // Same rule as the web composer: no subscribers, nobody to send to.
    // While the count is loading or unknown, sending is not blocked.
    const subscriberTotal = subscribersCountQuery.data?.total;
    const noSubscribers =
        ! isMessageMode &&
        typeof subscriberTotal === 'number' &&
        subscriberTotal <= 0;
    const capabilities = capabilitiesQuery.isError
        ? undefined
        : capabilitiesQuery.data?.data;
    const canSchedule = capabilities?.canSchedule !== false;
    const canRecur = capabilities?.canRecur !== false;

    // Scheduling needs a date and a time; recurring needs a time (and at
    // least one weekday for weekly). Without them the server rejects it.
    let sendOptionComplete = true;

    if ( sendOption === 'schedule' ) {
        sendOptionComplete =
            canSchedule &&
            Boolean( form.scheduled_date && form.scheduled_time );
    } else if ( sendOption === 'recurring' ) {
        sendOptionComplete =
            canRecur &&
            Boolean( form.time ) &&
            ( form.frequency !== 'weekly' || form.days.length > 0 );
    }

    const sendBlocked =
        step === 'send' && ( noSubscribers || ! sendOptionComplete );

    const processing =
        saveMutation.isPending ||
        sendMutation.isPending ||
        scheduleMutation.isPending ||
        recurringMutation.isPending;

    const handleSubmit = ( event: { preventDefault: () => void } ) => {
        event.preventDefault();
        setNotice( '' );

        if ( isMessageMode ) {
            saveMutation
                .mutateAsync( form )
                .then( () => navigate( '/automations/messages' ) )
                .catch( ( error ) =>
                    setNotice(
                        error instanceof Error
                            ? error.message
                            : 'Request failed.'
                    )
                );
            return;
        }

        if ( step === 'compose' ) {
            saveAndContinue( 'audience' );
            return;
        }

        if ( step === 'audience' ) {
            saveAndContinue( 'send' );
            return;
        }

        if ( noSubscribers || ! sendOptionComplete ) {
            return;
        }

        if ( sendOption === 'now' ) {
            sendMutation.mutate();
        } else if ( sendOption === 'schedule' ) {
            scheduleMutation.mutate();
        } else {
            recurringMutation.mutate();
        }
    };

    const weekdayLabels = [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ];

    const toggleRecurringDay = ( labelIndex: number ) => {
        const cronDay = ( labelIndex + 1 ) % 7;
        const days = form.days.includes( cronDay )
            ? form.days.filter( ( day ) => day !== cronDay )
            : [ ...form.days, cronDay ];
        setForm( { ...form, days } );
    };

    const scheduledDateValue = form.scheduled_date
        ? new Date( `${ form.scheduled_date }T00:00:00` )
        : undefined;

    // Later steps stay locked: each step is reached by saving the one
    // before it, so the draft exists before Audience and Send. Earlier
    // steps can be revisited; saving again updates the same draft.
    const stepIndex = validSteps.indexOf( step );
    const composerSteps: Step[] = [
        { value: 'compose', label: 'Content', icon: <Upload /> },
        { value: 'audience', label: 'Audience', icon: <Users /> },
        { value: 'send', label: 'Send', icon: <Send /> },
    ]
        .slice( 0, isMessageMode ? 1 : 3 )
        .map( ( item, index ) => ( {
            ...item,
            disabled: index > stepIndex,
        } ) );

    const renderImageSection = (
        iconOrImage: 'icon' | 'image',
        selectedImageType: string
    ) => {
        const file = iconOrImage === 'icon' ? form.icon : form.image;
        const inputId =
            iconOrImage === 'icon'
                ? 'np-notification-icon'
                : 'np-notification-image';
        const activeType =
            iconOrImage === 'icon' ? 'custom-icon' : 'custom-image';
        const lastUsedSrc =
            iconOrImage === 'icon' ? lastUsedIcon : lastUsedImage;
        const lastUsedType =
            iconOrImage === 'icon' ? 'last-used-icon' : 'last-used-image';

        let content: JSX.Element | null = null;

        if ( iconOrImage === 'icon' && selectedImageType === 'default-icon' ) {
            content = (
                <div className="border-2 border-dashed rounded-lg p-8 transition-colors flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5">
                    <div className="relative text-center flex flex-col">
                        <img
                            src={ defaultBellIcon }
                            alt="Icon preview"
                            className="w-full h-32 object-contain rounded-md mb-2"
                        />
                    </div>
                </div>
            );
        } else if ( selectedImageType === lastUsedType && lastUsedSrc ) {
            content = (
                <div className="border-2 border-dashed rounded-lg p-8 transition-colors flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5">
                    <div className="relative text-center flex flex-col">
                        <img
                            src={ lastUsedSrc }
                            alt="Icon preview"
                            className="w-full h-32 object-contain rounded-md mb-2"
                        />
                    </div>
                </div>
            );
        } else if ( selectedImageType === activeType ) {
            content = (
                <div
                    className={ cn(
                        'border-2 border-dashed rounded-lg p-8 transition-colors flex flex-col items-center justify-center',
                        ! file &&
                            'cursor-pointer hover:border-primary hover:bg-primary/5'
                    ) }
                    onClick={ () => {
                        if ( ! file ) {
                            document.getElementById( inputId )?.click();
                        }
                    } }
                    role="button"
                    tabIndex={ 0 }
                    onKeyDown={ ( event ) => {
                        if ( event.key === 'Enter' && ! file ) {
                            document.getElementById( inputId )?.click();
                        }
                    } }
                >
                    <input
                        accept="image/*"
                        className="hidden"
                        id={ inputId }
                        type="file"
                        onChange={ ( event ) => {
                            const selected = event.target.files?.[ 0 ] || null;

                            if ( iconOrImage === 'icon' ) {
                                setForm( {
                                    ...form,
                                    icon: selected,
                                    icon_url: '',
                                    last_used_icon: false,
                                } );
                            } else {
                                setForm( {
                                    ...form,
                                    image: selected,
                                    image_url: '',
                                    last_used_image: false,
                                } );
                            }
                        } }
                    />
                    { file ? (
                        <div className="relative text-center flex flex-col">
                            <img
                                src={
                                    iconOrImage === 'icon'
                                        ? iconPreviewUrl
                                        : imagePreviewUrl
                                }
                                alt="Icon preview"
                                className="w-full h-32 object-cover rounded-md mb-2"
                            />
                            <Button
                                variant="ghost"
                                className="absolute right-0 top-0 bg-white text-red-500 rounded-none rounded-bl hover:bg-red-500 hover:rounded-tr hover:text-white"
                                onClick={ ( event ) => {
                                    event.stopPropagation();

                                    if ( iconOrImage === 'icon' ) {
                                        setForm( { ...form, icon: null } );
                                    } else {
                                        setForm( { ...form, image: null } );
                                    }
                                } }
                            >
                                <XIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground text-center">
                                Drag &amp; drop an icon here, or click to select
                            </p>
                        </>
                    ) }
                </div>
            );
        }

        return (
            <div className="mt-2 border rounded-lg p-4 flex items-center justify-center">
                { content }
            </div>
        );
    };

    const tabContentCreate = (
        <SectionCard
            title="Content"
            description="What subscribers see when the notification arrives."
        >
            <div className="mt-5">
                <div className="mb-5 space-y-1.5">
                    <Label htmlFor="title">
                        Title <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            required
                            aria-required
                            maxLength={ 50 }
                            id="title"
                            type="text"
                            name="title"
                            value={ form.title }
                            placeholder={ notificationPlaceholder.title }
                            onChange={ ( event ) =>
                                setForm( {
                                    ...form,
                                    title: event.target.value,
                                } )
                            }
                        />
                        <span className="text-sm text-muted-foreground absolute right-2 top-[50%] translate-y-[-50%]">
                            { form.title?.length || 0 }/50
                        </span>
                    </div>
                </div>

                <div className="mb-5 space-y-1.5">
                    <Label htmlFor="message">
                        Message <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Textarea
                            required
                            aria-required
                            id="message"
                            maxLength={ 100 }
                            className="p-3 w-full h-[75px]"
                            name="body"
                            value={ form.message }
                            placeholder={ notificationPlaceholder.message }
                            onChange={ ( event ) =>
                                setForm( {
                                    ...form,
                                    message: event.target.value,
                                } )
                            }
                        />
                        <span className="text-sm text-muted-foreground absolute right-2 top-[50%] translate-y-[-50%]">
                            { form.message?.length || 0 }/100
                        </span>
                    </div>
                </div>

                <div className="mb-5 space-y-1.5">
                    <Label htmlFor="target_url">Target URL</Label>
                    <Input
                        maxLength={ 255 }
                        id="target_url"
                        type="url"
                        className="p-2 w-full"
                        name="target_url"
                        value={ form.target_url }
                        onChange={ ( event ) =>
                            setForm( {
                                ...form,
                                target_url: event.target.value,
                            } )
                        }
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                        <Label>Notification Icon</Label>
                        <RadioGroup
                            disabled={ Boolean( form.icon_url ) }
                            value={ iconTypeOption }
                            onValueChange={ ( selectedIcon ) => {
                                if ( selectedIcon === 'last-used-icon' ) {
                                    setForm( {
                                        ...form,
                                        icon: null,
                                        last_used_icon: true,
                                    } );
                                } else {
                                    setForm( {
                                        ...form,
                                        last_used_icon: false,
                                    } );
                                }
                                setIconTypeOption( selectedIcon );
                            } }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="default-icon"
                                    id="default-icon"
                                />
                                <Label htmlFor="default-icon">Default</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="custom-icon"
                                    id="custom-icon"
                                />
                                <Label htmlFor="custom-icon">Custom</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="last-used-icon"
                                    id="last-used-icon"
                                />
                                <Label htmlFor="last-used-icon">
                                    Last Used
                                </Label>
                            </div>
                        </RadioGroup>
                        { renderImageSection( 'icon', iconTypeOption ) }
                        <div className="flex items-center space-x-2">
                            <Input
                                name="icon_url"
                                type="url"
                                maxLength={ 255 }
                                placeholder="Or enter icon URL"
                                value={ form.icon_url }
                                onChange={ ( event ) =>
                                    setForm( {
                                        ...form,
                                        icon_url: event.target.value,
                                        last_used_icon: false,
                                        icon: null,
                                    } )
                                }
                                className="flex-grow"
                                disabled={ Boolean( form.icon ) }
                            />
                        </div>
                    </div>
                    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                        <Label>Notification Image</Label>
                        <RadioGroup
                            disabled={ Boolean( form.image_url ) }
                            value={ imageTypeOption }
                            onValueChange={ ( selectedImage ) => {
                                if ( selectedImage === 'last-used-image' ) {
                                    setForm( {
                                        ...form,
                                        image: null,
                                        last_used_image: true,
                                    } );
                                } else {
                                    setForm( {
                                        ...form,
                                        last_used_image: false,
                                    } );
                                }
                                setImageTypeOption( selectedImage );
                            } }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="custom-image"
                                    id="custom-image"
                                />
                                <Label htmlFor="custom-image">Custom</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="last-used-image"
                                    id="last-used-image"
                                />
                                <Label htmlFor="last-used-image">
                                    Last Used
                                </Label>
                            </div>
                        </RadioGroup>
                        { renderImageSection( 'image', imageTypeOption ) }
                        <div className="flex items-center space-x-2">
                            <Input
                                type="url"
                                name="image_url"
                                placeholder="Or enter image URL"
                                maxLength={ 255 }
                                value={ form.image_url }
                                onChange={ ( event ) =>
                                    setForm( {
                                        ...form,
                                        image_url: event.target.value,
                                        last_used_image: false,
                                        image: null,
                                    } )
                                }
                                className="flex-grow"
                                disabled={ Boolean( form.image ) }
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>
                                Notification Image Displayed Only on Windows
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </SectionCard>
    );

    const activeSegments = segments.filter(
        ( segment ) => segment.is_active !== false
    );

    const tabContentAudience = (
        <SectionCard
            title="Audience"
            description="Who should get this notification."
        >
            <div className="mt-5 space-y-4">
                <RadioGroup
                    value={ form.segment_id || 'all' }
                    onValueChange={ ( segmentId ) =>
                        setForm( {
                            ...form,
                            segment_id: segmentId === 'all' ? '' : segmentId,
                        } )
                    }
                    className="space-y-2.5"
                >
                    <div className={ CHOICE_ROW }>
                        <RadioGroupItem
                            className="w-5 h-5 flex-shrink-0"
                            value="all"
                            id="send-to-all"
                        />
                        <ChoiceIcon>
                            <Users />
                        </ChoiceIcon>
                        <Label
                            htmlFor="send-to-all"
                            className="cursor-pointer font-medium after:absolute after:inset-0"
                        >
                            Send to All Subscribers
                        </Label>
                    </div>

                    { activeSegments.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
                            No audience groups yet.{ ' ' }
                            <Link
                                to="/segments/new"
                                className="text-primary underline underline-offset-2 hover:no-underline"
                            >
                                Create a segment
                            </Link>{ ' ' }
                            to target a specific group of subscribers.
                        </div>
                    ) : (
                        activeSegments.map( ( segment ) => (
                            <div key={ segment.id } className={ CHOICE_ROW }>
                                <RadioGroupItem
                                    className="w-5 h-5 flex-shrink-0"
                                    value={ String( segment.id ) }
                                    id={ String( segment.id ) }
                                />
                                <ChoiceIcon>
                                    <Filter />
                                </ChoiceIcon>
                                <Label
                                    htmlFor={ String( segment.id ) }
                                    className="cursor-pointer font-medium after:absolute after:inset-0"
                                >
                                    { segment.name }
                                </Label>
                            </div>
                        ) )
                    ) }
                </RadioGroup>

                <p className="text-xs text-muted-foreground">
                    Want to target subscribers by interest or category?{ ' ' }
                    <Link
                        to="/segments"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                    >
                        Create a tag
                    </Link>
                    , then{ ' ' }
                    <Link
                        to="/segments/new"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                    >
                        build a segment
                    </Link>{ ' ' }
                    using that tag.
                </p>
            </div>
        </SectionCard>
    );

    const tabContentSend = (
        <SectionCard
            title="When to send"
            description="Send it now, pick a time, or repeat it on a schedule."
        >
            <div className="mt-5 space-y-5">
                <RadioGroup
                    value={ sendOption }
                    onValueChange={ setSendOption }
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <SendOptionCard
                        value="now"
                        title="Send Now"
                        description="Immediate delivery"
                        icon={ <Send /> }
                        selected={ sendOption === 'now' }
                    />
                    <SendOptionCard
                        value="schedule"
                        title="Schedule"
                        description="Set a future date"
                        icon={ <CalendarIcon /> }
                        selected={ sendOption === 'schedule' }
                        locked={ ! canSchedule }
                    />
                    <SendOptionCard
                        value="recurring"
                        title="Recurring"
                        description="Repeat on a schedule"
                        icon={ <Clock /> }
                        selected={ sendOption === 'recurring' }
                        locked={ ! canRecur }
                    />
                </RadioGroup>
                <SendOptionsUpgrade
                    locked={ [
                        ...( canSchedule ? [] : [ 'Scheduled sends' ] ),
                        ...( canRecur ? [] : [ 'Recurring sends' ] ),
                    ] }
                />
                { sendOption === 'schedule' ? (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                        <div>
                            <Label htmlFor="date_time">
                                Schedule Date and Time
                            </Label>
                        </div>
                        <div>
                            <div className="flex space-x-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            id="date_time"
                                            type="button"
                                            className={ cn(
                                                'w-[240px] justify-start text-left font-normal border-dashed bg-muted/50 hover:bg-muted',
                                                ! scheduledDateValue &&
                                                    'text-muted-foreground'
                                            ) }
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            { scheduledDateValue ? (
                                                format(
                                                    scheduledDateValue,
                                                    'PPP'
                                                )
                                            ) : (
                                                <span>Pick a date</span>
                                            ) }
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={ scheduledDateValue }
                                            onSelect={ ( selected ) =>
                                                setForm( {
                                                    ...form,
                                                    scheduled_date: selected
                                                        ? format(
                                                              selected,
                                                              'yyyy-MM-dd'
                                                          )
                                                        : '',
                                                } )
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <TimePicker
                                    value={ form.scheduled_time }
                                    onChange={ ( time ) =>
                                        setForm( {
                                            ...form,
                                            scheduled_time: time,
                                        } )
                                    }
                                    className="w-[150px]"
                                />
                            </div>
                            { form.scheduled_date &&
                            form.scheduled_time ? null : (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Pick both a date and a time to schedule it.
                                </p>
                            ) }
                        </div>
                    </div>
                ) : null }
                { sendOption === 'recurring' ? (
                    <div className="space-y-4">
                        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                            <div>
                                <Label>Repeat</Label>
                            </div>
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <Select
                                        value={ form.frequency }
                                        onValueChange={ ( value ) =>
                                            setForm( {
                                                ...form,
                                                frequency: value,
                                            } )
                                        }
                                    >
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">
                                                Daily
                                            </SelectItem>
                                            <SelectItem value="weekly">
                                                Weekly
                                            </SelectItem>
                                            <SelectItem value="monthly">
                                                Monthly
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-muted-foreground">
                                        at
                                    </span>
                                    <Label
                                        htmlFor="recurring_time"
                                        className="sr-only"
                                    >
                                        Time
                                    </Label>
                                    <TimePicker
                                        id="recurring_time"
                                        value={ form.time }
                                        onChange={ ( time ) =>
                                            setForm( { ...form, time } )
                                        }
                                        className="w-full sm:w-[150px]"
                                    />
                                </div>
                                { form.time ? null : (
                                    <p className="text-xs text-muted-foreground">
                                        Pick a time for each send.
                                    </p>
                                ) }
                                { form.frequency === 'weekly' ? (
                                    <div>
                                        <Label>On</Label>
                                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                                            { weekdayLabels.map(
                                                ( day, index ) => {
                                                    const cronDay =
                                                        ( index + 1 ) % 7;

                                                    return (
                                                        <div
                                                            key={ day }
                                                            className="flex items-center space-x-2"
                                                        >
                                                            <Switch
                                                                id={ day.toLowerCase() }
                                                                checked={ form.days.includes(
                                                                    cronDay
                                                                ) }
                                                                onCheckedChange={ () =>
                                                                    toggleRecurringDay(
                                                                        index
                                                                    )
                                                                }
                                                            />
                                                            <Label
                                                                htmlFor={ day.toLowerCase() }
                                                            >
                                                                { day }
                                                            </Label>
                                                        </div>
                                                    );
                                                }
                                            ) }
                                        </div>
                                        { form.days.length === 0 ? (
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                Pick at least one day of the
                                                week.
                                            </p>
                                        ) : null }
                                    </div>
                                ) : null }
                                { form.frequency === 'monthly' ? (
                                    <div>
                                        <Label htmlFor="recurring_day_of_month">
                                            Day of month
                                        </Label>
                                        <Input
                                            id="recurring_day_of_month"
                                            type="number"
                                            min={ 1 }
                                            max={ 31 }
                                            value={ form.day_of_month }
                                            onChange={ ( event ) =>
                                                setForm( {
                                                    ...form,
                                                    day_of_month: Number(
                                                        event.target.value
                                                    ),
                                                } )
                                            }
                                            className="w-[100px] mt-2"
                                        />
                                    </div>
                                ) : null }
                            </div>
                        </div>
                    </div>
                ) : null }
            </div>
        </SectionCard>
    );

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <PageHeader
                title={ ( () => {
                    if ( isMessageMode ) {
                        return notificationId
                            ? 'Edit message'
                            : 'Create message';
                    }

                    return notificationId
                        ? 'Edit Notification'
                        : 'Create Notification';
                } )() }
                description={
                    isMessageMode
                        ? 'A reusable message for your automations.'
                        : 'Write it, pick who gets it, then send or schedule it.'
                }
                actions={
                    <Button
                        asChild
                        variant="outline"
                        className="h-10 gap-2 px-4"
                    >
                        <Link
                            to={
                                isMessageMode
                                    ? '/automations/messages'
                                    : '/notifications'
                            }
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden />
                            { isMessageMode ? 'All messages' : 'All campaigns' }
                        </Link>
                    </Button>
                }
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="min-w-0">
                    <form onSubmit={ handleSubmit }>
                        <Tabs value={ step } onValueChange={ goToStep }>
                            <StepTabs active={ step } steps={ composerSteps } />

                            <TabsContent className="mt-5" value="compose">
                                <NoticeMessage
                                    message={ notice }
                                    status={
                                        saveMutation.isError
                                            ? 'error'
                                            : 'success'
                                    }
                                />
                                { tabContentCreate }
                            </TabsContent>

                            { ! isMessageMode ? (
                                <>
                                    <TabsContent
                                        className="mt-5"
                                        value="audience"
                                    >
                                        { tabContentAudience }
                                    </TabsContent>

                                    <TabsContent className="mt-5" value="send">
                                        <NoticeMessage
                                            message={ notice }
                                            status={
                                                sendMutation.isError ||
                                                scheduleMutation.isError ||
                                                recurringMutation.isError
                                                    ? 'error'
                                                    : 'success'
                                            }
                                        />
                                        { tabContentSend }
                                    </TabsContent>
                                </>
                            ) : null }

                            { sendBlocked ? (
                                <div className="mt-5 rounded-xl border border-dashed border-border bg-card px-5 py-6 text-center text-sm text-muted-foreground">
                                    No subscribers yet, so there is nobody to
                                    notify.{ ' ' }
                                    <Link
                                        to="/settings?tab=optin"
                                        className="text-primary underline underline-offset-2 hover:no-underline"
                                    >
                                        Set up the opt-in prompt
                                    </Link>{ ' ' }
                                    to start collecting subscribers.
                                </div>
                            ) : null }

                            <div className="mt-5 flex justify-end">
                                <Button
                                    type="submit"
                                    className="h-10 gap-1 px-5"
                                    disabled={ processing || sendBlocked }
                                    aria-label={ submitButtonLabel }
                                >
                                    { submitButtonLabel }
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        </Tabs>
                    </form>
                </div>

                <ComposerPreview
                    title={ form.title || notificationPlaceholder.title }
                    message={ form.message || notificationPlaceholder.message }
                    icon={ previewIcon }
                />
            </div>
        </div>
    );
}

function siteNameFor( settings?: NotifyPressSettings ): string | null {
    if ( settings?.siteName ) {
        return settings.siteName;
    }

    if ( settings?.connectedSite?.site_name ) {
        return settings.connectedSite.site_name;
    }

    const url = settings?.siteUrl || window.notifypress?.siteUrl || '';

    return (
        url
            .replace( /(^\w+:|^)\/\//, '' )
            .replace( /^www\./, '' )
            .split( '/' )[ 0 ] || null
    );
}

export default function NotificationsPage() {
    const params = useParams();
    const routerLocation = useLocation();
    const queryClient = useQueryClient();
    const { liveSends, markCancelling } = useLiveActivity();
    const [ cursor, setCursor ] = useState( '' );
    const [ statusFilter, setStatusFilter ] = useState( 'all' );
    const [ expandedRow, setExpandedRow ] = useState< string | null >( null );
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const settings = settingsQuery.data;
    const hasToken = hasApiToken( settings );
    const token = getApiToken( settings );
    const siteName = siteNameFor( settings );
    const notificationId = params.notificationId;
    const isFormRoute =
        routerLocation.pathname.includes( '/notifications/new' ) ||
        Boolean( notificationId );

    const notificationsQuery = useQuery( {
        queryKey: [
            'np-notifications',
            token,
            cursor,
            statusFilter,
            LIST_PARAMS,
        ],
        enabled: hasToken && ! isFormRoute,
        queryFn: () =>
            laravelRequest< LaravelCollection< CampaignRow > >(
                settings,
                '/notifications',
                {
                    query: {
                        ...LIST_PARAMS,
                        ...( cursor ? { cursor } : {} ),
                        ...( statusFilter !== 'all'
                            ? { status: statusFilter }
                            : {} ),
                    },
                }
            ),
        refetchInterval: ( query ) =>
            ( query.state.data?.data || [] ).some( ( item ) =>
                [ 'pending', 'scheduled', 'sending' ].includes(
                    item.status || ''
                )
            )
                ? 8000
                : false,
    } );

    const cancelMutation = useMutation( {
        mutationFn: ( id: Notification[ 'id' ] ) =>
            laravelRequest( settings, `/notifications/${ id }/cancel`, {
                method: 'POST',
            } ),
        onSuccess: () => {
            queryClient.invalidateQueries( {
                queryKey: [ 'np-notifications' ],
            } );
            toast.warning( 'Notification cancelled' );
        },
        onError: ( error ) => {
            toast.error( error.message );
        },
    } );

    const rows = useMemo(
        () => notificationsQuery.data?.data || [],
        [ notificationsQuery.data ]
    );
    const setStatusFilterAndResetCursor = ( status: string ) => {
        setStatusFilter( status );
        setCursor( '' );
    };
    const toggleRow = ( id: Notification[ 'id' ] ) => {
        setExpandedRow( ( current ) =>
            current === String( id ) ? null : String( id )
        );
    };
    const loading = notificationsQuery.isFetching && ! notificationsQuery.data;

    if ( isFormRoute && ! hasToken ) {
        return <Navigate replace to="/notifications" />;
    }

    if ( isFormRoute ) {
        if ( ! settings ) {
            return <p className={ ui.subtext }>Loading…</p>;
        }

        return (
            <NotificationForm
                settings={ settings }
                notificationId={ notificationId }
                isMessage={
                    new URLSearchParams( routerLocation.search ).get(
                        'message'
                    ) === '1'
                }
            />
        );
    }

    // Click-rate bars are relative to the best campaign on the page.
    const bestRate = Math.max(
        1,
        ...rows.map(
            ( notification ) =>
                normalizeAnalytics( notification ).click_through_rate
        )
    );

    // Rows come newest-id first, so a day can appear twice (a draft created on
    // the 23rd but sent on the 24th). Keep that order, but pull each day's rows
    // together under the day's first header.
    const groupOrder: string[] = [];
    const byGroup: Record< string, CampaignRow[] > = {};

    rows.forEach( ( notification ) => {
        const key = dayGroup( notification ).key;

        if ( ! byGroup[ key ] ) {
            byGroup[ key ] = [];
            groupOrder.push( key );
        }

        byGroup[ key ].push( notification );
    } );

    const grouped = groupOrder.flatMap( ( key ) => byGroup[ key ] );
    const filterLabel =
        STATUS[ statusFilter as StatusType ]?.label ?? statusFilter;

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <PageHeader
                title="Campaigns"
                description={
                    siteName
                        ? `Send, schedule and track push notifications on ${ siteName }`
                        : 'Send, schedule and track push notifications'
                }
                actions={
                    hasToken ? (
                        <Button
                            asChild
                            className="h-10 w-full gap-2 px-4 sm:w-auto"
                        >
                            <Link to="/notifications/new">
                                <Plus className="h-4 w-4" aria-hidden />
                                New campaign
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            disabled
                            className="h-10 w-full gap-2 px-4 sm:w-auto"
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            New campaign
                        </Button>
                    )
                }
            />

            { liveSends.length > 0 ? (
                <LiveActivityPanel
                    sends={ liveSends }
                    onMarkCancelling={ markCancelling }
                />
            ) : null }

            <section aria-label="Campaigns" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Select
                        value={ statusFilter }
                        onValueChange={ ( value ) => {
                            setStatusFilterAndResetCursor( value );
                        } }
                    >
                        <SelectTrigger
                            aria-label="Filter by status"
                            className="h-9 w-48 gap-2 rounded-lg bg-card text-sm font-medium [&_svg]:h-3.5 [&_svg]:w-3.5"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            { FILTERS.map( ( filter ) => (
                                <SelectItem
                                    key={ filter.value }
                                    value={ filter.value }
                                >
                                    <span className="flex items-center gap-2 [&>svg]:h-3.5 [&>svg]:w-3.5">
                                        { filter.icon }
                                        { filter.label }
                                    </span>
                                </SelectItem>
                            ) ) }
                        </SelectContent>
                    </Select>
                    { rows.length > 0 ? (
                        <p className="hidden text-sm text-muted-foreground sm:block">
                            Newest first · click a sent campaign for its
                            breakdown
                        </p>
                    ) : null }
                </div>

                { loading ? (
                    <ul className="space-y-2.5" aria-hidden>
                        { Array.from( { length: 5 } ).map( ( _, index ) => (
                            <li
                                key={ index }
                                className="flex animate-pulse items-center gap-3 rounded-xl border border-border bg-card p-4"
                            >
                                <span className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-48 rounded bg-muted" />
                                    <div className="h-3 w-72 max-w-full rounded bg-muted" />
                                </div>
                            </li>
                        ) ) }
                    </ul>
                ) : null }

                { ! loading && rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-card">
                        { statusFilter !== 'all' ? (
                            <EmptyState
                                icon={ <ListFilter className="h-5 w-5" /> }
                                title={ `No ${ filterLabel
                                    .replace( '…', '' )
                                    .toLowerCase() } campaigns` }
                            >
                                <p className="max-w-72 text-sm text-muted-foreground">
                                    Nothing matches this filter on this site
                                    yet.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-1 h-10 px-4"
                                    onClick={ () => {
                                        setStatusFilterAndResetCursor( 'all' );
                                    } }
                                >
                                    Show all campaigns
                                </Button>
                            </EmptyState>
                        ) : (
                            <EmptyState
                                icon={ <Bell className="h-5 w-5" /> }
                                title="No notifications"
                            >
                                <p className="max-w-72 text-sm text-muted-foreground">
                                    You don&apos;t have any notifications at the
                                    moment.
                                </p>
                                { hasToken ? (
                                    <Button
                                        asChild
                                        className="mt-1 h-10 gap-2 px-4"
                                    >
                                        <Link to="/notifications/new">
                                            <Plus
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            New campaign
                                        </Link>
                                    </Button>
                                ) : null }
                            </EmptyState>
                        ) }
                    </div>
                ) : null }

                { ! loading && rows.length > 0 ? (
                    <ul
                        className={ cn(
                            'space-y-2 transition-opacity',
                            notificationsQuery.isFetching
                                ? 'opacity-75'
                                : 'opacity-100'
                        ) }
                    >
                        { grouped.map( ( notification, index ) => {
                            const group = dayGroup( notification );
                            const showHeader =
                                index === 0 ||
                                dayGroup( grouped[ index - 1 ] ).key !==
                                    group.key;
                            const analytics =
                                normalizeAnalytics( notification );
                            const hasAnalytics = analytics.views > 0;
                            const expanded =
                                expandedRow === String( notification.id );
                            const rate = analytics.click_through_rate;
                            const status = statusOf( notification );
                            const meta = STATUS[ status ];
                            const createdBy = notification.created_by || '';
                            const via =
                                SEND_VIA_LABELS[ createdBy ] ||
                                createdBy ||
                                'WordPress';
                            const isSent = [ 'sent', 'sending' ].includes(
                                status
                            );
                            const canCancel = [
                                'scheduled',
                                'recurring',
                                'sending',
                            ].includes( status );
                            // No chevron and no buttons: keep the chevron's slot
                            // so the status note lines up. Rows with Edit/Cancel
                            // skip it, so the buttons sit where the chevrons are.
                            const keepChevronSlot =
                                ! hasAnalytics && isSent && ! canCancel;

                            return (
                                <Fragment key={ notification.id }>
                                    { showHeader ? (
                                        <li
                                            aria-hidden
                                            className="flex items-center gap-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-0"
                                        >
                                            { group.label }
                                            <span className="h-px flex-1 bg-border" />
                                        </li>
                                    ) : null }
                                    <li
                                        className={ cn(
                                            'group rounded-xl border bg-card shadow-sm transition-colors',
                                            expanded
                                                ? 'border-primary/40 shadow-sm'
                                                : 'border-border hover:border-primary/30'
                                        ) }
                                    >
                                        { /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- mirrors the app; the chevron state is announced via aria-expanded. */ }
                                        <div
                                            className={ cn(
                                                'flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6 sm:px-5',
                                                hasAnalytics
                                                    ? 'cursor-pointer'
                                                    : null
                                            ) }
                                            aria-expanded={
                                                hasAnalytics
                                                    ? expanded
                                                    : undefined
                                            }
                                            onClick={ () => {
                                                if ( hasAnalytics ) {
                                                    toggleRow(
                                                        notification.id
                                                    );
                                                }
                                            } }
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-4">
                                                <span
                                                    className={ cn(
                                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5',
                                                        TILE_TONES[ meta.tone ]
                                                    ) }
                                                    aria-hidden
                                                >
                                                    { meta.icon }
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="flex min-w-0 items-center gap-2">
                                                        <span
                                                            className="truncate text-[15px] font-semibold leading-6 text-foreground"
                                                            title={
                                                                notification.title
                                                            }
                                                        >
                                                            {
                                                                notification.title
                                                            }
                                                        </span>
                                                        { notification.purpose ===
                                                        'automation_message' ? (
                                                            <Chip tone="violet">
                                                                Message
                                                            </Chip>
                                                        ) : null }
                                                    </p>
                                                    <p
                                                        className="truncate text-sm leading-5 text-muted-foreground"
                                                        title={
                                                            notification.message
                                                        }
                                                    >
                                                        { notification.message }
                                                    </p>
                                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                                                        <span
                                                            className={ cn(
                                                                'notification-status inline-flex items-center gap-1.5 font-semibold',
                                                                TEXT_TONES[
                                                                    meta.tone
                                                                ]
                                                            ) }
                                                        >
                                                            <span
                                                                className={ cn(
                                                                    'h-1.5 w-1.5 rounded-full bg-current',
                                                                    status ===
                                                                        'sending'
                                                                        ? 'animate-pulse'
                                                                        : null
                                                                ) }
                                                                aria-hidden
                                                            />
                                                            { meta.label }
                                                        </span>
                                                        <span aria-hidden>
                                                            ·
                                                        </span>
                                                        <span className="inline-flex items-center">
                                                            { via }
                                                        </span>
                                                        <span aria-hidden>
                                                            ·
                                                        </span>
                                                        <span className="tabular-nums">
                                                            { group.key ===
                                                            'upcoming'
                                                                ? `${
                                                                      status ===
                                                                      'recurring'
                                                                          ? 'Next'
                                                                          : 'Goes out'
                                                                  } ${ formatSentAt(
                                                                      notificationRawDate(
                                                                          notification
                                                                      )
                                                                  ) }`
                                                                : timeOf(
                                                                      notification
                                                                  ) }
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 border-t border-border pt-3 sm:border-0 sm:pt-0">
                                                { hasAnalytics ? (
                                                    <dl className="grid flex-1 grid-cols-3 gap-4 sm:w-[360px] sm:flex-none">
                                                        <div>
                                                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                                Views
                                                            </dt>
                                                            <dd className="font-display text-lg font-semibold leading-7 tabular-nums text-foreground">
                                                                { formatCount(
                                                                    analytics.views
                                                                ) }
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                                Clicks
                                                            </dt>
                                                            <dd className="font-display text-lg font-semibold leading-7 tabular-nums text-foreground">
                                                                { formatCount(
                                                                    analytics.clicks
                                                                ) }
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                                CTR
                                                            </dt>
                                                            <dd className="font-display text-lg font-semibold leading-7 tabular-nums text-primary">
                                                                { rate }%
                                                            </dd>
                                                            <div
                                                                className="mt-0.5 h-1 w-full max-w-24 overflow-hidden rounded-full bg-muted"
                                                                aria-hidden
                                                            >
                                                                <div
                                                                    className="h-full rounded-full bg-primary"
                                                                    style={ {
                                                                        width: `${ Math.min(
                                                                            100,
                                                                            ( rate /
                                                                                bestRate ) *
                                                                                100
                                                                        ) }%`,
                                                                    } }
                                                                />
                                                            </div>
                                                        </div>
                                                    </dl>
                                                ) : (
                                                    <p
                                                        className={ cn(
                                                            'flex-1 text-xs font-medium sm:w-[360px] sm:flex-none',
                                                            status === 'failed'
                                                                ? 'text-destructive'
                                                                : 'text-muted-foreground'
                                                        ) }
                                                    >
                                                        { statusNote(
                                                            notification
                                                        ) }
                                                    </p>
                                                ) }

                                                { /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only stops the row toggle. */ }
                                                <div
                                                    className="ml-auto flex shrink-0 items-center justify-end gap-1 sm:ml-0"
                                                    onClick={ ( event ) => {
                                                        event.stopPropagation();
                                                    } }
                                                >
                                                    { isSent ? null : (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        to={ `/notifications/${ notification.id }/edit` }
                                                                        aria-label={ `Edit ${ notification.title }` }
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                                    >
                                                                        <Edit3
                                                                            className="h-4 w-4"
                                                                            aria-hidden
                                                                        />
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    Edit
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) }
                                                    { canCancel ? (
                                                        <AlertDialog>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <AlertDialogTrigger
                                                                            asChild
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                aria-label={ `Cancel ${ notification.title }` }
                                                                                disabled={
                                                                                    cancelMutation.isPending
                                                                                }
                                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                                                                            >
                                                                                <Ban
                                                                                    className="h-4 w-4"
                                                                                    aria-hidden
                                                                                />
                                                                            </button>
                                                                        </AlertDialogTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Cancel
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <div className="mb-1 flex h-10 w-10 items-center justify-center self-center rounded-full bg-destructive/10 text-destructive sm:self-start">
                                                                        <Ban className="h-5 w-5" />
                                                                    </div>
                                                                    <AlertDialogTitle>
                                                                        { status ===
                                                                        'sending'
                                                                            ? 'Cancel this send?'
                                                                            : `Cancel this ${ status } send?` }
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        { status ===
                                                                        'recurring'
                                                                            ? 'This will stop the recurring schedule. The notification will be marked Cancelled and can be re-scheduled later.'
                                                                            : null }
                                                                        { status ===
                                                                        'sending'
                                                                            ? 'This will stop delivery to remaining subscribers. Messages already queued may still be delivered.'
                                                                            : null }
                                                                        { status ===
                                                                        'scheduled'
                                                                            ? 'This will cancel the scheduled send. The notification will be marked Cancelled.'
                                                                            : null }
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>
                                                                        Keep it
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        onClick={ () => {
                                                                            cancelMutation.mutate(
                                                                                notification.id
                                                                            );
                                                                        } }
                                                                    >
                                                                        Cancel
                                                                        send
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    ) : null }
                                                </div>
                                                { hasAnalytics ? (
                                                    <ChevronRight
                                                        className={ cn(
                                                            'h-5 w-5 shrink-0 transition-transform',
                                                            expanded
                                                                ? 'rotate-90 text-primary'
                                                                : 'text-muted-foreground group-hover:text-foreground'
                                                        ) }
                                                        aria-hidden
                                                    />
                                                ) : null }
                                                { keepChevronSlot ? (
                                                    <span
                                                        className="w-5 shrink-0"
                                                        aria-hidden
                                                    />
                                                ) : null }
                                            </div>
                                        </div>

                                        { expanded && hasAnalytics ? (
                                            <div className="px-4 pb-3">
                                                <CampaignInsights
                                                    analytics={ analytics }
                                                />
                                            </div>
                                        ) : null }
                                    </li>
                                </Fragment>
                            );
                        } ) }
                    </ul>
                ) : null }

                { ! loading && rows.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <p className="text-sm text-muted-foreground">
                            { rows.length } on this page
                        </p>
                        <CursorPager
                            label="Campaign pages"
                            hasPrevious={ Boolean(
                                notificationsQuery.data?.prev_cursor
                            ) }
                            hasNext={ Boolean(
                                notificationsQuery.data?.next_cursor
                            ) }
                            disabled={ notificationsQuery.isFetching }
                            onPrevious={ () => {
                                setCursor(
                                    notificationsQuery.data?.prev_cursor || ''
                                );
                            } }
                            onNext={ () => {
                                setCursor(
                                    notificationsQuery.data?.next_cursor || ''
                                );
                            } }
                        />
                    </div>
                ) : null }
            </section>
        </div>
    );
}
