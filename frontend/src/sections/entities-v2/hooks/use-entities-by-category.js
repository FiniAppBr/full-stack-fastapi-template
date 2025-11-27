import useSWR from 'swr';
import { useMemo } from 'react';

import { fetcher, endpoints } from 'src/utils/axios';

import { MAIN_CARDS } from '../data/card-definitions';

/**
 * Hook for fetching and organizing entities by category.
 * Entities have `category` and `template` fields from entity-schemas.json.
 */
export function useEntitiesByCategory(options = {}) {
  const { linkedEntityIds = null } = options;

  // Fetch all entities
  const { data, error, isLoading, mutate } = useSWR(
    endpoints.entities?.list || '/api/v1/entities',
    fetcher
  );

  // Filter by linked IDs if provided
  const filteredEntities = useMemo(() => {
    const entities = data?.data || [];
    if (!linkedEntityIds) return entities;
    return entities.filter((e) => linkedEntityIds.includes(e.id));
  }, [data?.data, linkedEntityIds]);

  // Organize entities by category
  const entitiesByCategory = useMemo(() => {
    const result = {};

    // Initialize structure for each category
    MAIN_CARDS.forEach((card) => {
      result[card.id] = {
        entities: [],
        count: 0,
        byTemplate: {},
      };

      // Initialize by template
      (card.templates || []).forEach((template) => {
        result[card.id].byTemplate[template.id] = [];
      });
    });

    // Categorize each entity
    filteredEntities.forEach((entity) => {
      const { category, template } = entity;

      if (category && result[category]) {
        result[category].entities.push(entity);
        result[category].count += 1;

        if (template && result[category].byTemplate[template]) {
          result[category].byTemplate[template].push(entity);
        }
      }
    });

    return result;
  }, [filteredEntities]);

  const getCategoryCount = (categoryId) => entitiesByCategory[categoryId]?.count || 0;

  const getCategoryEntities = (categoryId) => entitiesByCategory[categoryId]?.entities || [];

  const getTemplateEntities = (categoryId, templateId) =>
    entitiesByCategory[categoryId]?.byTemplate[templateId] || [];

  const totalCount = filteredEntities.length;

  return {
    entities: filteredEntities,
    entitiesByCategory,
    totalCount,
    getCategoryCount,
    getCategoryEntities,
    getTemplateEntities,
    isLoading,
    error,
    mutate,
  };
}
