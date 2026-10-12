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
    Airplay,
    Ban,
    Calendar as CalendarIcon,
    CalendarClock,
    BarChart,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Globe,
    Clock,
    Edit3,
    Eye,
    ListFilter,
    Loader2,
    MousePointerClick,
    Plus,
    Repeat,
    Server,
    Send,
    Smartphone,
    Upload,
    WorkflowIcon as WordPress,
    XCircle,
    XIcon,
    Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../components/utils';
import useLiveActivity from '../lib/use-live-activity';
import LiveActivityPanel from '../components/live-activity-panel';
import defaultBellIcon from '../../images/default-icon.png';
import ChromeMac from '../components/notifications/previews/ChromeMac';
import ChromeWindows from '../components/notifications/previews/ChromeWindows';
import FirefoxMac from '../components/notifications/previews/FirefoxMac';
import FirefoxWindows from '../components/notifications/previews/FirefoxWindows';
import SafariMac from '../components/notifications/previews/SafariMac';
import { toast } from 'sonner';
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
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../components/ui/popover';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Textarea } from '../components/ui/textarea';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { TimePicker } from '../components/ui/time-picker';
import {
    Bar as RechartsBar,
    BarChart as RechartsBarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from 'recharts';
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

function notificationDate( notification: Notification ): string {
    let value = notification.created_at;

    if ( notification.status === 'sent' ) {
        value = notification.sent_at || notification.created_at;
    } else if ( notification.status === 'scheduled' ) {
        value = notification.scheduled_at;
    }

    if ( ! value ) {
        return '—';
    }

    const date = new Date( value );

    if ( Number.isNaN( date.getTime() ) ) {
        return value;
    }

    return new Intl.DateTimeFormat( 'en-US' ).format( date );
}

function sendViaLabel( createdBy?: string ) {
    const labels: Record< string, string > = {
        'rest-api': 'REST API',
        web: 'Web',
        mobile: 'Mobile',
        wordpress: 'WordPress',
    };

    return labels[ createdBy || '' ] || createdBy || 'WordPress';
}

function SendViaIcon( { createdBy }: { createdBy?: string } ) {
    const icons: Record< string, typeof Server > = {
        mobile: Smartphone,
        wordpress: WordPress,
        web: Globe,
    };
    const Icon = icons[ createdBy || '' ] || Server;

    return (
        <span className="flex items-center font-medium">
            <Icon className="h-4 w-4 mr-2" />
            { sendViaLabel( createdBy ) }
        </span>
    );
}

function notificationStatusClass( status?: string ) {
    switch ( status ) {
        case 'sending':
            return 'bg-blue-100 text-sm text-blue-600 animate-pulse';
        case 'sent':
            return 'bg-emerald-600/10 text-sm text-emerald-600';
        case 'pending':
            return 'bg-gray-100 text-sm text-gray-600';
        case 'failed':
            return 'bg-red-100 text-sm text-red-600';
        case 'scheduled':
            return 'bg-purple-100 text-sm text-purple-600';
        case 'recurring':
            return 'bg-indigo-100 text-sm text-indigo-600';
        default:
            return 'bg-gray-100 text-sm text-gray-600';
    }
}

function NotificationStatusBadge( { status }: { status?: string } ) {
    const icons: Record< string, JSX.Element > = {
        sending: (
            <Loader2 className="text-blue-500 mr-2 h-4 w-4 animate-spin" />
        ),
        sent: <CheckCircle className="text-emerald-600 mr-2 h-4 w-4" />,
        pending: <Clock className="text-muted-foreground mr-2 h-4 w-4" />,
        failed: <XCircle className="text-red-500 mr-2 h-4 w-4" />,
        scheduled: <CalendarClock className="text-purple-500 mr-2 h-4 w-4" />,
        recurring: <Repeat className="text-indigo-500 mr-2 h-4 w-4" />,
    };

    const label = status
        ? status.charAt( 0 ).toUpperCase() + status.slice( 1 )
        : 'Unknown';

    return (
        <span
            className={ `${ notificationStatusClass(
                status
            ) } notification-status flex items-center max-w-fit rounded-full py-1 px-3 font-medium` }
        >
            { icons[ status || 'pending' ] || icons.pending }
            { status === 'sending' ? 'Sending...' : label }
        </span>
    );
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

    const segmentsQuery = useQuery( {
        queryKey: [ 'np-segments-all', settings.apiToken ],
        queryFn: () =>
            laravelRequest< LaravelCollection< Segment > >(
                settings,
                '/segments'
            ),
    } );

    const latestNotificationQuery = useQuery( {
        queryKey: [ 'np-notifications-latest', settings.apiToken ],
        enabled: ! Boolean( notificationId ),
        queryFn: () =>
            laravelRequest< LaravelCollection< Notification > >(
                settings,
                '/notifications',
                {
                    query: { limit: 1, order: 'desc' },
                }
            ),
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
            setNotice( 'Draft saved.' );
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

            const response = await laravelRequest(
                settings,
                '/notifications/send',
                {
                    method: 'POST',
                    body: payload,
                }
            );

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
        onSuccess: () => {
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
    const lastUsedIcon =
        notificationQuery.data?.data?.icon_preview_url ||
        latestNotificationQuery.data?.data?.[ 0 ]?.icon_preview_url ||
        '';
    const lastUsedImage =
        notificationQuery.data?.data?.image_preview_url ||
        latestNotificationQuery.data?.data?.[ 0 ]?.image_preview_url ||
        '';
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

    const tabTriggerClass = ( tab: string ) =>
        cn(
            'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground gap-2 sm:flex',
            {
                hidden: step !== tab,
            }
        );

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
        <Card className="mb-4">
            <CardContent className="pt-5">
                <div className="mb-4">
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

                <div className="mb-4">
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

                <div className="mb-4">
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

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Label>Notification Icon</Label>
                        <RadioGroup
                            disabled={ Boolean( form.icon_url ) }
                            defaultValue="default-icon"
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
                    <div className="space-y-4">
                        <Label>Notification Image</Label>
                        <RadioGroup
                            disabled={ Boolean( form.image_url ) }
                            defaultValue="custom-image"
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

                        <div className="flex items-center space-x-2 text-sm text-yellow-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                                Notification Image Displayed Only on Windows
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const activeSegments = segments.filter(
        ( segment ) => segment.is_active !== false
    );

    const tabContentAudience = (
        <div className="mb-4 space-y-4">
            <RadioGroup
                value={ form.segment_id || 'all' }
                onValueChange={ ( segmentId ) =>
                    setForm( {
                        ...form,
                        segment_id: segmentId === 'all' ? '' : segmentId,
                    } )
                }
                className="space-y-2"
            >
                <div className="bg-card transition-[border-color] flex items-center space-x-2 px-5 py-5 rounded-lg border border-border relative hover:border-primary">
                    <RadioGroupItem
                        className="w-5 h-5 flex-shrink-0"
                        value="all"
                        id="send-to-all"
                    />
                    <Label
                        htmlFor="send-to-all"
                        className="cursor-pointer font-medium"
                    >
                        Send to All Subscribers
                    </Label>
                </div>

                { activeSegments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
                        No audience groups yet. Create a segment to target a
                        specific group of subscribers.
                    </div>
                ) : (
                    activeSegments.map( ( segment ) => (
                        <div
                            key={ segment.id }
                            className="bg-card transition-[border-color] flex items-center space-x-2 px-5 py-5 rounded-lg border border-border relative hover:border-primary"
                        >
                            <RadioGroupItem
                                className="w-5 h-5 flex-shrink-0"
                                value={ String( segment.id ) }
                                id={ String( segment.id ) }
                            />
                            <Label
                                htmlFor={ String( segment.id ) }
                                className="cursor-pointer font-medium"
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
    );

    const sendOptionCards = [
        {
            value: 'now',
            icon: Send,
            label: 'Send Now',
            description: 'Immediate delivery',
        },
        {
            value: 'schedule',
            icon: CalendarIcon,
            label: 'Schedule',
            description: 'Set a future date',
        },
        {
            value: 'recurring',
            icon: Clock,
            label: 'Recurring',
            description: 'Repeat on a schedule',
        },
    ];

    const tabContentSend = (
        <div className="space-y-6 mb-4">
            <RadioGroup
                value={ sendOption }
                onValueChange={ setSendOption }
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                { sendOptionCards.map( ( option ) => {
                    const OptionIcon = option.icon;

                    return (
                        <Card
                            key={ option.value }
                            className={ cn(
                                'relative transition-all cursor-pointer',
                                sendOption === option.value
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                    : 'hover:border-primary/50'
                            ) }
                        >
                            <CardContent className="flex items-center space-x-4 p-4">
                                <RadioGroupItem
                                    value={ option.value }
                                    id={ option.value }
                                    className="sr-only"
                                />
                                <div
                                    className={ cn(
                                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                                        sendOption === option.value
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    ) }
                                >
                                    <OptionIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="font-medium text-sm">
                                        { option.label }
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        { option.description }
                                    </p>
                                </div>
                                <Label
                                    htmlFor={ option.value }
                                    className="absolute inset-0 cursor-pointer"
                                ></Label>
                            </CardContent>
                        </Card>
                    );
                } ) }
            </RadioGroup>
            { sendOption === 'schedule' ? (
                <Card>
                    <CardHeader>
                        <Label htmlFor="date_time">
                            Schedule Date and Time
                        </Label>
                    </CardHeader>
                    <CardContent>
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
                                            format( scheduledDateValue, 'PPP' )
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
                    </CardContent>
                </Card>
            ) : null }
            { sendOption === 'recurring' ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <Label>Repeat</Label>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <Select
                                    value={ form.frequency }
                                    onValueChange={ ( value ) =>
                                        setForm( { ...form, frequency: value } )
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
                            { form.frequency === 'weekly' ? (
                                <div>
                                    <Label>On</Label>
                                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                                        { weekdayLabels.map( ( day, index ) => {
                                            const cronDay = ( index + 1 ) % 7;

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
                                        } ) }
                                    </div>
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
                        </CardContent>
                    </Card>
                </div>
            ) : null }
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="flex justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <form onSubmit={ handleSubmit }>
                        <Tabs value={ step } onValueChange={ goToStep }>
                            <TabsList className="h-auto bg-transparent border-b border-border rounded-none w-full justify-start gap-0 p-0 mb-0">
                                <TabsTrigger
                                    className={ tabTriggerClass( 'compose' ) }
                                    value="compose"
                                >
                                    <Upload className="w-4 h-4" />
                                    Create Notification
                                </TabsTrigger>
                                { ! isMessageMode ? (
                                    <>
                                        <TabsTrigger
                                            className={ tabTriggerClass(
                                                'audience'
                                            ) }
                                            value="audience"
                                        >
                                            <Users className="w-4 h-4" />
                                            Audience
                                        </TabsTrigger>
                                        <TabsTrigger
                                            className={ tabTriggerClass(
                                                'send'
                                            ) }
                                            value="send"
                                        >
                                            <Send className="w-4 h-4" />
                                            Send
                                        </TabsTrigger>
                                    </>
                                ) : null }
                            </TabsList>

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

                            <div className="flex justify-end mt-4 relative">
                                <Button
                                    type="submit"
                                    disabled={ processing }
                                    aria-label={ submitButtonLabel }
                                >
                                    { submitButtonLabel }
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        </Tabs>
                    </form>
                </div>

                <div className="hidden sm:flex flex-col w-[400px] flex-shrink-0">
                    <div className="flex items-center gap-2 px-4 py-3 mb-3 border-b-2 border-primary text-sm font-medium">
                        <Airplay className="w-4 h-4 text-primary" />
                        <span>Notification Preview</span>
                    </div>
                    <Card>
                        <CardContent className="pt-5 pb-0">
                            <ChromeMac
                                classes="mb-7"
                                cardTitle="Mac OS - Chrome"
                                title={
                                    form.title || notificationPlaceholder.title
                                }
                                message={
                                    form.message ||
                                    notificationPlaceholder.message
                                }
                                icon={ previewIcon || undefined }
                            />
                            <FirefoxMac
                                classes="mb-7"
                                cardTitle="Mac OS - Firefox"
                                title={
                                    form.title || notificationPlaceholder.title
                                }
                                message={
                                    form.message ||
                                    notificationPlaceholder.message
                                }
                                icon={ previewIcon || undefined }
                            />
                            <SafariMac
                                classes="mb-7"
                                cardTitle="Mac OS - Safari"
                                title={
                                    form.title || notificationPlaceholder.title
                                }
                                message={
                                    form.message ||
                                    notificationPlaceholder.message
                                }
                                icon={ previewIcon || undefined }
                            />
                            <ChromeWindows
                                classes="mb-7"
                                cardTitle="Windows OS - Chrome"
                                title={
                                    form.title || notificationPlaceholder.title
                                }
                                message={
                                    form.message ||
                                    notificationPlaceholder.message
                                }
                                icon={ previewIcon || undefined }
                            />
                            <FirefoxWindows
                                classes="mb-7"
                                cardTitle="Windows OS - Firefox"
                                title={
                                    form.title || notificationPlaceholder.title
                                }
                                message={
                                    form.message ||
                                    notificationPlaceholder.message
                                }
                                icon={ previewIcon || undefined }
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const params = useParams();
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const queryClient = useQueryClient();
    const { liveSends, markCancelling } = useLiveActivity();
    const [ cursor, setCursor ] = useState( '' );
    const [ statusFilter, setStatusFilter ] = useState( 'all' );
    const [ expandedRow, setExpandedRow ] = useState< string | number | null >(
        null
    );
    const [ analyticsTab, setAnalyticsTab ] = useState<
        'overview' | 'browsers' | 'devices'
    >( 'overview' );
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const settings = settingsQuery.data;
    const hasToken = hasApiToken( settings );
    const token = getApiToken( settings );
    const notificationId = params.notificationId;
    const isFormRoute =
        routerLocation.pathname.includes( '/notifications/new' ) ||
        Boolean( notificationId );

    const notificationsQuery = useQuery( {
        queryKey: [ 'np-notifications', token, cursor, statusFilter ],
        enabled: hasToken && ! isFormRoute,
        queryFn: () =>
            laravelRequest< LaravelCollection< Notification > >(
                settings,
                '/notifications',
                {
                    query: {
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
            String( current ) === String( id ) ? null : id
        );
        setAnalyticsTab( 'overview' );
    };
    const loading = notificationsQuery.isFetching && ! notificationsQuery.data;

    const renderSkeletonRows = () =>
        Array.from( { length: 5 } ).map( ( _, index ) => (
            <tr className="animate-pulse" key={ index }>
                <td className={ ui.td }>
                    <div className="h-4 w-4 rounded bg-muted" />
                </td>
                { Array.from( { length: 6 } ).map( ( __, cellIndex ) => (
                    <td className={ ui.td } key={ cellIndex }>
                        <div
                            className={ `h-4 rounded bg-muted ${
                                cellIndex === 1 ? 'w-40' : 'w-24'
                            }` }
                        />
                    </td>
                ) ) }
                <td className={ ui.td }>
                    <div className="ml-auto h-8 w-8 rounded bg-muted" />
                </td>
            </tr>
        ) );

    const renderAnalytics = ( analytics: NotificationAnalytics ) => {
        const views = analytics.views || 0;
        const clicks = analytics.clicks || 0;
        const ctr = analytics.click_through_rate || 0;
        const browserData = [
            { name: 'Chrome', value: analytics.browsers?.chrome || 0 },
            { name: 'Firefox', value: analytics.browsers?.firefox || 0 },
            { name: 'Safari', value: analytics.browsers?.safari || 0 },
            { name: 'Edge', value: analytics.browsers?.edge || 0 },
            { name: 'Opera', value: analytics.browsers?.opera || 0 },
            { name: 'Other', value: analytics.browsers?.other || 0 },
        ];
        const deviceData = [
            {
                name: 'Desktop',
                value: analytics.devices?.desktop || 0,
                icon: Server,
            },
            {
                name: 'Mobile',
                value: analytics.devices?.mobile || 0,
                icon: Smartphone,
            },
            {
                name: 'Tablet',
                value: analytics.devices?.tablet || 0,
                icon: WordPress,
            },
        ];

        return (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-7">
                <Tabs
                    className="w-full"
                    value={ analyticsTab }
                    onValueChange={ ( value ) =>
                        setAnalyticsTab( value as typeof analyticsTab )
                    }
                >
                    <TabsList className="grid h-11 w-full grid-cols-3 bg-transparent p-0 text-muted-foreground">
                        <TabsTrigger
                            className="!border-0 py-3 text-base font-semibold !shadow-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            value="overview"
                        >
                            Impressions
                        </TabsTrigger>
                        <TabsTrigger
                            className="!border-0 py-3 text-base font-semibold !shadow-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            value="browsers"
                        >
                            Browsers
                        </TabsTrigger>
                        <TabsTrigger
                            className="!border-0 py-3 text-base font-semibold !shadow-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            value="devices"
                        >
                            Devices
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6 space-y-5">
                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="flex items-center gap-4">
                                <div className="grid h-10 w-10 place-items-center text-foreground">
                                    <Eye className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Views
                                    </p>
                                    <p className="text-3xl font-bold leading-none text-foreground">
                                        { views.toLocaleString() }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="grid h-10 w-10 place-items-center text-foreground">
                                    <MousePointerClick className="h-8 w-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Clicks
                                    </p>
                                    <p className="text-3xl font-bold leading-none text-foreground">
                                        { clicks.toLocaleString() }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="mb-2 text-sm font-medium text-muted-foreground">
                                Click-through Rate
                            </p>
                            <Progress value={ ctr } className="h-2" />
                            <p className="mt-2 text-sm text-muted-foreground">
                                { ctr }%
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="browsers" className="mt-6 space-y-4">
                        <h4 className="text-lg font-semibold text-foreground">
                            Browser Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={ 220 }>
                            <RechartsBarChart
                                data={ browserData }
                                layout="vertical"
                                margin={ {
                                    top: 0,
                                    right: 0,
                                    left: -16,
                                    bottom: 0,
                                } }
                            >
                                <CartesianGrid
                                    horizontal={ false }
                                    strokeDasharray="3 3"
                                />
                                <XAxis hide type="number" />
                                <YAxis
                                    axisLine={ false }
                                    dataKey="name"
                                    tickLine={ false }
                                    type="category"
                                    width={ 100 }
                                />
                                <RechartsTooltip
                                    content={ ( { active, payload } ) =>
                                        active && payload && payload.length ? (
                                            <div className="rounded bg-background p-2 shadow">
                                                <p className="font-semibold">
                                                    { `Total: ${ (
                                                        payload[ 0 ]?.value || 0
                                                    ).toLocaleString() }` }
                                                </p>
                                            </div>
                                        ) : null
                                    }
                                />
                                <RechartsBar
                                    dataKey="value"
                                    fill="hsl(var(--primary))"
                                    radius={ [ 0, 4, 4, 0 ] }
                                />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="devices" className="mt-6 space-y-4">
                        <h4 className="text-lg font-semibold text-foreground">
                            Device Distribution
                        </h4>
                        <div className="grid gap-4 md:grid-cols-3">
                            { deviceData.map( ( device ) => {
                                const DeviceIcon = device.icon;
                                const percent = views
                                    ? Math.round(
                                          ( device.value / views ) * 100
                                      )
                                    : 0;

                                return (
                                    <div
                                        key={ device.name }
                                        className="rounded-2xl border border-border bg-background p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground">
                                                <DeviceIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block text-sm font-medium text-foreground">
                                                    { device.name }
                                                </span>
                                                <span className="block text-sm text-muted-foreground">
                                                    { device.value.toLocaleString() }
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <Progress
                                                className="h-2"
                                                value={ percent }
                                            />
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            { percent }%
                                        </p>
                                    </div>
                                );
                            } ) }
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        );
    };

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

    return (
        <div className={ ui.page }>
            <section
                className={ `${
                    ui.tableWrap
                } transition-opacity duration-500 ${
                    loading ? 'opacity-75' : 'opacity-100'
                }` }
            >
                <div className="flex gap-1 sm:gap-0 flex-col sm:flex-row sm:items-center justify-between space-y-0 p-6 pb-2">
                    <h3 className="text-2xl font-bold leading-none tracking-tight text-foreground">
                        Notifications
                    </h3>
                    <div className="flex items-center sm:space-x-2 flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 pb-2 sm:pb-0">
                        <Select
                            value={ statusFilter }
                            onValueChange={ setStatusFilterAndResetCursor }
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <span className="flex items-center gap-2">
                                        <ListFilter className="h-4 w-4 text-muted-foreground" />
                                        All
                                    </span>
                                </SelectItem>
                                <SelectItem value="sent">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                        Sent
                                    </span>
                                </SelectItem>
                                <SelectItem value="pending">
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        Pending
                                    </span>
                                </SelectItem>
                                <SelectItem value="failed">
                                    <span className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4 text-red-600" />
                                        Failed
                                    </span>
                                </SelectItem>
                                <SelectItem value="scheduled">
                                    <span className="flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-purple-600" />
                                        Scheduled
                                    </span>
                                </SelectItem>
                                <SelectItem value="recurring">
                                    <span className="flex items-center gap-2">
                                        <Repeat className="h-4 w-4 text-indigo-600" />
                                        Recurring
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        { hasToken ? (
                            <Button asChild className="w-full sm:w-auto">
                                <Link to="/notifications/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Notification
                                </Link>
                            </Button>
                        ) : null }
                    </div>
                </div>

                { liveSends.length > 0 ? (
                    <div className="p-6 pb-0">
                        <LiveActivityPanel
                            sends={ liveSends }
                            onMarkCancelling={ markCancelling }
                        />
                    </div>
                ) : null }

                <div className="overflow-x-auto">
                    <table className="min-w-full w-full caption-bottom text-sm">
                        <thead className="bg-muted/50 [&_tr]:border-b">
                            <tr className="border-y border-border transition-colors hover:bg-muted/50">
                                <th className={ `w-[32px] ${ ui.th }` } />
                                <th className={ ui.th }>Title</th>
                                <th className={ ui.th }>Message</th>
                                <th className={ ui.th }>Via</th>
                                <th className={ ui.th }>Status</th>
                                <th className={ ui.th }>Views / Clicks</th>
                                <th className={ ui.th }>Date</th>
                                <th className={ `w-[40px] ${ ui.th }` } />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border [&_tr:last-child]:border-0">
                            { loading ? renderSkeletonRows() : null }
                            { ! loading && rows.length > 0
                                ? rows.map( ( notification ) => {
                                      const analytics =
                                          normalizeAnalytics( notification );
                                      const hasAnalytics = analytics.views > 0;
                                      const isExpanded =
                                          String( expandedRow ) ===
                                          String( notification.id );
                                      const ExpandIcon = isExpanded
                                          ? ChevronUp
                                          : ChevronDown;

                                      return (
                                          <Fragment key={ notification.id }>
                                              <tr
                                                  className={ `border-b hover:bg-muted/50 transition-colors ${
                                                      hasAnalytics
                                                          ? 'cursor-pointer'
                                                          : ''
                                                  }` }
                                                  onClick={ () =>
                                                      hasAnalytics
                                                          ? toggleRow(
                                                                notification.id
                                                            )
                                                          : undefined
                                                  }
                                              >
                                                  <td
                                                      className={ `${ ui.td } pr-0` }
                                                  >
                                                      { hasAnalytics ? (
                                                          <ExpandIcon className="h-4 w-4 text-muted-foreground" />
                                                      ) : (
                                                          <span className="block h-4 w-4" />
                                                      ) }
                                                  </td>
                                                  <td
                                                      className={ `${ ui.td } font-medium max-w-[180px] truncate` }
                                                  >
                                                      <span className="truncate">
                                                          { notification.title }
                                                      </span>
                                                  </td>
                                                  <td
                                                      className={ `${ ui.td } text-muted-foreground max-w-[220px] truncate` }
                                                  >
                                                      { notification.message }
                                                  </td>
                                                  <td
                                                      className={ `${ ui.td } w-[120px]` }
                                                  >
                                                      <SendViaIcon
                                                          createdBy={
                                                              notification.created_by
                                                          }
                                                      />
                                                  </td>
                                                  <td
                                                      className={ `${ ui.td } w-[130px]` }
                                                  >
                                                      <NotificationStatusBadge
                                                          status={
                                                              notification.status
                                                          }
                                                      />
                                                  </td>
                                                  <td
                                                      className={ `${ ui.td } w-[140px]` }
                                                  >
                                                      { hasAnalytics ? (
                                                          <div className="flex items-center gap-3 text-sm">
                                                              <span className="flex items-center gap-1 text-muted-foreground">
                                                                  <Eye className="h-3.5 w-3.5" />
                                                                  { analytics.views.toLocaleString() }
                                                              </span>
                                                              <span className="flex items-center gap-1 text-muted-foreground">
                                                                  <MousePointerClick className="h-3.5 w-3.5" />
                                                                  { analytics.clicks.toLocaleString() }
                                                              </span>
                                                          </div>
                                                      ) : (
                                                          <span className="text-xs text-muted-foreground/60">
                                                              —
                                                          </span>
                                                      ) }
                                                  </td>
                                                  <td
                                                      className={ `${ ui.td } text-sm text-muted-foreground whitespace-nowrap` }
                                                  >
                                                      { notificationDate(
                                                          notification
                                                      ) }
                                                  </td>
                                                  <td
                                                      className={ ui.td }
                                                      onClick={ ( event ) =>
                                                          event.stopPropagation()
                                                      }
                                                  >
                                                      <div className="flex items-center gap-1">
                                                          <button
                                                              type="button"
                                                              onClick={ () =>
                                                                  navigate(
                                                                      `/notifications/${ notification.id }/edit`
                                                                  )
                                                              }
                                                              className={ `flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors ${
                                                                  [
                                                                      'sent',
                                                                      'sending',
                                                                  ].includes(
                                                                      notification.status ||
                                                                          ''
                                                                  )
                                                                      ? 'pointer-events-none opacity-30'
                                                                      : ''
                                                              }` }
                                                          >
                                                              <Edit3 className="h-4 w-4" />
                                                              <span className="sr-only">
                                                                  Edit
                                                              </span>
                                                          </button>
                                                          { [
                                                              'scheduled',
                                                              'recurring',
                                                              'sending',
                                                          ].includes(
                                                              notification.status ||
                                                                  ''
                                                          ) ? (
                                                              <AlertDialog>
                                                                  <TooltipProvider>
                                                                      <Tooltip>
                                                                          <TooltipTrigger
                                                                              asChild
                                                                          >
                                                                              <AlertDialogTrigger
                                                                                  asChild
                                                                              >
                                                                                  <Button
                                                                                      className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors text-destructive"
                                                                                      variant="ghost"
                                                                                      disabled={
                                                                                          cancelMutation.isPending
                                                                                      }
                                                                                      type="button"
                                                                                  >
                                                                                      <Ban className="h-4 w-4" />
                                                                                      <span className="sr-only">
                                                                                          Cancel
                                                                                      </span>
                                                                                  </Button>
                                                                              </AlertDialogTrigger>
                                                                          </TooltipTrigger>
                                                                          <TooltipContent>
                                                                              Cancel
                                                                          </TooltipContent>
                                                                      </Tooltip>
                                                                  </TooltipProvider>
                                                                  <AlertDialogContent>
                                                                      <AlertDialogHeader>
                                                                          <AlertDialogTitle>
                                                                              { notification.status ===
                                                                              'sending'
                                                                                  ? 'Cancel this send?'
                                                                                  : `Cancel this ${ notification.status } send?` }
                                                                          </AlertDialogTitle>
                                                                          <AlertDialogDescription>
                                                                              { notification.status ===
                                                                              'recurring'
                                                                                  ? 'This will stop the recurring schedule. The notification will move back to Pending and can be re-scheduled later.'
                                                                                  : null }
                                                                              { notification.status ===
                                                                              'sending'
                                                                                  ? 'This will stop delivery to remaining subscribers. Messages already queued may still be delivered.'
                                                                                  : null }
                                                                              { notification.status ===
                                                                              'scheduled'
                                                                                  ? 'This will cancel the scheduled send. The notification will move back to Pending.'
                                                                                  : null }
                                                                          </AlertDialogDescription>
                                                                      </AlertDialogHeader>
                                                                      <AlertDialogFooter>
                                                                          <AlertDialogCancel>
                                                                              Keep
                                                                              sending
                                                                          </AlertDialogCancel>
                                                                          <AlertDialogAction
                                                                              onClick={ () =>
                                                                                  cancelMutation.mutate(
                                                                                      notification.id
                                                                                  )
                                                                              }
                                                                          >
                                                                              Cancel
                                                                              send
                                                                          </AlertDialogAction>
                                                                      </AlertDialogFooter>
                                                                  </AlertDialogContent>
                                                              </AlertDialog>
                                                          ) : null }
                                                      </div>
                                                  </td>
                                              </tr>
                                              { isExpanded && hasAnalytics ? (
                                                  <tr>
                                                      <td
                                                          className="p-0"
                                                          colSpan={ 8 }
                                                      >
                                                          <div className="p-4 bg-muted/50 border-t border-b">
                                                              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                                                                  <BarChart className="h-4 w-4" />
                                                                  <span>
                                                                      Analytics
                                                                  </span>
                                                              </div>
                                                              { renderAnalytics(
                                                                  analytics
                                                              ) }
                                                          </div>
                                                      </td>
                                                  </tr>
                                              ) : null }
                                          </Fragment>
                                      );
                                  } )
                                : null }
                            { ! loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan={ 8 } className={ ui.emptyTd }>
                                        No notifications yet.
                                    </td>
                                </tr>
                            ) : null }
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center p-6 pt-0 justify-end">
                    <div className="flex overflow-x-auto sm:justify-center">
                        { notificationsQuery.data?.prev_cursor ? (
                            <button
                                className="flex items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2"
                                onClick={ () =>
                                    setCursor(
                                        notificationsQuery.data?.prev_cursor ||
                                            ''
                                    )
                                }
                                type="button"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </button>
                        ) : null }
                        { notificationsQuery.data?.next_cursor ? (
                            <button
                                className="flex items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2"
                                onClick={ () =>
                                    setCursor(
                                        notificationsQuery.data?.next_cursor ||
                                            ''
                                    )
                                }
                                type="button"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        ) : null }
                    </div>
                </div>
            </section>
        </div>
    );
}
