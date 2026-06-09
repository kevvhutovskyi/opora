import React, { useState } from 'react';
import { Box, Button, FormField, Input, Switch } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { FIELDS } from '../../constants';
import { toLinks } from '../../utils';
import { Section, Badge } from '../ui';

interface VariantFormProps {
  variantId: string | null;
  productId: string | null;
  variantsTable: Table | null;
  activeVariant: Record | undefined;
  onVariantCreated?: (newVariantId: string) => void;
}

export function VariantForm({
  variantId,
  productId,
  variantsTable,
  activeVariant,
  onVariantCreated,
}: VariantFormProps): JSX.Element {
  const [sku, setSku] = useState(activeVariant?.getCellValueAsString(FIELDS.variant.sku) || '');
  const [price, setPrice] = useState<number>(Number(activeVariant?.getCellValue(FIELDS.variant.price)) || 0);
  const [inStock, setInStock] = useState<boolean>(
    activeVariant ? Boolean(activeVariant.getCellValue(FIELDS.variant.inStock)) : true
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!variantsTable || !productId) return;
    const fields = {
      [FIELDS.variant.sku]: sku,
      [FIELDS.variant.price]: price,
      [FIELDS.variant.inStock]: inStock,
      [FIELDS.variant.product]: toLinks([productId]),
    };

    setIsSaving(true);
    try {
      if (variantId) {
        await variantsTable.updateRecordAsync(variantId, fields);
        alert('Варіацію оновлено!');
      } else {
        const newVarId = await variantsTable.createRecordAsync(fields);
        alert('Варіацію створено!');
        onVariantCreated?.(newVarId);
      }
    } catch (error) {
      console.error(error);
      alert('Помилка при збереженні варіації');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Section
      title="Параметри"
      first
      action={variantId ? <Badge tone={inStock ? 'success' : 'danger'}>{inStock ? 'В наявності' : 'Немає'}</Badge> : undefined}
    >
      <FormField label="Артикул"><Input value={sku} onChange={(e) => setSku(e.target.value)} /></FormField>
      <FormField label="Ціна (₴)"><Input type="number" value={String(price)} onChange={(e) => setPrice(Number(e.target.value))} /></FormField>
      <FormField label="Наявність"><Switch value={inStock} onChange={setInStock} /></FormField>
      <Box>
        <Button variant="primary" icon="check" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Збереження…' : 'Зберегти варіацію'}
        </Button>
      </Box>
    </Section>
  );
}
