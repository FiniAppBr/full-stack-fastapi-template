import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { MAIN_CARDS } from '../data/card-definitions';
import { MainCard } from '../components/main-card';
import { StaggerContainer, StaggerItem } from '../components/animated-view';

/**
 * Main view showing the 6 primary entity cards.
 */
export function MainCardsView({
  onSelectCard,
  getCount,
  totalCount = 0,
  compact = false,
}) {
  return (
    <Box>
      {!compact && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h4">Entidades</Typography>
            {totalCount > 0 && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ color: 'text.secondary' }}>
                <Iconify icon="solar:database-bold-duotone" width={20} />
                <Typography variant="body2" fontWeight={600}>
                  {totalCount} {totalCount === 1 ? 'item' : 'itens'}
                </Typography>
              </Stack>
            )}
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Configure o que seu agente sabe, como reage, o que coleta e seus limites
          </Typography>
        </Box>
      )}

      <StaggerContainer
        sx={{
          display: 'grid',
          gridTemplateColumns: compact ? 'repeat(auto-fill, minmax(260px, 1fr))' : { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: compact ? 2 : 3,
          justifyItems: 'center',
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
    </Box>
  );
}
