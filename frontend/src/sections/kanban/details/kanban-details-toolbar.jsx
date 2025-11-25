import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useBoolean } from 'src/hooks/use-boolean';
import { useResponsive } from 'src/hooks/use-responsive';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: '#00B8D9', icon: 'solar:double-alt-arrow-down-bold-duotone' },
  { value: 'medium', label: 'Média', color: '#FFAB00', icon: 'solar:double-alt-arrow-right-bold-duotone' },
  { value: 'high', label: 'Alta', color: '#FF5630', icon: 'solar:double-alt-arrow-up-bold-duotone' },
];

export function KanbanDetailsToolbar({
  liked,
  onLike,
  taskName,
  priority,
  onDelete,
  onCloseDetails,
  onChangePriority,
}) {
  const smUp = useResponsive('up', 'sm');

  const confirm = useBoolean();
  const priorityPopover = usePopover();
  const morePopover = usePopover();

  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[1];

  const handleChangePriority = useCallback(
    (newValue) => {
      priorityPopover.onClose();
      onChangePriority?.(newValue);
    },
    [priorityPopover, onChangePriority]
  );

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        sx={{
          p: (theme) => theme.spacing(2.5, 1, 2.5, 2.5),
          borderBottom: (theme) => `solid 1px ${theme.vars.palette.divider}`,
        }}
      >
        {!smUp && (
          <Tooltip title="Voltar">
            <IconButton onClick={onCloseDetails} sx={{ mr: 1 }}>
              <Iconify icon="eva:arrow-ios-back-fill" />
            </IconButton>
          </Tooltip>
        )}

        {/* Priority selector */}
        <Button
          size="small"
          variant="soft"
          onClick={priorityPopover.onOpen}
          startIcon={<Iconify icon={currentPriority.icon} sx={{ color: currentPriority.color }} />}
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} sx={{ ml: -0.5 }} />}
          sx={{
            color: currentPriority.color,
            bgcolor: alpha(currentPriority.color, 0.12),
            '&:hover': { bgcolor: alpha(currentPriority.color, 0.24) },
          }}
        >
          {currentPriority.label}
        </Button>

        <Stack direction="row" justifyContent="flex-end" flexGrow={1} spacing={0.5}>
          <Tooltip title={liked ? 'Remover favorito' : 'Favoritar'}>
            <IconButton
              onClick={onLike}
              sx={{
                color: liked ? 'warning.main' : 'text.secondary',
              }}
            >
              <Iconify icon={liked ? 'solar:star-bold' : 'solar:star-outline'} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Excluir">
            <IconButton onClick={confirm.onTrue} sx={{ color: 'text.secondary' }}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Mais opcoes">
            <IconButton onClick={morePopover.onOpen} sx={{ color: 'text.secondary' }}>
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Tooltip>

          {smUp && (
            <Tooltip title="Fechar">
              <IconButton onClick={onCloseDetails} sx={{ color: 'text.secondary' }}>
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Priority Popover */}
      <CustomPopover
        open={priorityPopover.open}
        anchorEl={priorityPopover.anchorEl}
        onClose={priorityPopover.onClose}
        slotProps={{ arrow: { placement: 'top-left' } }}
      >
        <MenuList>
          {PRIORITY_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              selected={priority === option.value}
              onClick={() => handleChangePriority(option.value)}
            >
              <Iconify icon={option.icon} sx={{ color: option.color, mr: 1 }} />
              <Typography variant="body2">{option.label}</Typography>
            </MenuItem>
          ))}
        </MenuList>
      </CustomPopover>

      {/* More Options Popover */}
      <CustomPopover
        open={morePopover.open}
        anchorEl={morePopover.anchorEl}
        onClose={morePopover.onClose}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <MenuList>
          <MenuItem onClick={morePopover.onClose}>
            <Iconify icon="solar:copy-bold" sx={{ mr: 1 }} />
            Duplicar
          </MenuItem>
          <MenuItem onClick={morePopover.onClose}>
            <Iconify icon="solar:link-bold" sx={{ mr: 1 }} />
            Copiar link
          </MenuItem>
          <MenuItem onClick={morePopover.onClose}>
            <Iconify icon="solar:archive-bold" sx={{ mr: 1 }} />
            Arquivar
          </MenuItem>
        </MenuList>
      </CustomPopover>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Excluir lead"
        content={
          <>
            Tem certeza que deseja excluir <strong>{taskName}</strong> do pipeline?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onDelete?.();
              confirm.onFalse();
            }}
          >
            Excluir
          </Button>
        }
      />
    </>
  );
}
