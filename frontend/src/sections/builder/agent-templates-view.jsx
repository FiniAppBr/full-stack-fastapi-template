import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Agent templates based on real use cases from context-management-strategy.txt
const AGENT_TEMPLATES = [
  {
    id: 'luxury-furniture',
    icon: 'solar:sofa-3-bold',
    iconColor: '#8B4513',
    title: 'Loja de Móveis Premium',
    description: 'Vendas de móveis de alto padrão com qualificação de orçamento e scoring de leads',
    category: 'E-commerce',
    stats: {
      trackingFields: 6,
      gatingRules: 2,
      validationRules: 2,
      actions: 2,
      knowledgeBlocks: 3,
    },
    features: [
      'Qualificação de orçamento',
      'Pontuação de qualidade de leads',
      'Controle de exibição de preços',
      'Captura de contato',
      'Gerenciamento de catálogo',
    ],
    config: {
      tracking: ['Budget Range', 'Lead Quality', 'Contact Captured', 'Catalogue Requested', 'Competitor Mentioned', 'Consultation Interest'],
      gating: ['Hide prices until budget known', 'Hide premium products for low budget'],
      validation: ['Strip prices if budget unknown', 'Block catalogue if not requested'],
      tools: ['Send Catalogue PDF', 'Schedule Home Visit'],
    },
  },
  {
    id: 'dental-clinic',
    icon: 'solar:health-bold',
    iconColor: '#00BCD4',
    title: 'Clínica Odontológica',
    description: 'Agendamento em múltiplas unidades com detecção de emergências',
    category: 'Saúde',
    stats: {
      trackingFields: 3,
      gatingRules: 0,
      validationRules: 2,
      actions: 3,
      knowledgeBlocks: 2,
    },
    features: [
      'Detecção de emergências',
      'Agendamento multi-unidades',
      'Integração Calendly',
      'Transferência instantânea',
      'Confirmações automáticas',
    ],
    config: {
      tracking: ['Urgency', 'Issue Type', 'Location Preference'],
      gating: [],
      validation: ['Handoff if emergency', 'Recommend expert for complex issues'],
      tools: ['Check Calendar Availability', 'Book Appointment', 'Send Confirmation'],
    },
  },
  {
    id: 'law-firm',
    icon: 'solar:scale-bold',
    iconColor: '#1A237E',
    title: 'Escritório de Advocacia',
    description: 'Agendamento de consultas jurídicas com proteções de segurança rigorosas',
    category: 'Serviços Profissionais',
    stats: {
      trackingFields: 4,
      gatingRules: 1,
      validationRules: 3,
      actions: 2,
      knowledgeBlocks: 4,
    },
    features: [
      'Bloqueio de orientação jurídica',
      'Detecção de tipo de caso',
      'Roteamento para especialistas',
      'Tom profissional',
      'Verificações de conformidade',
    ],
    config: {
      tracking: ['Case Type', 'Urgency', 'Previous Client', 'Budget Range'],
      gating: ['Block legal advice documents'],
      validation: ['Never give legal advice', 'Professional tone only', 'No promises'],
      tools: ['Schedule Consultation', 'Send Intake Form'],
    },
  },
  {
    id: 'restaurant',
    icon: 'solar:plate-bold',
    iconColor: '#FF5722',
    title: 'Restaurante',
    description: 'Reservas e cardápio com tratamento de alergias',
    category: 'Alimentação',
    stats: {
      trackingFields: 5,
      gatingRules: 1,
      validationRules: 2,
      actions: 3,
      knowledgeBlocks: 3,
    },
    features: [
      'Reserva de mesas',
      'Detecção de alergias',
      'Cardápio com fotos',
      'Pedidos simples',
      'Escalação para chef',
    ],
    config: {
      tracking: ['Party Size', 'Date', 'Dietary Restrictions', 'Order Complexity', 'Special Occasion'],
      gating: ['Show allergen info only if mentioned'],
      validation: ['Handoff complex orders', 'Chef review for severe allergies'],
      tools: ['Check Reservations', 'Send Menu PDF', 'Simple Order'],
    },
  },
  {
    id: 'real-estate',
    icon: 'solar:buildings-3-bold',
    iconColor: '#2E7D32',
    title: 'Imobiliária',
    description: 'Busca de imóveis e agendamento de visitas com integração CRM',
    category: 'Imóveis',
    stats: {
      trackingFields: 6,
      gatingRules: 2,
      validationRules: 1,
      actions: 4,
      knowledgeBlocks: 5,
    },
    features: [
      'Busca de imóveis',
      'Filtragem por orçamento',
      'Agendamento de visitas',
      'Preferências de localização',
      'Integração CRM',
    ],
    config: {
      tracking: ['Budget Range', 'Property Type', 'Location', 'Bedrooms', 'Timeline', 'Lead Quality'],
      gating: ['Hide luxury properties for low budget', 'Filter by location preference'],
      validation: ['Qualify budget before showing listings'],
      tools: ['Search Properties', 'Schedule Viewing', 'Send Brochure', 'CRM Update'],
    },
  },
  {
    id: 'gym-fitness',
    icon: 'solar:dumbbells-bold',
    iconColor: '#F44336',
    title: 'Academia & Fitness',
    description: 'Vendas de planos e agendamento de aulas com tom motivacional',
    category: 'Saúde & Fitness',
    stats: {
      trackingFields: 5,
      gatingRules: 1,
      validationRules: 1,
      actions: 3,
      knowledgeBlocks: 4,
    },
    features: [
      'Tom energético',
      'Detecção de experiência',
      'Agendamento de aulas',
      'Aulas experimentais',
      'Retenção de alunos',
    ],
    config: {
      tracking: ['Experience Level', 'Fitness Goals', 'Schedule Preference', 'Budget', 'Cancellation Intent'],
      gating: ['Advanced classes only for experienced'],
      validation: ['Handoff cancellations for retention'],
      tools: ['Book Trial Class', 'Check Schedule', 'Send Workout Plan'],
    },
  },
  {
    id: 'education-online',
    icon: 'solar:diploma-bold',
    iconColor: '#673AB7',
    title: 'Plataforma de Cursos Online',
    description: 'Recomendações de cursos e matrículas com links de pagamento',
    category: 'Educação',
    stats: {
      trackingFields: 4,
      gatingRules: 2,
      validationRules: 1,
      actions: 4,
      knowledgeBlocks: 6,
    },
    features: [
      'Detecção de nível',
      'Recomendações de cursos',
      'Integração de pagamento',
      'Entrega de acesso',
      'Acompanhamento de progresso',
    ],
    config: {
      tracking: ['Experience Level', 'Learning Goals', 'Budget', 'Enrolled'],
      gating: ['Advanced courses for experienced only', 'Hide prices for existing students'],
      validation: ['Verify payment before access'],
      tools: ['Send Payment Link', 'Check Payment Status', 'Send Access Link', 'Recommend Courses'],
    },
  },
  {
    id: 'travel-agency',
    icon: 'solar:suitcase-bold',
    iconColor: '#00ACC1',
    title: 'Agência de Viagens',
    description: 'Planejamento e reservas de viagens com expertise em destinos',
    category: 'Viagens & Turismo',
    stats: {
      trackingFields: 7,
      gatingRules: 2,
      validationRules: 1,
      actions: 4,
      knowledgeBlocks: 8,
    },
    features: [
      'Qualificação de orçamento',
      'Matching de destinos',
      'Pacotes personalizados',
      'Envio de documentos',
      'Multilíngue',
    ],
    config: {
      tracking: ['Budget Range', 'Travel Dates', 'Destination Interest', 'Group Size', 'Travel Style', 'Special Requirements', 'Language'],
      gating: ['Luxury packages for high budget only', 'Filter by destination preference'],
      validation: ['Qualify budget before detailed planning'],
      tools: ['Search Packages', 'Send Itinerary', 'Book Package', 'Send Documents'],
    },
  },
  {
    id: 'auto-dealership',
    icon: 'solar:cart-large-4-bold',
    iconColor: '#424242',
    title: 'Concessionária de Veículos',
    description: 'Vendas de veículos com test drive e avaliação de troca',
    category: 'Automotivo',
    stats: {
      trackingFields: 6,
      gatingRules: 2,
      validationRules: 2,
      actions: 4,
      knowledgeBlocks: 5,
    },
    features: [
      'Filtragem por orçamento',
      'Agendamento de test drive',
      'Avaliação de troca',
      'Opções de financiamento',
      'Busca no estoque',
    ],
    config: {
      tracking: ['Budget Range', 'Vehicle Type', 'Trade-In', 'Financing Interest', 'Timeline', 'Lead Quality'],
      gating: ['Luxury vehicles for qualified budget', 'Financing info only if interested'],
      validation: ['Qualify budget before detailed pricing', 'Verify trade-in info'],
      tools: ['Search Inventory', 'Schedule Test Drive', 'Calculate Trade-In', 'Send Financing Options'],
    },
  },
  {
    id: 'blank-template',
    icon: 'solar:add-square-bold',
    iconColor: '#757575',
    title: 'Começar do Zero',
    description: 'Crie um agente personalizado do zero com controle total',
    category: 'Personalizado',
    stats: {
      trackingFields: 0,
      gatingRules: 0,
      validationRules: 0,
      actions: 0,
      knowledgeBlocks: 0,
    },
    features: [
      'Sem pré-configuração',
      'Personalização total',
      'Adicione suas próprias regras',
      'Configure via chat',
      'Flexibilidade ilimitada',
    ],
    config: {
      tracking: [],
      gating: [],
      validation: [],
      tools: [],
    },
  },
];

