import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/utils/axios';

import { MAIN_CARDS } from '../data/card-definitions';

/**
 * Simple hook - fetch entities, filter by card categories.
 */
export function useEntitiesByCategory(options = {}) {
  const { linkedEntityIds = null } = options;

  const { data, error, isLoading, mutate } = useSWR(
    endpoints.entities?.list || '/api/v1/entities',
    fetcher
  );

  const entities = useMemo(() => {
    const list = data?.data || [];
    if (!linkedEntityIds) return list;
    return list.filter((e) => linkedEntityIds.includes(e.id));
  }, [data?.data, linkedEntityIds]);

  // Get entities for a card (filter by card's categories)
  const getCardEntities = (cardId) => {
    const card = MAIN_CARDS.find((c) => c.id === cardId);
    if (!card) return [];
    return entities.filter((e) => card.categories.includes(e.category));
  };

  // Get count for a card
  const getCardCount = (cardId) => getCardEntities(cardId).length;

  return {
    entities,
    totalCount: entities.length,
    getCardEntities,
    getCardCount,
    isLoading,
    error,
    mutate,
  };
}
