module.exports = {
    content: [
        './assets/src/App.tsx',
        './assets/src/lib/admin-ui.ts',
        './assets/src/pages/**/*.{js,ts,tsx}',
        './assets/src/components/**/*.{js,ts,tsx}',
    ],
    corePlugins: {
        preflight: false,
    },
    // The admin UI is light only (style.scss defines light theme colours
    // alone). Tailwind's default `media` strategy turned every `dark:` class
    // on whenever the computer was in dark mode, painting dark colours onto
    // the light WordPress admin. Scoping them to a class nothing sets keeps
    // them off, and leaves a switch should a dark theme ever be added.
    darkMode: [ 'class', '.np-dark' ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                'content-bg': 'hsl(var(--content-bg))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
        },
    },
    plugins: [],
};
