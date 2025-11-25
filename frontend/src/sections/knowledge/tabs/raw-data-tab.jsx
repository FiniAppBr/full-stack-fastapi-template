import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function RawDataTab() {
  const [stats, setStats] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Fetch stats and chunks
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, chunksRes] = await Promise.all([
        axios.get(endpoints.knowledge.stats),
        axios.get(endpoints.knowledge.list, { params: { limit: 100 } }),
      ]);
      setStats(statsRes.data);
      setChunks(chunksRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch knowledge data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter chunks by search
  const filteredChunks = chunks.filter((chunk) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (chunk.title && chunk.title.toLowerCase().includes(query)) ||
      chunk.content.toLowerCase().includes(query)
    );
  });

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agent_id', 'nina');
    formData.append('category', 'document');

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await axios.post(endpoints.knowledge.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        },
      });

      await fetchData();
      alert(`Arquivo processado! ${response.data.chunks_created} chunks criados.`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Erro ao processar arquivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    handleFileUpload(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle chunk delete
  const handleDeleteChunk = async (chunkId) => {
    if (!window.confirm('Tem certeza que deseja excluir este chunk?')) return;

    try {
      await axios.delete(endpoints.knowledge.delete(chunkId));
      await fetchData();
    } catch (error) {
      console.error('Failed to delete chunk:', error);
      alert('Erro ao excluir chunk');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  const hasData = chunks.length > 0;

  return (
    <>
      {/* Upload Area - Always prominent */}
      <Box
        component="label"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          mb: 3,
          borderRadius: 2,
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'primary.lighter' : 'background.neutral',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.lighter',
          },
        }}
      >
        <input
          type="file"
          accept=".txt,.md,.pdf,.doc,.docx"
          hidden
          onChange={handleInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <Stack spacing={2} alignItems="center" sx={{ width: '100%', maxWidth: 300 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              Processando documento...
            </Typography>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ width: '100%', borderRadius: 1 }}
            />
          </Stack>
        ) : (
          <>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.lighter',
                mb: 2,
              }}
            >
              <Iconify icon="solar:cloud-upload-bold-duotone" width={40} sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Adicionar documento
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
              Arraste um arquivo aqui ou clique para selecionar
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Formatos aceitos: .txt, .md, .pdf, .doc, .docx
            </Typography>
          </>
        )}
      </Box>

      {/* Stats - Compact row */}
      {stats && hasData && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(4, 1fr)',
            mb: 3,
          }}
        >
          {[
            { icon: 'solar:document-bold-duotone', color: 'primary.main', value: stats.total_chunks, label: 'Documentos' },
            { icon: 'solar:check-circle-bold-duotone', color: 'success.main', value: stats.active_chunks, label: 'Ativos' },
            { icon: 'solar:text-bold-duotone', color: 'info.main', value: `${(stats.total_tokens / 1000).toFixed(1)}k`, label: 'Tokens' },
            { icon: 'solar:cpu-bolt-bold-duotone', color: 'warning.main', value: stats.chunks_with_embeddings, label: 'Processados' },
          ].map((stat) => (
            <Box
              key={stat.label}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Iconify icon={stat.icon} width={24} sx={{ color: stat.color, mb: 0.5 }} />
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Documents List */}
      {hasData && (
        <>
          <Divider sx={{ mb: 3 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Seus documentos
            </Typography>
            <TextField
              size="small"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:magnifer-bold" width={18} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <Stack spacing={1}>
            {filteredChunks.map((chunk) => (
              <Box
                key={chunk.id}
                onClick={() => setSelectedChunk(chunk)}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: 'primary.light',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.lighter',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon="solar:document-text-bold" width={20} sx={{ color: 'primary.main' }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {chunk.title || `Documento #${chunk.id}`}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                    >
                      {chunk.content.substring(0, 80)}...
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {chunk.has_embedding && (
                      <Iconify icon="solar:check-circle-bold" width={18} sx={{ color: 'success.main' }} />
                    )}
                    <Typography variant="caption" color="text.disabled">
                      {chunk.token_count} tokens
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChunk(chunk.id);
                      }}
                      sx={{ ml: 1 }}
                    >
                      <Iconify icon="solar:trash-bin-minimalistic-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>

          {filteredChunks.length === 0 && searchQuery && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhum documento encontrado para "{searchQuery}"
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Empty state when no data */}
      {!hasData && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Você ainda não tem documentos. Faça upload do seu primeiro arquivo acima!
          </Typography>
        </Box>
      )}

      {/* Chunk Detail Dialog */}
      <Dialog
        open={!!selectedChunk}
        onClose={() => setSelectedChunk(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedChunk && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.lighter',
                    }}
                  >
                    <Iconify icon="solar:document-text-bold" width={20} sx={{ color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h6">
                    {selectedChunk.title || `Documento #${selectedChunk.id}`}
                  </Typography>
                </Stack>
                <IconButton onClick={() => setSelectedChunk(null)} size="small">
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}
              >
                {selectedChunk.content}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 'auto' }}>
                <Chip label={selectedChunk.category} size="small" variant="soft" color="primary" />
                <Chip label={`${selectedChunk.token_count} tokens`} size="small" variant="outlined" />
                {selectedChunk.has_embedding && (
                  <Chip
                    icon={<Iconify icon="solar:check-circle-bold" width={14} />}
                    label="Processado"
                    size="small"
                    variant="soft"
                    color="success"
                  />
                )}
              </Stack>
              <Button
                color="error"
                variant="soft"
                startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />}
                onClick={() => {
                  handleDeleteChunk(selectedChunk.id);
                  setSelectedChunk(null);
                }}
              >
                Excluir
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
