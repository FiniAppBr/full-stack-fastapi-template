import { memo, useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import agentSchemas from 'src/assets/data/agent-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useFormField, useFormActions } from '../agent-form-context';

// ----------------------------------------------------------------------

const ActionItem = memo(({ action, isEnabled, isAlwaysOn, onToggle, categoryColor }) => (
  <Box
    onClick={() => !isAlwaysOn && onToggle(action.id)}
    sx={{
      p: 1.5,
      borderRadius: 1.5,
      cursor: isAlwaysOn ? 'default' : 'pointer',
      border: '1px solid',
      borderColor: isEnabled ? `${categoryColor}50` : 'grey.200',
      bgcolor: isEnabled ? `${categoryColor}08` : 'transparent',
      opacity: isAlwaysOn ? 0.7 : 1,
      transition: 'all 0.2s',
      '&:hover': !isAlwaysOn && {
        borderColor: `${categoryColor}80`,
        bgcolor: `${categoryColor}05`,
      },
    }}
  >
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isEnabled ? categoryColor : 'grey.100',
          }}
        >
          <Iconify
            icon={action.icon}
            width={16}
            sx={{ color: isEnabled ? 'white' : 'text.secondary' }}
          />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {action.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {action.description}
          </Typography>
        </Box>
      </Stack>
      {isAlwaysOn ? (
        <Tooltip title="Sempre ativo">
          <Chip label="Auto" size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
        </Tooltip>
      ) : (
        <Switch checked={isEnabled} size="small" />
      )}
    </Stack>
  </Box>
));

// ----------------------------------------------------------------------

const CategorySection = memo(({ category, actions, enabledActions, onToggle }) => {
  const enabledCount = actions.filter((a) => enabledActions.includes(a.id) || a.alwaysOn).length;
  const allEnabled = enabledCount === actions.length;

  const handleToggleAll = () => {
    const nonAlwaysOnActions = actions.filter((a) => !a.alwaysOn);
    const actionIds = nonAlwaysOnActions.map((a) => a.id);

    if (allEnabled) {
      actionIds.forEach((id) => {
        if (enabledActions.includes(id)) {
          onToggle(id);
        }
      });
    } else {
      actionIds.forEach((id) => {
        if (!enabledActions.includes(id)) {
          onToggle(id);
        }
      });
    }
  };

  return (
    <Box>
      {/* Category Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${category.color}15`,
            }}
          >
            <Iconify icon={category.icon} width={16} sx={{ color: category.color }} />
          </Box>
          <Typography variant="subtitle2">{category.name}</Typography>
          <Chip
            label={`${enabledCount}/${actions.length}`}
            size="small"
            sx={{
              height: 20,
              fontSize: 11,
              bgcolor: enabledCount > 0 ? `${category.color}15` : 'grey.100',
              color: enabledCount > 0 ? category.color : 'text.secondary',
            }}
          />
        </Stack>
        {actions.some((a) => !a.alwaysOn) && (
          <Typography
            variant="caption"
            onClick={handleToggleAll}
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {allEnabled ? 'Desativar todos' : 'Ativar todos'}
          </Typography>
        )}
      </Stack>

      {/* Actions Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1,
        }}
      >
        {actions.map((action) => (
          <ActionItem
            key={action.id}
            action={action}
            isEnabled={enabledActions.includes(action.id) || action.alwaysOn}
            isAlwaysOn={action.alwaysOn}
            onToggle={onToggle}
            categoryColor={category.color}
          />
        ))}
      </Box>
    </Box>
  );
});

// ----------------------------------------------------------------------

export const ActionsSection = memo(() => {
  const enabledActions = useFormField('enabledActions');
  const { toggleInArray } = useFormActions();

  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups = {};
    agentSchemas.actionCategories.forEach((cat) => {
      groups[cat.id] = {
        category: cat,
        actions: agentSchemas.actionTypes.filter((a) => a.category === cat.id),
      };
    });
    return groups;
  }, []);

  // Count total enabled
  const totalEnabled = useMemo(
    () =>
      agentSchemas.actionTypes.filter(
        (a) => enabledActions.includes(a.id) || a.alwaysOn
      ).length,
    [enabledActions]
  );

  return (
    <Stack spacing={3}>
      {/* Summary */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'primary.lighter',
          border: '1px solid',
          borderColor: 'primary.light',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Iconify icon="solar:widget-5-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="subtitle2">
              {totalEnabled} ações habilitadas
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configure quais ações o agente pode executar
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Categories */}
      {Object.entries(groupedActions).map(([categoryId, { category, actions }]) => (
        <CategorySection
          key={categoryId}
          category={category}
          actions={actions}
          enabledActions={enabledActions}
          onToggle={(id) => toggleInArray('enabledActions', id)}
        />
      ))}

      {/* Info box */}
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Iconify
            icon="solar:info-circle-bold-duotone"
            width={20}
            sx={{ color: 'info.main', mt: 0.25 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              <strong>Dica:</strong> Ações essenciais (busca de conhecimento, transferir para humano)
              estão sempre ativas. As demais podem ser habilitadas conforme a necessidade do agente.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
});
