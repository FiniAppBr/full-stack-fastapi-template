import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { EntitiesTab } from './tabs/entities-tab';
import { RawDataTab } from './tabs/raw-data-tab';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'entities',
    label: 'Entidades',
    icon: <Iconify icon="solar:folder-bold" width={20} />,
    component: EntitiesTab,
  },
  {
    value: 'raw',
    label: 'Dados Brutos',
    icon: <Iconify icon="solar:document-text-bold" width={20} />,
    component: RawDataTab,
  },
];

// ----------------------------------------------------------------------

export function KnowledgeListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'entities';
  const [currentTab, setCurrentTab] = useState(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TABS.find((t) => t.value === tabParam)) {
      setCurrentTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSearchParams({ tab: newValue });
  };

  const CurrentTabComponent = TABS.find((tab) => tab.value === currentTab)?.component || EntitiesTab;

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Conhecimento</Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie a base de conhecimento dos seus agentes
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
