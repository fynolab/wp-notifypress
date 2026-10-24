export type DateTime = string;

export type Nullable< T > = T | null;

export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';
export type AutomationTrigger = 'subscriber_created' | 'custom_event';
export type AutomationStepType =
    | 'wait'
    | 'send_notification'
    | 'add_tag'
    | 'webhook';

export interface AutomationStep {
    id?: number;
    nodeId?: string;
    type: AutomationStepType;
    config: Record< string, unknown >;
    position_x?: number;
    position_y?: number;
    parent_step_id?: number | null;
    branch?: string | null;
}

export interface Automation {
    id: number;
    name: string;
    description?: string | null;
    trigger_type: AutomationTrigger;
    trigger_config?: Record< string, unknown >;
    status: AutomationStatus;
    steps?: AutomationStep[];
    enrollments_count?: number;
    started_count?: number;
    active_count?: number;
    finished_count?: number;
    suspended_count?: number;
    created_at?: DateTime;
    updated_at?: DateTime;
}

export interface AutomationTemplate {
    key: string;
    name: string;
    category: 'popular' | 'all';
    description: string;
    trigger_type: AutomationTrigger;
    trigger_config: Record< string, unknown > | unknown[];
    steps: Array< {
        type: AutomationStepType;
        config: Record< string, unknown >;
        position_x: number;
        position_y: number;
    } >;
    needs_notification: boolean;
    has_notifications: boolean;
    is_custom_event: boolean;
}

export interface ConnectedSite {
    id?: number | string;
    site_name?: string;
    site_url?: string;
    public_key?: string;
    remove_powered_by?: boolean;
    prompt_title?: string | null;
    prompt_message?: string | null;
    prompt_icon?: string | null;
    prompt_approve_text?: string | null;
    prompt_cancel_text?: string | null;
    prompt_style?: string;
    prompt_accent_color?: string;
    prompt_position?: string;
    prompt_delay_seconds?: number;
    prompt_hide_days?: number;
}

export interface WpPostType {
    name: string;
    label: string;
}

export interface Announcement {
    id: number;
    title: string;
    body: string;
    link_url: string | null;
    link_label: string | null;
    created_at: DateTime;
    read: boolean;
}

export interface NotifyPressSettings {
    /**
     * A masked fingerprint of the API token, never the token itself — except
     * momentarily while an admin is entering a new one. See lib/settings.ts.
     */
    apiToken?: string;
    apiKey?: string;
    /** Whether an API token is stored on the server. */
    connected?: boolean;
    siteKey?: string;
    siteName?: string;
    siteUrl?: string;
    setupCompleted?: boolean;
    connectionStatus?: 'connected' | 'disconnected' | string;
    connectedSite?: ConnectedSite;
    removePoweredBy?: boolean;
    welcomeNotificationEnabled?: boolean;
    welcomeNotificationTitle?: string;
    welcomeNotificationMessage?: string;
    welcomeNotificationIcon?: string;
    welcomeNotificationUrl?: string;
    postNotificationEnabled?: boolean;
    postNotificationPostTypes?: string[];
    wcOrderNotificationEnabled?: boolean;
    wcAbandonedCartNotificationEnabled?: boolean;
    /** Read-only: whether the WooCommerce plugin is active. Not persisted. */
    wooCommerceActive?: boolean;
    pwaEnabled?: boolean;
}

export interface LaravelCollection< T > {
    data?: T[];
    total?: number;
    next_cursor?: string;
    prev_cursor?: string;
}

export interface LaravelResource< T > {
    data?: T;
}

export interface SegmentRuleGroup {
    condition?: string;
    values: string[];
}

export interface SegmentRule {
    location: SegmentRuleGroup;
    device: SegmentRuleGroup;
    browser: SegmentRuleGroup;
}

export interface Segment {
    id: number | string;
    name: string;
    description?: string;
    is_active?: boolean;
    rule?: Partial< SegmentRule > | string | null;
    created_at?: DateTime;
}

export interface SubscriberTag {
    id: number;
    name: string;
    slug?: string;
}

export interface Subscriber {
    id: number | string;
    token?: string;
    city?: string;
    country?: string;
    browser?: string;
    device?: string;
    timezone?: string;
    ip?: string;
    active?: boolean;
    created_at?: DateTime;
    tags?: SubscriberTag[];
}

export interface NotificationAnalytics {
    views?: number;
    clicks?: number;
    click_through_rate?: number;
    browsers?: {
        chrome?: number;
        firefox?: number;
        safari?: number;
        edge?: number;
        opera?: number;
        other?: number;
    };
    devices?: {
        desktop?: number;
        mobile?: number;
        tablet?: number;
    };
}

export interface Notification {
    id: number | string;
    title?: string;
    message?: string;
    status?: string;
    purpose?: string;
    created_by?: string;
    target_url?: string;
    icon_url?: string;
    icon_preview_url?: string;
    image_url?: string;
    image_preview_url?: string;
    segment_id?: number | string;
    scheduled_at?: DateTime;
    sent_at?: DateTime;
    created_at?: DateTime;
    views?: number;
    clicks?: number;
    chrome?: number;
    firefox?: number;
    safari?: number;
    edge?: number;
    opera?: number;
    other?: number;
    desktop?: number;
    mobile?: number;
    tablet?: number;
    analytics?: NotificationAnalytics | string;
}

export interface DashboardCountry {
    code?: string | null;
    name?: string;
    country?: string;
    flag?: string;
    subscribers?: number;
    total?: number;
    count?: number;
    percentage?: number | string;
    growth_rate?: number | string;
}

