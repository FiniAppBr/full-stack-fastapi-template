import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { TasksView } from 'src/sections/operations/tasks-view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{`Tarefas - ${CONFIG.site.name}`}</title>
      </Helmet>

      <TasksView />
    </>
  );
}
