import { useState } from '@wordpress/element';
import type { ReactNode } from 'react';
import {
    Check,
    ChevronDown,
    Globe2,
    MonitorSmartphone,
    Smartphone,
    Tag as TagIcon,
} from 'lucide-react';

import { Chip } from '../page-parts';
import { cn } from '../utils';
import type { SegmentRuleGroup } from '../../types';

// Segment rule helpers shared by the Segments list and the segment editor.
// Ported from the app's resources/js/Pages/Segments/Index.tsx and
// Pages/Segments/Components/SegmentForm.tsx.

export type RuleKey = 'location' | 'device' | 'browser' | 'tags';

/**
 * The full segment rule, tags included. `tags.values` holds tag ids as
 * strings, the way GET /segments/{id} returns them.
 */
export type FullSegmentRule = Record< RuleKey, SegmentRuleGroup >;

export type TagOption = {
    id: number;
    name: string;
    slug?: string;
    type?: string;
    subscribers_count?: number | string;
};

export const RULE_KEYS: RuleKey[] = [ 'location', 'device', 'browser', 'tags' ];

export const RULE_LABELS: Record< RuleKey, string > = {
    location: 'Location',
    device: 'Device',
    browser: 'Browser',
    tags: 'Tags',
};

export const defaultRule: FullSegmentRule = {
    location: { condition: 'is_equal_to', values: [] },
    device: { condition: 'is_equal_to', values: [] },
    browser: { condition: 'is_equal_to', values: [] },
    tags: { condition: 'is_one_of', values: [] },
};

const normalizeGroup = (
    group: unknown,
    fallback: SegmentRuleGroup,
    key: RuleKey
): SegmentRuleGroup => {
    const raw = ( group && typeof group === 'object' ? group : {} ) as {
        condition?: unknown;
        values?: unknown;
    };
    const values = Array.isArray( raw.values ) ? raw.values : [];

    return {
        condition:
            typeof raw.condition === 'string' && raw.condition
                ? raw.condition
                : fallback.condition,
        // Tag ids can be stored as numbers; keep them as strings so they match
        // the picker's option values. Other groups keep only strings.
        values:
            key === 'tags'
                ? values
                      .filter(
                          ( value ) =>
                              typeof value === 'string' ||
                              typeof value === 'number'
                      )
                      .map( ( value ) => String( value ) )
                : values.filter(
                      ( value ): value is string => typeof value === 'string'
                  ),
    };
};

/**
 * Turns a stored rule (object, JSON string or nothing) into a complete rule
 * with every group present.
 *
 * @param {unknown} raw The rule as the API returned it.
 * @return {FullSegmentRule} The normalised rule.
 */
export const normalizeRule = ( raw?: unknown ): FullSegmentRule => {
    let rule: Record< string, unknown > = {};

    if ( typeof raw === 'string' ) {
        try {
            rule = JSON.parse( raw ) || {};
        } catch ( error ) {
            rule = {};
        }
    } else if ( raw && typeof raw === 'object' ) {
        rule = raw as Record< string, unknown >;
    }

    return {
        location: normalizeGroup(
            rule.location,
            defaultRule.location,
            'location'
        ),
        device: normalizeGroup( rule.device, defaultRule.device, 'device' ),
        browser: normalizeGroup( rule.browser, defaultRule.browser, 'browser' ),
        tags: normalizeGroup( rule.tags, defaultRule.tags, 'tags' ),
    };
};

export const titleCase = ( value: string ) =>
    value
        .replace( /_/g, ' ' )
        .replace( /\b\w/g, ( letter ) => letter.toUpperCase() );

export const tagNameFor = ( tags: TagOption[], id: string ) =>
    tags.find( ( tag ) => String( tag.id ) === id )?.name ?? `#${ id }`;

const summarise = ( values: string[], limit: number ) =>
    values.slice( 0, limit ).join( ', ' ) +
    ( values.length > limit ? ` +${ values.length - limit }` : '' );

/**
 * The rule summary chips in the Segments table.
 *
 * @param {Object}          props      Component props.
 * @param {FullSegmentRule} props.rule The segment's rule.
 * @param {TagOption[]}     props.tags Known tags, to name tag ids.
 */
export function RuleChips( {
    rule,
    tags,
}: {
    rule: FullSegmentRule;
    tags: TagOption[];
} ) {
    const chips: { key: string; icon: ReactNode; label: string }[] = [];

    if ( rule.location.values.length ) {
        chips.push( {
            key: 'location',
            icon: <Globe2 className="h-3 w-3" aria-hidden />,
            label: summarise( rule.location.values, 2 ),
        } );
    }

    if ( rule.device.values.length ) {
        chips.push( {
            key: 'device',
            icon: <Smartphone className="h-3 w-3" aria-hidden />,
            label: rule.device.values.join( ', ' ),
        } );
    }

    if ( rule.browser.values.length ) {
        chips.push( {
            key: 'browser',
            icon: <MonitorSmartphone className="h-3 w-3" aria-hidden />,
            label: rule.browser.values.join( ', ' ),
        } );
    }

    if ( rule.tags.values.length ) {
        chips.push( {
            key: 'tags',
            icon: <TagIcon className="h-3 w-3" aria-hidden />,
            label: summarise(
                rule.tags.values.map( ( id ) => tagNameFor( tags, id ) ),
                2
            ),
        } );
    }

    if ( ! chips.length ) {
        return <Chip tone="primary">All subscribers</Chip>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            { chips.map( ( chip ) => (
                <Chip
                    key={ chip.key }
                    icon={ chip.icon }
                    className={ cn(
                        'font-medium',
                        chip.key === 'tags' ? null : 'capitalize'
                    ) }
                >
                    { chip.label }
                </Chip>
            ) ) }
        </div>
    );
}

