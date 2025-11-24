import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import axios, { endpoints } from 'src/utils/axios';

import entitySchemas from 'src/assets/data/entity-schemas.json';

// ----------------------------------------------------------------------

export function EntityListView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [stats, setStats] = useState({});
  const [recentEntities, setRecentEntities] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Category filter from URL
  const selectedCategory = searchParams.get('category') || null;

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedCategoryForNew, setSelectedCategoryForNew] = useState(null);

  // Row menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuEntity, setMenuEntity] = useState(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(endpoints.entities.stats);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  // Fetch recent entities
  const fetchRecent = useCallback(async () => {
    try {
      const response = await axios.get(endpoints.entities.recent);
      setRecentEntities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch recent:', error);
    }
  }, []);

  // Fetch entities (filtered)
  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('skip', page * rowsPerPage);
      params.set('limit', rowsPerPage);
      if (selectedCategory) params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);

      const response = await axios.get(`${endpoints.entities.list}?${params}`);
      setEntities(response.data.data || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, [fetchStats, fetchRecent]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Handlers
  const handleCategoryClick = (categoryId) => {
    if (categoryId === selectedCategory) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', categoryId);
    }
    setSearchParams(searchParams);
    setPage(0);
  };

  const handleNewEntity = (categoryId = null) => {
    if (categoryId) {
      setSelectedCategoryForNew(categoryId);
      setTemplateDialogOpen(true);
    } else {
      setTemplateDialogOpen(true);
      setSelectedCategoryForNew(null);
    }
  };

  const handleTemplateSelect = (categoryId, templateId) => {
    setTemplateDialogOpen(false);
    navigate(`${paths.dashboard.entity.new}?category=${categoryId}&template=${templateId}`);
  };

  const handleEdit = (id) => {
    navigate(paths.dashboard.entity.edit(id));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta entidade?')) {
      try {
        await axios.delete(endpoints.entities.delete(id));
        fetchStats();
        fetchRecent();
        fetchEntities();
      } catch (error) {
        console.error('Failed to delete entity:', error);
      }
    }
    setMenuAnchor(null);
    setMenuEntity(null);
  };

  const handleMenuOpen = (event, entity) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuEntity(entity);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuEntity(null);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const getCategoryInfo = (categoryId) => {
    return entitySchemas.categories.find((c) => c.id === categoryId) || {
      name: categoryId,
      icon: 'solar:widget-add-bold-duotone',
      color: '#757575',
    };
  };

  const getTemplateInfo = (categoryId, templateId) => {
    const category = entitySchemas.categories.find((c) => c.id === categoryId);
    if (!category) return null;
    return category.templates.find((t) => t.id === templateId);
  };

  // Show dashboard or filtered list
  const showDashboard = !selectedCategory && !searchQuery;

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4">Entidades</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie produtos, políticas, FAQ e mais
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => handleNewEntity()}
        >
          Nova Entidade
        </Button>
      </Stack>

      {/* Search bar (always visible) */}
      <TextField
        fullWidth
        placeholder="Buscar entidades..."
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Category filter chips */}
      {selectedCategory && (
        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
          <Chip
            label={getCategoryInfo(selectedCategory).name}
            icon={<Iconify icon={getCategoryInfo(selectedCategory).icon} />}
            onDelete={() => handleCategoryClick(selectedCategory)}
            sx={{
              bgcolor: getCategoryInfo(selectedCategory).color,
              color: 'white',
              '& .MuiChip-deleteIcon': { color: 'white' },
            }}
          />
        </Stack>
      )}

      {showDashboard ? (
        <>
          {/* Category Cards Grid */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              mb: 4,
            }}
          >
            {entitySchemas.categories.map((category) => (
              <Card
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) => theme.customShadows?.z8 || '0 8px 16px rgba(0,0,0,0.1)',
                  },
                  borderLeft: `4px solid ${category.color}`,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${category.color}15`,
                    }}
                  >
                    <Iconify icon={category.icon} width={24} sx={{ color: category.color }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {category.name}
                    </Typography>
                    <Typography variant="h4" sx={{ color: category.color }}>
                      {stats[category.id] || 0}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNewEntity(category.id);
                    }}
                    sx={{
                      bgcolor: `${category.color}15`,
                      '&:hover': { bgcolor: `${category.color}25` },
                    }}
                  >
                    <Iconify icon="mingcute:add-line" sx={{ color: category.color }} />
                  </IconButton>
                </Stack>
              </Card>
            ))}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Recent Entities */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recentes
          </Typography>

          {recentEntities.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Nenhuma entidade criada ainda. Clique em uma categoria acima para começar!
            </Alert>
          ) : (
            <Card>
              <TableContainer>
                <Table>
                  <TableBody>
                    {recentEntities.map((entity) => {
                      const categoryInfo = getCategoryInfo(entity.category);
                      const templateInfo = getTemplateInfo(entity.category, entity.template);
                      return (
                        <TableRow
                          key={entity.id}
                          hover
                          onClick={() => handleEdit(entity.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ width: 50 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: `${categoryInfo.color}15`,
                              }}
                            >
                              <Iconify
                                icon={templateInfo?.icon || categoryInfo.icon}
                                sx={{ color: categoryInfo.color }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2">{entity.name}</Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {entity.description || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                label={categoryInfo.name}
                                size="small"
                                sx={{
                                  bgcolor: `${categoryInfo.color}15`,
                                  color: categoryInfo.color,
                                  fontWeight: 600,
                                }}
                              />
                              {templateInfo && (
                                <Chip
                                  label={templateInfo.name}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {Object.keys(entity.data || {})
                                .slice(0, 3)
                                .map((key) => (
                                  <Chip
                                    key={key}
                                    label={key}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                ))}
                              {Object.keys(entity.data || {}).length > 3 && (
                                <Chip
                                  label={`+${Object.keys(entity.data).length - 3}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <IconButton size="small" onClick={(e) => handleMenuOpen(e, entity)}>
                              <Iconify icon="eva:more-vertical-fill" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      ) : (
        /* Filtered List View */
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={50} />
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Campos</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : entities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">
                        Nenhuma entidade encontrada
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  entities.map((entity) => {
                    const categoryInfo = getCategoryInfo(entity.category);
                    const templateInfo = getTemplateInfo(entity.category, entity.template);
                    return (
                      <TableRow
                        key={entity.id}
                        hover
                        onClick={() => handleEdit(entity.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: `${categoryInfo.color}15`,
                            }}
                          >
                            <Iconify
                              icon={templateInfo?.icon || categoryInfo.icon}
                              sx={{ color: categoryInfo.color }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{entity.name}</Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {entity.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Chip
                              label={categoryInfo.name}
                              size="small"
                              sx={{
                                bgcolor: `${categoryInfo.color}15`,
                                color: categoryInfo.color,
                                fontWeight: 600,
                              }}
                            />
                            {templateInfo && (
                              <Chip label={templateInfo.name} size="small" variant="outlined" />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {Object.keys(entity.data || {})
                              .slice(0, 3)
                              .map((key) => (
                                <Chip
                                  key={key}
                                  label={key}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            {Object.keys(entity.data || {}).length > 3 && (
                              <Chip
                                label={`+${Object.keys(entity.data).length - 3}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, entity)}>
                            <Iconify icon="eva:more-vertical-fill" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </Card>
      )}

      {/* Row Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleEdit(menuEntity?.id);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <Iconify icon="solar:pen-bold" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleDelete(menuEntity?.id)}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <Iconify icon="solar:trash-bin-trash-bold" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSelect={handleTemplateSelect}
        preselectedCategory={selectedCategoryForNew}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function TemplateSelectionDialog({ open, onClose, onSelect, preselectedCategory }) {
  const [expandedCategory, setExpandedCategory] = useState(preselectedCategory);

  useEffect(() => {
    if (preselectedCategory) {
      setExpandedCategory(preselectedCategory);
    }
  }, [preselectedCategory]);

  const handleCategoryExpand = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Escolha um Tipo de Entidade</Typography>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {entitySchemas.categories.map((category) => (
          <Box key={category.id}>
            {/* Category Header */}
            <Box
              onClick={() => handleCategoryExpand(category.id)}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                bgcolor: expandedCategory === category.id ? `${category.color}08` : 'transparent',
                borderLeft: `4px solid ${category.color}`,
                '&:hover': { bgcolor: `${category.color}08` },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: `${category.color}15`,
                  mr: 2,
                }}
              >
                <Iconify icon={category.icon} sx={{ color: category.color }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{category.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {category.description}
                </Typography>
              </Box>
              <Iconify
                icon={expandedCategory === category.id ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
                sx={{ color: 'text.secondary' }}
              />
            </Box>

            {/* Templates Grid */}
            {expandedCategory === category.id && (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  p: 2,
                  pt: 0,
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                }}
              >
                {category.templates.map((template) => (
                  <Card
                    key={template.id}
                    onClick={() => onSelect(category.id, template.id)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: `${category.color}08`,
                        borderColor: category.color,
                      },
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: `${category.color}15`,
                          flexShrink: 0,
                        }}
                      >
                        <Iconify icon={template.icon} sx={{ color: category.color, fontSize: 20 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {template.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {template.description}
                        </Typography>
                        {template.suggestedFields?.length > 0 && (
                          <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            {template.suggestedFields.slice(0, 3).map((field) => (
                              <Chip
                                key={field}
                                label={entitySchemas.fields[field]?.label || field}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            ))}
                            {template.suggestedFields.length > 3 && (
                              <Chip
                                label={`+${template.suggestedFields.length - 3}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                          </Stack>
                        )}
                      </Box>
                    </Stack>
                  </Card>
                ))}
              </Box>
            )}

            <Divider />
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
