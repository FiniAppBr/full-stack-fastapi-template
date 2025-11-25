import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function InventoryTab() {
  const theme = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    quantity: 0,
    low_stock_threshold: 5,
    sku: '',
  });

  // Quick adjust state
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [adjustmentAmount, setAdjustmentAmount] = useState(1);
  const [adjustmentNote, setAdjustmentNote] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = lowStockOnly ? { low_stock_only: true } : {};
      const response = await axios.get(endpoints.operations.products, { params });
      setProducts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  }, [lowStockOnly]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRowClick = (product) => {
    setSelectedProduct(product);

    if (product.inventory) {
      setFormData({
        quantity: product.inventory.quantity || 0,
        low_stock_threshold: product.inventory.low_stock_threshold || 5,
        sku: product.inventory.sku || '',
      });
    } else {
      setFormData({
        quantity: 0,
        low_stock_threshold: 5,
        sku: '',
      });
    }

    setAdjustmentType('add');
    setAdjustmentAmount(1);
    setAdjustmentNote('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleSave = async () => {
    if (!selectedProduct?.inventory?.id) {
      // Create inventory if doesn't exist
      try {
        await axios.post(endpoints.operations.inventory, {
          entity_id: selectedProduct.entity.id,
          ...formData,
        });
      } catch (err) {
        console.error('Failed to create inventory:', err);
        alert('Erro ao criar estoque');
        return;
      }
    } else {
      try {
        await axios.patch(
          endpoints.operations.inventoryDetails(selectedProduct.inventory.id),
          formData
        );
      } catch (err) {
        console.error('Failed to update inventory:', err);
        alert('Erro ao atualizar estoque');
        return;
      }
    }

    await fetchProducts();
    handleCloseDialog();
  };

  const handleQuickAdjust = async () => {
    if (!selectedProduct?.inventory?.id) {
      alert('Primeiro salve as configurações do estoque');
      return;
    }

    try {
      setSaving(true);

      const newQuantity =
        adjustmentType === 'add'
          ? formData.quantity + adjustmentAmount
          : formData.quantity - adjustmentAmount;

      await axios.patch(endpoints.operations.inventoryDetails(selectedProduct.inventory.id), {
        quantity: Math.max(0, newQuantity),
      });

      setFormData((prev) => ({
        ...prev,
        quantity: Math.max(0, newQuantity),
      }));

      setAdjustmentAmount(1);
      setAdjustmentNote('');
      await fetchProducts();
    } catch (err) {
      console.error('Failed to adjust inventory:', err);
      alert('Erro ao ajustar estoque');
    } finally {
      setSaving(false);
    }
  };

  const getStockStatus = (inventory) => {
    if (!inventory) return { label: 'Sem registro', color: 'default', severity: 0 };

    const available = inventory.quantity - (inventory.reserved_quantity || 0);

    if (available <= 0) {
      return { label: 'Esgotado', color: 'error', severity: 100 };
    }
    if (inventory.quantity <= inventory.low_stock_threshold) {
      return { label: 'Baixo', color: 'warning', severity: 75 };
    }
    return { label: 'Normal', color: 'success', severity: 0 };
  };

  const getStockLevel = (inventory) => {
    if (!inventory || !inventory.low_stock_threshold) return 100;
    const ratio = inventory.quantity / (inventory.low_stock_threshold * 3);
    return Math.min(100, Math.max(0, ratio * 100));
  };

  const formatPrice = (value) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate summary stats
  const stats = {
    total: products.length,
    lowStock: products.filter(
      (p) => p.inventory && p.inventory.quantity <= p.inventory.low_stock_threshold
    ).length,
    outOfStock: products.filter(
      (p) => p.inventory && p.inventory.quantity - (p.inventory.reserved_quantity || 0) <= 0
    ).length,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <>
      {/* Stats bar */}
      <Stack direction="row" spacing={3} mb={3}>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            flex: 1,
          }}
        >
          <Typography variant="h4">{stats.total}</Typography>
          <Typography variant="body2" color="text.secondary">
            Produtos
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            flex: 1,
          }}
        >
          <Typography variant="h4" color="warning.main">
            {stats.lowStock}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estoque Baixo
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            flex: 1,
          }}
        >
          <Typography variant="h4" color="error.main">
            {stats.outOfStock}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Esgotados
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />}
            label="Apenas estoque baixo"
          />
        </Box>
      </Stack>

      {products.length === 0 ? (
        <Stack alignItems="center" spacing={2} py={6}>
          <Iconify icon="solar:box-bold" width={64} sx={{ color: 'text.disabled' }} />
          <Typography variant="h6" color="text.secondary">
            {lowStockOnly ? 'Nenhum produto com estoque baixo' : 'Nenhum produto encontrado'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
            {lowStockOnly ? (
              'Todos os produtos estão com estoque adequado!'
            ) : (
              <>
                Adicione a capacidade &quot;stockable&quot; a uma entidade em{' '}
                <strong>AI & Intelligence &gt; Entidades</strong> para controlar o estoque.
              </>
            )}
          </Typography>
        </Stack>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="center">Quantidade</TableCell>
                <TableCell align="center">Reservado</TableCell>
                <TableCell align="center">Disponível</TableCell>
                <TableCell>Nível</TableCell>
                <TableCell>Status</TableCell>
                <TableCell width={60} />
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const status = getStockStatus(product.inventory);
                const available = product.inventory
                  ? product.inventory.quantity - (product.inventory.reserved_quantity || 0)
                  : 0;
                const level = getStockLevel(product.inventory);

                return (
                  <TableRow
                    key={product.entity.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(product)}
                  >
                    <TableCell>
                      <Typography variant="subtitle2">{product.entity.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPrice(product.entity.data?.price)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {product.inventory?.sku || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2">
                        {product.inventory?.quantity ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {product.inventory?.reserved_quantity ?? 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="subtitle2"
                        color={available <= 0 ? 'error.main' : 'text.primary'}
                      >
                        {available}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      <Tooltip title={`${Math.round(level)}% do nível ideal`}>
                        <LinearProgress
                          variant="determinate"
                          value={level}
                          color={status.color}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip label={status.label} size="small" color={status.color} variant="soft" />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        {selectedProduct && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:box-bold" />
                <span>{selectedProduct.entity.name}</span>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Quick adjustment */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Ajuste Rápido
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={adjustmentType}
                        label="Tipo"
                        onChange={(e) => setAdjustmentType(e.target.value)}
                      >
                        <MenuItem value="add">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon="mingcute:add-line" color="success.main" />
                            <span>Entrada</span>
                          </Stack>
                        </MenuItem>
                        <MenuItem value="remove">
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Iconify icon="mingcute:minus-line" color="error.main" />
                            <span>Saída</span>
                          </Stack>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      type="number"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      size="small"
                      sx={{ width: 80 }}
                      inputProps={{ min: 1 }}
                    />

                    <Button
                      variant="contained"
                      color={adjustmentType === 'add' ? 'success' : 'error'}
                      onClick={handleQuickAdjust}
                      disabled={saving || !selectedProduct?.inventory?.id}
                      startIcon={
                        <Iconify
                          icon={adjustmentType === 'add' ? 'mingcute:add-line' : 'mingcute:minus-line'}
                        />
                      }
                    >
                      {adjustmentType === 'add' ? 'Adicionar' : 'Remover'}
                    </Button>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Atual: <strong>{formData.quantity}</strong> unidades
                    {adjustmentType === 'add'
                      ? ` (+${adjustmentAmount} = ${formData.quantity + adjustmentAmount})`
                      : ` (-${adjustmentAmount} = ${Math.max(0, formData.quantity - adjustmentAmount)})`}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                {/* Settings */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Configurações
                  </Typography>

                  <Stack spacing={2}>
                    <TextField
                      label="SKU / Código"
                      value={formData.sku}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                      fullWidth
                      size="small"
                      helperText="Código único do produto para identificação"
                    />

                    <TextField
                      label="Quantidade em estoque"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      fullWidth
                      size="small"
                      inputProps={{ min: 0 }}
                    />

                    <TextField
                      label="Alerta de estoque baixo"
                      type="number"
                      value={formData.low_stock_threshold}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          low_stock_threshold: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      fullWidth
                      size="small"
                      inputProps={{ min: 0 }}
                      helperText="Quantidade mínima antes de alertar"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="solar:bell-bing-bold" width={20} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Stack>
                </Grid>

                {/* Info */}
                {selectedProduct.inventory && (
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                      }}
                    >
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Reservado:
                          </Typography>
                          <Typography variant="body2">
                            {selectedProduct.inventory.reserved_quantity || 0}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Disponível:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {formData.quantity - (selectedProduct.inventory.reserved_quantity || 0)}
                          </Typography>
                        </Stack>
                        {selectedProduct.inventory.last_restocked_at && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Último reabastecimento:
                            </Typography>
                            <Typography variant="body2">
                              {new Date(selectedProduct.inventory.last_restocked_at).toLocaleString(
                                'pt-BR'
                              )}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancelar</Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
