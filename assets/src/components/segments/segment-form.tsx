import { useEffect, useState } from '@wordpress/element';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    ArrowRight,
    Chrome,
    Compass,
    FileText,
    Globe2,
    Laptop,
    ListFilter,
    MonitorSmartphone,
    Smartphone,
    Tag as TagIcon,
} from 'lucide-react';

import { laravelRequest } from '../../lib/api';
import { getApiToken } from '../../lib/settings';
import type {
    LaravelResource,
    NotifyPressSettings,
    Segment,
    SegmentRuleGroup,
} from '../../types';
import { Chip, PageHeader, SectionCard, StepTabs } from '../page-parts';
import { Alert, AlertDescription } from '../ui/alert';
import { Button, buttonVariants } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { cn } from '../utils';
import {
    AndDivider,
    OptionMultiSelect,
    RULE_KEYS,
    RULE_LABELS,
    RulePanel,
    SelectableTile,
    defaultRule,
    normalizeRule,
    tagNameFor,
    titleCase,
} from './segment-parts';
import type { FullSegmentRule, RuleKey, TagOption } from './segment-parts';

const conditions = [
    { label: 'Is equal to', value: 'is_equal_to' },
    { label: 'Is not equal to', value: 'is_not_equal_to' },
    { label: 'Is one of', value: 'is_one_of' },
];

const deviceOptions = [
    { label: 'Desktop', value: 'desktop', icon: <Laptop /> },
    { label: 'Mobile', value: 'mobile', icon: <Smartphone /> },
];

const browserOptions = [
    { label: 'Chrome', value: 'chrome' },
    { label: 'Firefox', value: 'firefox' },
    { label: 'Opera', value: 'opera' },
    { label: 'Edge', value: 'edge' },
    { label: 'Safari', value: 'safari' },
];

type Step = 'details' | 'rules';

export interface SegmentFormData {
    name: string;
    description: string;
    is_active: boolean;
    rule: FullSegmentRule;
}

function ConditionSelect( {
    value,
    onChange,
    label,
}: {
    value?: string;
    onChange: ( value: string ) => void;
    label: string;
} ) {
    return (
        <div className="w-full shrink-0 sm:w-48">
            <Select value={ value } onValueChange={ onChange }>
                <SelectTrigger aria-label={ label } className="h-10">
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
        </div>
    );
}

function AudiencePreview( {
    rule,
    tags,
    settings,
}: {
    rule: FullSegmentRule;
    tags: TagOption[];
    settings: NotifyPressSettings;
} ) {
    const [ liveCount, setLiveCount ] = useState< number | null >( null );
    const ruleKey = JSON.stringify( rule );

    // Debounced live re-count as the user edits targeting rules: avoids firing
    // a request on every toggle while still feeling responsive. The whole
    // rule, tags included, goes to the server.
    useEffect( () => {
        const timer = setTimeout( () => {
            laravelRequest< { count: number | string } >(
                settings,
                '/segments/preview-count',
                {
                    method: 'POST',
                    body: { rule: JSON.parse( ruleKey ) },
                }
            )
                .then( ( response ) => {
                    setLiveCount( Number( response.count ) );
                } )
                .catch( () => {
                    // Keep showing the last known count rather than a blank preview.
                } );
        }, 400 );

        return () => {
            clearTimeout( timer );
        };
    }, [ ruleKey, settings ] );

    return (
        <SectionCard
            title="Audience Preview"
            description="Based on current rules"
            className="lg:sticky lg:top-6"
        >
            <div className="mt-4 rounded-lg bg-primary/5 p-4 dark:bg-primary/10">
                <p className="font-display text-3xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
                    { liveCount === null || Number.isNaN( liveCount )
                        ? '—'
                        : liveCount.toLocaleString() }
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    matching subscribers
                </p>
            </div>
            <ul className="mt-4 space-y-3">
                { RULE_KEYS.map( ( key ) => {
                    const group = rule[ key ];
                    const displayValues =
                        key === 'tags'
                            ? group.values.map( ( id ) =>
                                  tagNameFor( tags, id )
                              )
                            : group.values.map( titleCase );
                    const extra =
                        group.values.length > 3
                            ? ` +${ group.values.length - 3 } more`
                            : '';

                    return (
                        <li
                            key={ key }
                            className="flex items-start justify-between gap-3 border-t border-border pt-3 text-sm first:border-t-0 first:pt-0"
                        >
                            <span className="font-medium text-foreground">
                                { RULE_LABELS[ key ] }
                            </span>
                            { group.values.length > 0 ? (
                                <span className="text-right text-xs text-muted-foreground">
                                    { titleCase( group.condition || '' ) }
                                    <span className="mt-0.5 block font-medium text-foreground">
                                        { displayValues
                                            .slice( 0, 3 )
                                            .join( ', ' ) }
                                        { extra }
                                    </span>
                                </span>
                            ) : (
                                <Chip>Any</Chip>
                            ) }
                        </li>
                    );
                } ) }
            </ul>
        </SectionCard>
    );
}

