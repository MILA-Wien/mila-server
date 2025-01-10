import type { Config } from "tailwindcss";

// See https://uicolors.app/

export default <Partial<Config>>{
  safelist: [
    {
      pattern: /border-(red|blue|green|orange|pink|purple|primary)-500/,
      variants: ["hover", "focus"], // Optional: include hover, focus variants if needed
    },
    {
      pattern: /bg-(red|blue|green|orange|pink|purple|primary)-50/,
    },
  ],
  theme: {
    extend: {
      colors: {
        black: "#333333",
        white: "#ffffff",

        milaGreen: "#00867a", // Elf Green 700 - CI
        milaGreenHover: "#009a8c",
        milaPurple: "#3b2776", // Meteorite 900 - CI
        milaPurpleHover: "#554588",

        // Main color
        green: {
          "50": "#f2fbf9",
          "100": "#d1f6ee",
          "200": "#a4ebde",
          "300": "#6edaca",
          "400": "#40c1b3",
          "500": "#00867a", // Elf Green 700 - CI
          "600": "#1a5552",
          "700": "#1a4745",
          "800": "#092a29",
          "900": "#092a29",
          "950": "#092a29",
        },

        // All the same for nuxt ui
        purple: {
          "50": "#f1f1fc",
          "100": "#e5e6fa",
          "200": "#cfcff6",
          "300": "#b4b2ef",
          "400": "#9c93e6",
          "500": "#3b2776",
          "600": "#281a4c",
          "700": "#281a4c",
          "800": "#281a4c",
          "900": "#281a4c",
          "950": "#281a4c",
        },

        blue: {
          "50": "#f1f5fd",
          "100": "#dee7fb",
          "200": "#c5d7f8",
          "300": "#9dbdf3",
          "400": "#6e9aec",
          "500": "#5e84e7",
          "600": "#385ad8",
          "700": "#2f47c6",
          "800": "#2c3ba1",
          "900": "#283680",
          "950": "#1d234e",
        },

        orange: {
          "50": "#fdf8ef",
          "100": "#faeeda",
          "200": "#f3dab5",
          "300": "#ecc085",
          "400": "#e39c54",
          "500": "#dc8233",
          "600": "#d36d29",
          "700": "#ab5323",
          "800": "#894323",
          "900": "#6f391f",
          "950": "#3b1b0f",
        },

        red: {
          "50": "#fdf3f3",
          "100": "#fbe5e5",
          "200": "#f8d0d0",
          "300": "#f2afaf",
          "400": "#e98080",
          "500": "#d94c4c",
          "600": "#c73b3b",
          "700": "#a72e2e",
          "800": "#8b2929",
          "900": "#742828",
          "950": "#3e1111",
        },

        pink: {
          "50": "#fcf6fd",
          "100": "#f9ebfc",
          "200": "#f4dbf8",
          "300": "#ebb7f0",
          "400": "#df8ce6",
          "500": "#cd5fd6",
          "600": "#b340b9",
          "700": "#963299",
          "800": "#7c2a7e",
          "900": "#682768",
          "950": "#430f43",
        },

        gray: {
          "50": "#f6f7f8",
          "100": "#ebecee",
          "200": "#dcdee1",
          "300": "#c4c8cc",
          "400": "#a1a6ac",
          "500": "#92979f",
          "600": "#81868f",
          "700": "#747881",
          "800": "#62646b",
          "900": "#505258",
          "950": "#333438",
        },
      },
      fontFamily: {
        Avory: ["AvoryII"],
        OpenSans: ["OpenSans"],
      },
    },
  },
};
