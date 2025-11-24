import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { EntityListView } from 'src/sections/entity/entity-list-view';

// ----------------------------------------------------------------------

export default function EntityListPage() {
  return (
    <>
      <Helmet>
        <title>{`Entidades - ${CONFIG.appName}`}</title>
      </Helmet>

      <EntityListView />
    </>
  );
}
