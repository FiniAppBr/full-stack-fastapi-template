import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';
import { LinkButton } from 'src/components/link-button';

import { MAIN_CARDS, categories } from '../data/card-definitions';
import { MainCard } from '../components/main-card';
import { StaggerContainer, StaggerItem } from '../components/animated-view';

/**
 * Main view - 6 cards grid + recent entities list
 */
export function MainCardsView({
  onSelectCard,
  onEditEntity,
  getCount,
  totalCount = 0,
  compact = false,
}) {
  const [recentEntities, setRecentEntities] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [processing, setProcessing] = useState(null);

  const fetchRecent = useCallback(async () => {
    try {
      setLoadingRecent(true);
      const response = await axios.get(endpoints.entities.recent);
      setRecentEntities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch recent:', error);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const handleProcess = async (entity) => {
    setProcessing(entity.id);
    try {
      await axios.post(endpoints.entities.process(entity.id));
      fetchRecent();
    } catch (error) {
      alert('Erro ao processar');
    } finally {
      setProcessing(null);
    }
  };

  const getCategoryInfo = (categoryId) => categories.find((c) => c.id === categoryId) || { name: categoryId, icon: 'solar:widget-bold', color: '#757575' };

  return (
    <Box>
      {!compact && (
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h4">Entidades</Typography>
            {totalCount > 0 && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                <Iconify icon="solar:database-bold-duotone" width={20} />
                <Typography variant="body2" fontWeight={600}>{totalCount} itens</Typography>
              </Stack>
            )}
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Configure o que seu agente sabe, como reage, o que coleta e seus limites
          </Typography>
        </Box>
      )}

      {/* 5 Cards */}
      <StaggerContainer
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 2,
          mb: 4,
        }}
      >
        {MAIN_CARDS.map((card) => (
          <StaggerItem key={card.id}>
            <MainCard
              card={card}
              count={getCount?.(card.id) || 0}
              onClick={() => onSelectCard(card.id)}
              compact={compact}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>

      <Divider sx={{ my: 3 }} />

      {/* Recent Entities List */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Recentes</Typography>
        <Button size="small" startIcon={<Iconify icon="solar:refresh-bold" />} onClick={fetchRecent} disabled={loadingRecent}>
          Atualizar
        </Button>
      </Stack>

      {loadingRecent ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
      ) : recentEntities.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Iconify icon="solar:inbox-bold-duotone" width={48} sx={{ opacity: 0.5, mb: 1 }} />
          <Typography variant="body2">Nenhuma entidade ainda</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {recentEntities.map((entity) => {
            const catInfo = getCategoryInfo(entity.category);
            return (
              <Box
                key={entity.id}
                onClick={() => onEditEntity?.(entity)}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${catInfo.color}15` }}>
                  <Iconify icon={catInfo.icon} width={20} sx={{ color: catInfo.color }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>{entity.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{entity.description || catInfo.name}</Typography>
                </Box>

                {/* Process button */}
                <Box onClick={(e) => e.stopPropagation()}>
                  {processing === entity.id ? (
                    <CircularProgress size={18} />
                  ) : entity.is_processed ? (
                    <IconButton size="small" onClick={() => handleProcess(entity)} title="Reprocessar">
                      <Iconify icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                    </IconButton>
                  ) : (
                    <IconButton size="small" onClick={() => handleProcess(entity)} title="Processar">
                      <Iconify icon="solar:cpu-bolt-bold" />
                    </IconButton>
                  )}
                </Box>

                {/* Link button */}
                <Box onClick={(e) => e.stopPropagation()}>
                  <LinkButton entityId={entity.id} />
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
