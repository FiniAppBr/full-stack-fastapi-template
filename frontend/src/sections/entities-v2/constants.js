// Animation durations
export const ANIMATION_DURATION = 0.3;
export const ANIMATION_EASE = [0.4, 0, 0.2, 1]; // ease-out

// Card dimensions
export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 240;
export const CARD_ASPECT_RATIO = 3 / 4;

// Compact mode dimensions (for embedded use)
export const COMPACT_CARD_HEIGHT = 120;
export const COMPACT_CARD_WIDTH = 280;

// Subcard dimensions
export const SUBCARD_HEIGHT = 80;

// Colors with opacity helpers
export const colorWithOpacity = (color, opacity) => {
  // Handle hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

// Z-index layers
export const Z_INDEX = {
  card: 1,
  cardHover: 2,
  header: 10,
  modal: 100,
};
