/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#E8F5E9', // Pastel Green Surface
                    100: '#C8E6C9',
                    200: '#A5D6A7',
                    300: '#81C784',
                    400: '#66BB6A',
                    500: '#004D40', // Deep Forest Green - Base Brand Primary
                    600: '#003E33',
                    700: '#002E26',
                    800: '#001F1A',
                    900: '#000F0D',
                    950: '#000504',
                },
                accent: {
                    50: '#FDF8E6',
                    100: '#FBEBBA',
                    200: '#F8D882',
                    300: '#F4C44A',
                    400: '#E6A514',
                    500: '#D4AF37', // Gold - Base Accent
                    600: '#BCA033',
                    700: '#8E7321',
                    800: '#69551A',
                    900: '#4D3E14',
                    950: '#2F260A',
                },
                neutral: {
                    50: '#FAFAFA', 
                    100: '#F4F4F5',
                    200: '#E5E7EB', // Standard Light Mode border
                    300: '#D4D4D8',
                    400: '#A1A1AA',
                    500: '#71717A',
                    600: '#5F5A5A', // Muted Text
                    700: '#3F3F46',
                    800: '#27272A',
                    900: '#0F172A', // Dark Slate Header
                    950: '#18181B',
                },
                'brand-surface': '#E8F5E9',
                'warm-grey': '#EFE8E8', // Premium Neutral
                'soft-blue': '#C3DDDC', // Data / Structure Background
                success: {
                    bg: '#D1FAE5',
                    500: '#10B981', // Emerald
                    700: '#047857',
                },
                warning: {
                    bg: '#FEF3C7',
                    500: '#F59E0B', // Amber
                    700: '#B45309',
                },
                error: {
                    bg: '#FEE2E2',
                    500: '#EF4444', // Rose
                    700: '#B91C1C',
                },
                background: '#FFFFFF',
                surface: '#FFFFFF',
                border: '#E5E7EB', 
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
                sans: ['"Inter"', 'sans-serif'],
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