/**
 * Searchable multi-pick dropdown, used for countries and tags in the segment
 * editor.
 *
 * @param {Object}   props                   Component props.
 * @param {Array}    props.options           Options to pick from.
 * @param {string[]} props.values            Selected option values.
 * @param {Function} props.onChange          Receives the new selection.
 * @param {string}   props.placeholder       Shown when nothing is selected.
 * @param {string}   props.searchPlaceholder Placeholder of the search box.
 * @param {string}   props.emptyLabel        Shown when the search finds nothing.
 * @param {string}   props.label             Accessible name of the trigger.
 */
export function OptionMultiSelect( {
    options,
    values,
    onChange,
    placeholder,
    searchPlaceholder,
    emptyLabel,
    label,
}: {
    options: { label: string; value: string }[];
    values: string[];
    onChange: ( values: string[] ) => void;
    placeholder: string;
    searchPlaceholder: string;
    emptyLabel: string;
    label: string;
} ) {
    const [ open, setOpen ] = useState( false );
    const [ search, setSearch ] = useState( '' );
    const selected = new Set( values );
    const filtered = options.filter( ( option ) =>
        option.label.toLowerCase().includes( search.toLowerCase() )
    );
    const labelFor = ( value: string ) =>
        options.find( ( option ) => option.value === value )?.label ??
        titleCase( value );
    const selectedLabel = values.length
        ? summarise( values.map( labelFor ), 3 )
        : placeholder;

    const toggle = ( value: string ) => {
        onChange(
            selected.has( value )
                ? values.filter( ( item ) => item !== value )
                : [ ...values, value ]
        );
    };

    return (
        <div className="relative min-w-0 flex-1">
            <button
                type="button"
                aria-label={ label }
                aria-expanded={ open }
                className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-muted"
                onClick={ () => {
                    setOpen( ! open );
                } }
            >
                <span
                    className={ cn(
                        'truncate',
                        values.length ? null : 'text-muted-foreground'
                    ) }
                >
                    { selectedLabel }
                </span>
                <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
            </button>
            { open ? (
                <div className="absolute z-30 mt-2 w-full rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg">
                    <input
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-muted"
                        aria-label={ searchPlaceholder }
                        placeholder={ searchPlaceholder }
                        value={ search }
                        onChange={ ( event ) => {
                            setSearch( event.target.value );
                        } }
                    />
                    <div className="mt-2 max-h-64 overflow-auto">
                        { filtered.length ? (
                            filtered.map( ( option ) => (
                                <button
                                    type="button"
                                    key={ option.value }
                                    aria-pressed={ selected.has(
                                        option.value
                                    ) }
                                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                    onClick={ () => {
                                        toggle( option.value );
                                    } }
                                >
                                    <span>{ option.label }</span>
                                    { selected.has( option.value ) ? (
                                        <Check
                                            className="h-4 w-4 text-primary"
                                            aria-hidden
                                        />
                                    ) : null }
                                </button>
                            ) )
                        ) : (
                            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                                { emptyLabel }
                            </p>
                        ) }
                    </div>
                </div>
            ) : null }
        </div>
    );
}

/**
 * One rule group in the editor: a soft panel with an icon header.
 *
 * @param {Object}    props          Component props.
 * @param {ReactNode} props.icon     Header icon.
 * @param {string}    props.label    Group name.
 * @param {ReactNode} props.children Group controls.
 */
export function RulePanel( {
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
} ) {
    return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2.5">
                <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4"
                    aria-hidden
                >
                    { icon }
                </span>
                <span className="text-sm font-semibold text-foreground">
                    { label }
                </span>
            </div>
            { children }
        </div>
    );
}

export function AndDivider() {
    return (
        <div className="my-2 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                AND
            </span>
            <span className="h-px flex-1 bg-border" />
        </div>
    );
}

/**
 * A device or browser choice tile in the editor.
 *
 * @param {Object}    props         Component props.
 * @param {ReactNode} props.icon    Tile icon.
 * @param {string}    props.label   Choice name.
 * @param {boolean}   props.active  Whether it is selected.
 * @param {Function}  props.onClick Toggles the choice.
 */
export function SelectableTile( {
    icon,
    label,
    active,
    onClick,
}: {
    icon: ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
} ) {
    return (
        <button
            type="button"
            aria-pressed={ active }
            className={ cn(
                'relative flex w-24 select-none flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>svg]:h-7 [&>svg]:w-7',
                active
                    ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
            ) }
            onClick={ () => {
                onClick();
            } }
        >
            { active ? (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden />
                </span>
            ) : null }
            { icon }
            <span className="text-xs font-medium">{ label }</span>
        </button>
    );
}
