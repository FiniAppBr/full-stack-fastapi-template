import { memo } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import entitySchemas from 'src/assets/data/entity-schemas.json';

import { Iconify } from 'src/components/iconify';

import { useAgentForm } from '../agent-form-context';

// ----------------------------------------------------------------------

const getCategoryInfo = (categoryId) =>
  entitySchemas.categories.find((c) => c.id === categoryId) || {
    name: categoryId,
    icon: 'solar:widget-add-bold-duotone',
    color: '#757575',
  };

export const KnowledgeSection = memo(({
  availableEntities,
  onOpenPicker,
}) => {
  const { linkedEntities, setField } = useAgentForm();

  const handleRemove = (entityId) => {
    setField(
      'linkedEntities',
      linkedEntities.filter((id) => id !== entityId)
    );
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="subtitle2">Entidades Vinculadas</Typography>
          <Typography variant="caption" color="text.secondary">
            Conhecimento que o agente pode acessar
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={onOpenPicker}
        >
          Vincular
        </Button>
      </Stack>

      {linkedEntities.length === 0 ? (
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'grey.50',
            textAlign: 'center',
          }}
        >
          <Iconify
            icon="solar:book-2-bold-duotone"
            width={40}
            sx={{ color: 'text.disabled', mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            Nenhuma entidade vinculada
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 2,
            p: 1,
          }}
        >
          <Stack spacing={1}>
            {linkedEntities.map((entityId) => {
              const entity = availableEntities.find((e) => e.id === entityId);
              if (!entity) return null;
              const categoryInfo = getCategoryInfo(entity.category);
              return (
                <Box
                  key={entityId}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${categoryInfo.color}15`,
                      }}
                    >
                      <Iconify icon={categoryInfo.icon} width={16} sx={{ color: categoryInfo.color }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {entity.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {categoryInfo.name}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton size="small" onClick={() => handleRemove(entityId)}>
                    <Iconify icon="eva:close-fill" width={18} />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
});
