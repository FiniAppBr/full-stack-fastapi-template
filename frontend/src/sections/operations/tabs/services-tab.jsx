import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import axios, { endpoints } from 'src/utils/axios';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const DAYS_OF_WEEK = [
  { value: 0, label: 'Seg' },
  { value: 1, label: 'Ter' },
  { value: 2, label: 'Qua' },
  { value: 3, label: 'Qui' },
  { value: 4, label: 'Sex' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
];

// ----------------------------------------------------------------------

export function ServicesTab() {
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    duration_minutes: 60,
    buffer_minutes: 0,
    max_per_day: null,
    requires_confirmation: false,
    allowed_days: null,
    advance_booking_days: 30,
    min_notice_hours: 1,
  });
  const [selectedProviders, setSelectedProviders] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [servicesRes, professionalsRes] = await Promise.all([
        axios.get(endpoints.operations.services),
        axios.get(endpoints.operations.professionals),
      ]);

      setServices(servicesRes.data || []);
      setProfessionals(professionalsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRowClick = (service) => {
    setSelectedService(service);

    // Initialize form with booking config data or defaults
    if (service.booking_config) {
      setFormData({
        duration_minutes: service.booking_config.duration_minutes || 60,
        buffer_minutes: service.booking_config.buffer_minutes || 0,
        max_per_day: service.booking_config.max_per_day,
        requires_confirmation: service.booking_config.requires_confirmation || false,
        allowed_days: service.booking_config.allowed_days,
        advance_booking_days: service.booking_config.advance_booking_days || 30,
        min_notice_hours: service.booking_config.min_notice_hours || 1,
      });
    } else {
      setFormData({
        duration_minutes: 60,
        buffer_minutes: 0,
        max_per_day: null,
        requires_confirmation: false,
        allowed_days: null,
        advance_booking_days: 30,
        min_notice_hours: 1,
      });
    }

    // Set selected providers
    setSelectedProviders(service.providers || []);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedService(null);
  };

  const handleSaveConfig = async () => {
    if (!selectedService?.booking_config?.id) {
      // Create booking config if doesn't exist
      try {
        await axios.post(endpoints.operations.bookingConfigs, {
          entity_id: selectedService.entity.id,
          ...formData,
        });
      } catch (err) {
        console.error('Failed to create booking config:', err);
        alert('Erro ao criar configuração');
        return;
      }
    } else {
      try {
        await axios.patch(
          endpoints.operations.bookingConfigDetails(selectedService.booking_config.id),
          formData
        );
      } catch (err) {
        console.error('Failed to update booking config:', err);
        alert('Erro ao atualizar configuração');
        return;
      }
    }

    await fetchData();
  };

  const handleSaveProviders = async () => {
    if (!selectedService) return;

    try {
      setSaving(true);

      // Get current links for this service
      const currentLinks = await axios.get(endpoints.operations.entityLinks, {
        params: { source_entity_id: selectedService.entity.id, relationship_type: 'provides' },
      });

      const currentProviderIds = new Set(
        (currentLinks.data?.data || []).map((link) => link.target_entity_id)
      );
      const newProviderIds = new Set(selectedProviders.map((p) => p.id));

      // Delete removed links
      const linksToDelete = (currentLinks.data?.data || []).filter(
        (link) => !newProviderIds.has(link.target_entity_id)
      );
      await Promise.all(
        linksToDelete.map((link) => axios.delete(endpoints.operations.entityLinkDetails(link.id)))
      );

      // Add new links
      const providersToAdd = selectedProviders.filter(
        (provider) => !currentProviderIds.has(provider.id)
      );
      await Promise.all(
        providersToAdd.map((provider) =>
          axios.post(endpoints.operations.entityLinks, {
            source_entity_id: selectedService.entity.id,
            target_entity_id: provider.id,
            relationship_type: 'provides',
          })
        )
      );

      await fetchData();
    } catch (err) {
      console.error('Failed to update providers:', err);
      alert('Erro ao atualizar profissionais');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await handleSaveConfig();
    await handleSaveProviders();
    setSaving(false);
    handleCloseDialog();
  };

  const handleDaysChange = (event, newDays) => {
    setFormData((prev) => ({
      ...prev,
      allowed_days: newDays.length === 0 ? null : newDays,
    }));
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatPrice = (value) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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

  if (services.length === 0) {
    return (
      <Stack alignItems="center" spacing={2} py={6}>
        <Iconify icon="solar:calendar-mark-bold" width={64} sx={{ color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          Nenhum serviço encontrado
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={400}>
          Adicione a capacidade &quot;bookable&quot; a uma entidade em{' '}
          <strong>AI & Intelligence &gt; Entidades</strong> para que ela apareça aqui.
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Serviço</TableCell>
              <TableCell>Preço</TableCell>
              <TableCell>Duração</TableCell>
              <TableCell>Profissionais</TableCell>
              <TableCell>Confirmação</TableCell>
              <TableCell width={60} />
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow
                key={service.entity.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleRowClick(service)}
              >
                <TableCell>
                  <Typography variant="subtitle2">{service.entity.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {service.entity.category}
                  </Typography>
                </TableCell>
                <TableCell>{formatPrice(service.entity.data?.price)}</TableCell>
                <TableCell>
                  {service.booking_config
                    ? formatDuration(service.booking_config.duration_minutes)
                    : '-'}
                </TableCell>
                <TableCell>
                  {service.providers.length > 0 ? (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {service.providers.slice(0, 2).map((provider) => (
                        <Chip key={provider.id} label={provider.name} size="small" variant="soft" />
                      ))}
                      {service.providers.length > 2 && (
                        <Chip
                          label={`+${service.providers.length - 2}`}
                          size="small"
                          variant="soft"
                          color="default"
                        />
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      Nenhum
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {service.booking_config?.requires_confirmation ? (
                    <Chip label="Sim" size="small" color="warning" variant="soft" />
                  ) : (
                    <Chip label="Automática" size="small" color="success" variant="soft" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Iconify icon="solar:pen-bold" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedService && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Iconify icon="solar:settings-bold" />
                <span>{selectedService.entity.name}</span>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                {/* Left column - Booking Config */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Configuração de Agendamento
                  </Typography>

                  <Stack spacing={2.5}>
                    <TextField
                      label="Duração"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration_minutes: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      fullWidth
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
                      }}
                    />

                    <TextField
                      label="Intervalo entre sessões"
                      type="number"
                      value={formData.buffer_minutes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          buffer_minutes: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      fullWidth
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
                      }}
                      helperText="Tempo de descanso entre agendamentos"
                    />

                    <TextField
                      label="Máximo por dia"
                      type="number"
                      value={formData.max_per_day || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          max_per_day: e.target.value ? parseInt(e.target.value, 10) : null,
                        }))
                      }
                      fullWidth
                      size="small"
                      helperText="Deixe vazio para ilimitado"
                    />

                    <TextField
                      label="Antecedência máxima"
                      type="number"
                      value={formData.advance_booking_days}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          advance_booking_days: parseInt(e.target.value, 10) || 30,
                        }))
                      }
                      fullWidth
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                      }}
                    />

                    <TextField
                      label="Aviso mínimo"
                      type="number"
                      value={formData.min_notice_hours}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_notice_hours: parseInt(e.target.value, 10) || 1,
                        }))
                      }
                      fullWidth
                      size="small"
                      InputProps={{
                        endAdornment: <InputAdornment position="end">horas</InputAdornment>,
                      }}
                      helperText="Mínimo de antecedência para agendar"
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.requires_confirmation}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              requires_confirmation: e.target.checked,
                            }))
                          }
                        />
                      }
                      label="Requer confirmação manual"
                    />
                  </Stack>
                </Grid>

                {/* Right column - Days & Providers */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Dias Permitidos
                  </Typography>

                  <ToggleButtonGroup
                    value={formData.allowed_days || []}
                    onChange={handleDaysChange}
                    size="small"
                    sx={{ mb: 1, flexWrap: 'wrap' }}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <ToggleButton key={day.value} value={day.value}>
                        {day.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary" display="block" mb={3}>
                    Deixe todos desmarcados para permitir qualquer dia
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" gutterBottom>
                    Profissionais que Oferecem
                  </Typography>

                  <Autocomplete
                    multiple
                    options={professionals.map((p) => ({
                      id: p.entity.id,
                      name: p.entity.name,
                    }))}
                    getOptionLabel={(option) => option.name}
                    value={selectedProviders}
                    onChange={(e, newValue) => setSelectedProviders(newValue)}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Selecione profissionais..."
                        size="small"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={option.name}
                          size="small"
                          variant="soft"
                          color="primary"
                        />
                      ))
                    }
                  />
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Vincule profissionais que podem realizar este serviço
                  </Typography>
                </Grid>
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
