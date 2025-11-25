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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function KnowledgeListView() {
  const [stats, setStats] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
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

      // Refresh data
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
      <DashboardContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Conhecimento</Typography>
          <Typography variant="body2" color="text.secondary">
            Base de conhecimento para RAG (Retrieval-Augmented Generation)
          </Typography>
        </Box>

        <Button
          component="label"
          variant="contained"
          startIcon={<Iconify icon="solar:upload-bold" />}
          disabled={uploading}
        >
          Upload Documento
          <input
            type="file"
            accept=".txt,.md"
            hidden
            onChange={handleFileUpload}
          />
        </Button>
      </Stack>

      {/* Upload Progress */}
      {uploading && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="body2">Processando documento...</Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: 'repeat(4, 1fr)',
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:document-bold-duotone" width={40} sx={{ color: 'primary.main', mb: 1 }} />
              <Typography variant="h4">{stats.total_chunks}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Chunks
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:check-circle-bold-duotone" width={40} sx={{ color: 'success.main', mb: 1 }} />
              <Typography variant="h4">{stats.active_chunks}</Typography>
              <Typography variant="body2" color="text.secondary">
                Chunks Ativos
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:text-bold-duotone" width={40} sx={{ color: 'info.main', mb: 1 }} />
              <Typography variant="h4">{(stats.total_tokens / 1000).toFixed(1)}k</Typography>
              <Typography variant="body2" color="text.secondary">
                Tokens
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Iconify icon="solar:cpu-bolt-bold-duotone" width={40} sx={{ color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">{stats.chunks_with_embeddings}</Typography>
              <Typography variant="body2" color="text.secondary">
                Com Embedding
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar nos chunks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifer-bold" />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Chunks List */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Chunks ({filteredChunks.length})
            </Typography>
            {stats?.categories && (
              <Stack direction="row" spacing={1}>
                {stats.categories.map((cat) => (
                  <Chip
                    key={cat.category}
                    label={`${cat.category} (${cat.count})`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Stack>

          {filteredChunks.length === 0 ? (
            <Alert severity="info">
              Nenhum chunk encontrado. Faça upload de um documento para começar.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {filteredChunks.map((chunk) => (
                <Card
                  key={chunk.id}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setSelectedChunk(chunk)}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {chunk.title || `Chunk #${chunk.id}`}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            mt: 0.5,
                          }}
                        >
                          {chunk.content}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip
                            label={chunk.category}
                            size="small"
                            color="primary"
                            variant="soft"
                          />
                          <Chip
                            label={`${chunk.token_count} tokens`}
                            size="small"
                            variant="outlined"
                          />
                          {chunk.has_embedding && (
                            <Chip
                              icon={<Iconify icon="solar:check-circle-bold" width={16} />}
                              label="Embedding"
                              size="small"
                              color="success"
                              variant="soft"
                            />
                          )}
                        </Stack>
                      </Box>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChunk(chunk.id);
                        }}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

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
                <Typography variant="h6">
                  {selectedChunk.title || `Chunk #${selectedChunk.id}`}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={selectedChunk.category} color="primary" size="small" />
                  <Chip label={`${selectedChunk.token_count} tokens`} size="small" />
                </Stack>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
              >
                {selectedChunk.content}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                onClick={() => {
                  handleDeleteChunk(selectedChunk.id);
                  setSelectedChunk(null);
                }}
              >
                Excluir
              </Button>
              <Button onClick={() => setSelectedChunk(null)}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </DashboardContent>
  );
}