// ----------------------------------------------------------------------

export function AgentTemplatesView() {
  const navigate = useNavigate();

  const handleSelectTemplate = useCallback(
    (templateId) => {
      // TODO: Pass template ID to builder and pre-populate configuration
      navigate(paths.dashboard.agent.builder, { state: { templateId } });
    },
    [navigate]
  );

  const handleBack = useCallback(() => {
    navigate(paths.dashboard.agent.root);
  }, [navigate]);

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack spacing={3} sx={{ mb: 5 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="eva:arrow-back-fill" />}
            onClick={handleBack}
            color="inherit"
          >
            Voltar
          </Button>
          <Box sx={{ flexGrow: 1 }} />
        </Stack>

        <Box>
          <Typography variant="h3" gutterBottom>
            Escolha um Template de Agente
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Selecione um template pré-configurado baseado no seu segmento ou comece do zero
          </Typography>
        </Box>
      </Stack>

      {/* Template Grid */}
      <Grid container spacing={3}>
        {AGENT_TEMPLATES.map((template) => (
          <Grid key={template.id} xs={4}>
            <Card
              onClick={() => handleSelectTemplate(template.id)}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                cursor: 'pointer',
                border: 2,
                borderColor: 'divider',
                transition: (theme) =>
                  theme.transitions.create(['box-shadow', 'transform', 'border-color'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                '&:hover': {
                  boxShadow: (theme) => theme.customShadows.z20,
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3, pb: 2 }}>
                {/* Icon & Category */}
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: (theme) => `${template.iconColor}15`,
                    }}
                  >
                    <Iconify icon={template.icon} width={32} sx={{ color: template.iconColor }} />
                  </Box>
                  <Chip label={template.category} size="small" variant="soft" />
                </Stack>

                {/* Title & Description */}
                <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                  {template.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {template.description}
                </Typography>

                {/* Stats Pills */}
                <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
                  {template.stats.trackingFields > 0 && (
                    <Chip
                      label={`${template.stats.trackingFields} rastreio`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  {template.stats.gatingRules > 0 && (
                    <Chip
                      label={`${template.stats.gatingRules} filtragem`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                  {template.stats.validationRules > 0 && (
                    <Chip
                      label={`${template.stats.validationRules} validação`}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  )}
                  {template.stats.actions > 0 && (
                    <Chip
                      label={`${template.stats.actions} ações`}
                      size="small"
                      variant="outlined"
                      color="success"
                    />
                  )}
                  {template.stats.knowledgeBlocks > 0 && (
                    <Chip
                      label={`${template.stats.knowledgeBlocks} conhecimento`}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  )}
                </Stack>

                {/* Features List with Action Button */}
                <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
                  <Stack spacing={0.75} sx={{ flexGrow: 1 }}>
                    {template.features.slice(0, 5).map((feature, index) => (
                      <Stack key={index} direction="row" alignItems="center" spacing={1}>
                        <Iconify
                          icon="eva:checkmark-circle-2-fill"
                          width={16}
                          sx={{ color: 'success.main', flexShrink: 0 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <IconButton
                    color="primary"
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      ml: 1,
                      mb: 0.5,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template.id);
                    }}
                  >
                    <Iconify icon="eva:arrow-forward-fill" width={20} />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </DashboardContent>
  );
}
