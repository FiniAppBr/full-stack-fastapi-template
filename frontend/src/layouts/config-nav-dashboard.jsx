import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/config-global';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => <SvgColor src={`${CONFIG.site.basePath}/assets/icons/navbar/${name}.svg`} />;

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  parameter: icon('ic-parameter'),
};

// ----------------------------------------------------------------------

export const navData = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'Dashboard', path: paths.dashboard.root, icon: ICONS.dashboard },
    ],
  },
  /**
   * Communication
   */
  {
    subheader: 'Communication',
    items: [
      { title: 'Conversations', path: paths.dashboard.chat, icon: ICONS.chat },
      { title: 'Contacts', path: paths.dashboard.contacts, icon: ICONS.user },
      { title: 'Calendar', path: paths.dashboard.calendar, icon: ICONS.calendar },
    ],
  },
  /**
   * AI Agent
   */
  {
    subheader: 'AI Agent',
    items: [
      {
        title: 'Agent Config',
        path: paths.dashboard.agent.root,
        icon: ICONS.course, // Using 'course' icon temporarily for agent/robot
        children: [
          { title: 'Flowchart', path: paths.dashboard.agent.flowchart },
          { title: 'Analytics', path: paths.dashboard.agent.analytics },
        ],
      },
    ],
  },
  /**
   * Account
   */
  {
    subheader: 'Account',
    items: [
      { title: 'Settings', path: paths.dashboard.user.account, icon: ICONS.lock },
    ],
  },
];
