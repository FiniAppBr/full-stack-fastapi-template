/**
 * 6 main cards - simple category groupings.
 */
import entitySchemas from 'src/assets/data/entity-schemas.json';

export const MAIN_CARDS = [
  {
    id: 'products',
    title: 'Produtos e serviços',
    subtitle: 'O que você vende, preços',
    icon: 'solar:box-bold-duotone',
    color: '#2065D1',
    categories: ['products'],
  },
  {
    id: 'business',
    title: 'Informações do negócio',
    subtitle: 'Políticas, equipe, locais, processos',
    icon: 'solar:buildings-2-bold-duotone',
    color: '#7635DC',
    categories: ['policies', 'people', 'locations', 'processes', 'brand', 'faq', 'custom'],
  },
  {
    id: 'situations',
    title: 'Como agir',
    subtitle: 'Objeções, casos específicos, FAQs',
    icon: 'solar:chat-round-dots-bold-duotone',
    color: '#FF9800',
    categories: ['objections', 'specific_cases', 'faq'],
  },
  // collection removed - data collection is now inline in agent config
  {
    id: 'guardrails',
    title: 'Regras e restrições',
    subtitle: 'Limites, escalação, proibições',
    icon: 'solar:shield-warning-bold-duotone',
    color: '#F44336',
    categories: ['guardrails'],
  },
];

// Get templates for a card (from its categories)
export const getCardTemplates = (cardId) => {
  const card = MAIN_CARDS.find((c) => c.id === cardId);
  if (!card) return [];

  const templates = [];
  card.categories.forEach((catId) => {
    const cat = entitySchemas.categories.find((c) => c.id === catId);
    if (cat?.templates) {
      templates.push(...cat.templates.map((t) => ({ ...t, category: catId })));
    }
  });
  return templates;
};

// Get card by ID
export const getCard = (id) => MAIN_CARDS.find((c) => c.id === id);

// Get field definition
export const getField = (key) => entitySchemas.fields[key] || { label: key, type: 'text' };

// Schema exports
export const { fields, fieldGroups, categories } = entitySchemas;
