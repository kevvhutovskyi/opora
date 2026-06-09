import React, { useState } from 'react';
import { Box, Button, Input, Switch, Select, Text } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { useProductMutations } from '../../hooks/useProductMutations';
import { FIELDS, UI } from '../../constants';
import { Section } from '../ui';

interface SpecsSectionProps {
  productId: string;
  productSpecs: Record[] | null;
  allSpecs: Record[] | null;
}

export function SpecsSection({ productId, productSpecs, allSpecs }: SpecsSectionProps): JSX.Element {
  const { addProductSpec, removeProductSpec } = useProductMutations();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [specValue, setSpecValue] = useState('');

  const handleAdd = async () => {
    await addProductSpec(productId, specValue, selectedSpecId, newSpecName);
    setSpecValue('');
    setNewSpecName('');
    setSelectedSpecId('');
  };

  return (
    <Section title="Характеристики">
      {productSpecs?.map((spec) => (
        <Box key={spec.id} display="flex" justifyContent="space-between" alignItems="center" marginBottom={2}>
          <Text>
            {spec.getCellValueAsString(FIELDS.productSpec.spec)}: {spec.getCellValueAsString(FIELDS.productSpec.value)}
          </Text>
          <Button size="small" icon="trash" onClick={() => removeProductSpec(spec.id)} />
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
