import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { SubCard } from '../components/sub-card';
import { BackHeader } from '../components/back-header';
import { StaggerContainer, StaggerItem } from '../components/animated-view';

/**
 * View showing subcards for a selected main card.
 *
 * @param {Object} props
 * @param {Object} props.mainCard - The selected main card definition
 * @param {Function} props.onSelectSubcard - Callback when a subcard is clicked
 * @param {Function} props.onBack - Callback to go back to main cards
 * @param {Function} props.getCount - Function to get count for a subcard ID
 * @param {boolean} props.compact - Compact mode for embedded use
 */
export function SubcardsView({
  mainCard,
  onSelectSubcard,
  onBack,
  getCount,
  compact = false,
}) {
  if (!mainCard) return null;

  const { title, subtitle, icon, color, subcards } = mainCard;

  return (
    <Box>
      {/* Header */}
      <BackHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        color={color}
        onBack={onBack}
        compact={compact}
      />

      {/* Subcards List */}
      <StaggerContainer>
        <Stack spacing={compact ? 1 : 1.5}>
          {subcards.map((subcard) => (
            <StaggerItem key={subcard.id}>
              <SubCard
                subcard={subcard}
                parentColor={color}
                count={getCount?.(mainCard.id, subcard.id) || 0}
                onClick={() => onSelectSubcard(subcard.id)}
                compact={compact}
              />
            </StaggerItem>
          ))}
        </Stack>
      </StaggerContainer>
    </Box>
  );
}
