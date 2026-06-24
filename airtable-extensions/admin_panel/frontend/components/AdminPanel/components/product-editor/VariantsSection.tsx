import React, { useMemo, useState } from 'react';
import { Box, Button, Input, Select, Text } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { FIELDS, UI } from '../../constants';
import { getLinkedIds, isLinkedTo } from '../../utils';
import { useProductMutations } from '../../hooks/useProductMutations';
import { Section, Badge } from '../ui';

interface VariantsSectionProps {
  variantsTable: Table | null;
  productId: string;
  productRecord: Record | null;
  allVariants: Record[] | null;
  allOptions: Record[] | null;
  onEditVariant: (variantId: string) => void;
  onCreateVariant: () => void;
}

export function VariantsSection({
  variantsTable,
  productId,
  productRecord,
  allVariants,
  allOptions,
  onEditVariant,
  onCreateVariant,
}: VariantsSectionProps): JSX.Element {
  const { reorderProductLinks } = useProductMutations();
  const [bulkPriceMode, setBulkPriceMode] = useState<'set' | 'amount' | 'percent'>('set');
  const [bulkPriceValue, setBulkPriceValue] = useState(0);
  const [stockOptionId, setStockOptionId] = useState('');
  const [stockTarget, setStockTarget] = useState<'in' | 'out'>('out');
  const [busy, setBusy] = useState(false);

  // Порядок = linked-масив «Варіації Товарів» на товарі (саме його читає storefront).
  const variants = useMemo(() => {
    const linked = (allVariants || []).filter((v) => isLinkedTo(v, FIELDS.variant.product, productId));
    const order = productRecord ? getLinkedIds(productRecord, FIELDS.product.variants) : [];
    const pos = new Map(order.map((id, i) => [id, i]));
    return [...linked].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  }, [allVariants, productId, productRecord]);

  const moveVariant = async (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= variants.length) return;
    const ids = variants.map((v) => v.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    try {
      await reorderProductLinks(productId, FIELDS.product.variants, ids);
    } catch (e) {
      console.error(e);
      alert('Не вдалося змінити порядок.');
    } finally {
      setBusy(false);
    }
  };

  // Опції, що фактично використовуються варіаціями цього товару.
  const productOptions = useMemo(() => {
    const usedIds = new Set(variants.flatMap((v) => getLinkedIds(v, FIELDS.variant.options)));
    return (allOptions || []).filter((o) => usedIds.has(o.id));
  }, [variants, allOptions]);

  // Назви опцій варіації через « / » (напр. «Дуб / Чорний») — щоб було ясно, що пересуваєш.
  const optionsById = useMemo(() => new Map((allOptions || []).map((o) => [o.id, o])), [allOptions]);
  const variantLabel = (v: Record): string =>
    getLinkedIds(v, FIELDS.variant.options)
      .map((id) => optionsById.get(id)?.getCellValueAsString(FIELDS.option.name))
      .filter(Boolean)
      .join(' / ');

  const handleApplyBulkPrice = async () => {
    if (!variantsTable || variants.length === 0) return;
    if (!window.confirm('Оновити ціни для всіх варіацій?')) return;

    const updates = variants.map((v) => {
      const currentPrice = Number(v.getCellValue(FIELDS.variant.price)) || 0;
      let newPrice = currentPrice;
      if (bulkPriceMode === 'set') newPrice = bulkPriceValue;
      else if (bulkPriceMode === 'amount') newPrice = currentPrice + bulkPriceValue;
      else if (bulkPriceMode === 'percent') newPrice = currentPrice * (1 + bulkPriceValue / 100);
      return { id: v.id, fields: { [FIELDS.variant.price]: Number(newPrice.toFixed(2)) } };
    });

    await variantsTable.updateRecordsAsync(updates);
    alert('Ціни оновлено!');
  };

  // Масово виставити наявність варіаціям з обраною опцією (напр. колір закінчився).
  const handleApplyStockByOption = async () => {
    if (!variantsTable || !stockOptionId) {
      alert('Оберіть опцію');
      return;
    }
    const affected = variants.filter((v) => getLinkedIds(v, FIELDS.variant.options).includes(stockOptionId));
    if (affected.length === 0) {
      alert('Немає варіацій з цією опцією');
      return;
    }
    const inStock = stockTarget === 'in';
    const label = inStock ? 'в наявності' : 'немає в наявності';
    if (!window.confirm(`Позначити ${affected.length} варіацій як «${label}»?`)) return;

    await variantsTable.updateRecordsAsync(
      affected.map((v) => ({ id: v.id, fields: { [FIELDS.variant.inStock]: inStock } }))
    );
    alert('Наявність оновлено!');
  };

  return (
    <Section title="Варіації / SKU" action={<Button icon="plus" onClick={onCreateVariant}>Нова варіація</Button>}>
      {variants.length > 0 && (
        <Box display="flex" flexDirection="column" style={{ gap: 12 }} marginBottom={3}>
          {/* Bulk price */}
          <Box padding={3} style={{ background: '#EEF4FF', borderRadius: 8 }}>
            <Text fontWeight="bold" marginBottom={2}>Масове оновлення цін</Text>
            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
              <Select
                options={[
                  { value: 'set', label: 'Встановити' },
                  { value: 'amount', label: '+/- Сума' },
                  { value: 'percent', label: '+/- %' },
                ]}
                value={bulkPriceMode}
                onChange={(v) => setBulkPriceMode(v as 'set' | 'amount' | 'percent')}
              />
              <Input type="number" value={String(bulkPriceValue)} onChange={(e) => setBulkPriceValue(Number(e.target.value))} />
              <Button onClick={handleApplyBulkPrice}>OK</Button>
            </Box>
          </Box>

          {/* Bulk stock by option */}
          <Box padding={3} style={{ background: '#FFF6EC', borderRadius: 8 }}>
            <Text fontWeight="bold" marginBottom={1}>Наявність за опцією</Text>
            <Text size="small" textColor="light" marginBottom={2}>
              Напр. колір закінчився — позначити всі SKU з цією опцією.
            </Text>
            <Box display="flex" alignItems="center" style={{ gap: 8 }}>
              <Select
                options={[
                  { value: '', label: 'Оберіть опцію…' },
                  ...productOptions.map((o) => ({
                    value: o.id,
                    label: `${o.getCellValueAsString(FIELDS.option.name)}: ${o.getCellValueAsString(FIELDS.option.value)}`,
                  })),
                ]}
                value={stockOptionId}
                onChange={(v) => setStockOptionId(v as string)}
              />
              <Select
                options={[
                  { value: 'out', label: 'Немає в наявності' },
                  { value: 'in', label: 'В наявності' },
                ]}
                value={stockTarget}
                onChange={(v) => setStockTarget(v as 'in' | 'out')}
              />
              <Button onClick={handleApplyStockByOption}>Застосувати</Button>
            </Box>
          </Box>
        </Box>
      )}

      <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
        {variants.map((v, idx, arr) => {
          const inStock = Boolean(v.getCellValue(FIELDS.variant.inStock));
          return (
            <Box
              key={v.id}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              padding={2}
              style={{ background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}
            >
              <Box display="flex" alignItems="center" style={{ gap: 10 }}>
                <Text fontWeight="500">{variantLabel(v) || v.getCellValueAsString(FIELDS.variant.sku) || '—'}</Text>
                <Text textColor="light">{v.getCellValueAsString(FIELDS.variant.price)} ₴</Text>
                <Badge tone={inStock ? 'success' : 'danger'}>{inStock ? 'В наявності' : 'Немає'}</Badge>
              </Box>
              <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                <Button size="small" icon="chevronUp" disabled={busy || idx === 0} onClick={() => moveVariant(idx, 'up')} aria-label="Вгору" />
                <Button size="small" icon="chevronDown" disabled={busy || idx === arr.length - 1} onClick={() => moveVariant(idx, 'down')} aria-label="Вниз" />
                <Button size="small" icon="edit" onClick={() => onEditVariant(v.id)}>Редагувати</Button>
              </Box>
            </Box>
          );
        })}
        {variants.length === 0 && <Text textColor="light">Варіацій ще немає</Text>}
      </Box>
    </Section>
  );
}
