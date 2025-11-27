import { useState, useCallback, useMemo } from 'react';

import { getMainCard, getSubcard } from '../data/card-definitions';

/**
 * Navigation levels for the entity card system
 */
export const NAV_LEVELS = {
  MAIN: 'main',
  SUBCARDS: 'subcards',
  LIST: 'list',
};

/**
 * Hook for managing navigation state in the entity card system.
 *
 * Flow: Main Cards -> Subcards -> Entity List
 *
 * @param {Object} options
 * @param {string} options.initialLevel - Starting navigation level
 * @param {string} options.initialMainCardId - Pre-selected main card
 * @param {string} options.initialSubcardId - Pre-selected subcard
 * @returns {Object} Navigation state and actions
 */
export function useEntityNavigation(options = {}) {
  const {
    initialLevel = NAV_LEVELS.MAIN,
    initialMainCardId = null,
    initialSubcardId = null,
  } = options;

  const [level, setLevel] = useState(initialLevel);
  const [mainCardId, setMainCardId] = useState(initialMainCardId);
  const [subcardId, setSubcardId] = useState(initialSubcardId);
  const [direction, setDirection] = useState('right'); // 'right' = drilling in, 'left' = going back

  /**
   * Select a main card - navigates to subcards view
   */
  const selectMainCard = useCallback((id) => {
    setDirection('right');
    setMainCardId(id);
    setSubcardId(null);
    setLevel(NAV_LEVELS.SUBCARDS);
  }, []);

  /**
   * Select a subcard - navigates to entity list view
   */
  const selectSubcard = useCallback((id) => {
    setDirection('right');
    setSubcardId(id);
    setLevel(NAV_LEVELS.LIST);
  }, []);

  /**
   * Go back one level
   */
  const goBack = useCallback(() => {
    setDirection('left');
    if (level === NAV_LEVELS.LIST) {
      setSubcardId(null);
      setLevel(NAV_LEVELS.SUBCARDS);
    } else if (level === NAV_LEVELS.SUBCARDS) {
      setMainCardId(null);
      setLevel(NAV_LEVELS.MAIN);
    }
  }, [level]);

  /**
   * Reset to main cards view
   */
  const reset = useCallback(() => {
    setDirection('left');
    setMainCardId(null);
    setSubcardId(null);
    setLevel(NAV_LEVELS.MAIN);
  }, []);

  /**
   * Navigate to a specific state
   */
  const navigateTo = useCallback((newLevel, newMainCardId = null, newSubcardId = null) => {
    const currentDepth = level === NAV_LEVELS.MAIN ? 0 : level === NAV_LEVELS.SUBCARDS ? 1 : 2;
    const newDepth = newLevel === NAV_LEVELS.MAIN ? 0 : newLevel === NAV_LEVELS.SUBCARDS ? 1 : 2;

    setDirection(newDepth > currentDepth ? 'right' : 'left');
    setLevel(newLevel);
    setMainCardId(newMainCardId);
    setSubcardId(newSubcardId);
  }, [level]);

  /**
   * Current main card data
   */
  const currentMainCard = useMemo(
    () => (mainCardId ? getMainCard(mainCardId) : null),
    [mainCardId]
  );

  /**
   * Current subcard data
   */
  const currentSubcard = useMemo(
    () => (mainCardId && subcardId ? getSubcard(mainCardId, subcardId) : null),
    [mainCardId, subcardId]
  );

  /**
   * Can go back from current level
   */
  const canGoBack = level !== NAV_LEVELS.MAIN;

  /**
   * Breadcrumb trail for current location
   */
  const breadcrumbs = useMemo(() => {
    const crumbs = [];

    if (currentMainCard) {
      crumbs.push({
        id: currentMainCard.id,
        title: currentMainCard.title,
        level: NAV_LEVELS.SUBCARDS,
      });
    }

    if (currentSubcard) {
      crumbs.push({
        id: currentSubcard.id,
        title: currentSubcard.title,
        level: NAV_LEVELS.LIST,
      });
    }

    return crumbs;
  }, [currentMainCard, currentSubcard]);

  return {
    // State
    level,
    mainCardId,
    subcardId,
    direction,
    currentMainCard,
    currentSubcard,
    canGoBack,
    breadcrumbs,

    // Actions
    selectMainCard,
    selectSubcard,
    goBack,
    reset,
    navigateTo,
  };
}
