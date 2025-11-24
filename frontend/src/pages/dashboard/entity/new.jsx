import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { EntityNewEditForm } from 'src/sections/entity/entity-new-edit-form';

// ----------------------------------------------------------------------

export default function EntityCreatePage() {
  return (
    <>
      <Helmet>
        <title>{`Nova Entidade - ${CONFIG.appName}`}</title>
      </Helmet>

      <EntityNewEditForm />
    </>
  );
}
