import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { useBoolean } from 'src/hooks/use-boolean';

import { varAlpha } from 'src/theme/styles';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { usePopover, CustomPopover } from 'src/components/custom-popover';

import { KanbanInputName } from '../components/kanban-input-name';

// ----------------------------------------------------------------------

export function KanbanColumnToolBar({
  columnName,
  columnColor,
  totalTasks,
  handleProps,
  onClearColumn,
  onToggleAddTask,
  onDeleteColumn,
  onUpdateColumn,
}) {
  const renameRef = useRef(null);

  const popover = usePopover();

  const confirmDialog = useBoolean();
  const isRenaming = useBoolean();

  const [name, setName] = useState(columnName);

  useEffect(() => {
    if (isRenaming.value && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming.value]);

  const handleChangeName = useCallback((event) => {
    setName(event.target.value);
  }, []);

  const handleKeyUpUpdateColumn = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        if (renameRef.current) {
          renameRef.current.blur();
        }
        onUpdateColumn?.(name);
        isRenaming.onFalse();
      }
      if (event.key === 'Escape') {
        setName(columnName);
        isRenaming.onFalse();
      }
    },
    [name, onUpdateColumn, columnName, isRenaming]
  );

  const handleBlur = useCallback(() => {
    if (name !== columnName) {
      onUpdateColumn?.(name);
    }
    isRenaming.onFalse();
  }, [name, columnName, onUpdateColumn, isRenaming]);

  return (
    <>
      <Stack spacing={1.5}>
        {/* Color bar at top */}
        <Box
          sx={{
            height: 4,
            borderRadius: 1,
            bgcolor: columnColor || '#00B8D9',
            mx: -2,
            mt: -2.5,
          }}
        />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            {/* Color dot */}
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: columnColor || '#00B8D9',
                flexShrink: 0,
                boxShadow: (theme) => `0 0 0 3px ${alpha(columnColor || '#00B8D9', 0.24)}`,
              }}
            />

            {/* Column name */}
            {isRenaming.value ? (
              <KanbanInputName
                inputRef={renameRef}
                placeholder="Column name"
                value={name}
                onChange={handleChangeName}
                onKeyUp={handleKeyUpUpdateColumn}
                onBlur={handleBlur}
                inputProps={{ id: `input-column-${name}` }}
                sx={{ flex: 1 }}
              />
            ) : (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
                onClick={isRenaming.onTrue}
              >
                {columnName}
              </Typography>
            )}

            {/* Task count badge */}
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: (theme) => alpha(columnColor || '#00B8D9', 0.12),
                color: columnColor || '#00B8D9',
                fontWeight: 700,
                fontSize: '0.75rem',
                minWidth: 24,
                textAlign: 'center',
              }}
            >
              {totalTasks}
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <IconButton
              size="small"
              onClick={onToggleAddTask}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Iconify icon="solar:add-circle-bold" width={20} />
            </IconButton>

            <IconButton
              size="small"
              onClick={popover.onOpen}
              sx={{
                color: popover.open ? 'primary.main' : 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Iconify icon="solar:menu-dots-bold-duotone" width={20} />
            </IconButton>

            <IconButton
              size="small"
              {...handleProps}
              sx={{
                cursor: 'grab',
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                },
              }}
            >
              <Iconify icon="nimbus:drag-dots" width={20} />
            </IconButton>
          </Stack>
        </Stack>
      </Stack>

      <CustomPopover open={popover.open} anchorEl={popover.anchorEl} onClose={popover.onClose}>
        <MenuList>
          <MenuItem
            onClick={() => {
              isRenaming.onTrue();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Renomear
          </MenuItem>

          <MenuItem
            onClick={() => {
              onClearColumn?.();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eraser-bold" />
            Limpar
          </MenuItem>

          <MenuItem
            onClick={() => {
              confirmDialog.onTrue();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Excluir
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirmDialog.value}
        onClose={confirmDialog.onFalse}
        title="Excluir coluna"
        content={
          <>
            Tem certeza que deseja excluir esta coluna?
            <Box sx={{ typography: 'caption', color: 'error.main', mt: 2 }}>
              <strong> ATENÇÃO: </strong> Todos os cards desta coluna também serão excluídos.
            </Box>
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onDeleteColumn?.();
              confirmDialog.onFalse();
            }}
          >
            Excluir
          </Button>
        }
      />
    </>
  );
}
