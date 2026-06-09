import React from 'react';
import { Box, Button, Heading } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { useProductMutations } from '../hooks/useProductMutations';
import { UI } from '../constants';
import { Card, Badge } from './ui';
import { BasicInfoForm } from './product-editor/BasicInfoForm';
import { MarketingSection } from './product-editor/MarketingSection';
import { VideoSection } from './product-editor/VideoSection';
import { SpecsSection } from './product-editor/SpecsSection';
import { VariantsSection } from './product-editor/VariantsSection';

interface ProductEditorProps {
  productId: string | null;
  productRecord: Record | null;
  variantsTable: Table | null;
  allVariants: Record[] | null;
  allOptions: Record[] | null;
  allSpecs: Record[] | null;
  productSpecs: Record[] | null;
  popularRecord: Record | null;
  onGoBack: () => void;
  onEditVariant: (variantId: string) => void;
  onCreateVariant: () => void;
}

export default function ProductEditor({
  productId,
  productRecord,
  variantsTable,
  allVariants,
  allOptions,
  allSpecs,
  productSpecs,
  popularRecord,
  onGoBack,
  onEditVariant,
  onCreateVariant,
}: ProductEditorProps): JSX.Element {
  const { deleteProduct } = useProductMutations();

  const handleDeleteProduct = () => {
    if (!productId) return;
    if (window.confirm('Видалити товар?')) deleteProduct(productId).then(onGoBack);
  };

  return (
    <Card>
      <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom={4}>
        <Box display="flex" alignItems="center" style={{ gap: 12 }}>
          <Button icon="chevronLeft" onClick={onGoBack} aria-label="Назад" />
          <Heading margin={0}>{productId ? 'Редагування товару' : 'Створення товару'}</Heading>
        </Box>
        {!!popularRecord && <Badge tone="warn">★ Популярне</Badge>}
      </Box>

      <BasicInfoForm productId={productId} productRecord={productRecord} />

      {productId && (
        <>
          <MarketingSection productId={productId} popularRecord={popularRecord} />
          <VideoSection productId={productId} productRecord={productRecord} />
          <SpecsSection productId={productId} productSpecs={productSpecs} allSpecs={allSpecs} />
          <VariantsSection
            variantsTable={variantsTable}
            productId={productId}
            allVariants={allVariants}
            allOptions={allOptions}
            onEditVariant={onEditVariant}
            onCreateVariant={onCreateVariant}
          />

          <Box style={{ borderTop: `1px solid ${UI.dangerBg}`, paddingTop: 24, marginTop: 24 }}>
            <Button variant="danger" icon="trash" onClick={handleDeleteProduct}>Видалити товар</Button>
          </Box>
        </>
      )}
    </Card>
  );
}