export interface DashboardCampaign extends Notification {
    clicks?: number;
    sent?: number;
    delivered?: number;
    ctr?: number;
    date?: string;
}

export interface DashboardSubscriberChange {
    new: number;
    lost: number;
    net: number;
    percent: number | null;
}

export interface DashboardPlanUsage {
    name: string;
    subscriberLimit: number;
    accountSubscribers: number;
}

export interface DashboardCampaignsSent {
    last30: number;
    previous30: number;
    weekly: number[];
}

export interface DashboardRecentClickRate {
    rate: number | null;
    clicks: number;
    views: number;
}

export interface DashboardUpcoming {
    scheduled: number;
    recurring: number;
    next: {
        id: number;
        title: string;
        date: string | null;
        type: 'scheduled' | 'recurring';
    } | null;
}

export interface DashboardGrowthDay {
    date: string;
    new: number;
    lost: number;
}

export interface DashboardShareRow {
    name: string;
    subscribers: number;
    percentage: number;
}

export interface DashboardData {
    // The original counts arrive formatted ("1,234"); everything below
    // subscribersWithoutCountry is a raw number.
    totalNotifications?: number | string;
    totalSubscribers?: number | string;
    totalCountries?: number | string;
    totalScheduledNotifications?: number | string;
    clickRate?: number;
    clickRateChange?: number | null;
    topCountries?: DashboardCountry[];
    mapCountries?: {
        code: string;
        name: string;
        subscribers: number;
    }[];
    subscribersWithoutCountry?: number;
    recentCampaigns?: DashboardCampaign[];
    recentNotifications?: DashboardCampaign[];
    activeSubscribers?: number;
    subscriberChange?: DashboardSubscriberChange | null;
    plan?: DashboardPlanUsage | null;
    campaignsSent?: DashboardCampaignsSent | null;
    recentClickRate?: DashboardRecentClickRate | null;
    weeklyClickRates?: ( number | null )[];
    upcoming?: DashboardUpcoming | null;
    growth?: DashboardGrowthDay[];
    devices?: DashboardShareRow[];
    browsers?: DashboardShareRow[];
}

export type AnalyticsRange = '30d' | '90d' | '12m';

export type AnalyticsGranularity = 'day' | 'month';

export interface AnalyticsChange {
    current: number;
    previous: number;
}

export interface AnalyticsSummary {
    campaigns: AnalyticsChange;
    views: AnalyticsChange;
    clicks: AnalyticsChange;
    ctr: { current: number | null; previous: number | null };
}

export interface AnalyticsEngagementBucket {
    date: string;
    campaigns: number;
    views: number;
    clicks: number;
    ctr: number | null;
}

export interface AnalyticsShareRow {
    name: string;
    views: number;
    percentage: number;
}

export type AnalyticsLostReasonKey =
    | 'unsubscribed'
    | 'token_expired'
    | 'token_invalid'
    | 'other';

export interface AnalyticsLostReason {
    reason: AnalyticsLostReasonKey;
    label: string;
    subscribers: number;
    percentage: number;
}

export interface AnalyticsAudience {
    new: number;
    lost: number;
    net: number;
    series: DashboardGrowthDay[];
    lostReasons: AnalyticsLostReason[];
}

export interface AnalyticsFunnel {
    campaigns: number;
    untracked: number;
    sent: number;
    delivered: number;
    failed: number;
    views: number;
    clicks: number;
}

export interface AnalyticsSegmentRow {
    id: number | null;
    name: string;
    campaigns: number;
    views: number;
    clicks: number;
    ctr: number | null;
}

export interface AnalyticsCountryRow {
    code: string;
    name: string;
    flag: string | null;
    views: number;
    clicks: number;
    ctr: number | null;
}

export interface AnalyticsCountries {
    from: string;
    days: number;
    siteCtr: number | null;
    rows: AnalyticsCountryRow[];
}

export interface AnalyticsBestTimes {
    from: string;
    weeks: number;
    views: number[];
    clicks: number[];
}

export type AnalyticsCampaignSort =
    | 'sent_at'
    | 'sent'
    | 'delivered'
    | 'views'
    | 'clicks'
    | 'ctr';

export interface AnalyticsCampaignRow {
    id: number;
    title: string;
    sentAt: string | null;
    segment: { id: number; name: string } | null;
    sent: number | null;
    delivered: number | null;
    failed: number | null;
    views: number;
    clicks: number;
    ctr: number | null;
    ctrDelta: number | null;
}

export interface AnalyticsCampaignPage {
    data: AnalyticsCampaignRow[];
    meta: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
    siteCtr: number | null;
}

export interface AnalyticsData {
    range: AnalyticsRange;
    period: {
        from: string;
        to: string;
        granularity: AnalyticsGranularity;
    };
    summary: AnalyticsSummary;
    isPaidUser: boolean;
    // Everything below is null for Free users: the server does not send it.
    engagement: AnalyticsEngagementBucket[] | null;
    funnel: AnalyticsFunnel | null;
    segments: AnalyticsSegmentRow[] | null;
    countries: AnalyticsCountries | null;
    bestTimes: AnalyticsBestTimes | null;
    browsers: AnalyticsShareRow[] | null;
    devices: AnalyticsShareRow[] | null;
    audience: AnalyticsAudience | null;
}

export interface ReportsMeta {
    hasSites: boolean;
    isPaidUser: boolean;
}

export interface ReportQueueResponse {
    message?: string;
    report_type?: string;
    retention_message?: string;
    pdf_url?: string;
}
