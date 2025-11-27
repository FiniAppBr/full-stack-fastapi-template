/**
 * 6 main cards - simple category groupings.
 */
import entitySchemas from 'src/assets/data/entity-schemas.json';

export const MAIN_CARDS = [
  {
    id: 'products',
    title: 'O que você vende?',
    subtitle: 'Produtos, serviços, preços',
    icon: 'solar:box-bold-duotone',
    color: '#2065D1',
    categories: ['products'],
  },
  {
    id: 'business',
    title: 'Sobre o negócio',
    subtitle: 'Políticas, equipe, locais, documentos',
    icon: 'solar:buildings-2-bold-duotone',
    color: '#7635DC',
    categories: ['policies', 'people', 'locations', 'processes', 'brand', 'faq', 'custom', 'documents'],
    hasUpload: true,
  },
  {
    id: 'situations',
    title: 'Dúvidas e comportamento',
    subtitle: 'Objeções, oportunidades',
    icon: 'solar:chat-round-dots-bold-duotone',
    color: '#E91E63',
    categories: ['objections', 'opportunities'],
  },
  {
    id: 'collection',
    title: 'Coleta de dados e objetivos',
    subtitle: 'O que perguntar ao lead',
    icon: 'solar:clipboard-list-bold-duotone',
    color: '#00BCD4',
    categories: ['data_collection'],
  },
  {
    id: 'guardrails',
    title: 'Limites',
    subtitle: 'Escalação, restrições',
    icon: 'solar:shield-warning-bold-duotone',
    color: '#F44336',
    categories: ['guardrails', 'escalation'],
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
