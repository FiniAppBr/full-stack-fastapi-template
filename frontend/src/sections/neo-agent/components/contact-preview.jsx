import { m, AnimatePresence } from 'framer-motion';
import { memo, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { useContactFields } from '../../contacts/hooks/use-contact-fields';

import { PreviewCard } from './preview-card';

// ----------------------------------------------------------------------

// Default icons for common field types
const FIELD_ICONS = {
  name: 'solar:user-bold',
  email: 'solar:letter-bold',
  phone: 'solar:phone-bold',
  budget: 'solar:wallet-money-bold',
  interest: 'solar:star-bold',
};

// ----------------------------------------------------------------------

const AnimatedField = memo(({ fieldKey, value, label: customLabel, isNew }) => {
  const icon = FIELD_ICONS[fieldKey.toLowerCase()] || 'solar:document-text-bold';
  const label = customLabel || fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1).replace(/_/g, ' ');

  return (
    <m.div
      initial={isNew ? { opacity: 0, x: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: isNew ? alpha('#4caf50', 0.08) : 'grey.50',
          border: '1px solid',
          borderColor: isNew ? alpha('#4caf50', 0.3) : 'grey.200',
          transition: 'all 0.5s ease',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {/* Icon */}
          <Box
            component={m.div}
            animate={isNew ? {
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0],
            } : {}}
            transition={{ duration: 0.5 }}
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: isNew ? alpha('#4caf50', 0.15) : 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.5s ease',
            }}
          >
            <Iconify
              icon={icon}
              width={18}
              sx={{
                color: isNew ? 'success.main' : 'text.secondary',
                transition: 'color 0.5s ease',
              }}
            />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </Typography>
            <Typography
              component={m.div}
              animate={isNew ? { opacity: [0.5, 1] } : {}}
              transition={{ duration: 0.3 }}
              variant="body2"
              sx={{
                fontWeight: 500,
                color: isNew ? 'success.dark' : 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'color 0.5s ease',
              }}
            >
              {value}
            </Typography>
          </Box>

          {/* New indicator */}
          <AnimatePresence>
            {isNew && (
              <m.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: 'success.main',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Novo
                </Box>
              </m.div>
            )}
          </AnimatePresence>
        </Stack>
      </Box>
    </m.div>
  );
});

// ----------------------------------------------------------------------

const EmptyState = memo(() => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.disabled',
      p: 3,
    }}
  >
    <Iconify icon="solar:user-circle-linear" width={48} sx={{ mb: 1.5, opacity: 0.5 }} />
    <Typography variant="body2" color="text.secondary" textAlign="center">
      Dados coletados aparecerão aqui
    </Typography>
    <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ mt: 0.5 }}>
      Converse com o agente para ver a coleta em tempo real
    </Typography>
  </Box>
));

// ----------------------------------------------------------------------

// Default labels for system fields
const DEFAULT_LABELS = {
  name: 'Nome',
};

export const ContactPreview = memo(({ collectedData = {}, fieldConfigs = [], onReset }) => {
  const [newFields, setNewFields] = useState(new Set());
  const [prevData, setPrevData] = useState({});

  // Fetch contact field definitions to get labels
  const { fields: contactFields } = useContactFields();

  // Build label map from contact fields + defaults
  const labelMap = useMemo(() => {
    const map = { ...DEFAULT_LABELS };

    // Map field ID to label from contact fields
    contactFields.forEach((field) => {
      map[String(field.id)] = field.label;
      if (field.key) {
        map[field.key] = field.label;
      }
    });

    return map;
  }, [contactFields]);

  // Detect newly added fields
  useEffect(() => {
    const currentKeys = Object.keys(collectedData);
    const prevKeys = Object.keys(prevData);

    const addedKeys = currentKeys.filter((key) => !prevKeys.includes(key));

    if (addedKeys.length > 0) {
      setNewFields((prev) => new Set([...prev, ...addedKeys]));

      // Clear "new" status after animation
      setTimeout(() => {
        setNewFields((prev) => {
          const next = new Set(prev);
          addedKeys.forEach((key) => next.delete(key));
          return next;
        });
      }, 2000);
    }

    setPrevData(collectedData);
  }, [collectedData, prevData]);

  const fields = useMemo(() => Object.entries(collectedData), [collectedData]);
  const hasData = fields.length > 0;

  const handleReset = () => {
    setNewFields(new Set());
    setPrevData({});
    onReset?.();
  };

  return (
    <PreviewCard
      title="Contato"
      icon="solar:user-id-bold"
      showReset={hasData}
      onReset={handleReset}
    >
      {!hasData ? (
        <EmptyState />
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <Stack spacing={1.5}>
            <AnimatePresence mode="popLayout">
              {fields.map(([key, value]) => (
                <AnimatedField
                  key={key}
                  fieldKey={key}
                  value={String(value)}
                  label={labelMap[key]}
                  isNew={newFields.has(key)}
                />
              ))}
            </AnimatePresence>
          </Stack>
        </Box>
      )}

      {/* Footer with count */}
      {hasData && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'grey.100',
            bgcolor: 'grey.50',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {fields.length} {fields.length === 1 ? 'campo coletado' : 'campos coletados'}
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'success.main',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.5, transform: 'scale(1.2)' },
                },
              }}
            />
          </Stack>
        </Box>
      )}
    </PreviewCard>
  );
});
