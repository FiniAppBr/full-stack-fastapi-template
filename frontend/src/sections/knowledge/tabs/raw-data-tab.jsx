import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function RawDataTab() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Chunk viewer state
  const [viewingChunks, setViewingChunks] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [editingChunk, setEditingChunk] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch document entities (category='documents')
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { category: 'documents', limit: 100 };
      const response = await axios.get(endpoints.entities.list, { params });
      setDocuments(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter by search
  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) => doc.name?.toLowerCase().includes(query));
  }, [documents, searchQuery]);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setUploadProgress(0);

      await axios.post(endpoints.entities.uploadDocument, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        },
      });

      await fetchData();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.detail || 'Erro ao processar documento');
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

  // Handle document delete
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento e todos os seus chunks?')) return;

    try {
      await axios.delete(endpoints.entities.delete(docId));
      await fetchData();
      setSelectedDoc(null);
      setViewingChunks(false);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Erro ao excluir documento');
    }
  };

  // Fetch chunks for a document
  const fetchChunks = async (doc) => {
    if (!doc.chunk_ids?.length) {
      setChunks([]);
      return;
    }

    setChunksLoading(true);
    try {
      // Fetch chunks by agent_id pattern
      const agentId = `entity:${doc.id}`;
      const response = await axios.get(endpoints.knowledge.list, {
        params: { agent_id: agentId, limit: 100, active_only: false },
      });
      setChunks(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch chunks:', error);
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  };

  // Open chunk viewer for a document
  const handleViewChunks = async (doc) => {
    setSelectedDoc(doc);
    setViewingChunks(true);
    await fetchChunks(doc);
  };

  // Edit chunk
  const handleEditChunk = (chunk) => {
    setEditingChunk(chunk);
    setEditContent(chunk.content);
    setEditTitle(chunk.title || '');
  };

  // Save edited chunk
  const handleSaveChunk = async () => {
    if (!editingChunk) return;

    setSaving(true);
    try {
      // Update chunk content
      await axios.patch(endpoints.knowledge.update(editingChunk.id), {
        content: editContent,
        title: editTitle,
      });

      // Regenerate embedding
      await axios.post(endpoints.knowledge.embed(editingChunk.id));

      // Refresh chunks
      await fetchChunks(selectedDoc);
      setEditingChunk(null);
    } catch (error) {
      console.error('Failed to save chunk:', error);
      alert('Erro ao salvar chunk');
    } finally {
      setSaving(false);
    }
  };

  // Delete chunk
  const handleDeleteChunk = async (chunkId) => {
    if (!window.confirm('Tem certeza que deseja excluir este chunk?')) return;

    try {
      await axios.delete(endpoints.knowledge.delete(chunkId), { params: { hard: true } });
      await fetchChunks(selectedDoc);

      // Update document chunk count
      await fetchData();
    } catch (error) {
      console.error('Failed to delete chunk:', error);
      alert('Erro ao excluir chunk');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalChunks = documents.reduce((acc, d) => acc + (d.data?.chunk_count || 0), 0);
    return { totalDocs, totalChunks };
  }, [documents]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  const hasData = documents.length > 0;

  return (
    <>
      {/* Upload Area */}
      <Box sx={{ mb: 3 }}>
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
            accept=".txt,.md,.pdf,.docx,.doc,.pptx,.xlsx,.html,.htm"
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
                Formatos aceitos: .txt, .md, .pdf, .docx, .pptx, .xlsx, .html
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Stats */}
      {hasData && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(2, 1fr)',
            mb: 3,
          }}
        >
          {[
            { icon: 'solar:document-bold-duotone', color: 'primary.main', value: stats.totalDocs, label: 'Documentos' },
            { icon: 'solar:layers-bold-duotone', color: 'info.main', value: stats.totalChunks, label: 'Chunks' },
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

      {/* Search and List */}
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

          <Stack spacing={1.5}>
            {filteredDocs.map((doc) => (
              <Box
                key={doc.id}
                onClick={() => handleViewChunks(doc)}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
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
                        bgcolor: '#546E7A15',
                      }}
                    >
                      <Iconify icon="solar:document-text-bold" width={20} sx={{ color: '#546E7A' }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{doc.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {doc.data?.chunk_count || 0} chunks
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {doc.is_processed ? (
                      <Chip label="Processado" size="small" color="success" variant="soft" />
                    ) : (
                      <Chip label="Pendente" size="small" color="warning" variant="soft" />
                    )}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDoc(doc.id);
                      }}
                    >
                      <Iconify icon="solar:trash-bin-minimalistic-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>

          {filteredDocs.length === 0 && searchQuery && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhum documento encontrado para &quot;{searchQuery}&quot;
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Empty state */}
      {!hasData && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Nenhum documento. Faça upload do seu primeiro arquivo acima.
          </Typography>
        </Box>
      )}

      {/* Chunk Viewer Dialog */}
      <Dialog
        open={viewingChunks && !!selectedDoc}
        onClose={() => {
          setViewingChunks(false);
          setSelectedDoc(null);
          setChunks([]);
        }}
        maxWidth="md"
        fullWidth
      >
        {selectedDoc && (
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
                      bgcolor: '#546E7A15',
                    }}
                  >
                    <Iconify icon="solar:document-text-bold" width={20} sx={{ color: '#546E7A' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" noWrap sx={{ maxWidth: 400 }}>
                      {selectedDoc.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {chunks.length} chunks
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  onClick={() => {
                    setViewingChunks(false);
                    setSelectedDoc(null);
                    setChunks([]);
                  }}
                  size="small"
                >
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {chunksLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                  <CircularProgress />
                </Box>
              ) : chunks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography color="text.secondary">
                    Nenhum chunk encontrado para este documento.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={0} divider={<Divider />}>
                  {chunks.map((chunk, index) => (
                    <Box
                      key={chunk.id}
                      sx={{
                        p: 2,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              sx={{ bgcolor: 'grey.200', fontWeight: 600 }}
                            />
                            {chunk.title && (
                              <Typography variant="subtitle2" noWrap>
                                {chunk.title}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {chunk.token_count} tokens
                            </Typography>
                            {chunk.has_embedding ? (
                              <Chip label="Embedding" size="small" color="success" variant="soft" sx={{ height: 20 }} />
                            ) : (
                              <Chip label="Sem embedding" size="small" color="warning" variant="soft" sx={{ height: 20 }} />
                            )}
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              maxHeight: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 5,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {chunk.content}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleEditChunk(chunk)}>
                            <Iconify icon="solar:pen-bold" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteChunk(chunk.id)}
                            sx={{ color: 'error.main' }}
                          >
                            <Iconify icon="solar:trash-bin-minimalistic-bold" width={18} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                variant="soft"
                startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />}
                onClick={() => handleDeleteDoc(selectedDoc.id)}
              >
                Excluir documento
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Chunk Edit Dialog */}
      <Dialog
        open={!!editingChunk}
        onClose={() => setEditingChunk(null)}
        maxWidth="sm"
        fullWidth
      >
        {editingChunk && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Editar Chunk</Typography>
                <IconButton onClick={() => setEditingChunk(null)} size="small">
                  <Iconify icon="eva:close-fill" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField
                  label="Título"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Conteúdo"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  fullWidth
                  multiline
                  rows={12}
                  placeholder="Conteúdo do chunk..."
                />
                <Typography variant="caption" color="text.secondary">
                  Ao salvar, o embedding será regenerado automaticamente.
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={() => setEditingChunk(null)}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveChunk}
                disabled={saving || !editContent.trim()}
                startIcon={saving ? <CircularProgress size={16} /> : <Iconify icon="solar:diskette-bold" />}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
