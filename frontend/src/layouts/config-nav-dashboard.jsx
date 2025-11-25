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
   * Operações (Scheduling, Tasks)
   */
  {
    subheader: 'Operações',
    items: [
      { title: 'Agenda', path: paths.dashboard.calendar, icon: ICONS.calendar },
      { title: 'Tarefas', path: paths.dashboard.operations.tasks, icon: ICONS.kanban },
    ],
  },
  /**
   * CRM & Communication
   */
  {
    subheader: 'CRM',
    items: [
      { title: 'Pipeline', path: paths.dashboard.kanban, icon: ICONS.kanban },
      { title: 'Contatos', path: paths.dashboard.contacts, icon: ICONS.user },
      { title: 'Conversas', path: paths.dashboard.chat, icon: ICONS.chat },
    ],
  },
  /**
   * AI & Intelligence
   */
  {
    subheader: 'AI & Intelligence',
    items: [
      { title: 'Agentes', path: paths.dashboard.neoAgent.root, icon: ICONS.course },
      { title: 'Entidades', path: paths.dashboard.entity.root, icon: ICONS.folder },
      { title: 'Conhecimento', path: paths.dashboard.knowledge.root, icon: ICONS.blog },
      { title: 'Playground', path: paths.dashboard.ninaDebug, icon: ICONS.chat },
      { title: 'Analytics', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
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
