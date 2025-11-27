/**
 * Entity form templates by subcard type.
 * Defines fields and validation for each entity type.
 */

// Field types for form rendering
export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  CURRENCY: 'currency',
  URL: 'url',
  LIST: 'list', // comma-separated values
  SELECT: 'select',
  TOGGLE: 'toggle',
};

/**
 * Common field definitions reused across templates
 */
const COMMON_FIELDS = {
  name: {
    key: 'name',
    label: 'Nome',
    type: FIELD_TYPES.TEXT,
    required: true,
    placeholder: 'Nome do item',
  },
  description: {
    key: 'description',
    label: 'Descricao',
    type: FIELD_TYPES.TEXTAREA,
    required: false,
    placeholder: 'Descricao breve',
  },
  trigger_phrases: {
    key: 'trigger_phrases',
    label: 'Frases que ativam',
    type: FIELD_TYPES.LIST,
    required: true,
    placeholder: 'Ex: "e caro", "muito caro", "nao tenho dinheiro"',
    helperText: 'Separe as frases por virgula',
  },
  response_behavior: {
    key: 'response_behavior',
    label: 'Como o agente deve reagir',
    type: FIELD_TYPES.TEXTAREA,
    required: true,
    placeholder: 'Descreva o comportamento esperado do agente',
  },
  priority: {
    key: 'priority',
    label: 'Prioridade',
    type: FIELD_TYPES.SELECT,
    required: false,
    options: [
      { value: 'high', label: 'Alta' },
      { value: 'medium', label: 'Media' },
      { value: 'low', label: 'Baixa' },
    ],
    defaultValue: 'medium',
  },
};

/**
 * Templates organized by subcard ID
 */
