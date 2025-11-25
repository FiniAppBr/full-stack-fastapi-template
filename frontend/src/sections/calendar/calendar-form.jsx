import { z as zod } from 'zod';
import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { fIsAfter } from 'src/utils/format-time';

import axios, { endpoints } from 'src/utils/axios';

import { createEvent, updateEvent, deleteEvent, updateBookingStatus } from 'src/actions/calendar';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { Form, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const BookingSchema = zod.object({
  customer_name: zod
    .string()
    .min(1, { message: 'Nome do cliente é obrigatório!' })
    .max(100, { message: 'Nome deve ter menos de 100 caracteres' }),
  customer_phone: zod.string().optional(),
  customer_email: zod.string().email({ message: 'Email inválido' }).optional().or(zod.literal('')),
  contact_id: zod.number().optional().nullable(),
  service_id: zod.number().optional().nullable(),
  notes: zod.string().optional(),
  status: zod.string().optional(),
  start: zod.union([zod.string(), zod.number(), zod.date()]),
  end: zod.union([zod.string(), zod.number(), zod.date()]).optional(),
});

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente', color: 'warning' },
  { value: 'confirmed', label: 'Confirmado', color: 'info' },
  { value: 'completed', label: 'Concluído', color: 'success' },
  { value: 'cancelled', label: 'Cancelado', color: 'default' },
  { value: 'no_show', label: 'Não compareceu', color: 'error' },
];

// ----------------------------------------------------------------------

