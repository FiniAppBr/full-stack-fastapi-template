import { createTheme, MantineColorsTuple } from '@mantine/core';

// Primary brand color - generated from #2BDD66 using Mantine color generator
const brandGreen: MantineColorsTuple = [
  '#e6ffee',
  '#d3f9e0',
  '#a8f2c0',
  '#7aea9f',
  '#54e382',
  '#3bdf70',
  '#2bdd66', // Base color
  '#1bc455',
  '#0bae4a',
  '#00973c',
];

// Neutral gray scale for text, borders, backgrounds
const neutral: MantineColorsTuple = [
  '#f8f9fa',
  '#f1f3f5',
  '#e9ecef',
  '#dee2e6',
  '#ced4da',
  '#adb5bd',
  '#868e96',
  '#495057',
  '#343a40',
  '#212529',
];

export const theme = createTheme({
  /** Primary brand color */
  primaryColor: 'brand',

  /** Custom color palette */
  colors: {
    brand: brandGreen,
    neutral: neutral,
  },

  /** Default radius for all components */
  defaultRadius: 'md',

  /** Font family */
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

  /** Heading styles */
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2rem', lineHeight: '1.2' },
      h2: { fontSize: '1.5rem', lineHeight: '1.3' },
      h3: { fontSize: '1.25rem', lineHeight: '1.4' },
      h4: { fontSize: '1.125rem', lineHeight: '1.5' },
      h5: { fontSize: '1rem', lineHeight: '1.5' },
      h6: { fontSize: '0.875rem', lineHeight: '1.5' },
    },
  },

  /** Spacing scale (px) */
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },

  /** Border radius scale (px) */
  radius: {
    xs: '0.125rem', // 2px
    sm: '0.25rem',  // 4px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
  },

  /** Breakpoints for responsive design */
  breakpoints: {
    xs: '36em',   // 576px
    sm: '48em',   // 768px
    md: '62em',   // 992px
    lg: '75em',   // 1200px
    xl: '88em',   // 1408px
  },
});

/** Design tokens for consistent spacing, sizes, etc. */
export const tokens = {
  /** Common component heights */
  heights: {
    navbar: 60,
    footer: 64,
    buttonSm: 32,
    buttonMd: 40,
    buttonLg: 48,
  },

  /** Common widths */
  widths: {
    sidebar: 260,
    sidebarCollapsed: 80,
    contentMax: 1200,
  },

  /** Z-index scale */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  /** Animation durations (ms) */
  transitions: {
    fast: 150,
    base: 250,
    slow: 350,
  },

  /** Shadow scales */
  shadows: {
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
} as const;

/** Helper to get color from theme */
export const colors = {
  /** Primary brand colors */
  brand: {
    50: brandGreen[0],
    100: brandGreen[1],
    200: brandGreen[2],
    300: brandGreen[3],
    400: brandGreen[4],
    500: brandGreen[5],
    600: brandGreen[6], // Base
    700: brandGreen[7],
    800: brandGreen[8],
    900: brandGreen[9],
  },
  /** Neutral grays */
  neutral: {
    50: neutral[0],
    100: neutral[1],
    200: neutral[2],
    300: neutral[3],
    400: neutral[4],
    500: neutral[5],
    600: neutral[6],
    700: neutral[7],
    800: neutral[8],
    900: neutral[9],
  },
} as const;
