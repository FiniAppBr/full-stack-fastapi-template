/**
 * Main card definitions for the entity system.
 *
 * Structure:
 * - 4 main cards: CONHECIMENTO, SITUACOES, COLETA, LIMITES
 * - Each main card has subcards
 * - Each subcard maps to entity types
 */

export const MAIN_CARDS = [
  {
    id: 'conhecimento',
    title: 'Conhecimento',
    subtitle: 'Informacoes que seu agente sabe',
    icon: 'solar:book-bold-duotone',
    color: '#5C6BC0',
    subcards: [
      {
        id: 'catalogo',
        title: 'Catalogo',
        subtitle: 'Produtos e servicos',
        icon: 'solar:shop-bold-duotone',
        entityTypes: ['produto', 'servico', 'pacote', 'plano'],
      },
      {
        id: 'documentos',
        title: 'Documentos',
        subtitle: 'Arquivos e manuais',
        icon: 'solar:document-bold-duotone',
        entityTypes: ['documento', 'tabela_precos', 'manual'],
      },
      {
        id: 'informacoes',
        title: 'Informacoes',
        subtitle: 'Fatos rapidos',
        icon: 'solar:info-circle-bold-duotone',
        entityTypes: ['horario', 'localizacao', 'contato', 'pagamento', 'entrega'],
      },
      {
        id: 'faq',
        title: 'Perguntas Frequentes',
        subtitle: 'Duvidas comuns',
        icon: 'solar:chat-round-dots-bold-duotone',
        entityTypes: ['faq', 'topico'],
      },
    ],
  },
  {
    id: 'situacoes',
    title: 'Situacoes',
    subtitle: 'Como reagir em momentos especificos',
    icon: 'solar:bolt-bold-duotone',
    color: '#26A69A',
    subcards: [
      {
        id: 'objecoes',
        title: 'Objecoes',
        subtitle: 'Quando cliente resiste',
        icon: 'solar:shield-warning-bold-duotone',
        entityTypes: ['objecao_preco', 'objecao_tempo', 'objecao_confianca', 'objecao_autoridade', 'objecao_concorrente'],
      },
      {
        id: 'oportunidades',
        title: 'Oportunidades',
        subtitle: 'Sinais de compra',
        icon: 'solar:star-bold-duotone',
        entityTypes: ['sinal_compra', 'alta_engajamento', 'pedido_detalhe', 'retorno'],
      },
      {
        id: 'problemas',
        title: 'Problemas',
        subtitle: 'Reclamacoes e issues',
        icon: 'solar:danger-triangle-bold-duotone',
        entityTypes: ['problema_tecnico', 'reclamacao', 'reembolso', 'atraso'],
      },
      {
        id: 'momentos',
        title: 'Momentos',
        subtitle: 'Triggers por timing',
        icon: 'solar:clock-circle-bold-duotone',
        entityTypes: ['silencio', 'objecao_nao_tratada', 'pos_atendimento', 'lembrete'],
      },
    ],
  },
  {
    id: 'coleta',
    title: 'Coleta',
    subtitle: 'Dados para coletar dos clientes',
    icon: 'solar:clipboard-list-bold-duotone',
    color: '#FFA726',
    subcards: [
      {
        id: 'contato',
        title: 'Contato',
        subtitle: 'Nome, email, telefone',
        icon: 'solar:user-id-bold-duotone',
        entityTypes: ['campo_nome', 'campo_email', 'campo_telefone', 'campo_empresa'],
      },
      {
        id: 'qualificacao',
        title: 'Qualificacao',
        subtitle: 'BANT e similares',
        icon: 'solar:check-circle-bold-duotone',
        entityTypes: ['campo_orcamento', 'campo_prazo', 'campo_decisor', 'campo_necessidade', 'campo_origem'],
      },
      {
        id: 'preferencias',
        title: 'Preferencias',
        subtitle: 'Gostos e restricoes',
        icon: 'solar:settings-bold-duotone',
        entityTypes: ['campo_uso', 'campo_experiencia', 'campo_restricoes'],
      },
    ],
  },
  {
    id: 'limites',
    title: 'Limites',
    subtitle: 'Regras que o agente sempre segue',
    icon: 'solar:shield-check-bold-duotone',
    color: '#EF5350',
    subcards: [
      {
        id: 'nunca',
        title: 'Nunca Fazer',
        subtitle: 'Proibicoes',
        icon: 'solar:forbidden-bold-duotone',
        entityTypes: ['nunca_aconselhar', 'nunca_prometer', 'nunca_criticar', 'nunca_inventar', 'nunca_aceitar'],
      },
      {
        id: 'sempre',
        title: 'Sempre Fazer',
        subtitle: 'Obrigatorios',
        icon: 'solar:verified-check-bold-duotone',
        entityTypes: ['sempre_confirmar', 'sempre_registrar', 'sempre_oferecer'],
      },
      {
        id: 'transferir',
        title: 'Transferir',
        subtitle: 'Quando passar pra humano',
        icon: 'solar:hand-shake-bold-duotone',
        entityTypes: ['transferir_frustrado', 'transferir_pediu', 'transferir_nao_sabe', 'transferir_complexo', 'transferir_emergencia', 'transferir_negociacao'],
      },
    ],
  },
];

/**
 * Get main card by ID
 */
export const getMainCard = (id) => MAIN_CARDS.find((card) => card.id === id);

/**
 * Get subcard by main card ID and subcard ID
 */
export const getSubcard = (mainCardId, subcardId) => {
  const mainCard = getMainCard(mainCardId);
  if (!mainCard) return null;
  return mainCard.subcards.find((sub) => sub.id === subcardId);
};

/**
 * Get all subcards for a main card
 */
export const getSubcards = (mainCardId) => {
  const mainCard = getMainCard(mainCardId);
  return mainCard?.subcards || [];
};

/**
 * Find which main card and subcard an entity type belongs to
 */
export const findCardForEntityType = (entityType) => {
  for (const mainCard of MAIN_CARDS) {
    for (const subcard of mainCard.subcards) {
      if (subcard.entityTypes.includes(entityType)) {
        return { mainCard, subcard };
      }
    }
  }
  return null;
};
