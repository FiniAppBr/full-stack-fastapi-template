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

import { BackHeader } from '../components/back-header';

const COLOR = '#546E7A';

export function DocumentsView({ onBack, compact = false }) {
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(endpoints.entities.list, { params: { category: 'documents', limit: 100 } });
      setDocuments(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) => doc.name?.toLowerCase().includes(query));
  }, [documents, searchQuery]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setUploadProgress(0);
      await axios.post(endpoints.entities.uploadDocument, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress((e.loaded / e.total) * 100),
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

  const handleInputChange = (e) => handleFileUpload(e.target.files?.[0]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Excluir documento e todos os chunks?')) return;
    try {
      await axios.delete(endpoints.entities.delete(docId));
      await fetchData();
      setSelectedDoc(null);
      setViewingChunks(false);
    } catch (error) {
      alert('Erro ao excluir');
    }
  };

  const fetchChunks = async (doc) => {
    if (!doc.chunk_ids?.length) { setChunks([]); return; }
    setChunksLoading(true);
    try {
      const response = await axios.get(endpoints.knowledge.list, {
        params: { agent_id: `entity:${doc.id}`, limit: 100, active_only: false },
      });
      setChunks(response.data?.data || []);
    } catch (error) {
      setChunks([]);
    } finally {
      setChunksLoading(false);
    }
  };

  const handleViewChunks = async (doc) => {
    setSelectedDoc(doc);
    setViewingChunks(true);
    await fetchChunks(doc);
  };

  const handleEditChunk = (chunk) => {
    setEditingChunk(chunk);
    setEditContent(chunk.content);
    setEditTitle(chunk.title || '');
  };

  const handleSaveChunk = async () => {
    if (!editingChunk) return;
    setSaving(true);
    try {
      await axios.patch(endpoints.knowledge.update(editingChunk.id), { content: editContent, title: editTitle });
      await axios.post(endpoints.knowledge.embed(editingChunk.id));
      await fetchChunks(selectedDoc);
      setEditingChunk(null);
    } catch (error) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChunk = async (chunkId) => {
    if (!window.confirm('Excluir este chunk?')) return;
    try {
      await axios.delete(endpoints.knowledge.delete(chunkId), { params: { hard: true } });
      await fetchChunks(selectedDoc);
      await fetchData();
    } catch (error) {
      alert('Erro ao excluir');
    }
  };

  const stats = useMemo(() => ({
    totalDocs: documents.length,
    totalChunks: documents.reduce((acc, d) => acc + (d.data?.chunk_count || 0), 0),
  }), [documents]);

  if (loading) {
    return (
      <Box>
        <BackHeader title="Documentos" subtitle="Upload de arquivos" icon="solar:file-text-bold-duotone" color={COLOR} onBack={onBack} compact={compact} />
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      </Box>
    );
  }

  return (
    <Box>
      <BackHeader title="Documentos" subtitle="Upload de arquivos" icon="solar:file-text-bold-duotone" color={COLOR} onBack={onBack} compact={compact} />

      {/* Upload Area */}
      <Box
        component="label"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          p: 4, borderRadius: 2, border: '2px dashed', mb: 3,
          borderColor: dragActive ? COLOR : 'divider',
          bgcolor: dragActive ? `${COLOR}10` : 'background.neutral',
          cursor: 'pointer', transition: 'all 0.2s',
          '&:hover': { borderColor: COLOR, bgcolor: `${COLOR}10` },
        }}
      >
        <input type="file" accept=".txt,.md,.pdf,.docx,.doc,.pptx,.xlsx,.html,.htm" hidden onChange={handleInputChange} disabled={uploading} />
        {uploading ? (
          <Stack spacing={2} alignItems="center" sx={{ width: '100%', maxWidth: 300 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">Processando...</Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ width: '100%', borderRadius: 1 }} />
          </Stack>
        ) : (
          <>
            <Box sx={{ width: 72, height: 72, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${COLOR}15`, mb: 2 }}>
              <Iconify icon="solar:cloud-upload-bold-duotone" width={40} sx={{ color: COLOR }} />
            </Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>Adicionar documento</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>Arraste ou clique para selecionar</Typography>
            <Typography variant="caption" color="text.disabled">.txt, .md, .pdf, .docx, .pptx, .xlsx, .html</Typography>
          </>
        )}
      </Box>

      {/* Stats */}
      {documents.length > 0 && (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)', mb: 3 }}>
          {[
            { icon: 'solar:document-bold-duotone', value: stats.totalDocs, label: 'Documentos' },
            { icon: 'solar:layers-bold-duotone', value: stats.totalChunks, label: 'Chunks' },
          ].map((s) => (
            <Box key={s.label} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Iconify icon={s.icon} width={24} sx={{ color: COLOR, mb: 0.5 }} />
              <Typography variant="h6">{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <>
          <Divider sx={{ mb: 3 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Seus documentos</Typography>
            <TextField size="small" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} sx={{ width: 200 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Iconify icon="solar:magnifer-bold" width={18} /></InputAdornment> }}
            />
          </Stack>
          <Stack spacing={1.5}>
            {filteredDocs.map((doc) => (
              <Box key={doc.id} onClick={() => handleViewChunks(doc)}
                sx={{ p: 2, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${COLOR}15` }}>
                      <Iconify icon="solar:document-text-bold" width={20} sx={{ color: COLOR }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{doc.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{doc.data?.chunk_count || 0} chunks</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {doc.is_processed ? <Chip label="Processado" size="small" color="success" variant="soft" /> : <Chip label="Pendente" size="small" color="warning" variant="soft" />}
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}>
                      <Iconify icon="solar:trash-bin-minimalistic-bold" width={18} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
          {filteredDocs.length === 0 && searchQuery && (
            <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">Nenhum resultado para "{searchQuery}"</Typography></Box>
          )}
        </>
      )}

      {documents.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}><Typography variant="body2" color="text.secondary">Nenhum documento. Faça upload acima.</Typography></Box>
      )}

      {/* Chunk Viewer Dialog */}
      <Dialog open={viewingChunks && !!selectedDoc} onClose={() => { setViewingChunks(false); setSelectedDoc(null); setChunks([]); }} maxWidth="md" fullWidth>
        {selectedDoc && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${COLOR}15` }}>
                    <Iconify icon="solar:document-text-bold" width={20} sx={{ color: COLOR }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" noWrap sx={{ maxWidth: 400 }}>{selectedDoc.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{chunks.length} chunks</Typography>
                  </Box>
                </Stack>
                <IconButton onClick={() => { setViewingChunks(false); setSelectedDoc(null); setChunks([]); }} size="small"><Iconify icon="eva:close-fill" /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              {chunksLoading ? (
                <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
              ) : chunks.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}><Typography color="text.secondary">Nenhum chunk.</Typography></Box>
              ) : (
                <Stack spacing={0} divider={<Divider />}>
                  {chunks.map((chunk, i) => (
                    <Box key={chunk.id} sx={{ p: 2, '&:hover': { bgcolor: 'action.hover' } }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Chip label={`#${i + 1}`} size="small" sx={{ bgcolor: 'grey.200', fontWeight: 600 }} />
                            {chunk.title && <Typography variant="subtitle2" noWrap>{chunk.title}</Typography>}
                            <Typography variant="caption" color="text.secondary">{chunk.token_count} tokens</Typography>
                            <Chip label={chunk.has_embedding ? 'Embedding' : 'Sem embedding'} size="small" color={chunk.has_embedding ? 'success' : 'warning'} variant="soft" sx={{ height: 20 }} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
                            {chunk.content}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleEditChunk(chunk)}><Iconify icon="solar:pen-bold" width={18} /></IconButton>
                          <IconButton size="small" onClick={() => handleDeleteChunk(chunk.id)} sx={{ color: 'error.main' }}><Iconify icon="solar:trash-bin-minimalistic-bold" width={18} /></IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button color="error" variant="soft" startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />} onClick={() => handleDeleteDoc(selectedDoc.id)}>Excluir documento</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Chunk Edit Dialog */}
      <Dialog open={!!editingChunk} onClose={() => setEditingChunk(null)} maxWidth="sm" fullWidth>
        {editingChunk && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6">Editar Chunk</Typography>
                <IconButton onClick={() => setEditingChunk(null)} size="small"><Iconify icon="eva:close-fill" /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <TextField label="Título" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} fullWidth size="small" />
                <TextField label="Conteúdo" value={editContent} onChange={(e) => setEditContent(e.target.value)} fullWidth multiline rows={12} />
                <Typography variant="caption" color="text.secondary">Embedding será regenerado ao salvar.</Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={() => setEditingChunk(null)}>Cancelar</Button>
              <Button variant="contained" onClick={handleSaveChunk} disabled={saving || !editContent.trim()} startIcon={saving ? <CircularProgress size={16} /> : <Iconify icon="solar:diskette-bold" />}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
