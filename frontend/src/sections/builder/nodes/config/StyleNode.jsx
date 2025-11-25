import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { BaseNode } from '../BaseNode';

/**
 * Style Configuration Node
 * Communication style: tone, language, formality, length, emojis, multi-turn
 */
export function StyleNode({ data }) {
  const config = data?.config || {};
  const onEdit = data?.onEdit || (() => {});

  // Extract config values with defaults
  const emojis = config.emojis ?? true;
  const language = config.language || 'PT'; // PT, EN, Bilingual
  const length = config.length || 'Normal'; // Brief, Normal, Detailed
  const formality = config.formality || 'Informal'; // Formal (você), Informal (vc/tu)
  const multiTurn = config.multi_turn_enabled ?? false;
  const customPrompt = config.custom_prompt || '';

  return (
    <BaseNode
      id={data.id}
      type="config"
      pipelineType="personality"
      title="Estilo"
      tooltip="Estilo de comunicação do AI"
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
      leftHandle
    >
      {/* Toggle chips row 1 */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        <Chip
          size="small"
          icon={<Iconify icon={emojis ? 'mdi:emoticon-happy' : 'mdi:emoticon-neutral'} width={14} />}
          label={emojis ? 'Emojis' : 'Sem emojis'}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            bgcolor: emojis ? 'warning.lighter' : 'action.hover',
            color: emojis ? 'warning.dark' : 'text.secondary',
            border: '1px solid',
            borderColor: emojis ? 'warning.light' : 'divider',
          }}
        />
        <Chip
          size="small"
          label={language}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            bgcolor: 'info.lighter',
            color: 'info.dark',
            border: '1px solid',
            borderColor: 'info.light',
          }}
        />
      </Stack>

      {/* Toggle chips row 2 */}
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
        <Chip
          size="small"
          label={length}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            bgcolor: 'success.lighter',
            color: 'success.dark',
            border: '1px solid',
            borderColor: 'success.light',
          }}
        />
        <Chip
          size="small"
          label={formality}
          sx={{
            height: 24,
            fontSize: '0.7rem',
            bgcolor: 'secondary.lighter',
            color: 'secondary.dark',
            border: '1px solid',
            borderColor: 'secondary.light',
          }}
        />
      </Stack>

      {/* Multi-turn indicator */}
      {multiTurn && (
        <Box sx={{ mb: 1.5, p: 1, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Iconify icon="mdi:chat-processing" width={14} sx={{ color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
              Multi-turn ativo
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {[...Array(3)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  height: 16,
                  bgcolor: 'primary.main',
                  opacity: 0.7 - (index * 0.2),
                  borderRadius: 1,
                  width: `${100 - (index * 20)}%`,
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Custom prompt preview */}
      {customPrompt && (
        <Box sx={{ p: 1, bgcolor: 'background.neutral', borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontStyle: 'italic', display: 'block' }}>
            {customPrompt.length > 80 ? `${customPrompt.substring(0, 80)}...` : customPrompt}
          </Typography>
        </Box>
      )}

      {/* Empty state */}
      {!customPrompt && !multiTurn && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', display: 'block', textAlign: 'center', mt: 0.5 }}>
          Configurações padrão
        </Typography>
      )}
    </BaseNode>
  );
}

StyleNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    config: PropTypes.shape({
      emojis: PropTypes.bool,
      language: PropTypes.string,
      length: PropTypes.string,
      formality: PropTypes.string,
      multi_turn_enabled: PropTypes.bool,
      custom_prompt: PropTypes.string,
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
