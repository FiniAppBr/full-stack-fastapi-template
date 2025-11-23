import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { BaseNode } from '../BaseNode';

/**
 * Files Configuration Node
 * Shows media rules (auto-send attachments)
 */
export function FilesNode({ data }) {
  const config = data?.config || {};
  const mediaRules = config.mediaRules || {};
  const fileNames = Object.keys(mediaRules);
  const onEdit = data?.onEdit || (() => {});

  return (
    <BaseNode
      id={data.id}
      type="files"
      icon="mdi:paperclip"
      title="Arquivos Inteligentes"
      tooltip="Envia automaticamente quando cliente pedir"
      badge={fileNames.length}
      editable
      onEdit={onEdit}
      targetHandle={false}
      sourceHandle={false}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Envia automaticamente quando cliente pedir
      </Typography>

      {fileNames.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Nenhum arquivo configurado
        </Typography>
      ) : (
        <Box>
          {fileNames.slice(0, 2).map((fileName) => {
            const rule = mediaRules[fileName];
            return (
              <Box key={fileName} sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span style={{ fontSize: '1rem' }}>📄</span>
                  {fileName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', ml: 2.5 }}>
                  Envia quando ouvir:
                  <br />
                  {rule.triggers?.slice(0, 2).map((trigger) => `"${trigger}"`).join(', ')}
                  {rule.triggers?.length > 2 && `, +${rule.triggers.length - 2}`}
                </Typography>
              </Box>
            );
          })}
          {fileNames.length > 2 && (
            <Typography variant="caption" color="text.disabled">
              +{fileNames.length - 2} arquivos...
            </Typography>
          )}
        </Box>
      )}
    </BaseNode>
  );
}

FilesNode.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string,
    config: PropTypes.shape({
      mediaRules: PropTypes.shape({}),
    }),
    onEdit: PropTypes.func,
  }).isRequired,
};
