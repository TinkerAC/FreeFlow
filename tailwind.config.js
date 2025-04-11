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
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        marquee: 'marquee 10s linear infinite',
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

    // 一个用于设置窗口拖动区域的插件,使用词条"app-region-drag"即可设置窗口拖动区域
    function({ addUtilities }) {
      const newUtilities = {
        '.draggable': {
          '-webkit-app-region': 'drag',
        },
        '.undraggable': {
          '-webkit-app-region': 'no-drag',
        },
      };
      addUtilities(newUtilities, ['responsive', 'hover']);
    },

  ],
};