/**
 * Create / edit a segment in two steps: details first, then targeting rules.
 * Ported from the app's resources/js/Pages/Segments/Create.tsx, Edit.tsx and
 * Pages/Segments/Components/SegmentForm.tsx.
 *
 * @param {Object}              props           Component props.
 * @param {NotifyPressSettings} props.settings  Plugin settings.
 * @param {string}              props.segmentId Segment being edited, if any.
 */
export function SegmentForm( {
    settings,
    segmentId,
}: {
    settings: NotifyPressSettings;
    segmentId?: string;
} ) {
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const queryClient = useQueryClient();
    const token = getApiToken( settings );
    const isEdit = Boolean( segmentId );
    // "Create segment for {country}" on the dashboard map passes every stored
    // spelling of the country, so subscribers saved under either name match.
    const prefillLocations = isEdit
        ? []
        : (
              routerLocation.state as {
                  prefillLocations?: string[];
              } | null
           )?.prefillLocations || [];
    const [ step, setStep ] = useState< Step >( 'details' );
    const [ notice, setNotice ] = useState( '' );
    const [ createdSegmentId, setCreatedSegmentId ] = useState< string | null >(
        segmentId || null
    );
    const [ form, setForm ] = useState< SegmentFormData >( {
        name: '',
        description: '',
        is_active: true,
        rule:
            prefillLocations.length > 0
                ? {
                      ...defaultRule,
                      location: {
                          condition: 'is_one_of',
                          values: prefillLocations.map( ( name ) =>
                              name.toLowerCase()
                          ),
                      },
                  }
                : defaultRule,
    } );

    const metaQuery = useQuery( {
        queryKey: [ 'np-segment-meta', settings.apiToken ],
        queryFn: () =>
            laravelRequest< { countries?: string[] } >(
                settings,
                '/segments/meta'
            ),
    } );

    const tagsQuery = useQuery( {
        queryKey: [ 'np-tags', token ],
        queryFn: () =>
            laravelRequest< { data: TagOption[] } >( settings, '/tags' ),
    } );
    const tags = tagsQuery.data?.data || [];

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
            // normalizeRule keeps rule.tags, so editing preserves it.
            rule: normalizeRule( payload.rule ),
        } );
    }, [ segmentQuery.data ] );

    const updateRule = ( key: RuleKey, patch: Partial< SegmentRuleGroup > ) => {
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

    const toggleRuleValue = ( key: RuleKey, value: string ) => {
        const currentValues = form.rule[ key ].values || [];
        const nextValues = currentValues.includes( value )
            ? currentValues.filter( ( item ) => item !== value )
            : [ ...currentValues, value ];

        updateRule( key, { values: nextValues } );
    };

    const invalidateSegmentLists = () => {
        queryClient.invalidateQueries( { queryKey: [ 'np-segments' ] } );
        queryClient.invalidateQueries( { queryKey: [ 'np-segments-all' ] } );
    };

    const detailsMutation = useMutation( {
        mutationFn: () =>
            laravelRequest< LaravelResource< Segment > >(
                settings,
                isEdit ? `/segments/${ createdSegmentId }` : '/segments',
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
            invalidateSegmentLists();
            setStep( 'rules' );
        },
        onError: ( error ) => {
            setNotice( error.message );
        },
    } );

    // Sends the whole form, so the rule's location, device, browser and tags
    // groups are all saved.
    const rulesMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, `/segments/${ createdSegmentId }`, {
                method: 'PUT',
                body: form,
            } ),
        onSuccess: () => {
            invalidateSegmentLists();
            queryClient.invalidateQueries( {
                queryKey: [ 'np-segment', createdSegmentId ],
            } );
            navigate( '/segments' );
        },
        onError: ( error ) => {
            setNotice( error.message );
        },
    } );

    const metaCountries = metaQuery.data?.countries || [];
    const countries = [
        ...metaCountries,
        ...prefillLocations.filter(
            ( name ) =>
                ! metaCountries.some(
                    ( country ) => country.toLowerCase() === name.toLowerCase()
                )
        ),
    ];
    const countryOptions = countries.map( ( country ) => ( {
        label: country,
        value: country.toLowerCase(),
    } ) );
    const tagOptions = tags.map( ( tag ) => ( {
        label: tag.name,
        value: String( tag.id ),
    } ) );
    const canContinue = Boolean( form.name.trim() );
    const canOpenRules = Boolean( createdSegmentId );

    let tagsControl = (
        <div className="flex flex-col gap-3 sm:flex-row">
            <ConditionSelect
                label="Tags condition"
                value={ form.rule.tags.condition }
                onChange={ ( value ) => {
                    updateRule( 'tags', { condition: value } );
                } }
            />
            <OptionMultiSelect
                label="Tags"
                options={ tagOptions }
                values={ form.rule.tags.values }
                onChange={ ( values ) => {
                    updateRule( 'tags', { values } );
                } }
                placeholder="Select tags…"
                searchPlaceholder="Search tags…"
                emptyLabel="No tags found."
            />
        </div>
    );

    if ( tagsQuery.isLoading ) {
        tagsControl = (
            <p className="text-sm text-muted-foreground">Loading tags…</p>
        );
    } else if ( tags.length === 0 && form.rule.tags.values.length === 0 ) {
        tagsControl = (
            <p className="text-sm text-muted-foreground">
                No tags yet.{ ' ' }
                <Link
                    to="/segments?tab=tags"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                >
                    Create tags
                </Link>{ ' ' }
                to use tag-based targeting.
            </p>
        );
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <PageHeader
                title={ isEdit ? 'Edit Segment' : 'Create Segment' }
                description="Define your audience with targeting rules."
                actions={
                    <Link
                        to="/segments"
                        className={ cn(
                            buttonVariants( { variant: 'outline' } ),
                            'h-10 gap-2 px-4'
                        ) }
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        All segments
                    </Link>
                }
            />

            { notice ? (
                <Alert variant="destructive">
                    <AlertDescription>{ notice }</AlertDescription>
                </Alert>
            ) : null }

            <div className="flex flex-col items-start gap-6 lg:flex-row">
                <div className="w-full min-w-0 flex-1">
                    <Tabs
                        value={ step }
                        onValueChange={ ( value ) => {
                            setStep( value as Step );
                        } }
                    >
                        <div className="mb-6">
                            <StepTabs
                                active={ step }
                                steps={ [
                                    {
                                        value: 'details',
                                        label: 'Details',
                                        icon: <FileText />,
                                    },
                                    {
                                        value: 'rules',
                                        label: 'Rules',
                                        icon: <ListFilter />,
                                        disabled: ! canOpenRules,
                                    },
                                ] }
                            />
                        </div>

                        <TabsContent value="details" className="mt-0">
                            <SectionCard
                                title="Segment Details"
                                description="Give your segment a name and description."
                                footer={
                                    <>
                                        <span />
                                        <Button
                                            type="button"
                                            className="h-10 gap-1.5 px-5"
                                            disabled={
                                                detailsMutation.isPending ||
                                                ! canContinue
                                            }
                                            onClick={ () => {
                                                detailsMutation.mutate();
                                            } }
                                        >
                                            Save &amp; Continue
                                            <ArrowRight
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                        </Button>
                                    </>
                                }
                            >
                                <div className="mt-5 grid gap-5">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor="np-segment-name">
                                            Name{ ' ' }
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="np-segment-name"
                                            placeholder="e.g. UK Mobile Users"
                                            value={ form.name }
                                            onChange={ ( event ) => {
                                                setForm( {
                                                    ...form,
                                                    name: event.target.value,
                                                } );
                                            } }
                                        />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="np-segment-description">
                                            Description
                                        </Label>
                                        <Textarea
                                            id="np-segment-description"
                                            placeholder="What is this segment for?"
                                            rows={ 3 }
                                            value={ form.description }
                                            onChange={ ( event ) => {
                                                setForm( {
                                                    ...form,
                                                    description:
                                                        event.target.value,
                                                } );
                                            } }
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                                        <Switch
                                            id="np-segment-active"
                                            checked={ form.is_active }
                                            onCheckedChange={ ( checked ) => {
                                                setForm( {
                                                    ...form,
                                                    is_active: checked,
                                                } );
                                            } }
                                        />
                                        <div>
                                            <Label
                                                htmlFor="np-segment-active"
                                                className="cursor-pointer"
                                            >
                                                { form.is_active
                                                    ? 'Active'
                                                    : 'Inactive' }
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Only active segments can be
                                                picked when sending a campaign.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SectionCard>
                        </TabsContent>

                        <TabsContent value="rules" className="mt-0">
                            <SectionCard
                                title="Targeting Rules"
                                description="All conditions are combined with AND. Subscribers must match every rule."
                                footer={
                                    <>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 gap-1.5 px-4"
                                            onClick={ () => {
                                                setStep( 'details' );
                                            } }
                                        >
                                            <ArrowLeft
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            Back
                                        </Button>
                                        <Button
                                            type="button"
                                            className="h-10 px-5"
                                            disabled={
                                                rulesMutation.isPending ||
                                                ! createdSegmentId
                                            }
                                            onClick={ () => {
                                                rulesMutation.mutate();
                                            } }
                                        >
                                            { isEdit
                                                ? 'Save Changes'
                                                : 'Create Segment' }
                                        </Button>
                                    </>
                                }
                            >
                                <div className="mt-5 grid gap-2">
                                    <RulePanel
                                        icon={ <Globe2 /> }
                                        label="Location"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <ConditionSelect
                                                label="Location condition"
                                                value={
                                                    form.rule.location.condition
                                                }
                                                onChange={ ( value ) => {
                                                    updateRule( 'location', {
                                                        condition: value,
                                                    } );
                                                } }
                                            />
                                            <OptionMultiSelect
                                                label="Countries"
                                                options={ countryOptions }
                                                values={
                                                    form.rule.location.values
                                                }
                                                onChange={ ( values ) => {
                                                    updateRule( 'location', {
                                                        values,
                                                    } );
                                                } }
                                                placeholder="Select countries…"
                                                searchPlaceholder="Search countries…"
                                                emptyLabel="No countries found."
                                            />
                                        </div>
                                    </RulePanel>

                                    <AndDivider />

                                    <RulePanel
                                        icon={ <MonitorSmartphone /> }
                                        label="Device"
                                    >
                                        <div className="flex flex-col items-start gap-3 sm:flex-row">
                                            <ConditionSelect
                                                label="Device condition"
                                                value={
                                                    form.rule.device.condition
                                                }
                                                onChange={ ( value ) => {
                                                    updateRule( 'device', {
                                                        condition: value,
                                                    } );
                                                } }
                                            />
                                            <div className="flex flex-wrap gap-3">
                                                { deviceOptions.map(
                                                    ( option ) => (
                                                        <SelectableTile
                                                            key={ option.value }
                                                            icon={ option.icon }
                                                            label={
                                                                option.label
                                                            }
                                                            active={ form.rule.device.values.includes(
                                                                option.value
                                                            ) }
                                                            onClick={ () => {
                                                                toggleRuleValue(
                                                                    'device',
                                                                    option.value
                                                                );
                                                            } }
                                                        />
                                                    )
                                                ) }
                                            </div>
                                        </div>
                                    </RulePanel>

                                    <AndDivider />

                                    <RulePanel
                                        icon={ <Compass /> }
                                        label="Browser"
                                    >
                                        <div className="flex flex-col items-start gap-3 sm:flex-row">
                                            <ConditionSelect
                                                label="Browser condition"
                                                value={
                                                    form.rule.browser.condition
                                                }
                                                onChange={ ( value ) => {
                                                    updateRule( 'browser', {
                                                        condition: value,
                                                    } );
                                                } }
                                            />
                                            <div className="flex flex-wrap gap-3">
                                                { browserOptions.map(
                                                    ( option ) => (
                                                        <SelectableTile
                                                            key={ option.value }
                                                            icon={ <Chrome /> }
                                                            label={
                                                                option.label
                                                            }
                                                            active={ form.rule.browser.values.includes(
                                                                option.value
                                                            ) }
                                                            onClick={ () => {
                                                                toggleRuleValue(
                                                                    'browser',
                                                                    option.value
                                                                );
                                                            } }
                                                        />
                                                    )
                                                ) }
                                            </div>
                                        </div>
                                    </RulePanel>

                                    <AndDivider />

                                    <RulePanel
                                        icon={ <TagIcon /> }
                                        label="Tags"
                                    >
                                        { tagsControl }
                                    </RulePanel>
                                </div>
                            </SectionCard>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="w-full shrink-0 lg:w-80">
                    <AudiencePreview
                        rule={ form.rule }
                        tags={ tags }
                        settings={ settings }
                    />
                </div>
            </div>
        </div>
    );
}
