import React, { useMemo, useState } from 'react';
import { Box, Text } from '@airtable/blocks/ui';
import ProductList from './AdminPanel/components/ProductsList';
import ProductEditor from './AdminPanel/components/ProductEditor';
import VariantEditor from './AdminPanel/components/VariantEditor';
import RequestsCRM from './AdminPanel/components/RequestsCRM';
import JsonUploader from './AdminPanel/components/JsonUploader';
import { useCatalogData } from './AdminPanel/hooks/useCatalogData';
import { FIELDS, UI } from './AdminPanel/constants';
import { isLinkedTo } from './AdminPanel/utils';

type View = 'list' | 'edit_product' | 'edit_variant' | 'requests' | 'json_upload';

export default function AdminPanel(): JSX.Element {
  const { isReady, tables, records } = useCatalogData();

  const {
    variantsTable = null,
    optionsTable = null,
    requestsTable = null,
  } = tables || {};

  const {
    productsRecords = [],
    variantsRecords = [],
    optionsRecords = [],
    specsRecords = [],
    prodSpecsRecords = [],
    popularProductsRecords = [],
    requestsRecords = [],
  } = records || {};

  // ROUTING & SELECTION STATE
  const [view, setView] = useState<View>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Derived selections — computed here so we don't pass the whole DB into editors.
  const selectedProductRecord = useMemo(
    () => productsRecords?.find((r) => r.id === selectedProductId) || null,
    [productsRecords, selectedProductId]
  );

  const currentProductSpecs = useMemo(
    () => prodSpecsRecords?.filter((spec) => isLinkedTo(spec, FIELDS.productSpec.product, selectedProductId)) || [],
    [prodSpecsRecords, selectedProductId]
  );

  const popularRecord = useMemo(
    () => popularProductsRecords?.find((record) => isLinkedTo(record, FIELDS.popular.products, selectedProductId)) || null,
    [popularProductsRecords, selectedProductId]
  );

  if (!isReady) {
    return (
      <Box padding={4} height="100vh" display="flex" alignItems="center" justifyContent="center" backgroundColor={UI.appBg}>
        <Text textColor="light">Завантаження бази…</Text>
      </Box>
    );
  }

  return (
    <Box height="100vh" overflowY="auto" backgroundColor={UI.appBg}>
      <Box maxWidth="960px" margin="0 auto" padding={4}>
        {view === 'list' && (
          <ProductList
            productsRecords={productsRecords}
            variantsRecords={variantsRecords}
            popularProductsRecords={popularProductsRecords}
            onNavigateToRequests={() => setView('requests')}
            onNavigateToJsonUpload={() => setView('json_upload')}
            onCreateProduct={() => {
              setSelectedProductId(null);
              setView('edit_product');
            }}
            onEditProduct={(id) => {
              setSelectedProductId(id);
              setView('edit_product');
            }}
          />
        )}

        {view === 'edit_product' && (
          <ProductEditor
            productId={selectedProductId}
            productRecord={selectedProductRecord}
            variantsTable={variantsTable}
            allVariants={variantsRecords}
            allOptions={optionsRecords}
            allSpecs={specsRecords}
            productSpecs={currentProductSpecs}
            popularRecord={popularRecord}
            onGoBack={() => setView('list')}
            onCreateVariant={() => {
              setSelectedVariantId(null);
              setView('edit_variant');
            }}
            onEditVariant={(id) => {
              setSelectedVariantId(id);
              setView('edit_variant');
            }}
          />
        )}

        {view === 'edit_variant' && (
          <VariantEditor
            variantId={selectedVariantId}
            productId={selectedProductId}
            variantsTable={variantsTable}
            allVariants={variantsRecords}
            optionsTable={optionsTable}
            allOptions={optionsRecords}
            onGoBack={() => setView('edit_product')}
            onVariantCreated={(newId) => setSelectedVariantId(newId)}
          />
        )}

        {view === 'json_upload' && <JsonUploader onGoBack={() => setView('list')} />}

        {view === 'requests' && (
          <RequestsCRM
            requestsTable={requestsTable}
            requestsRecords={requestsRecords}
            onGoBack={() => setView('list')}
          />
        )}
      </Box>
    </Box>
  );
}
