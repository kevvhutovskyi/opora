import React, { useMemo, useState } from 'react';
import { Box, Text } from '@airtable/blocks/ui';
import ProductList from './AdminPanel/components/ProductsList';
import ProductEditor from './AdminPanel/components/ProductEditor';
import VariantEditor from './AdminPanel/components/VariantEditor';
import RequestsCRM from './AdminPanel/components/RequestsCRM';
import JsonUploader from './AdminPanel/components/JsonUploader';
import BulkImageUploader from './AdminPanel/components/BulkImageUploader';
import FiltersConfig from './AdminPanel/components/FiltersConfig';
import BannersManager from './AdminPanel/components/BannersManager';
import CommentsManager from './AdminPanel/components/CommentsManager';
import { Sidebar, NAV_ITEMS } from './AdminPanel/components/Sidebar';
import { Breadcrumbs, Crumb } from './AdminPanel/components/Breadcrumbs';
import { useCatalogData } from './AdminPanel/hooks/useCatalogData';
import { FIELDS, UI } from './AdminPanel/constants';
import { getLinkedIds, isLinkedTo } from './AdminPanel/utils';

type View = 'list' | 'edit_product' | 'edit_variant' | 'requests' | 'json_upload' | 'bulk_images' | 'filters_config' | 'banners' | 'comments';

export default function AdminPanel(): JSX.Element {
  const { isReady, tables, records } = useCatalogData();

  const {
    variantsTable = null,
    optionsTable = null,
    specsTable = null,
    requestsTable = null,
    bannersTable = null,
    commentsTable = null,
    optionFiltersTable = null,
  } = tables || {};

  const {
    productsRecords = [],
    variantsRecords = [],
    optionsRecords = [],
    specsRecords = [],
    prodSpecsRecords = [],
    popularProductsRecords = [],
    requestsRecords = [],
    bannersRecords = [],
    commentsRecords = [],
    optionFiltersRecords = [],
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

  // Назва товару / варіації для хлібних крихт.
  const productName = selectedProductRecord?.getCellValueAsString(FIELDS.product.model) || 'Новий товар';

  const variantName = useMemo(() => {
    if (!selectedVariantId) return 'Нова варіація';
    const variant = variantsRecords?.find((v) => v.id === selectedVariantId);
    if (!variant) return 'Варіація';
    const optionsById = new Map((optionsRecords || []).map((o) => [o.id, o]));
    const optionsLabel = getLinkedIds(variant, FIELDS.variant.options)
      .map((id) => optionsById.get(id)?.getCellValueAsString(FIELDS.option.name))
      .filter(Boolean)
      .join(' / ');
    return (
      variant.getCellValueAsString(FIELDS.variant.name) ||
      optionsLabel ||
      variant.getCellValueAsString(FIELDS.variant.sku) ||
      'Варіація'
    );
  }, [selectedVariantId, variantsRecords, optionsRecords]);

  // Хлібні крихти для поточного view.
  const breadcrumbs = useMemo<Crumb[]>(() => {
    const toList: Crumb = { label: 'Каталог товарів', onClick: () => setView('list') };
    if (view === 'edit_product') return [toList, { label: productName }];
    if (view === 'edit_variant')
      return [toList, { label: productName, onClick: () => setView('edit_product') }, { label: variantName }];
    if (view === 'list') return [{ label: 'Каталог товарів' }];
    const navLabel = NAV_ITEMS.find((item) => item.key === view)?.label || '';
    return [toList, { label: navLabel }];
  }, [view, productName, variantName]);

  // Активний пункт навбару: редактори товару/варіації лишаються в розділі «Каталог».
  const activeNav = view === 'edit_product' || view === 'edit_variant' ? 'list' : view;

  if (!isReady) {
    return (
      <Box padding={4} height="100vh" display="flex" alignItems="center" justifyContent="center" backgroundColor={UI.appBg}>
        <Text textColor="light">Завантаження бази…</Text>
      </Box>
    );
  }

  return (
    <Box height="100vh" display="flex" backgroundColor={UI.appBg}>
      <Sidebar active={activeNav} onNavigate={(key) => setView(key as View)} />
      <Box flex="1" overflowY="auto">
        <Box maxWidth="960px" margin="0 auto" padding={4}>
          <Breadcrumbs items={breadcrumbs} />
          {view === 'list' && (
          <ProductList
            productsRecords={productsRecords}
            variantsRecords={variantsRecords}
            popularProductsRecords={popularProductsRecords}
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

        {view === 'bulk_images' && (
          <BulkImageUploader
            productsRecords={productsRecords}
            variantsRecords={variantsRecords}
            optionsRecords={optionsRecords}
            onGoBack={() => setView('list')}
          />
        )}

        {view === 'banners' && (
          <BannersManager
            bannersTable={bannersTable}
            bannersRecords={bannersRecords}
            onGoBack={() => setView('list')}
          />
        )}

        {view === 'filters_config' && specsTable && (
          <FiltersConfig
            specsRecords={specsRecords}
            specsTable={specsTable}
            optionsRecords={optionsRecords}
            optionFiltersTable={optionFiltersTable}
            optionFiltersRecords={optionFiltersRecords}
            onBack={() => setView('list')}
          />
        )}

        {view === 'requests' && (
          <RequestsCRM
            requestsTable={requestsTable}
            requestsRecords={requestsRecords}
            productsRecords={productsRecords}
            variantsRecords={variantsRecords}
            onGoBack={() => setView('list')}
          />
        )}

        {view === 'comments' && (
          <CommentsManager
            commentsTable={commentsTable}
            commentsRecords={commentsRecords}
            productsRecords={productsRecords}
            onGoBack={() => setView('list')}
          />
        )}
        </Box>
      </Box>
    </Box>
  );
}
