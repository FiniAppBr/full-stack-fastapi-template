import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/utils/axios';

import { MAIN_CARDS, findCardForEntityType } from '../data/card-definitions';

/**
 * Hook for fetching and organizing entities by card/subcard categories.
 *
 * @param {Object} options
 * @param {number[]} options.linkedEntityIds - Optional filter to only show linked entities
 * @returns {Object} Entities organized by category with counts
 */
export function useEntitiesByCategory(options = {}) {
  const { linkedEntityIds = null } = options;

  // Fetch all entities
  const { data, error, isLoading, mutate } = useSWR(
    endpoints.entities?.list || '/api/v1/entities',
    fetcher
  );

  const entities = data?.data || [];

  // Filter by linked IDs if provided
  const filteredEntities = useMemo(() => {
    if (!linkedEntityIds) return entities;
    return entities.filter((e) => linkedEntityIds.includes(e.id));
  }, [entities, linkedEntityIds]);

  // Organize entities by main card
  const entitiesByMainCard = useMemo(() => {
    const result = {};

    MAIN_CARDS.forEach((mainCard) => {
      result[mainCard.id] = {
        entities: [],
        count: 0,
        bySubcard: {},
      };

      mainCard.subcards.forEach((subcard) => {
        result[mainCard.id].bySubcard[subcard.id] = {
          entities: [],
          count: 0,
        };
      });
    });

    // Categorize each entity
    filteredEntities.forEach((entity) => {
      // Try to find by template/category mapping
      const entityType = entity.template || entity.category;
      const cardInfo = findCardForEntityType(entityType);

      if (cardInfo) {
        const { mainCard, subcard } = cardInfo;
        result[mainCard.id].entities.push(entity);
        result[mainCard.id].count += 1;
        result[mainCard.id].bySubcard[subcard.id].entities.push(entity);
        result[mainCard.id].bySubcard[subcard.id].count += 1;
      } else {
        // Fallback: put in conhecimento/faq as generic
        result.conhecimento.entities.push(entity);
        result.conhecimento.count += 1;
        result.conhecimento.bySubcard.faq.entities.push(entity);
        result.conhecimento.bySubcard.faq.count += 1;
      }
    });

    return result;
  }, [filteredEntities]);

  /**
   * Get count for a main card
   */
  const getMainCardCount = (mainCardId) => entitiesByMainCard[mainCardId]?.count || 0;

  /**
   * Get count for a subcard
   */
  const getSubcardCount = (mainCardId, subcardId) =>
    entitiesByMainCard[mainCardId]?.bySubcard[subcardId]?.count || 0;

  /**
   * Get entities for a main card
   */
  const getMainCardEntities = (mainCardId) => entitiesByMainCard[mainCardId]?.entities || [];

  /**
   * Get entities for a subcard
   */
  const getSubcardEntities = (mainCardId, subcardId) =>
    entitiesByMainCard[mainCardId]?.bySubcard[subcardId]?.entities || [];

  /**
   * Total entity count
   */
  const totalCount = filteredEntities.length;

  return {
    // Data
    entities: filteredEntities,
    entitiesByMainCard,
    totalCount,

    // Getters
    getMainCardCount,
    getSubcardCount,
    getMainCardEntities,
    getSubcardEntities,

    // SWR state
    isLoading,
    error,
    mutate,
  };
}
