import React, { useMemo, useState } from 'react';
import { Box, Button, Input, Switch, Select, Text } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { useProductMutations } from '../../hooks/useProductMutations';
import { getLinkedIds } from '../../utils';
import { FIELDS, UI } from '../../constants';
import { Section } from '../ui';

interface SpecsSectionProps {
  productId: string;
  productRecord: Record | null;
  productSpecs: Record[] | null;
  allSpecs: Record[] | null;
}

export function SpecsSection({ productId, productRecord, productSpecs, allSpecs }: SpecsSectionProps): JSX.Element {
  const { addProductSpec, removeProductSpec, reorderProductLinks } = useProductMutations();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [busy, setBusy] = useState(false);

  // Порядок = linked-масив «Товари/Характеристики» на товарі (його читає сторінка товару).
  const specs = useMemo(() => {
    const list = productSpecs || [];
    const order = productRecord ? getLinkedIds(productRecord, FIELDS.product.specs) : [];
    const pos = new Map(order.map((id, i) => [id, i]));
    return [...list].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
  }, [productSpecs, productRecord]);

  const handleAdd = async () => {
    await addProductSpec(productId, specValue, selectedSpecId, newSpecName);
    setSpecValue('');
    setNewSpecName('');
    setSelectedSpecId('');
  };

  const moveSpec = async (index: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= specs.length) return;
    const ids = specs.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    try {
      await reorderProductLinks(productId, FIELDS.product.specs, ids);
    } catch (e) {
      console.error(e);
      alert('Не вдалося змінити порядок.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="Характеристики">
      {specs.map((spec, idx, arr) => (
        <Box key={spec.id} display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
          <Text>
            {spec.getCellValueAsString(FIELDS.productSpec.spec)}: {spec.getCellValueAsString(FIELDS.productSpec.value)}
          </Text>
          <Box display="flex" alignItems="center" style={{ gap: 4 }}>
            <Button size="small" icon="chevronUp" disabled={busy || idx === 0} onClick={() => moveSpec(idx, 'up')} aria-label="Вгору" />
            <Button size="small" icon="chevronDown" disabled={busy || idx === arr.length - 1} onClick={() => moveSpec(idx, 'down')} aria-label="Вниз" />
            <Button size="small" icon="trash" onClick={() => removeProductSpec(spec.id)} />
          </Box>
        </Box>
      ))}

      <Box padding={3} marginTop={2} style={{ border: `1px solid ${UI.border}`, borderRadius: 8 }}>
        <Switch value={isCreating} onChange={setIsCreating} label="Нова властивість?" />
        {isCreating ? (
          <Input placeholder="Назва" value={newSpecName} onChange={(e) => setNewSpecName(e.target.value)} marginTop={2} />
        ) : (
          <Select
            marginTop={2}
            options={[{ value: '', label: 'Оберіть…' }, ...(allSpecs?.map((s) => ({ value: s.id, label: s.name })) || [])]}
            value={selectedSpecId}
            onChange={(v) => setSelectedSpecId(v as string)}
          />
        )}
        <Input placeholder="Значення" value={specValue} onChange={(e) => setSpecValue(e.target.value)} marginTop={2} />
        <Button marginTop={2} onClick={handleAdd}>Додати</Button>
      </Box>
    </Section>
  );
}
