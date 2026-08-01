import { useEffect, useMemo, useState } from '@wordpress/element';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import PaidFeatureOverlay from '../components/paid-feature-overlay';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
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
    ArrowRight,
    Check,
    ChevronDown,
    Chrome,
    Compass,
    Filter,
    Globe2,
    Laptop,
    MonitorSmartphone,
    Pencil,
    Plus,
    Search,
    Smartphone,
    Tag as TagIcon,
    Trash2,
} from 'lucide-react';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { laravelRequest } from '../lib/api';
import { statusBadgeClass, ui } from '../lib/admin-ui';
import { Input } from '../components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import type { ComponentType, ReactNode } from 'react';
import type {
    LaravelCollection,
    LaravelResource,
    NotifyPressSettings,
    Segment,
    SegmentRule,
    SegmentRuleGroup,
} from '../types';

const defaultRule: SegmentRule = {
    location: { condition: 'is_equal_to', values: [] },
    device: { condition: 'is_equal_to', values: [] },
    browser: { condition: 'is_equal_to', values: [] },
};

const conditions = [
    { label: 'Is equal to', value: 'is_equal_to' },
    { label: 'Is not equal to', value: 'is_not_equal_to' },
    { label: 'Is one of', value: 'is_one_of' },
];

const deviceOptions = [
    { label: 'Desktop', value: 'desktop', icon: Laptop },
    { label: 'Mobile', value: 'mobile', icon: Smartphone },
];

const browserOptions = [
    { label: 'Chrome', value: 'chrome' },
    { label: 'Firefox', value: 'firefox' },
    { label: 'Opera', value: 'opera' },
    { label: 'Edge', value: 'edge' },
    { label: 'Safari', value: 'safari' },
];

interface SegmentFormData {
    name: string;
    description: string;
    is_active: boolean;
    rule: SegmentRule;
}

const normalizeGroup = (
    group: Partial< SegmentRuleGroup > | undefined,
    fallback: SegmentRuleGroup
): SegmentRuleGroup => ( {
    condition: group?.condition || fallback.condition || 'is_equal_to',
    values: Array.isArray( group?.values ) ? group.values : [],
} );

const normalizeRule = (
    raw?: Partial< SegmentRule > | string | null
): SegmentRule => {
    let rule: Partial< SegmentRule > = {};

    if ( typeof raw === 'string' ) {
        try {
            rule = JSON.parse( raw ) || {};
        } catch ( error ) {
            rule = {};
        }
    } else if ( raw ) {
        rule = raw;
    }

    return {
        location: normalizeGroup( rule?.location, defaultRule.location ),
        device: normalizeGroup( rule?.device, defaultRule.device ),
        browser: normalizeGroup( rule?.browser, defaultRule.browser ),
    };
};

const titleCase = ( value: string ) =>
    value
        .replace( /_/g, ' ' )
        .replace( /\b\w/g, ( letter ) => letter.toUpperCase() );

function StepTabs( {
    step,
    canOpenRules,
    onChange,
}: {
    step: 'details' | 'rules';
    canOpenRules: boolean;
    onChange: ( step: 'details' | 'rules' ) => void;
} ) {
    const items = [
        { key: 'details' as const, label: '1. Details' },
        { key: 'rules' as const, label: '2. Rules' },
    ];

    return (
        <div className="inline-flex rounded-md bg-muted/40 p-1">
            { items.map( ( item ) => {
                const disabled = item.key === 'rules' && ! canOpenRules;

                return (
                    <Button
                        className={ `min-h-10 rounded-md px-4 text-sm font-semibold transition-colors ${
                            step === item.key
                                ? 'bg-background text-foreground shadow'
                                : 'text-muted-foreground hover:text-foreground'
                        } ${ disabled ? 'pointer-events-none opacity-50' : '' }` }
                        disabled={ disabled }
                        key={ item.key }
                        onClick={ () => onChange( item.key ) }
                        type="button"
                        variant="ghost"
                    >
                        { item.label }
                    </Button>
                );
            } ) }
        </div>
    );
}

function RuleHeader( {
    icon,
    label,
}: {
    icon: ReactNode;
    label: string;
} ) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                { icon }
            </span>
            <span className="text-base font-bold text-foreground">
                { label }
            </span>
        </div>
    );
}

