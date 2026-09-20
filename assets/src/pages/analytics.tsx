import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BellPlus, Eye, Lock, MousePointerClick, Sparkles, TrendingUp, Users } from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Label,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Button } from '../components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '../components/ui/chart';
import { laravelRequest } from '../lib/api';
import { formatNumber } from '../lib/format';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import type { AnalyticsData, LaravelResource, NotifyPressSettings } from '../types';

const BROWSER_COLORS: Record<string, string> = {
    Chrome: 'hsl(var(--chart-1))',
    Firefox: 'hsl(var(--chart-2))',
    Safari: 'hsl(var(--chart-3))',
    Edge: 'hsl(var(--chart-4))',
    Opera: 'hsl(var(--chart-5))',
    Other: 'hsl(var(--muted-foreground))',
};

const STATUS_COLORS: Record<string, string> = {
    sent: 'hsl(var(--chart-1))',
    scheduled: 'hsl(var(--chart-2))',
    pending: 'hsl(var(--chart-3))',
    failed: 'hsl(var(--destructive))',
    sending: 'hsl(var(--chart-4))',
};

const subscriberChartConfig = {
    totalSubscribers: {
        label: 'Subscribers',
        color: 'hsl(var(--chart-blue))',
    },
} satisfies ChartConfig;

const notificationsMonthlyConfig = {
    total: { label: 'Notifications sent', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const subscribersMonthlyConfig = {
    total: { label: 'New subscribers', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const emptyAnalyticsData: AnalyticsData = {
    totalSubscribers: 0,
    totalNotifications: 0,
    totalScheduledNotifications: 0,
    numberOfSubscribersUserCanHave: 0,
    totalClicks: 0,
    totalViews: 0,
    averageCtr: 0,
    notificationsPerMonth: [],
    subscribersPerMonth: [],
    browserBreakdown: [],
    notificationsByStatus: {},
    activeSubscribers: 0,
    inactiveSubscribers: 0,
    isPaidUser: true,
};

function billingUrl(settings?: NotifyPressSettings) {
    const appUrl =
        settings?.appUrl ||
        window.notifypress?.defaultAppUrl ||
        window.notifypress?.appUrl ||
        'https://app.notifypress.com';

    return `${String(appUrl).replace(/\/$/, '')}/user/billing`;
}

function formatTooltipValue(value: string | number) {
    return formatNumber(typeof value === 'number' ? value : Number(value || 0));
}

function StatCard({
    title,
    value,
    description,
    icon,
}: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader className="flex-row items-center gap-3 pb-2">
                {icon}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-4xl font-bold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

export default function AnalyticsPage() {
    const settingsQuery = useQuery({
        queryKey: ['np-settings'],
        queryFn: getSettings,
    });
    const settings = settingsQuery.data;
    const token = getApiToken(settings);
    const hasToken = hasApiToken(settings);
    const analyticsQuery = useQuery({
        queryKey: ['np-analytics', token, settings?.appUrl],
        enabled: hasToken,
        queryFn: () =>
            laravelRequest<LaravelResource<AnalyticsData>>(
                settings,
                '/analytics',
            ),
    });

    if (!hasToken) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="border-amber-200 bg-amber-50 text-amber-900">
                    <CardContent className="py-6">
                        <p className="text-sm font-semibold">
                            API token required
                        </p>
                        <p className="mt-1 text-sm text-amber-800">
                            Connect NotifyPress or add an API token in
                            Settings to load analytics for this site.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (analyticsQuery.isError) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="py-6">
                        <p className="text-sm font-semibold text-foreground">
                            Analytics unavailable
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {analyticsQuery.error instanceof Error
                                ? analyticsQuery.error.message
                                : 'Unable to load analytics for this site.'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const data = analyticsQuery.data?.data ?? emptyAnalyticsData;
    const isPaidUser = analyticsQuery.data?.data?.isPaidUser ?? true;
    const loading = analyticsQuery.isFetching && !analyticsQuery.data;
    const upgradeHref = billingUrl(settings);
    const radialChartData = [
        {
            totalSubscribers: data.totalSubscribers,
            fill: 'var(--color-totalSubscribers)',
        },
    ];
    const activeSubscriberData = [
        {
            name: 'Active',
            value: data.activeSubscribers,
            fill: 'hsl(var(--chart-1))',
        },
        {
            name: 'Inactive',
            value: data.inactiveSubscribers,
            fill: 'hsl(var(--muted-foreground))',
        },
    ];
    const statusData = Object.entries(data.notificationsByStatus).map(
        ([status, total]) => ({
            status: status.charAt(0).toUpperCase() + status.slice(1),
            total,
            fill: STATUS_COLORS[status] ?? 'hsl(var(--muted-foreground))',
        }),
    );

    return (
        <div className="container mx-auto space-y-8 px-4 py-8">
            <div
                className={`grid grid-cols-1 gap-5 transition-opacity duration-300 md:grid-cols-2 lg:grid-cols-4 ${
                    loading ? 'opacity-70' : 'opacity-100'
                }`}
            >
                <StatCard
                    title="Total Notifications"
                    value={formatNumber(data.totalNotifications)}
                    description={`${formatNumber(data.totalScheduledNotifications)} scheduled`}
                    icon={<BellPlus className="h-5 w-5 text-purple-500" />}
                />
                <StatCard
                    title="Total Views"
                    value={formatNumber(data.totalViews)}
                    description="across all sent notifications"
                    icon={<Eye className="h-5 w-5 text-blue-500" />}
                />
                <StatCard
                    title="Total Clicks"
                    value={formatNumber(data.totalClicks)}
                    description="across all sent notifications"
                    icon={<MousePointerClick className="h-5 w-5 text-green-500" />}
                />
                <StatCard
                    title="Avg. Click-Through Rate"
                    value={`${data.averageCtr}%`}
                    description="clicks ÷ views"
                    icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
                />
            </div>

            <div className="relative space-y-8">
                {!isPaidUser ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/60 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2 px-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                                <Lock className="h-5 w-5 text-violet-500" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                                Analytics charts are a paid feature
                            </p>
                            <p className="max-w-xs text-xs text-muted-foreground">
                                Upgrade to a Business or Premium plan to access
                                detailed charts, growth trends, and browser
                                breakdowns.
                            </p>
                            <a
                                href={upgradeHref}
                                className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-violet-700"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Upgrade Plan
                            </a>
                        </div>
                    </div>
                ) : null}

                <div
                    className={
                        !isPaidUser
                            ? 'pointer-events-none space-y-8 select-none blur-sm'
                            : 'space-y-8'
                    }
                >
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Notifications Sent</CardTitle>
                                <CardDescription>
                                    Monthly sends over the last 12 months
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.notificationsPerMonth.length > 0 ? (
                                    <ChartContainer
                                        config={notificationsMonthlyConfig}
                                        className="h-[220px] w-full"
                                    >
                                        <BarChart
                                            data={data.notificationsPerMonth}
                                            margin={{ top: 10 }}
                                        >
                                            <CartesianGrid vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                tickLine={false}
                                                tickMargin={8}
                                                axisLine={false}
                                                tickFormatter={(value) =>
                                                    value.split(' ')[0]
                                                }
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                width={32}
                                            />
                                            <ChartTooltip
                                                content={<ChartTooltipContent />}
                                            />
                                            <Bar
                                                dataKey="total"
                                                fill="var(--color-total)"
                                                radius={6}
                                            />
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                                        No sent notifications yet.
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline">
                                    <Link to="/notifications">
                                        View All Campaigns
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader className="flex-row items-center gap-3">
                                <Users className="h-5 w-5" />
                                <div>
                                    <CardTitle>Total Subscribers</CardTitle>
                                    <CardDescription>
                                        vs. plan limit
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer
                                    config={subscriberChartConfig}
                                    className="mx-auto aspect-square max-h-[220px]"
                                >
                                    <RadialBarChart
                                        data={radialChartData}
                                        startAngle={0}
                                        endAngle={
                                            data.numberOfSubscribersUserCanHave >
                                            0
                                                ? 360 *
                                                  (data.totalSubscribers /
                                                      data.numberOfSubscribersUserCanHave)
                                                : 0
                                        }
                                        innerRadius={80}
                                        outerRadius={110}
                                    >
                                        <PolarGrid
                                            gridType="circle"
                                            radialLines={false}
                                            stroke="none"
                                            className="first:fill-muted last:fill-background"
                                            polarRadius={[86, 74]}
                                        />
                                        <RadialBar
                                            dataKey="totalSubscribers"
                                            background
                                            cornerRadius={10}
                                        />
                                        <PolarRadiusAxis
                                            tick={false}
                                            tickLine={false}
                                            axisLine={false}
                                        >
                                            <Label
                                                content={({ viewBox }) => {
                                                    if (
                                                        viewBox &&
                                                        'cx' in viewBox &&
                                                        'cy' in viewBox
                                                    ) {
                                                        return (
                                                            <text
                                                                x={viewBox.cx}
                                                                y={viewBox.cy}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                            >
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={viewBox.cy}
                                                                    className="fill-foreground text-3xl font-bold"
                                                                >
                                                                    {formatNumber(
                                                                        data.totalSubscribers,
                                                                    )}
                                                                </tspan>
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={(viewBox.cy || 0) + 24}
                                                                    className="fill-muted-foreground text-xs"
                                                                >
                                                                    of{' '}
                                                                    {formatNumber(
                                                                        data.numberOfSubscribersUserCanHave,
                                                                    )}
                                                                </tspan>
                                                            </text>
                                                        );
                                                    }

                                                    return null;
                                                }}
                                            />
                                        </PolarRadiusAxis>
                                    </RadialBarChart>
                                </ChartContainer>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline">
                                    <Link to="/subscribers">
                                        View All Subscribers
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Subscriber Growth</CardTitle>
                                <CardDescription>
                                    New subscribers per month over the last 12
                                    months
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.subscribersPerMonth.length > 0 ? (
                                    <ChartContainer
                                        config={subscribersMonthlyConfig}
                                        className="h-[220px] w-full"
                                    >
                                        <LineChart
                                            data={data.subscribersPerMonth}
                                            margin={{ top: 10 }}
                                        >
                                            <CartesianGrid vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                tickLine={false}
                                                tickMargin={8}
                                                axisLine={false}
                                                tickFormatter={(value) =>
                                                    value.split(' ')[0]
                                                }
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                width={32}
                                            />
                                            <ChartTooltip
                                                content={<ChartTooltipContent />}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="total"
                                                stroke="var(--color-total)"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                                        No subscriber data yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Browser Breakdown</CardTitle>
                                <CardDescription>
                                    Views by browser across all sent
                                    notifications
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.browserBreakdown.length > 0 ? (
                                    <div className="flex items-center gap-6">
                                        <ResponsiveContainer
                                            width="50%"
                                            height={200}
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={data.browserBreakdown}
                                                    dataKey="views"
                                                    nameKey="browser"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    strokeWidth={2}
                                                >
                                                    {data.browserBreakdown.map(
                                                        (entry) => (
                                                            <Cell
                                                                key={entry.browser}
                                                                fill={
                                                                    BROWSER_COLORS[
                                                                        entry.browser
                                                                    ] ??
                                                                    'hsl(var(--muted-foreground))'
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) =>
                                                        formatTooltipValue(
                                                            value as
                                                                | string
                                                                | number,
                                                        )
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <ul className="flex-1 space-y-2 text-sm">
                                            {data.browserBreakdown.map(
                                                (entry) => (
                                                    <li
                                                        key={entry.browser}
                                                        className="flex items-center justify-between gap-2"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span
                                                                className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                                                                style={{
                                                                    background:
                                                                        BROWSER_COLORS[
                                                                            entry.browser
                                                                        ] ??
                                                                        'hsl(var(--muted-foreground))',
                                                                }}
                                                            />
                                                            {entry.browser}
                                                        </span>
                                                        <span className="font-medium">
                                                            {formatNumber(
                                                                entry.views,
                                                            )}
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                        No view data yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaigns by Status</CardTitle>
                                <CardDescription>
                                    Breakdown of all notifications by their
                                    current status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {statusData.length > 0 ? (
                                    <ul className="space-y-3">
                                        {statusData.map((item) => {
                                            const pct =
                                                data.totalNotifications > 0
                                                    ? Math.round(
                                                          (item.total /
                                                              data.totalNotifications) *
                                                              100,
                                                      )
                                                    : 0;

                                            return (
                                                <li key={item.status}>
                                                    <div className="mb-1 flex justify-between text-sm">
                                                        <span className="font-medium">
                                                            {item.status}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {formatNumber(
                                                                item.total,
                                                            )}{' '}
                                                            ({pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full rounded-full bg-muted">
                                                        <div
                                                            className="h-2 rounded-full transition-all"
                                                            style={{
                                                                width: `${pct}%`,
                                                                background:
                                                                    item.fill,
                                                            }}
                                                        />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
                                        No notification data yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Subscriber Activity</CardTitle>
                                <CardDescription>
                                    Active vs. inactive subscribers
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {data.activeSubscribers + data.inactiveSubscribers >
                                0 ? (
                                    <div className="flex items-center gap-6">
                                        <ResponsiveContainer
                                            width="50%"
                                            height={200}
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={activeSubscriberData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    strokeWidth={2}
                                                >
                                                    {activeSubscriberData.map(
                                                        (entry) => (
                                                            <Cell
                                                                key={entry.name}
                                                                fill={entry.fill}
                                                            />
                                                        ),
                                                    )}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) =>
                                                        formatTooltipValue(
                                                            value as
                                                                | string
                                                                | number,
                                                        )
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <ul className="flex-1 space-y-3 text-sm">
                                            {activeSubscriberData.map((entry) => {
                                                const total =
                                                    data.activeSubscribers +
                                                    data.inactiveSubscribers;
                                                const pct =
                                                    total > 0
                                                        ? Math.round(
                                                              (entry.value /
                                                                  total) *
                                                                  100,
                                                          )
                                                        : 0;

                                                return (
                                                    <li
                                                        key={entry.name}
                                                        className="flex items-center justify-between gap-2"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span
                                                                className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                                                                style={{
                                                                    background:
                                                                        entry.fill,
                                                                }}
                                                            />
                                                            {entry.name}
                                                        </span>
                                                        <span className="font-medium">
                                                            {formatNumber(
                                                                entry.value,
                                                            )}{' '}
                                                            <span className="text-muted-foreground">
                                                                ({pct}%)
                                                            </span>
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                                        No subscriber activity yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
