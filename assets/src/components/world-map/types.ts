export type MapCountry = {
    code: string;
    name: string;
    subscribers: number;
};

export type TopCountry = {
    code: string | null;
    name: string;
    subscribers: number;
    percentage: number;
    growth_rate: number;
    flag: string | null;
};

export type Breakdown = {
    name: string;
    subscribers: number;
    percentage: number;
};

export type CountryEngagement = {
    views: number;
    clicks: number;
    ctr: number | null;
    siteCtr: number | null;
};

export type CountryInsights = {
    code: string;
    name: string;
    flag: string | null;
    storedNames: string[];
    subscribers: number;
    percentage: number;
    newLast30Days: number;
    newPrevious30Days: number;
    growthRate: number;
    cities: Breakdown[];
    devices: Breakdown[];
    browsers: Breakdown[];
    timezone: string | null;
    engagement: CountryEngagement;
};