function AndDivider() {
    return (
        <div className="flex items-center gap-4 py-4">
            <div className="h-px flex-1 bg-border" />
            <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-bold uppercase text-primary">
                AND
            </span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

function CountrySelect( {
    countries,
    values,
    onChange,
}: {
    countries: string[];
    values: string[];
    onChange: ( values: string[] ) => void;
} ) {
    const [ open, setOpen ] = useState( false );
    const [ search, setSearch ] = useState( '' );
    const selected = new Set( values );
    const filteredCountries = countries.filter( ( country ) =>
        country.toLowerCase().includes( search.toLowerCase() )
    );
    const selectedLabel = values.length
        ? values
              .slice( 0, 3 )
              .map( titleCase )
              .join( ', ' ) + ( values.length > 3 ? ` +${ values.length - 3 }` : '' )
        : 'Select countries...';

    const toggle = ( country: string ) => {
        const value = country.toLowerCase();
        onChange(
            selected.has( value )
                ? values.filter( ( item ) => item !== value )
                : [ ...values, value ]
        );
    };

    return (
        <div className="relative min-w-0 flex-1">
            <Button
                className="flex min-h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm focus:outline-none"
                onClick={ () => setOpen( ! open ) }
                type="button"
            >
                <span
                    className={
                        values.length ? 'truncate' : 'truncate text-muted-foreground'
                    }
                >
                    { selectedLabel }
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
            { open ? (
                <div className="absolute z-30 mt-2 w-full rounded-md border border-border bg-background p-2 shadow-lg">
                    <input
                        className={ ui.input }
                        onChange={ ( event ) => setSearch( event.target.value ) }
                        placeholder="Search countries..."
                        value={ search }
                    />
                    <div className="mt-2 max-h-64 overflow-auto">
                        { filteredCountries.length ? (
                            filteredCountries.map( ( country ) => {
                                const value = country.toLowerCase();
                                const active = selected.has( value );

                                return (
                                    <Button
                                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                        key={ country }
                                        onClick={ () => toggle( country ) }
                                        type="button"
                                        variant="ghost"
                                    >
                                        <span>{ country }</span>
                                        { active ? (
                                            <Check className="h-4 w-4 text-primary" />
                                        ) : null }
                                    </Button>
                                );
                            } )
                        ) : (
                            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                                No countries found.
                            </div>
                        ) }
                    </div>
                </div>
            ) : null }
        </div>
    );
}

function SelectableCard( {
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: ComponentType< { className?: string } >;
    label: string;
    active: boolean;
    onClick: () => void;
} ) {
    return (
        <Button
            className={ `relative grid h-28 w-28 place-items-center rounded-lg border-2 bg-background p-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground ${
                active
                    ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/15'
                    : 'border-border'
            }` }
            onClick={ onClick }
            type="button"
        >
            { active ? (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                </span>
            ) : null }
            <span className="grid gap-2 text-center">
                <Icon className="mx-auto h-8 w-8" />
                <span className="text-sm font-medium">{ label }</span>
            </span>
        </Button>
    );
}

function RuleChips( { rule }: { rule: SegmentRule } ) {
    const chips: { icon: ReactNode; label: string }[] = [];

    if ( rule.location.values.length ) {
        chips.push( {
            icon: <Globe2 className="h-3.5 w-3.5" />,
            label:
                rule.location.values.slice( 0, 2 ).map( titleCase ).join( ', ' ) +
                ( rule.location.values.length > 2
                    ? ` +${ rule.location.values.length - 2 }`
                    : '' ),
        } );
    }

    if ( rule.device.values.length ) {
        chips.push( {
            icon: <Smartphone className="h-3.5 w-3.5" />,
            label: rule.device.values.map( titleCase ).join( ', ' ),
        } );
    }

    if ( rule.browser.values.length ) {
        chips.push( {
            icon: <MonitorSmartphone className="h-3.5 w-3.5" />,
            label: rule.browser.values.map( titleCase ).join( ', ' ),
        } );
    }

    if ( ! chips.length ) {
        return (
            <span className="text-sm italic text-muted-foreground">
                All subscribers
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            { chips.map( ( chip ) => (
                <span
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
                    key={ chip.label }
                >
                    { chip.icon }
                    { chip.label }
                </span>
            ) ) }
        </div>
    );
}

function AudiencePreview( {
    form,
    settings,
}: {
    form: SegmentFormData;
    settings?: NotifyPressSettings;
} ) {
    const [ liveCount, setLiveCount ] = useState< number | null >( null );

    // Debounced live re-count as the user edits targeting rules — avoids firing a request
    // on every keystroke/checkbox toggle while still feeling responsive.
    useEffect( () => {
        if ( ! settings ) {
            return;
        }

        const timer = setTimeout( () => {
            laravelRequest< { count: number } >(
                settings,
                '/segments/preview-count',
                {
                    method: 'POST',
                    body: { rule: form.rule },
                }
            )
                .then( ( response ) => setLiveCount( response.count ) )
                .catch( () => {
                    // Keep showing the last known count rather than a broken/blank preview.
                } );
        }, 400 );

        return () => clearTimeout( timer );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ JSON.stringify( form.rule ), settings ] );

    const entries = [
        { label: 'Location', rule: form.rule.location },
        { label: 'Device', rule: form.rule.device },
        { label: 'Browser', rule: form.rule.browser },
    ];

    return (
        <aside className={ `${ ui.cardPadded } h-fit xl:sticky xl:top-6` }>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">
                        Audience Preview
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Based on current rules
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">
                        { liveCount === null
                            ? '—'
                            : liveCount.toLocaleString() }
                    </div>
                    <div className="text-sm text-muted-foreground">
                        subscribers
                    </div>
                </div>
            </div>

            <div className="mt-5 border-t border-border pt-5">
                { entries.map( ( entry ) => {
                    const hasValues = entry.rule.values.length > 0;
                    const values =
                        entry.rule.values
                            .slice( 0, 3 )
                            .map( titleCase )
                            .join( ', ' ) +
                        ( entry.rule.values.length > 3
                            ? ` +${ entry.rule.values.length - 3 } more`
                            : '' );

                    return (
                        <div className="mb-5 last:mb-0" key={ entry.label }>
                            <div className="font-bold text-foreground">
                                { entry.label }
                            </div>
                            { hasValues ? (
                                <div className="mt-1 text-sm text-muted-foreground">
                                    { titleCase( entry.rule.condition || '' ) }:{ ' ' }
                                    <span className="text-foreground">
                                        { values }
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-1 text-sm italic text-muted-foreground">
                                    Any
                                </div>
                            ) }
                        </div>
                    );
                } ) }
            </div>
        </aside>
    );
}

function DeleteDialog( {
    segment,
    busy,
    onCancel,
    onConfirm,
}: {
    segment: Segment | null;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
} ) {
    if ( ! segment ) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl">
                <h3 className="text-lg font-bold text-foreground">
                    Delete segment
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Are you sure you want to delete "{ segment.name }"? This action
                    cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        className={ ui.secondaryButton }
                        disabled={ busy }
                        onClick={ onCancel }
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        className={ ui.dangerButton }
                        disabled={ busy }
                        onClick={ onConfirm }
                        type="button"
                    >
                        { busy ? 'Deleting...' : 'Delete' }
                    </Button>
                </div>
            </div>
        </div>
    );
}

function SegmentSkeletonRows() {
    return (
        <>
            { Array.from( { length: 4 } ).map( ( _, index ) => (
                <tr className="animate-pulse" key={ index }>
                    { Array.from( { length: 6 } ).map( ( __, cellIndex ) => (
                        <td className={ ui.td } key={ cellIndex }>
                            <div
                                className={ `h-4 rounded bg-muted ${
                                    cellIndex === 2 ? 'w-56' : 'w-28'
                                }` }
                            />
                        </td>
                    ) ) }
                </tr>
            ) ) }
        </>
    );
}

type TagRow = {
    id: number;
    name: string;
    slug: string;
    type: string;
    subscribers_count: number;
};

const TAG_TYPE_CLASS: Record< string, string > = {
    category: 'bg-blue-100 text-blue-700',
    interest: 'bg-purple-100 text-purple-700',
    custom: 'bg-gray-100 text-gray-700',
};

function TagsTab( { settings }: { settings?: NotifyPressSettings } ) {
    const queryClient = useQueryClient();
    const [ name, setName ] = useState( '' );
    const [ type, setType ] = useState( 'category' );

    const tagsQuery = useQuery( {
        queryKey: [ 'np-tags-list' ],
        queryFn: () =>
            laravelRequest< { data: TagRow[] } >( settings, '/tags' ),
    } );
    const tags = tagsQuery.data?.data || [];

    const createMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, '/tags', {
                method: 'POST',
                body: { name, type },
            } ),
        onSuccess: () => {
            setName( '' );
            queryClient.invalidateQueries( { queryKey: [ 'np-tags-list' ] } );
        },
    } );

    const deleteMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/tags/${ id }`, {
                method: 'DELETE',
            } ),
        onSuccess: () =>
            queryClient.invalidateQueries( { queryKey: [ 'np-tags-list' ] } ),
    } );

    return (
        <div className="grid gap-6">
            <Card className={ ui.card }>
                <CardHeader>
                    <CardTitle className="text-base">Create Tag</CardTitle>
                    <CardDescription>
                        Tags group subscribers by interest, category, or any
                        custom criteria.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            className="flex-1"
                            onChange={ ( event ) =>
                                setName( event.target.value )
                            }
                            onKeyDown={ ( event ) =>
                                event.key === 'Enter' &&
                                name.trim() &&
                                createMutation.mutate()
                            }
                            placeholder="Tag name e.g. marketing, breaking-news"
                            value={ name }
                        />
                        <Select onValueChange={ setType } value={ type }>
                            <SelectTrigger className="min-h-11 w-full sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="category">
                                    Category
                                </SelectItem>
                                <SelectItem value="interest">
                                    Interest
                                </SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            className={ ui.primaryButton }
                            disabled={
                                createMutation.isPending || ! name.trim()
                            }
                            onClick={ () => createMutation.mutate() }
                            type="button"
                        >
                            <Plus className="h-4 w-4" />
                            Create
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className={ ui.tableWrap }>
                <div className={ ui.tableScroll }>
                    <table className={ ui.table }>
                        <thead>
                            <tr>
                                <th className={ ui.th }>Tag</th>
                                <th className={ ui.th }>Type</th>
                                <th className={ ui.th }>Subscribers</th>
                                <th className={ ui.th } />
                            </tr>
                        </thead>
                        <tbody>
                            { ! tags.length ? (
                                <tr>
                                    <td
                                        className={ ui.emptyTd }
                                        colSpan={ 4 }
                                    >
                                        No tags yet. Create one above.
                                    </td>
                                </tr>
                            ) : (
                                tags.map( ( tag ) => (
                                    <tr key={ tag.id }>
                                        <td className={ ui.td }>
                                            <div className="flex items-center gap-2">
                                                <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">
                                                    { tag.name }
                                                </span>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    #{ tag.slug }
                                                </span>
                                            </div>
                                        </td>
                                        <td className={ ui.td }>
                                            <span
                                                className={ `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    TAG_TYPE_CLASS[
                                                        tag.type
                                                    ] ?? TAG_TYPE_CLASS.custom
                                                }` }
                                            >
                                                { tag.type }
                                            </span>
                                        </td>
                                        <td
                                            className={ `${ ui.td } text-muted-foreground` }
                                        >
                                            { tag.subscribers_count }
                                        </td>
                                        <td
                                            className={ `${ ui.td } text-right` }
                                        >
                                            <Button
                                                aria-label={ `Delete tag ${ tag.name }` }
                                                className={ `${ ui.ghostButton } text-destructive hover:bg-destructive/10 hover:text-destructive` }
                                                onClick={ () => {
                                                    if (
                                                        window.confirm(
                                                            `Delete tag "${ tag.name }"? This will remove it from all subscribers.`
                                                        )
                                                    ) {
                                                        deleteMutation.mutate(
                                                            tag.id
                                                        );
                                                    }
                                                } }
                                                type="button"
                                                variant="ghost"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ) )
                            ) }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SegmentForm( {
    settings,
    segmentId,
}: {
    settings: NotifyPressSettings;
    segmentId?: string;
} ) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = Boolean( segmentId );
    const [ step, setStep ] = useState< 'details' | 'rules' >( 'details' );
    const [ notice, setNotice ] = useState( '' );
    const [ createdSegmentId, setCreatedSegmentId ] = useState< string | null >(
        segmentId || null
    );
    const [ form, setForm ] = useState< SegmentFormData >( {
        name: '',
        description: '',
        is_active: true,
        rule: defaultRule,
    } );

    const metaQuery = useQuery( {
        queryKey: [ 'np-segment-meta', settings.apiToken ],
        queryFn: () =>
            laravelRequest< { countries?: string[] } >(
                settings,
                '/segments/meta'
            ),
    } );

    const segmentQuery = useQuery( {
        queryKey: [ 'np-segment', segmentId ],
        enabled: Boolean( segmentId ),
        queryFn: () =>
            laravelRequest< LaravelResource< Segment > >(
                settings,
                `/segments/${ segmentId }`
            ),
    } );

    useEffect( () => {
        if ( ! segmentQuery.data?.data ) {
            return;
        }

        const payload = segmentQuery.data.data;
        setForm( {
            name: payload.name || '',
            description: payload.description || '',
            is_active: Boolean( payload.is_active ),
            rule: normalizeRule( payload.rule ),
        } );
    }, [ segmentQuery.data ] );

    const updateRule = (
        key: keyof SegmentRule,
        patch: Partial< SegmentRuleGroup >
    ) => {
        setForm( ( current ) => ( {
            ...current,
            rule: {
                ...current.rule,
                [ key ]: {
                    ...current.rule[ key ],
                    ...patch,
                },
            },
        } ) );
    };

    const toggleRuleValue = ( key: keyof SegmentRule, value: string ) => {
        const currentValues = form.rule[ key ].values || [];
        const nextValues = currentValues.includes( value )
            ? currentValues.filter( ( item ) => item !== value )
            : [ ...currentValues, value ];

        updateRule( key, { values: nextValues } );
    };

    const detailsMutation = useMutation( {
        mutationFn: () =>
            laravelRequest< LaravelResource< Segment > >(
                settings,
                isEdit
                    ? `/segments/${ createdSegmentId }`
                    : '/segments',
                {
                    method: isEdit ? 'PUT' : 'POST',
                    body: {
                        name: form.name,
                        description: form.description,
                        is_active: form.is_active,
                    },
                }
            ),
        onSuccess: ( response ) => {
            setNotice( '' );
            const id = response.data?.id;
            if ( id !== undefined && id !== null ) {
                setCreatedSegmentId( String( id ) );
            }
            queryClient.invalidateQueries( { queryKey: [ 'np-segments' ] } );
            setStep( 'rules' );
        },
        onError: ( error ) => setNotice( error.message ),
    } );

    const rulesMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, `/segments/${ createdSegmentId }`, {
                method: 'PUT',
                body: form,
            } ),
        onSuccess: () => {
            queryClient.invalidateQueries( { queryKey: [ 'np-segments' ] } );
            queryClient.invalidateQueries( {
                queryKey: [ 'np-segment', createdSegmentId ],
            } );
            navigate( '/segments' );
        },
        onError: ( error ) => setNotice( error.message ),
    } );

    const countries = metaQuery.data?.countries || [];
    const canContinue = Boolean( form.name.trim() );
    const canOpenRules = Boolean( createdSegmentId );

    return (
        <div className={ ui.page }>
            <div>
                <h3 className={ ui.heading }>
                    { isEdit ? 'Edit Segment' : 'Create Segment' }
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Define your audience with targeting rules.
                </p>
            </div>

            <StepTabs
                canOpenRules={ canOpenRules }
                onChange={ setStep }
                step={ step }
            />

            <div className={ ui.gridDetail }>
                <section className={ ui.cardPadded }>
                    { notice ? (
                        <Alert variant="destructive">
                            <AlertDescription>{ notice }</AlertDescription>
                        </Alert>
                    ) : null }

                    { step === 'details' ? (
                        <>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">
                                    Segment Details
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Give your segment a name and description.
                                </p>
                            </div>

                            <div className="mt-6 grid gap-5">
                                <label className="grid gap-2">
                                    <span className={ ui.label }>
                                        Name{ ' ' }
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </span>
                                    <input
                                        className={ ui.input }
                                        onChange={ ( event ) =>
                                            setForm( {
                                                ...form,
                                                name: event.target.value,
                                            } )
                                        }
                                        placeholder="e.g. UK Mobile Users"
                                        value={ form.name }
                                    />
                                </label>
                                <label className="grid gap-2">
                                    <span className={ ui.label }>
                                        Description
                                    </span>
                                    <textarea
                                        className={ ui.textarea }
                                        onChange={ ( event ) =>
                                            setForm( {
                                                ...form,
                                                description: event.target.value,
                                            } )
                                        }
                                        placeholder="What is this segment for?"
                                        value={ form.description }
                                    />
                                </label>
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex h-8 w-14 cursor-pointer items-center">
                                        <input
                                            checked={ form.is_active }
                                            className="peer sr-only"
                                            onChange={ ( event ) =>
                                                setForm( {
                                                    ...form,
                                                    is_active:
                                                        event.target.checked,
                                                } )
                                            }
                                            type="checkbox"
                                        />
                                        <span
                                            className="absolute inset-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                                        />
                                        <span className="absolute left-1 h-6 w-6 rounded-full bg-background shadow transition-transform peer-checked:translate-x-6" />
                                    </label>
                                    <span className="text-sm font-semibold text-foreground">
                                        { form.is_active
                                            ? 'Active'
                                            : 'Inactive' }
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <Button
                                    className={ ui.primaryButton }
                                    disabled={
                                        detailsMutation.isPending ||
                                        ! canContinue
                                    }
                                    onClick={ () => detailsMutation.mutate() }
                                    type="button"
                                >
                                    Save & Continue
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </>
                    ) : null }

                    { step === 'rules' ? (
                        <>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">
                                    Targeting Rules
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    All conditions are combined with AND -
                                    subscribers must match every rule.
                                </p>
                            </div>

                            <div className="mt-8 grid gap-6">
                                <div>
                                    <RuleHeader
                                        icon={
                                            <Globe2 className="h-5 w-5" />
                                        }
                                        label="Location"
                                    />
                                    <div className="flex flex-col gap-3 md:flex-row">
                                        <Select
                                            onValueChange={ ( value ) =>
                                                updateRule( 'location', {
                                                    condition: value,
                                                } )
                                            }
                                            value={
                                                form.rule.location.condition
                                            }
                                        >
                                            <SelectTrigger className="min-h-11 md:w-64">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                { conditions.map( ( condition ) => (
                                                    <SelectItem
                                                        key={ condition.value }
                                                        value={ condition.value }
                                                    >
                                                        { condition.label }
                                                    </SelectItem>
                                                ) ) }
                                            </SelectContent>
                                        </Select>
                                        <CountrySelect
                                            countries={ countries }
                                            onChange={ ( values ) =>
                                                updateRule( 'location', {
                                                    values,
                                                } )
                                            }
                                            values={
                                                form.rule.location.values
                                            }
                                        />
                                    </div>
                                </div>

                                <AndDivider />

                                <div>
                                    <RuleHeader
                                        icon={
                                            <MonitorSmartphone className="h-5 w-5" />
                                        }
                                        label="Device"
                                    />
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start">
                                        <Select
                                            onValueChange={ ( value ) =>
                                                updateRule( 'device', {
                                                    condition: value,
                                                } )
                                            }
                                            value={ form.rule.device.condition }
                                        >
                                            <SelectTrigger className="min-h-11 md:w-64">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                { conditions.map( ( condition ) => (
                                                    <SelectItem
                                                        key={ condition.value }
                                                        value={ condition.value }
                                                    >
                                                        { condition.label }
                                                    </SelectItem>
                                                ) ) }
                                            </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-3">
                                            { deviceOptions.map( ( option ) => (
                                                <SelectableCard
                                                    active={ form.rule.device.values.includes(
                                                        option.value
                                                    ) }
                                                    icon={ option.icon }
                                                    key={ option.value }
                                                    label={ option.label }
                                                    onClick={ () =>
                                                        toggleRuleValue(
                                                            'device',
                                                            option.value
                                                        )
                                                    }
                                                />
                                            ) ) }
                                        </div>
                                    </div>
                                </div>

                                <AndDivider />

                                <div>
                                    <RuleHeader
                                        icon={
                                            <Compass className="h-5 w-5" />
                                        }
                                        label="Browser"
                                    />
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start">
                                        <Select
                                            onValueChange={ ( value ) =>
                                                updateRule( 'browser', {
                                                    condition: value,
                                                } )
                                            }
                                            value={
                                                form.rule.browser.condition
                                            }
                                        >
                                            <SelectTrigger className="min-h-11 md:w-64">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                { conditions.map( ( condition ) => (
                                                    <SelectItem
                                                        key={ condition.value }
                                                        value={ condition.value }
                                                    >
                                                        { condition.label }
                                                    </SelectItem>
                                                ) ) }
                                            </SelectContent>
                                        </Select>
                                        <div className="flex flex-wrap gap-3">
                                            { browserOptions.map( ( option ) => (
                                                <SelectableCard
                                                    active={ form.rule.browser.values.includes(
                                                        option.value
                                                    ) }
                                                    icon={ Chrome }
                                                    key={ option.value }
                                                    label={ option.label }
                                                    onClick={ () =>
                                                        toggleRuleValue(
                                                            'browser',
                                                            option.value
                                                        )
                                                    }
                                                />
                                            ) ) }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-2">
                                <Button
                                    className={ ui.secondaryButton }
                                    onClick={ () => setStep( 'details' ) }
                                    type="button"
                                >
                                    Back
                                </Button>
                                <Button
                                    className={ ui.primaryButton }
                                    disabled={
                                        rulesMutation.isPending ||
                                        ! createdSegmentId
                                    }
                                    onClick={ () => rulesMutation.mutate() }
                                    type="button"
                                >
                                    { isEdit
                                        ? 'Save Changes'
                                        : 'Create Segment' }
                                </Button>
                            </div>
                        </>
                    ) : null }
                </section>

                <AudiencePreview form={ form } settings={ settings } />
            </div>
        </div>
    );
}

export default function SegmentsPage() {
    const params = useParams();
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const queryClient = useQueryClient();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const activeTab =
        searchParams.get( 'tab' ) === 'tags' ? 'tags' : 'segments';
    const [ search, setSearch ] = useState( '' );
    const [ segmentToDelete, setSegmentToDelete ] = useState< Segment | null >(
        null
    );
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const settings = settingsQuery.data;
    const hasToken = hasApiToken( settings );
    const token = getApiToken( settings );
    const segmentId = params.segmentId;
    const isFormRoute =
        routerLocation.pathname.includes( '/segments/new' ) ||
        Boolean( segmentId );

    const segmentsQuery = useQuery( {
        queryKey: [ 'np-segments', token ],
        enabled: hasToken && ! isFormRoute,
        queryFn: () =>
            laravelRequest<
                LaravelCollection< Segment > & { isPaidUser?: boolean }
            >( settings, '/segments' ),
    } );

    const deleteMutation = useMutation( {
        mutationFn: ( id: Segment[ 'id' ] ) =>
            laravelRequest( settings, `/segments/${ id }`, {
                method: 'DELETE',
            } ),
        onSuccess: () => {
            setSegmentToDelete( null );
            queryClient.invalidateQueries( { queryKey: [ 'np-segments' ] } );
        },
    } );

    const rows = useMemo(
        () => segmentsQuery.data?.data || [],
        [ segmentsQuery.data ]
    );
    const filteredRows = useMemo( () => {
        if ( ! search.trim() ) {
            return rows;
        }

        const needle = search.toLowerCase();
        return rows.filter( ( segment ) =>
            [ segment.name, segment.description || '' ]
                .join( ' ' )
                .toLowerCase()
                .includes( needle )
        );
    }, [ rows, search ] );
    const loading = segmentsQuery.isFetching && ! segmentsQuery.data;

    if ( isFormRoute && ! hasToken ) {
        return <Navigate replace to="/segments" />;
    }

    if ( isFormRoute ) {
        if ( ! settings ) {
            return <p className={ ui.subtext }>Loading…</p>;
        }

        return <SegmentForm settings={ settings } segmentId={ segmentId } />;
    }

    return (
        <div className={ ui.page }>
            <div className="inline-flex w-fit gap-1 border-b border-border">
                { ( [ 'segments', 'tags' ] as const ).map( ( tab ) => (
                    <button
                        className={ `border-b-2 px-3 pb-2 text-sm font-semibold capitalize transition-colors ${
                            activeTab === tab
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }` }
                        key={ tab }
                        onClick={ () =>
                            setSearchParams(
                                tab === 'tags' ? { tab: 'tags' } : {}
                            )
                        }
                        type="button"
                    >
                        { tab }
                    </button>
                ) ) }
            </div>

            { activeTab === 'tags' ? (
                <TagsTab settings={ settings } />
            ) : (
            <PaidFeatureOverlay
                isPaidUser={ segmentsQuery.data?.isPaidUser ?? true }
                featureName="Segments"
                description="Audience segmentation is available on Starter plans and above. Upgrade to target specific groups of subscribers when sending notifications."
                settings={ settings }
            >
            <section
                className={ `overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow transition-opacity duration-500 ${
                    loading ? 'opacity-75' : 'opacity-100'
                }` }
            >
                <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className={ ui.heading }>Segments</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            { rows.length } segment{ rows.length === 1 ? '' : 's' } -
                            target specific groups of subscribers
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        { rows.length ? (
                            <label className="relative block">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none sm:w-72"
                                    onChange={ ( event ) =>
                                        setSearch( event.target.value )
                                    }
                                    placeholder="Search segments..."
                                    value={ search }
                                />
                            </label>
                        ) : null }
                        { hasToken ? (
                            <Link
                                to="/segments/new"
                                className={ ui.primaryButton }
                            >
                                <Plus className="h-4 w-4" />
                                New Segment
                            </Link>
                        ) : null }
                    </div>
                </div>

                { loading ? (
                    <div className={ ui.tableScroll }>
                        <table className={ ui.table }>
                            <thead>
                                <tr>
                                    <th className={ ui.th }>Name</th>
                                    <th className={ ui.th }>Description</th>
                                    <th className={ ui.th }>Rules</th>
                                    <th className={ ui.th }>Status</th>
                                    <th className={ ui.th }>Created</th>
                                    <th className={ ui.th } />
                                </tr>
                            </thead>
                            <tbody>
                                <SegmentSkeletonRows />
                            </tbody>
                        </table>
                    </div>
                ) : ! rows.length ? (
                    <div className="grid place-items-center px-6 py-20 text-center">
                        <div className="grid max-w-sm gap-3 justify-items-center">
                            <span className="grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground">
                                <Filter className="h-8 w-8" />
                            </span>
                            <h4 className="text-lg font-bold text-foreground">
                                No segments yet
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                { hasToken
                                    ? 'Create a segment to target a specific group of subscribers when sending notifications.'
                                    : 'Connect NotifyPress to start creating audience segments for this site.' }
                            </p>
                            { hasToken ? (
                                <Link
                                    className={ `${ ui.primaryButton } mt-2` }
                                    to="/segments/new"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create your first segment
                                </Link>
                            ) : null }
                        </div>
                    </div>
                ) : filteredRows.length ? (
                    <div className={ ui.tableScroll }>
                        <table className={ ui.table }>
                            <thead>
                                <tr>
                                    <th className={ ui.th }>Name</th>
                                    <th className={ ui.th }>Description</th>
                                    <th className={ ui.th }>Rules</th>
                                    <th className={ ui.th }>Status</th>
                                    <th className={ ui.th }>Created</th>
                                    <th className={ ui.th } />
                                </tr>
                            </thead>
                            <tbody>
                                { filteredRows.map( ( segment ) => (
                                    <tr
                                        className="group hover:bg-muted/40"
                                        key={ segment.id }
                                    >
                                        <td className={ ui.td }>
                                            <strong>{ segment.name }</strong>
                                        </td>
                                        <td
                                            className={ `${ ui.td } max-w-72 text-muted-foreground` }
                                        >
                                            { segment.description || '-' }
                                        </td>
                                        <td className={ ui.td }>
                                            <RuleChips
                                                rule={ normalizeRule(
                                                    segment.rule
                                                ) }
                                            />
                                        </td>
                                        <td className={ ui.td }>
                                            <span
                                                className={ statusBadgeClass(
                                                    segment.is_active
                                                ) }
                                            >
                                                { segment.is_active
                                                    ? 'Active'
                                                    : 'Inactive' }
                                            </span>
                                        </td>
                                        <td
                                            className={ `${ ui.td } whitespace-nowrap text-muted-foreground` }
                                        >
                                            { segment.created_at || '-' }
                                        </td>
                                        <td
                                            className={ `${ ui.td } text-right` }
                                        >
                                            <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Button
                                                    aria-label="Edit segment"
                                                    className={ ui.ghostButton }
                                                    variant="ghost"
                                                    onClick={ () =>
                                                        navigate(
                                                            `/segments/${ segment.id }/edit`
                                                        )
                                                    }
                                                    type="button"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    aria-label="Delete segment"
                                                    className={ `${ ui.ghostButton } text-destructive hover:bg-destructive/10 hover:text-destructive` }
                                                    variant="ghost"
                                                    onClick={ () =>
                                                        setSegmentToDelete(
                                                            segment
                                                        )
                                                    }
                                                    type="button"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid place-items-center px-6 py-16 text-center">
                        <div className="grid gap-3 justify-items-center">
                            <Search className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                No segments match your search.
                            </p>
                        </div>
                    </div>
                ) }
            </section>
            </PaidFeatureOverlay>
            ) }

            <DeleteDialog
                busy={ deleteMutation.isPending }
                onCancel={ () => setSegmentToDelete( null ) }
                onConfirm={ () => {
                    if ( segmentToDelete ) {
                        deleteMutation.mutate( segmentToDelete.id );
                    }
                } }
                segment={ segmentToDelete }
            />
        </div>
    );
}
