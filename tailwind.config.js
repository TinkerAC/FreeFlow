/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                'component-bg': '#121212',
                'item-bg-hover': '#1f1f1f',
                'item-bg-selected': '#2a2a2a',
                'item-bg-hover-selected': '#484848',

            },

        },
    },
    plugins: [],
}