export const ENTITY_TEMPLATES = {
  // ============================================
  // CONHECIMENTO
  // ============================================

  // Catalogo
  catalogo: {
    produto: {
      name: 'Produto',
      icon: 'solar:box-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'price', label: 'Preco', type: FIELD_TYPES.CURRENCY, required: true },
        COMMON_FIELDS.description,
        { key: 'features', label: 'Caracteristicas', type: FIELD_TYPES.LIST, placeholder: 'Feature 1, Feature 2, ...' },
        { key: 'checkout_url', label: 'Link de compra', type: FIELD_TYPES.URL },
      ],
    },
    servico: {
      name: 'Servico',
      icon: 'solar:hand-stars-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'price', label: 'Preco', type: FIELD_TYPES.CURRENCY },
        { key: 'duration', label: 'Duracao (min)', type: FIELD_TYPES.NUMBER },
        COMMON_FIELDS.description,
        { key: 'booking_url', label: 'Link de agendamento', type: FIELD_TYPES.URL },
      ],
    },
    pacote: {
      name: 'Pacote',
      icon: 'solar:gift-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'price', label: 'Preco', type: FIELD_TYPES.CURRENCY, required: true },
        { key: 'included_items', label: 'Itens inclusos', type: FIELD_TYPES.LIST, required: true },
        COMMON_FIELDS.description,
      ],
    },
    plano: {
      name: 'Plano',
      icon: 'solar:medal-ribbons-star-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'price_monthly', label: 'Preco mensal', type: FIELD_TYPES.CURRENCY },
        { key: 'price_annual', label: 'Preco anual', type: FIELD_TYPES.CURRENCY },
        { key: 'features', label: 'Recursos', type: FIELD_TYPES.LIST },
        { key: 'limits', label: 'Limites', type: FIELD_TYPES.TEXT },
      ],
    },
  },

  // Documentos
  documentos: {
    documento: {
      name: 'Documento',
      icon: 'solar:document-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'file_url', label: 'Arquivo', type: 'file' },
        COMMON_FIELDS.description,
      ],
    },
    tabela_precos: {
      name: 'Tabela de Precos',
      icon: 'solar:tag-price-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'content', label: 'Conteudo', type: FIELD_TYPES.TEXTAREA, required: true, rows: 6 },
      ],
    },
    manual: {
      name: 'Manual',
      icon: 'solar:notebook-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'content', label: 'Conteudo', type: FIELD_TYPES.TEXTAREA, required: true, rows: 8 },
      ],
    },
  },

  // Informacoes
  informacoes: {
    horario: {
      name: 'Horario de Funcionamento',
      icon: 'solar:clock-circle-bold-duotone',
      fields: [
        { key: 'schedule', label: 'Horarios', type: FIELD_TYPES.TEXTAREA, required: true, placeholder: 'Seg-Sex: 9h-18h\nSab: 9h-13h\nDom: Fechado' },
        { key: 'timezone', label: 'Fuso horario', type: FIELD_TYPES.TEXT, defaultValue: 'America/Sao_Paulo' },
      ],
    },
    localizacao: {
      name: 'Localizacao',
      icon: 'solar:map-point-bold-duotone',
      fields: [
        { key: 'address', label: 'Endereco', type: FIELD_TYPES.TEXTAREA, required: true },
        { key: 'regions_served', label: 'Regioes atendidas', type: FIELD_TYPES.LIST },
        { key: 'directions', label: 'Como chegar', type: FIELD_TYPES.TEXTAREA },
      ],
    },
    contato: {
      name: 'Informacoes de Contato',
      icon: 'solar:phone-bold-duotone',
      fields: [
        { key: 'phone', label: 'Telefone', type: FIELD_TYPES.TEXT },
        { key: 'email', label: 'Email', type: FIELD_TYPES.TEXT },
        { key: 'social_links', label: 'Redes sociais', type: FIELD_TYPES.LIST },
      ],
    },
    pagamento: {
      name: 'Metodos de Pagamento',
      icon: 'solar:card-bold-duotone',
      fields: [
        { key: 'methods', label: 'Metodos aceitos', type: FIELD_TYPES.LIST, required: true, placeholder: 'Pix, Cartao, Boleto' },
        { key: 'installments', label: 'Parcelamento', type: FIELD_TYPES.TEXT, placeholder: 'Ate 12x sem juros' },
      ],
    },
    entrega: {
      name: 'Informacoes de Entrega',
      icon: 'solar:delivery-bold-duotone',
      fields: [
        { key: 'shipping_info', label: 'Prazo e valores', type: FIELD_TYPES.TEXTAREA, required: true },
        { key: 'regions', label: 'Regioes atendidas', type: FIELD_TYPES.LIST },
      ],
    },
  },

  // FAQ
  faq: {
    faq: {
      name: 'Pergunta Frequente',
      icon: 'solar:chat-round-dots-bold-duotone',
      fields: [
        { key: 'question', label: 'Pergunta', type: FIELD_TYPES.TEXT, required: true },
        { key: 'answer', label: 'Resposta', type: FIELD_TYPES.TEXTAREA, required: true, rows: 4 },
      ],
    },
    topico: {
      name: 'Topico',
      icon: 'solar:folder-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'content', label: 'Conteudo', type: FIELD_TYPES.TEXTAREA, required: true, rows: 6 },
      ],
    },
  },

  // ============================================
  // SITUACOES
  // ============================================

  // Objecoes
  objecoes: {
    objecao_preco: {
      name: 'Objecao de Preco',
      icon: 'solar:tag-price-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Ex: "e caro", "muito caro", "nao tenho dinheiro"' },
        COMMON_FIELDS.response_behavior,
        COMMON_FIELDS.priority,
      ],
    },
    objecao_tempo: {
      name: 'Objecao de Tempo',
      icon: 'solar:clock-circle-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Ex: "nao tenho tempo", "depois eu vejo"' },
        COMMON_FIELDS.response_behavior,
        COMMON_FIELDS.priority,
      ],
    },
    objecao_confianca: {
      name: 'Objecao de Confianca',
      icon: 'solar:shield-warning-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Ex: "ja tentei antes", "nao sei se funciona"' },
        COMMON_FIELDS.response_behavior,
        COMMON_FIELDS.priority,
      ],
    },
    objecao_autoridade: {
      name: 'Objecao de Autoridade',
      icon: 'solar:users-group-rounded-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Ex: "preciso falar com meu marido", "vou consultar meu chefe"' },
        COMMON_FIELDS.response_behavior,
        COMMON_FIELDS.priority,
      ],
    },
    objecao_concorrente: {
      name: 'Objecao de Concorrente',
      icon: 'solar:flag-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'competitor_name', label: 'Nome do concorrente', type: FIELD_TYPES.TEXT },
        COMMON_FIELDS.response_behavior,
        COMMON_FIELDS.priority,
      ],
    },
  },

  // Oportunidades
  oportunidades: {
    sinal_compra: {
      name: 'Sinal de Compra',
      icon: 'solar:cart-check-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Ex: "como pago", "tem pix", "qual o proximo passo"' },
        COMMON_FIELDS.response_behavior,
      ],
    },
    alta_engajamento: {
      name: 'Alta Engajamento',
      icon: 'solar:fire-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'condition', label: 'Condicao', type: FIELD_TYPES.TEXT, placeholder: 'Ex: 5+ perguntas, sentimento positivo' },
        COMMON_FIELDS.response_behavior,
      ],
    },
    pedido_detalhe: {
      name: 'Pedido de Detalhe',
      icon: 'solar:magnifer-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Perguntas especificas sobre recursos' },
        COMMON_FIELDS.response_behavior,
      ],
    },
    retorno: {
      name: 'Cliente Retornando',
      icon: 'solar:restart-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        COMMON_FIELDS.response_behavior,
      ],
    },
  },

  // Problemas
  problemas: {
    problema_tecnico: {
      name: 'Problema Tecnico',
      icon: 'solar:bug-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { ...COMMON_FIELDS.trigger_phrases, placeholder: 'Ex: "nao consigo acessar", "nao funciona"' },
        { key: 'troubleshoot_steps', label: 'Passos para resolver', type: FIELD_TYPES.TEXTAREA, rows: 4 },
        { key: 'escalate_after', label: 'Escalar apos (tentativas)', type: FIELD_TYPES.NUMBER, defaultValue: 2 },
      ],
    },
    reclamacao: {
      name: 'Reclamacao',
      icon: 'solar:sad-square-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        COMMON_FIELDS.response_behavior,
        { key: 'escalate', label: 'Escalar para humano', type: FIELD_TYPES.TOGGLE, defaultValue: true },
      ],
    },
    reembolso: {
      name: 'Pedido de Reembolso',
      icon: 'solar:wallet-money-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'policy', label: 'Politica de reembolso', type: FIELD_TYPES.TEXTAREA, required: true },
        COMMON_FIELDS.response_behavior,
      ],
    },
    atraso: {
      name: 'Pergunta sobre Atraso',
      icon: 'solar:hourglass-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        COMMON_FIELDS.response_behavior,
      ],
    },
  },

  // Momentos
  momentos: {
    silencio: {
      name: 'Silencio do Usuario',
      icon: 'solar:sleeping-square-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'wait_time', label: 'Tempo de espera (min)', type: FIELD_TYPES.NUMBER, defaultValue: 2 },
        COMMON_FIELDS.response_behavior,
      ],
    },
    objecao_nao_tratada: {
      name: 'Objecao Nao Tratada',
      icon: 'solar:danger-triangle-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'turns_to_wait', label: 'Turnos para esperar', type: FIELD_TYPES.NUMBER, defaultValue: 2 },
        COMMON_FIELDS.response_behavior,
      ],
    },
    pos_atendimento: {
      name: 'Pos-Atendimento',
      icon: 'solar:check-circle-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'trigger_event', label: 'Evento que dispara', type: FIELD_TYPES.TEXT, placeholder: 'Ex: compra, agendamento, resolucao' },
        COMMON_FIELDS.response_behavior,
      ],
    },
    lembrete: {
      name: 'Lembrete',
      icon: 'solar:bell-bold-duotone',
      fields: [
        COMMON_FIELDS.name,
        { key: 'timing', label: 'Quando enviar', type: FIELD_TYPES.TEXT, placeholder: 'Ex: 24h antes do agendamento' },
        COMMON_FIELDS.response_behavior,
      ],
    },
  },

  // ============================================
  // COLETA
  // ============================================

  // Contato
  contato: {
    campo_nome: {
      name: 'Coletar Nome',
      icon: 'solar:user-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.SELECT, options: [
          { value: 'greeting', label: 'No inicio da conversa' },
          { value: 'interest', label: 'Quando mostrar interesse' },
          { value: 'always', label: 'Sempre que nao tiver' },
        ], defaultValue: 'greeting' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Como posso te chamar?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_email: {
      name: 'Coletar Email',
      icon: 'solar:letter-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.SELECT, options: [
          { value: 'interest', label: 'Quando mostrar interesse' },
          { value: 'scheduling', label: 'Antes de agendar' },
          { value: 'always', label: 'Sempre que nao tiver' },
        ], defaultValue: 'interest' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Me passa seu email?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_telefone: {
      name: 'Coletar Telefone',
      icon: 'solar:phone-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.SELECT, options: [
          { value: 'scheduling', label: 'Antes de agendar' },
          { value: 'interest', label: 'Quando mostrar interesse' },
          { value: 'always', label: 'Sempre que nao tiver' },
        ], defaultValue: 'scheduling' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Qual seu WhatsApp?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_empresa: {
      name: 'Coletar Empresa',
      icon: 'solar:buildings-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT, placeholder: 'Em contexto B2B' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Voce e de qual empresa?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
  },

  // Qualificacao
  qualificacao: {
    campo_orcamento: {
      name: 'Coletar Orcamento',
      icon: 'solar:wallet-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT, defaultValue: 'Durante qualificacao' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Voce tem um valor em mente?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_prazo: {
      name: 'Coletar Prazo',
      icon: 'solar:calendar-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT, defaultValue: 'Apos qualificacao' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Pra quando voce precisa disso?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_decisor: {
      name: 'Coletar Decisor',
      icon: 'solar:crown-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT, defaultValue: 'Durante qualificacao' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Quem mais participa da decisao?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_necessidade: {
      name: 'Coletar Necessidade',
      icon: 'solar:target-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT, defaultValue: 'No inicio' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Qual o desafio que voce enfrenta?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
    campo_origem: {
      name: 'Coletar Origem',
      icon: 'solar:route-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT, defaultValue: 'A qualquer momento' },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Como voce nos encontrou?' },
        { key: 'required', label: 'Obrigatorio', type: FIELD_TYPES.TOGGLE, defaultValue: false },
      ],
    },
  },

  // Preferencias
  preferencias: {
    campo_uso: {
      name: 'Coletar Uso Pretendido',
      icon: 'solar:lightbulb-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Pra que voce pretende usar?' },
      ],
    },
    campo_experiencia: {
      name: 'Coletar Experiencia',
      icon: 'solar:medal-star-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Voce ja tem experiencia com isso?' },
      ],
    },
    campo_restricoes: {
      name: 'Coletar Restricoes',
      icon: 'solar:forbidden-bold-duotone',
      fields: [
        { key: 'when_to_ask', label: 'Quando pedir', type: FIELD_TYPES.TEXT },
        { key: 'how_to_ask', label: 'Como perguntar', type: FIELD_TYPES.TEXT, placeholder: 'Tem alguma restricao?' },
      ],
    },
  },

  // ============================================
  // LIMITES
  // ============================================

  // Nunca Fazer
  nunca: {
    nunca_aconselhar: {
      name: 'Nunca Aconselhar',
      icon: 'solar:forbidden-bold-duotone',
      fields: [
        { key: 'topic', label: 'Topico proibido', type: FIELD_TYPES.TEXT, required: true, placeholder: 'Ex: juridico, medico, financeiro' },
        { key: 'response', label: 'O que dizer ao inves', type: FIELD_TYPES.TEXTAREA },
      ],
    },
    nunca_prometer: {
      name: 'Nunca Prometer',
      icon: 'solar:danger-triangle-bold-duotone',
      fields: [
        { key: 'promise_type', label: 'Tipo de promessa proibida', type: FIELD_TYPES.TEXT, required: true },
        { key: 'response', label: 'O que dizer ao inves', type: FIELD_TYPES.TEXTAREA },
      ],
    },
    nunca_criticar: {
      name: 'Nunca Criticar',
      icon: 'solar:chat-round-line-bold-duotone',
      fields: [
        { key: 'target', label: 'O que nunca criticar', type: FIELD_TYPES.TEXT, required: true, placeholder: 'Ex: concorrentes' },
        { key: 'response', label: 'Como responder ao inves', type: FIELD_TYPES.TEXTAREA },
      ],
    },
    nunca_inventar: {
      name: 'Nunca Inventar',
      icon: 'solar:question-circle-bold-duotone',
      fields: [
        { key: 'response', label: 'O que dizer quando nao sabe', type: FIELD_TYPES.TEXTAREA, required: true },
      ],
    },
    nunca_aceitar: {
      name: 'Nunca Aceitar',
      icon: 'solar:shield-cross-bold-duotone',
      fields: [
        { key: 'request_type', label: 'Tipo de pedido a recusar', type: FIELD_TYPES.TEXT, required: true, placeholder: 'Ex: ilegal, antiético' },
        { key: 'response', label: 'Como recusar', type: FIELD_TYPES.TEXTAREA },
      ],
    },
  },

  // Sempre Fazer
  sempre: {
    sempre_confirmar: {
      name: 'Sempre Confirmar',
      icon: 'solar:check-read-bold-duotone',
      fields: [
        { key: 'what_to_confirm', label: 'O que confirmar', type: FIELD_TYPES.TEXT, required: true },
        { key: 'how_to_confirm', label: 'Como confirmar', type: FIELD_TYPES.TEXTAREA },
      ],
    },
    sempre_registrar: {
      name: 'Sempre Registrar',
      icon: 'solar:clipboard-text-bold-duotone',
      fields: [
        { key: 'what_to_register', label: 'O que registrar', type: FIELD_TYPES.TEXT, required: true },
        { key: 'when', label: 'Quando', type: FIELD_TYPES.TEXT },
      ],
    },
    sempre_oferecer: {
      name: 'Sempre Oferecer',
      icon: 'solar:hand-heart-bold-duotone',
      fields: [
        { key: 'what_to_offer', label: 'O que oferecer', type: FIELD_TYPES.TEXT, required: true },
        { key: 'when', label: 'Quando', type: FIELD_TYPES.TEXT },
      ],
    },
  },

  // Transferir
  transferir: {
    transferir_frustrado: {
      name: 'Transferir se Frustrado',
      icon: 'solar:emoji-funny-square-bold-duotone',
      fields: [
        { key: 'signals', label: 'Sinais de frustracao', type: FIELD_TYPES.LIST, placeholder: 'caps lock, palavroes, repeticao' },
        { key: 'message', label: 'Mensagem ao transferir', type: FIELD_TYPES.TEXTAREA, defaultValue: 'Vou te passar para um atendente agora mesmo' },
      ],
    },
    transferir_pediu: {
      name: 'Transferir se Pediu',
      icon: 'solar:hand-shake-bold-duotone',
      fields: [
        { key: 'message', label: 'Mensagem ao transferir', type: FIELD_TYPES.TEXTAREA, defaultValue: 'Claro, ja vou te transferir' },
      ],
    },
    transferir_nao_sabe: {
      name: 'Transferir se Nao Sabe',
      icon: 'solar:question-square-bold-duotone',
      fields: [
        { key: 'attempts', label: 'Tentativas antes de transferir', type: FIELD_TYPES.NUMBER, defaultValue: 2 },
        { key: 'message', label: 'Mensagem ao transferir', type: FIELD_TYPES.TEXTAREA, defaultValue: 'Vou chamar alguem que pode te ajudar melhor' },
      ],
    },
    transferir_complexo: {
      name: 'Transferir se Complexo',
      icon: 'solar:layers-minimalistic-bold-duotone',
      fields: [
        { key: 'examples', label: 'Exemplos de situacoes complexas', type: FIELD_TYPES.LIST },
        { key: 'message', label: 'Mensagem ao transferir', type: FIELD_TYPES.TEXTAREA },
      ],
    },
    transferir_emergencia: {
      name: 'Transferir em Emergencia',
      icon: 'solar:siren-bold-duotone',
      fields: [
        { key: 'signals', label: 'Sinais de emergencia', type: FIELD_TYPES.LIST, placeholder: 'dor, urgente, emergencia' },
        { key: 'message', label: 'Mensagem ao transferir', type: FIELD_TYPES.TEXTAREA, defaultValue: 'Vou priorizar seu caso agora' },
      ],
    },
    transferir_negociacao: {
      name: 'Transferir para Negociacao',
      icon: 'solar:wallet-money-bold-duotone',
      fields: [
        { key: 'signals', label: 'Sinais de negociacao', type: FIELD_TYPES.LIST, placeholder: 'desconto, negociar, valor menor' },
        { key: 'message', label: 'Mensagem ao transferir', type: FIELD_TYPES.TEXTAREA, defaultValue: 'Vou te passar para quem pode discutir valores' },
      ],
    },
  },
};

/**
 * Get templates for a subcard
 */
export const getTemplatesForSubcard = (subcardId) => ENTITY_TEMPLATES[subcardId] || {};

/**
 * Get a specific template
 */
export const getTemplate = (subcardId, templateId) => ENTITY_TEMPLATES[subcardId]?.[templateId];

/**
 * Get all template IDs for a subcard
 */
export const getTemplateIds = (subcardId) => Object.keys(ENTITY_TEMPLATES[subcardId] || {});
