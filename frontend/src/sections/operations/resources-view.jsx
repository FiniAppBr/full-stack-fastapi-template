import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { ServicesTab } from './tabs/services-tab';
import { InventoryTab } from './tabs/inventory-tab';
import { ProfessionalsTab } from './tabs/professionals-tab';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'services',
    label: 'Serviços',
    icon: <Iconify icon="solar:calendar-mark-bold" width={20} />,
    component: ServicesTab,
  },
  {
    value: 'professionals',
    label: 'Profissionais',
    icon: <Iconify icon="solar:users-group-rounded-bold" width={20} />,
    component: ProfessionalsTab,
  },
  {
    value: 'inventory',
    label: 'Estoque',
    icon: <Iconify icon="solar:box-bold" width={20} />,
    component: InventoryTab,
  },
];

// ----------------------------------------------------------------------

export function ResourcesView() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Derive tab directly from URL - single source of truth, no useEffect sync needed
  const currentTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    const validTab = TABS.find((t) => t.value === tabParam);
    return validTab ? tabParam : 'services';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (event, newValue) => {
      setSearchParams({ tab: newValue });
    },
    [setSearchParams]
  );

  const CurrentTabComponent = TABS.find((tab) => tab.value === currentTab)?.component || ServicesTab;

  return (
    <DashboardContent>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Recursos</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie serviços, profissionais e estoque
          </Typography>
        </Box>
      </Stack>

      <Card>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            px: 2.5,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          <CurrentTabComponent />
        </Box>
      </Card>
    </DashboardContent>
  );
}
