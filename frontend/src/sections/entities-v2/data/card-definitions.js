/**
 * Card definitions that wrap entity-schemas.json categories.
 * Uses the existing schema as the single source of truth.
 */

import entitySchemas from 'src/assets/data/entity-schemas.json';

// Re-export categories as MAIN_CARDS for the card UI
export const MAIN_CARDS = entitySchemas.categories.map((cat) => ({
  id: cat.id,
  title: cat.name,
  subtitle: cat.description,
  icon: cat.icon,
  color: cat.color,
  templates: cat.templates,
}));

// Export the full schema for access to fields, fieldGroups, etc.
export const { fields, fieldGroups } = entitySchemas;

/**
 * Get main card by ID
 */
export const getMainCard = (id) => MAIN_CARDS.find((card) => card.id === id);

/**
 * Get template by category and template ID
 */
export const getTemplate = (categoryId, templateId) => {
  const card = getMainCard(categoryId);
  if (!card) return null;
  return card.templates.find((t) => t.id === templateId);
};

/**
 * Get all templates for a category
 */
export const getTemplates = (categoryId) => {
  const card = getMainCard(categoryId);
  return card?.templates || [];
};

/**
 * Get field definition by key
 */
export const getField = (fieldKey) =>
  fields[fieldKey] || {
    label: fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    type: 'text',
    icon: 'solar:document-text-bold-duotone',
    placeholder: '',
    isCustom: true,
  };

/**
 * Find which category an entity belongs to
 */
export const findCardForEntity = (entity) => {
  if (!entity?.category) return null;
  return getMainCard(entity.category);
};
