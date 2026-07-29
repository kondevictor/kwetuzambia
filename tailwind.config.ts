import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kwetu: {
          green: "#0B5D3B",
          greenDark: "#083F28",
          orange: "#E8792B",
          orangeLight: "#F2A65A",
          cream: "#FBF7F0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
