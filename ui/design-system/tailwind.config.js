/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Tactical Glass Palette
                background: '#020617', // Dark Mode Base
                surface: '#0f172a',
                primary: '#3b82f6',
                secondary: '#64748b',
                accent: '#22d3ee',
                border: '#1e293b', // 1px Border Color
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'], // For Headers/Tactical Look
            },
            borderWidth: {
                DEFAULT: '1px', // Enforce 1px borders
            },
        },
    },
    plugins: [],
}