export function CalendarForm({ currentEvent, colorOptions, onClose }) {
  // Extract booking data from event if editing
  const isEditing = !!currentEvent?.id;
  const extendedProps = currentEvent?.extendedProps || {};

  // Contact and Service state
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  // Fetch contacts and bookable entities
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingContacts(true);
        setLoadingServices(true);

        const [contactsRes, entitiesRes] = await Promise.all([
          axios.get(endpoints.contacts.list, { params: { limit: 100 } }),
          axios.get(endpoints.entities.list, { params: { limit: 100 } }),
        ]);

        setContacts(contactsRes.data?.data || []);

        // Filter entities with 'bookable' capability
        const allEntities = entitiesRes.data?.data || [];
        const bookableEntities = allEntities.filter(
          (e) => e.capabilities?.includes('bookable')
        );
        setServices(bookableEntities);

        // Set initial selected values if editing
        if (extendedProps.contact_id) {
          const contact = (contactsRes.data?.data || []).find(
            (c) => c.id === extendedProps.contact_id
          );
          if (contact) setSelectedContact(contact);
        }
        if (extendedProps.service_id) {
          const service = bookableEntities.find(
            (s) => s.id === extendedProps.service_id
          );
          if (service) setSelectedService(service);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoadingContacts(false);
        setLoadingServices(false);
      }
    };
    fetchData();
  }, [extendedProps.contact_id, extendedProps.service_id]);

  const defaultValues = {
    customer_name: extendedProps.customer_name || currentEvent?.title?.split(' (')[0] || '',
    customer_phone: extendedProps.customer_phone || '',
    customer_email: extendedProps.customer_email || '',
    contact_id: extendedProps.contact_id || null,
    service_id: extendedProps.service_id || null,
    notes: extendedProps.notes || currentEvent?.description || '',
    status: extendedProps.status || 'pending',
    start: currentEvent?.start || new Date(),
    end: currentEvent?.end || null,
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(BookingSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  // When contact is selected, auto-fill customer fields
  const handleContactChange = (event, newValue) => {
    setSelectedContact(newValue);
    if (newValue) {
      setValue('contact_id', newValue.id);
      setValue('customer_name', newValue.name);
      setValue('customer_phone', newValue.phone || '');
      setValue('customer_email', newValue.email || '');
    } else {
      setValue('contact_id', null);
    }
  };

  // When service is selected
  const handleServiceChange = (event, newValue) => {
    setSelectedService(newValue);
    setValue('service_id', newValue?.id || null);
  };

  const dateError = values.end ? fIsAfter(values.start, values.end) : false;

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (!dateError) {
        if (isEditing) {
          // Update existing booking
          const eventData = {
            id: currentEvent.id,
            extendedProps: { booking_id: extendedProps.booking_id || currentEvent.id },
            title: data.customer_name,
            start: data.start,
            end: data.end,
            description: data.notes,
          };
          await updateEvent(eventData);

          // Update status if changed
          if (data.status !== extendedProps.status) {
            await updateBookingStatus(extendedProps.booking_id || currentEvent.id, data.status);
          }

          toast.success('Agendamento atualizado!');
        } else {
          // Create new booking
          const eventData = {
            title: data.customer_name,
            start: data.start,
            end: data.end,
            description: data.notes,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            contact_id: data.contact_id,
            service_id: data.service_id,
          };
          await createEvent(eventData);
          toast.success('Agendamento criado!');
        }
        onClose();
        reset();
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar agendamento');
    }
  });

  const onDelete = useCallback(async () => {
    try {
      const bookingId = extendedProps.booking_id || currentEvent?.id;
      await deleteEvent(bookingId);
      toast.success('Agendamento excluído!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir agendamento');
    }
  }, [currentEvent?.id, extendedProps.booking_id, onClose]);

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Scrollbar sx={{ p: 3, bgcolor: 'background.neutral' }}>
        <Stack spacing={3}>
          {/* Show source indicator if from AI agent */}
          {extendedProps.source === 'agent' && (
            <Alert severity="info" icon={<Iconify icon="solar:cpu-bolt-bold" />}>
              Este agendamento foi criado por um agente de IA
            </Alert>
          )}

          {/* Reference code if exists */}
          {extendedProps.reference_code && (
            <Box>
              <Chip
                label={`Código: ${extendedProps.reference_code}`}
                color="primary"
                variant="outlined"
                icon={<Iconify icon="solar:ticket-bold" width={18} />}
              />
            </Box>
          )}

          {/* Service/Entity picker */}
          <Autocomplete
            options={services}
            value={selectedService}
            onChange={handleServiceChange}
            loading={loadingServices}
            getOptionLabel={(option) => option.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Serviço"
                placeholder="Selecione um serviço (opcional)"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Iconify icon="solar:calendar-bold-duotone" sx={{ color: 'primary.main', mr: 1 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Stack>
                  <Typography variant="body2">{option.name}</Typography>
                  {option.data?.price && (
                    <Typography variant="caption" color="text.secondary">
                      R$ {option.data.price}
                      {option.data?.duration_minutes && ` • ${option.data.duration_minutes} min`}
                    </Typography>
                  )}
                </Stack>
              </li>
            )}
          />

          {/* Contact picker */}
          <Autocomplete
            options={contacts}
            value={selectedContact}
            onChange={handleContactChange}
            loading={loadingContacts}
            getOptionLabel={(option) => option.name || ''}
            isOptionEqualToValue={(option, value) => option.id === value?.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Contato"
                placeholder="Selecione ou digite para buscar"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Iconify icon="solar:user-bold-duotone" sx={{ color: 'info.main', mr: 1 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Stack>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.phone || option.email || 'Sem contato'}
                  </Typography>
                </Stack>
              </li>
            )}
          />

          <Field.Text
            name="customer_name"
            label="Nome do Cliente"
            placeholder="Nome completo"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Field.Text
              name="customer_phone"
              label="Telefone"
              placeholder="(11) 99999-9999"
            />
            <Field.Text
              name="customer_email"
              label="Email"
              placeholder="email@exemplo.com"
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Field.MobileDateTimePicker
              name="start"
              label="Início"
            />
            <Field.MobileDateTimePicker
              name="end"
              label="Fim"
              slotProps={{
                textField: {
                  error: dateError,
                  helperText: dateError ? 'Fim deve ser depois do início' : null,
                },
              }}
            />
          </Stack>

          {isEditing && (
            <Field.Select name="status" label="Status">
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                      size="small"
                      label={option.label}
                      color={option.color}
                      sx={{ minWidth: 100 }}
                    />
                  </Stack>
                </MenuItem>
              ))}
            </Field.Select>
          )}

          <Field.Text
            name="notes"
            label="Observações"
            multiline
            rows={3}
            placeholder="Notas adicionais sobre o agendamento..."
          />
        </Stack>
      </Scrollbar>

      <DialogActions sx={{ flexShrink: 0 }}>
        {isEditing && (
          <Tooltip title="Excluir agendamento">
            <IconButton onClick={onDelete} color="error">
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancelar
        </Button>

        <LoadingButton
          type="submit"
          variant="contained"
          loading={isSubmitting}
          disabled={dateError}
        >
          {isEditing ? 'Atualizar' : 'Criar Agendamento'}
        </LoadingButton>
      </DialogActions>
    </Form>
  );
}
