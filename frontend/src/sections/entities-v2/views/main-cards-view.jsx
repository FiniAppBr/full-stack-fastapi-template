import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

import { StaggerItem, StaggerContainer } from '../components/animated-view';
import { EntityListItem } from '../components/entity-list-item';
import { MainCard } from '../components/main-card';
import { categories, MAIN_CARDS } from '../data/card-definitions';

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
              <EntityListItem
                key={entity.id}
                entity={entity}
                color={catInfo.color}
                categoryLabel={catInfo.name}
                onEdit={() => onEditEntity?.(entity)}
                onRefresh={fetchRecent}
                showActions
                compact
              />
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
