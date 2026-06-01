import React, { useMemo, useState } from 'react';
import { Box, colors } from '@airtable/blocks/ui';
import ProductList from './AdminPanel/components/ProductsList';
import ProductEditor from './AdminPanel/components/ProductEditor';
import VariantEditor from './AdminPanel/components/VariantEditor';
import RequestsCRM from './AdminPanel/components/RequestsCRM';
import { useCatalogData } from './AdminPanel/hooks/useCatalogData';

export default function AdminPanel(): JSX.Element {
  const { isReady, tables, records } = useCatalogData();

  const { 
    variantsTable = null, 
    optionsTable = null, 
    requestsTable = null 
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
  const [view, setView] = useState<'list' | 'edit_product' | 'edit_variant' | 'requests'>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // We calculate these here so we don't pass the entire database down to the editor
  const selectedProductRecord = useMemo(() => 
    productsRecords?.find(r => r.id === selectedProductId) || null,
  [productsRecords, selectedProductId]);

  const currentProductSpecs = useMemo(() => 
    prodSpecsRecords?.filter(spec => {
      const linkedProducts = spec.getCellValue('Товар') as Array<{id: string}> | null;
      return linkedProducts?.some(link => link.id === selectedProductId);
    }) || [],
  [prodSpecsRecords, selectedProductId]);

  const popularRecord = useMemo(() => 
    popularProductsRecords?.find(record => {
      const linkedProducts = record.getCellValue('Товари') as Array<{id: string}> | null;
      return linkedProducts?.some(link => link.id === selectedProductId);
    }) || null,
  [popularProductsRecords, selectedProductId]);

  if (!isReady) return <Box padding={3}>Завантаження бази...</Box>;

  return (
    <Box padding={4} height="100vh" overflowY="auto" backgroundColor={colors.GRAY_LIGHT_2}>
      
      {/* СПИСОК ТОВАРІВ */}
      {view === 'list' && (
        <ProductList 
          productsRecords={productsRecords}
          onNavigateToRequests={() => setView('requests')}
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

      {/* РЕДАГУВАННЯ ТОВАРУ */}
      {view === 'edit_product' && (
        <ProductEditor
          productId={selectedProductId}
          productRecord={selectedProductRecord}
          variantsTable={variantsTable}
          allVariants={variantsRecords}
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

      {/* РЕДАГУВАННЯ ВАРІАЦІЇ */}
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

      {/* СПИСОК ЗАПИТІВ (КЛІЄНТИ) */}
      {view === 'requests' && (
        <RequestsCRM 
          requestsTable={requestsTable}
          requestsRecords={requestsRecords}
          onGoBack={() => setView('list')}
        />
      )}

    </Box>
  );
}