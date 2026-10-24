declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module 'world-atlas/countries-110m.json' {
    const topology: {
        type: 'Topology';
        objects: Record< string, unknown >;
        arcs: number[][][];
    };

    export default topology;
}
