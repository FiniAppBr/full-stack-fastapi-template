import { memo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

const ALWAYS_ON_ACTIONS = agentSchemas.actionTypes.filter((a) => a.alwaysOn);
const TOOL_CATEGORIES = agentSchemas.actionCategories.filter((c) => c.id !== 'core');

const CATEGORY_DESCRIPTIONS = {
  calendar: 'Agendar, reagendar e cancelar compromissos',
  kanban: 'Criar e gerenciar tarefas',
  pipeline: 'Salvar e qualificar contatos',
  inventory: 'Consultar e reservar estoque',
};

// ----------------------------------------------------------------------

function CategoryCard({ category, enabled, onToggle }) {
  const description = CATEGORY_DESCRIPTIONS[category.id] || '';

  return (
    <Box
      onClick={() => onToggle(category.id)}
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: enabled ? `${category.color}40` : 'divider',
        bgcolor: enabled ? `${category.color}08` : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        '&:hover': {
          borderColor: enabled ? `${category.color}60` : 'text.disabled',
          bgcolor: enabled ? `${category.color}12` : 'action.hover',
        },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${category.color}15`,
        }}
      >
        <Iconify icon={category.icon} width={20} sx={{ color: category.color }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {category.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {description}
        </Typography>
      </Box>

      {/* Toggle indicator */}
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: enabled ? category.color : 'text.disabled',
          bgcolor: enabled ? category.color : 'transparent',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {enabled && <Iconify icon="eva:checkmark-fill" width={12} sx={{ color: 'white' }} />}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export const ActionsSection = memo(() => {
  const enabledToolCategories = useFormField('enabledToolCategories');
  const { toggleInArray } = useFormActions();

  return (
    <Stack spacing={2.5}>
      {/* Always-on actions */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          Sempre ativas
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {ALWAYS_ON_ACTIONS.map((action) => (
            <Box
              key={action.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: 1,
                bgcolor: 'grey.100',
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            >
              <Iconify icon={action.icon} width={16} sx={{ color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                {action.name}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Tool categories */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Ferramentas
        </Typography>
        <Stack spacing={1}>
          {TOOL_CATEGORIES.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              enabled={enabledToolCategories.includes(category.id)}
              onToggle={(id) => toggleInArray('enabledToolCategories', id)}
            />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
});
