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
  plugins: [
    // 一个用于隐藏滚动条的插件,使用词条"no-scrollbar"即可隐藏滚动条
    function({ addUtilities }) {
      const newUtilities = {
        '.no-scrollbar': {
          '-ms-overflow-style': 'none', /* IE and Edge */
          'scrollbar-width': 'none', /* Firefox */
        },
        '.no-scrollbar::-webkit-scrollbar': {
          display: 'none', /* Chrome, Safari, Opera */
        },
      };
      addUtilities(newUtilities);
    },

  ],
};