/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#E6F1F1',
                    100: '#BFE0E0',
                    200: '#99CECE',
                    300: '#73BDBD',
                    400: '#4DABAB',
                    500: '#097070', // Petrol - Base Brand Primary
                    600: '#075C5C',
                    700: '#054848',
                    800: '#043333',
                    900: '#021F1F',
                    950: '#010F0F',
                },
                accent: {
                    50: '#F7F0D6',
                    100: '#F1E8CC',
                    200: '#EBDFA3',
                    300: '#E4D57A',
                    400: '#DCCC51',
                    500: '#D3B454', // Gold - Base Accent
                    600: '#B89B3E',
                    700: '#9C8434',
                    800: '#7D6827',
                    900: '#5F4B19',
                    950: '#3E300E',
                },
                neutral: {
                    50: '#FAFAFA', 
                    100: '#F4F4F5',
                    200: '#E2DADA', // Surface Muted
                    300: '#D4D4D8',
                    400: '#A1A1AA',
                    500: '#71717A',
                    600: '#5F5A5A', // Muted Text
                    700: '#3F3F46',
                    800: '#27272A',
                    900: '#2B2B2B', // Dark Text / Headings
                    950: '#18181B',
                },
                'warm-grey': '#EFE8E8', // Premium Neutral
                'soft-blue': '#C3DDDC', // Data / Structure Background
                success: {
                    bg: '#E6F4F1',
                    500: '#3C8C7A',
                    700: '#2B6658',
                },
                warning: {
                    bg: '#F7F0D6',
                    500: '#C59E38',
                    700: '#8B6D21',
                },
                error: {
                    bg: '#F7E6E6',
                    500: '#B55353',
                    700: '#8C3E3E',
                },
                background: '#FAFAFA',
                surface: '#FFFFFF',
                border: '#D4D4D8', 
            },
            screens: {
                'sm': '320px',    // Mobile S
                'mobile-m': '375px',
                'mobile-l': '414px',
                'tablet': '768px',
                'desktop-s': '1024px',
                'desktop-m': '1280px',
                'desktop-l': '1440px',
                'desktop-xl': '1920px',
            },
            fontFamily: {
                sans: ['"IBM Plex Sans"', 'sans-serif'],
                serif: ['"IBM Plex Serif"', 'serif'],
            },
            fontSize: {
                'display': ['3.5rem', { lineHeight: '1.2' }], // 56px
                'h1': ['2.25rem', { lineHeight: '1.2' }],     // 36px
                'h2': ['1.75rem', { lineHeight: '1.2' }],     // 28px
                'h3': ['1.25rem', { lineHeight: '1.2' }],     // 20px
                'body': ['1rem', { lineHeight: '1.6' }],      // 16px - Refined for readability
                'ui-small': ['0.875rem', { lineHeight: '1.4' }], // 14px - Refined for UI
                'caption': ['0.875rem', { letterSpacing: '0.04em', lineHeight: '1.4' }], // 14px - Enforced minimum size for readability
            },
            spacing: {
                '1': '4px',
                '2': '8px',
                '3': '12px',
                '4': '16px',
                '5': '20px',
                '6': '24px',
                '7': '32px',
                '8': '40px',
                '10': '64px',
                '12': '96px',
            },
            borderRadius: {
                'xs': '2px',
                'sm': '4px',
                'md': '8px',
                'lg': '12px',
                'xl': '16px',
                'pill': '9999px',
            },
            borderWidth: {
                'thin': '1px',
                'medium': '2px',
                'thick': '3px',
                DEFAULT: '1px',
            },
            boxShadow: {
                'xs': '0px 1px 2px rgba(0,0,0,0.04)',
                'sm': '0px 2px 6px rgba(0,0,0,0.06)',
                'md': '0px 6px 16px rgba(0,0,0,0.08)',
                'lg': '0px 12px 32px rgba(0,0,0,0.10)',
            }
        },
    },
    plugins: [],
}
