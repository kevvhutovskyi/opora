import React from 'react';
import { Box, Button, Heading } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { UI } from '../constants';
import { Card } from './ui';
import { VariantForm } from './variant-editor/VariantForm';
import { GallerySection } from './variant-editor/GallerySection';
import { OptionsSection } from './variant-editor/OptionsSection';

interface VariantEditorProps {
  variantId: string | null;
  productId: string | null;
  variantsTable: Table | null;
  allVariants: Record[] | null;
  optionsTable: Table | null;
  allOptions: Record[] | null;
  onGoBack: () => void;
  onVariantCreated?: (newVariantId: string) => void;
}

export default function VariantEditor({
  variantId,
  productId,
  variantsTable,
  allVariants,
  optionsTable,
  allOptions,
  onGoBack,
  onVariantCreated,
}: VariantEditorProps): JSX.Element {
  const activeVariant = allVariants?.find((v) => v.id === variantId);

  const handleDelete = async () => {
    if (!variantsTable || !variantId) return;
    if (window.confirm('Видалити цю варіацію (SKU)?')) {
      await variantsTable.deleteRecordAsync(variantId);
      onGoBack();
    }
  };

  return (
    <Card>
      <Box display="flex" alignItems="center" marginBottom={4} style={{ gap: 12 }}>
        <Button icon="chevronLeft" onClick={onGoBack} aria-label="Назад" />
        <Heading margin={0}>{variantId ? 'Редагування варіації' : 'Нова варіація'}</Heading>
      </Box>

      <VariantForm
        variantId={variantId}
        productId={productId}
        variantsTable={variantsTable}
        activeVariant={activeVariant}
        onVariantCreated={onVariantCreated}
      />

      {variantId && (
        <>
          <GallerySection variantId={variantId} variantsTable={variantsTable} activeVariant={activeVariant} />
          <OptionsSection
            variantId={variantId}
            variantsTable={variantsTable}
            optionsTable={optionsTable}
            activeVariant={activeVariant}
            allOptions={allOptions}
          />

          <Box style={{ borderTop: `1px solid ${UI.dangerBg}`, paddingTop: 24, marginTop: 24 }}>
            <Button variant="danger" icon="trash" onClick={handleDelete}>Видалити варіацію повністю</Button>
          </Box>
        </>
      )}
    </Card>
  );
}
