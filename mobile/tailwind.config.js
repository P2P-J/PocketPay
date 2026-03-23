/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3DD598",
          dark: "#2EAE7D",
          light: "#E8FAF2",
        },
        background: "#FFFFFF",
        card: "#F5F6F8",
        "text-primary": "#191F28",
        "text-secondary": "#8B95A1",
        "text-disabled": "#B0B8C1",
        income: "#3182F6",
        expense: "#F04452",
        divider: "#E5E8EB",
        overlay: "rgba(0,0,0,0.2)",
        "overlay-heavy": "rgba(0,0,0,0.4)",
      },
      fontFamily: {
        pretendard: ["Pretendard"],
        "pretendard-medium": ["Pretendard-Medium"],
        "pretendard-semibold": ["Pretendard-SemiBold"],
        "pretendard-bold": ["Pretendard-Bold"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px" }],
        title: ["22px", { lineHeight: "30px" }],
        section: ["18px", { lineHeight: "26px" }],
        body: ["16px", { lineHeight: "24px" }],
        sub: ["14px", { lineHeight: "20px" }],
        caption: ["12px", { lineHeight: "16px" }],
        tab: ["10px", { lineHeight: "14px" }],
      },
      borderRadius: {
        card: "16px",
        button: "12px",
        input: "12px",
        sheet: "20px",
        badge: "999px",
      },
      spacing: {
        "screen-x": "20px",
        "card-p": "16px",
        "card-gap": "8px",
        "section-gap": "24px",
      },
      height: {
        "list-item": "68px",
        "btn-sm": "36px",
        "btn-md": "44px",
        "btn-lg": "52px",
        input: "52px",
        header: "56px",
      },
      width: {
        "icon-sm": "24px",
        "icon-md": "40px",
        "icon-lg": "56px",
      },
    },
  },
  plugins: [],
};
