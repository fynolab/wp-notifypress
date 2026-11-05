import { Card } from '../ui/card';
import PaidFeatureOverlay from '../paid-feature-overlay';
import { AnalyticsInsight } from './analytics-insight';
import { AnalyticsKpis } from './analytics-kpis';
import { EngagementCard } from './engagement-card';
import { FunnelCard } from './funnel-card';
import { BestTimesCard } from './best-times-card';
import { CountriesCard } from './countries-card';
import { AudienceCard } from './audience-card';
import { LossReasonsCard } from './loss-reasons-card';
import { SegmentsCard } from './segments-card';
import { DevicesBrowsers } from '../dashboard/devices-browsers';
import { SAMPLE_ANALYTICS as sample, SAMPLE_CAMPAIGNS } from './sample-data';

function SampleCampaignTable() {
    return (
        <Card className="border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-lg font-semibold text-foreground">
                Campaigns
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Every campaign sent in the last 30 days
            </p>
            <div className="mt-5 divide-y divide-border">
                { SAMPLE_CAMPAIGNS.map( ( campaign ) => (
                    <div
                        key={ campaign.title }
                        className="flex items-center justify-between gap-4 py-3 text-sm"
                    >
                        <span className="font-medium text-foreground">
                            { campaign.title }
                        </span>
                        <span className="flex gap-8 tabular-nums text-muted-foreground">
                            <span>
                                { campaign.views.toLocaleString() } views
                            </span>
                            <span>
                                { campaign.clicks.toLocaleString() } clicks
                            </span>
                            <span className="font-semibold text-primary">
                                { sample.ctr(
                                    campaign.clicks,
                                    campaign.views
                                ) }
                                %
                            </span>
                        </span>
                    </div>
                ) ) }
            </div>
        </Card>
    );
}

/**
 * The whole Analytics page rendered with made-up sample figures, shown to Free users
 * under the shared upgrade overlay so they can see what a paid plan gives them. The
 * server sends no real data for Free users; everything here comes from sample-data.ts.
 */
export function LockedSection() {
    return (
        <div data-testid="analytics-locked">
            <PaidFeatureOverlay
                isPaidUser={ false }
                featureName="Analytics"
                description="Insights, summary cards, engagement charts, delivery funnel, best send times, country and segment insights and the campaign table are on every paid plan, starting with Starter."
            >
                <div
                    className="space-y-6"
                    aria-hidden
                    data-testid="analytics-sample"
                >
                    <AnalyticsInsight
                        range={ sample.range }
                        summary={ sample.summary }
                        bestTimes={ sample.bestTimes }
                        countries={ sample.countries }
                    />

                    <AnalyticsKpis
                        summary={ sample.summary }
                        engagement={ sample.engagement }
                        range={ sample.range }
                    />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <EngagementCard
                            className="xl:col-span-3"
                            engagement={ sample.engagement }
                            summary={ sample.summary }
                            range={ sample.range }
                            granularity={ sample.granularity }
                        />
                        <FunnelCard
                            className="xl:col-span-2"
                            funnel={ sample.funnel }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <BestTimesCard
                            className="xl:col-span-3"
                            bestTimes={ sample.bestTimes }
                        />
                        <CountriesCard
                            className="xl:col-span-2"
                            countries={ sample.countries }
                            range={ sample.range }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <AudienceCard
                            className="xl:col-span-3"
                            audience={ sample.audience }
                            range={ sample.range }
                            granularity={ sample.granularity }
                        />
                        <LossReasonsCard
                            className="xl:col-span-2"
                            audience={ sample.audience }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <SegmentsCard
                            className="xl:col-span-3"
                            segments={ sample.segments }
                        />
                        <DevicesBrowsers
                            className="xl:col-span-2"
                            devices={ sample.devices }
                            browsers={ sample.browsers }
                            title="Browsers and devices"
                            description="Share of campaign views"
                            emptyText="No views in this period yet."
                            testId="analytics-sample-devices"
                        />
                    </div>

                    <SampleCampaignTable />
                </div>
            </PaidFeatureOverlay>
        </div>
    );
}
