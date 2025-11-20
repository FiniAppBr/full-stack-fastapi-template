import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Tone Configuration Node
 * Shows personality tone with waveform visualization
 */
export function ToneNode({ data }) {
  const tone = data?.tone || 'professional';
  const useEmojis = data?.useEmojis ?? false;
  const onEdit = data?.onEdit || (() => {});

  // Waveform config based on tone
  const waveforms = {
    professional: [3, 5, 4, 5, 3, 4],
    friendly: [2, 6, 3, 7, 4, 6],
    energetic: [1, 8, 2, 9, 3, 8],
    casual: [4, 5, 6, 4, 5, 4],
  };

  const wave = waveforms[tone] || waveforms.professional;

  return (
    <BaseNode
      id={data.id}
      type="tone"
      pipelineType="personality"
      title="Tom de Voz"
      tooltip="Personalidade e estilo de comunicação"
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
      leftHandle={true}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Personalidade do assistente
      </Typography>

      {/* Waveform visualization */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 0.5,
          height: 40,
          mb: 1,
        }}
      >
        {wave.map((height, index) => (
          <Box
            key={index}
            sx={{
              width: 4,
              height: `${height * 4}px`,
              bgcolor: 'primary.main',
              borderRadius: 0.5,
              opacity: 0.8,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </Box>

      {/* Tone label */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
          {tone}
        </Typography>
        {useEmojis && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
            Com emojis
          </Typography>
        )}
      </Box>
    </BaseNode>
  );
}

ToneNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    tone: PropTypes.string,
    useEmojis: PropTypes.bool,
    onEdit: PropTypes.func,
  }).isRequired,
};
