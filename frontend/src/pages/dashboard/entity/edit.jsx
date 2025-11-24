import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { EntityNewEditForm } from 'src/sections/entity/entity-new-edit-form';

// ----------------------------------------------------------------------

export default function EntityEditPage() {
  const { id } = useParams();

  return (
    <>
      <Helmet>
        <title>{`Editar Entidade - ${CONFIG.appName}`}</title>
      </Helmet>

      <EntityNewEditForm entityId={id} />
    </>
  );
}
