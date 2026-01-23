import { useMemo, useState, useCallback } from 'react';

import { getCard } from '../data/card-definitions';

/**
 * Navigation levels - simplified to just 2 levels
 */
export const NAV_LEVELS = {
  MAIN: 'main',
  LIST: 'list',
};

/**
 * Hook for managing navigation state in the entity card system.
 * Simplified flow: Main Cards -> Entity List (no subcard layer)
 */
export function useEntityNavigation(options = {}) {
  const {
    initialLevel = NAV_LEVELS.MAIN,
    initialCategoryId = null,
  } = options;

  const [level, setLevel] = useState(initialLevel);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [direction, setDirection] = useState('right');

  /**
   * Select a category - navigates to entity list
   */
  const selectCategory = useCallback((id) => {
    setDirection('right');
    setCategoryId(id);
    setLevel(NAV_LEVELS.LIST);
  }, []);

  /**
   * Go back to main cards
   */
  const goBack = useCallback(() => {
    setDirection('left');
    setCategoryId(null);
    setLevel(NAV_LEVELS.MAIN);
  }, []);

  /**
   * Reset to main cards view
   */
  const reset = useCallback(() => {
    setDirection('left');
    setCategoryId(null);
    setLevel(NAV_LEVELS.MAIN);
  }, []);

  /**
   * Current category data
   */
  const currentCard = useMemo(
    () => (categoryId ? getCard(categoryId) : null),
    [categoryId]
  );

  /**
   * Can go back from current level
   */
  const canGoBack = level !== NAV_LEVELS.MAIN;

  return {
    level,
    cardId: categoryId,
    direction,
    currentCard,
    canGoBack,
    selectCard: selectCategory,
    goBack,
    reset,
  };
}
