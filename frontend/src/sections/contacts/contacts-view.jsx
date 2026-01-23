import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { ContactCard } from './components/contact-card';
import { useContactFields } from './hooks/use-contact-fields';
import { ContactFormDialog } from './components/contact-form-dialog';
import { ContactDetailsDialog } from './components/contact-details-dialog';
import { useContacts, useContactStats, useContactActions } from './hooks/use-contacts';

// ----------------------------------------------------------------------

const SOURCE_CONFIG = {
  all: { label: 'Todas as Fontes', icon: 'solar:users-group-rounded-bold' },
  agent: { label: 'Agente IA', icon: 'solar:cpu-bolt-bold', color: '#00B8D9' },
  whatsapp: { label: 'WhatsApp', icon: 'ic:baseline-whatsapp', color: '#25D366' },
  website: { label: 'Website', icon: 'solar:globe-bold', color: '#5C6BC0' },
  manual: { label: 'Manual', icon: 'solar:pen-bold', color: '#637381' },
};

// ----------------------------------------------------------------------

export function ContactsView() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Data hooks
  const {
    contacts,
    totalCount,
    isLoading: contactsLoading,
    mutate: mutateContacts,
  } = useContacts({
    search: searchQuery,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
  });

  const { stats, mutate: mutateStats } = useContactStats();
  const { fields } = useContactFields();
  const { createContact, updateContact, deleteContact } = useContactActions();

  // Handlers
  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleSourceChange = useCallback((event) => {
    setSourceFilter(event.target.value);
  }, []);

  const handleViewDetails = useCallback((contact) => {
    setSelectedContact(contact);
    setDetailsDialogOpen(true);
  }, []);

  const handleEdit = useCallback((contact) => {
    setSelectedContact(contact);
    setDetailsDialogOpen(false);
    setFormDialogOpen(true);
  }, []);

  const handleCreateNew = useCallback(() => {
    setSelectedContact(null);
    setFormDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (contact) => {
      if (!window.confirm(`Tem certeza que deseja excluir ${contact.name}?`)) return;
      try {
        await deleteContact(contact.id);
        mutateContacts();
        mutateStats();
      } catch (error) {
        console.error('Failed to delete contact:', error);
      }
    },
    [deleteContact, mutateContacts, mutateStats]
  );

  const handleSave = useCallback(
    async (formData) => {
      if (selectedContact?.id) {
        await updateContact(selectedContact.id, formData);
      } else {
        await createContact(formData);
      }
      mutateContacts();
      mutateStats();
    },
    [selectedContact, createContact, updateContact, mutateContacts, mutateStats]
  );

  const handleCloseDialogs = useCallback(() => {
    setFormDialogOpen(false);
    setDetailsDialogOpen(false);
    setSelectedContact(null);
  }, []);

  // Stats display
  const statCards = [
    {
      label: 'Total',
      value: stats.total || 0,
      icon: 'solar:users-group-rounded-bold',
      color: '#5C6BC0',
    },
    {
      label: 'Via Agentes',
      value: stats.by_source?.agent || 0,
      icon: 'solar:cpu-bolt-bold',
      color: '#00B8D9',
    },
    {
      label: 'WhatsApp',
      value: stats.by_source?.whatsapp || 0,
      icon: 'ic:baseline-whatsapp',
      color: '#25D366',
    },
    {
      label: 'Esta Semana',
      value: stats.this_week || contacts.filter((c) => {
        const created = new Date(c.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created > weekAgo;
      }).length,
      icon: 'solar:calendar-bold',
      color: '#FF9800',
    },
  ];

  return (
    <DashboardContent maxWidth="xl">
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Contatos</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalCount} contatos cadastrados
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="soft"
            color="inherit"
            startIcon={<Iconify icon="solar:settings-bold" />}
            href="/dashboard/contacts/fields"
          >
            Campos
          </Button>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:user-plus-bold" />}
            onClick={handleCreateNew}
          >
            Novo Contato
          </Button>
        </Stack>
      </Stack>

      {/* Stats Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            sx={{
              p: 2,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(stat.color, 0.12),
                color: stat.color,
              }}
            >
              <Iconify icon={stat.icon} width={24} />
            </Box>
            <Box>
              <Typography variant="h4">{stat.value}</Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          </Card>
        ))}
      </Stack>

      {/* Filters */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por nome, telefone ou email..."
          value={searchQuery}
          onChange={handleSearchChange}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:magnifer-bold" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Fonte</InputLabel>
          <Select value={sourceFilter} label="Fonte" onChange={handleSourceChange}>
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Iconify
                    icon={config.icon}
                    width={18}
                    sx={{ color: config.color || 'text.secondary' }}
                  />
                  <span>{config.label}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Typography variant="body2" color="text.secondary">
          {contacts.length} de {totalCount} contatos
        </Typography>
      </Stack>

      {/* Contact Grid */}
      {contactsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : contacts.length === 0 ? (
        <Card
          sx={{
            py: 8,
            textAlign: 'center',
            bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
          }}
        >
          <Iconify
            icon="solar:users-group-rounded-bold-duotone"
            width={64}
            sx={{ color: 'text.disabled', mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum contato encontrado
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {searchQuery
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro contato'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:user-plus-bold" />}
              onClick={handleCreateNew}
            >
              Adicionar Contato
            </Button>
          )}
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              fields={fields}
              onViewDetails={handleViewDetails}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      {/* Dialogs */}
      <ContactDetailsDialog
        open={detailsDialogOpen}
        contact={selectedContact}
        fields={fields}
        onClose={handleCloseDialogs}
        onEdit={handleEdit}
      />

      <ContactFormDialog
        open={formDialogOpen}
        contact={selectedContact}
        fields={fields}
        onClose={handleCloseDialogs}
        onSave={handleSave}
      />
    </DashboardContent>
  );
}
