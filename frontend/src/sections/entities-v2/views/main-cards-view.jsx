import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { MAIN_CARDS } from '../data/card-definitions';
import { MainCard } from '../components/main-card';
import { StaggerContainer, StaggerItem } from '../components/animated-view';

/**
 * Main view showing the 4 primary entity cards.
 * Grid layout: 2x2 on desktop, 1 column on mobile.
 *
 * @param {Object} props
 * @param {Function} props.onSelectCard - Callback when a card is clicked
 * @param {Function} props.getCount - Function to get count for a card ID
 * @param {boolean} props.compact - Compact mode for embedded use
 */
export function MainCardsView({
  onSelectCard,
  getCount,
  compact = false,
}) {
  return (
    <Box>
      {/* Header */}
      {!compact && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Entidades
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure o que seu agente sabe, como reage, o que coleta e seus limites
          </Typography>
        </Box>
      )}

      {/* Cards Grid */}
      <StaggerContainer
        sx={{
          display: 'grid',
          gridTemplateColumns: compact
            ? 'repeat(auto-fill, minmax(260px, 1fr))'
            : {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
          gap: compact ? 2 : 3,
          justifyItems: compact ? 'stretch' : 'center',
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
