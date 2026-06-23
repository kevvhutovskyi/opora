import React, { useState } from 'react';
import { Box, Button, Input, Switch, Select, Text } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { FIELDS, UI } from '../../constants';
import { getLinkedIds, toLinks } from '../../utils';
import { Section } from '../ui';

interface OptionsSectionProps {
  variantId: string;
  variantsTable: Table | null;
  optionsTable: Table | null;
  activeVariant: Record | undefined;
  allOptions: Record[] | null;
}

export function OptionsSection({
  variantId,
  variantsTable,
  optionsTable,
  activeVariant,
  allOptions,
}: OptionsSectionProps): JSX.Element {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOptId, setSelectedOptId] = useState('');
  const [newOptGroup, setNewOptGroup] = useState('');
  const [newOptColor, setNewOptColor] = useState('');
  const [newOptValue, setNewOptValue] = useState('');

  const optionIds = activeVariant ? getLinkedIds(activeVariant, FIELDS.variant.options) : [];
  const linkedOptions = allOptions?.filter((o) => optionIds.includes(o.id)) || [];

  const handleAdd = async () => {
    if (!variantsTable || !optionsTable) return;
    let optionIdToLink = selectedOptId;

    if (isCreating && newOptGroup && newOptColor && newOptValue) {
      optionIdToLink = await optionsTable.createRecordAsync({
        [FIELDS.option.name]: `${newOptGroup.trim()}: ${newOptColor.trim()}`,
        [FIELDS.option.value]: newOptValue,
      });
    }

    if (!optionIdToLink) {
      alert('Оберіть або створіть опцію!');
      return;
    }

    await variantsTable.updateRecordAsync(variantId, {
      [FIELDS.variant.options]: toLinks([...optionIds, optionIdToLink]),
    });

    setNewOptGroup('');
    setNewOptColor('');
    setNewOptValue('');
    setIsCreating(false);
    setSelectedOptId('');
  };

  const handleRemove = async (optionIdToRemove: string) => {
    if (!variantsTable) return;
    if (window.confirm("Відв'язати цю опцію?")) {
      await variantsTable.updateRecordAsync(variantId, {
        [FIELDS.variant.options]: toLinks(optionIds.filter((id) => id !== optionIdToRemove)),
      });
    }
  };

  return (
    <Section title="Опції кольорів / деталей">
      <Box display="flex" flexWrap="wrap" marginBottom={3} style={{ gap: 8 }}>
        {linkedOptions.map((opt) => (
          <Box key={opt.id} padding={2} display="flex" alignItems="center" style={{ background: UI.warnBg, borderRadius: 8, gap: 8 }}>
            <Text>{opt.getCellValueAsString(FIELDS.option.name)}: {opt.getCellValueAsString(FIELDS.option.value)}</Text>
            <Button size="small" icon="x" onClick={() => handleRemove(opt.id)} />
          </Box>
        ))}
        {linkedOptions.length === 0 && <Text textColor="light">Опцій ще немає</Text>}
      </Box>

      <Box padding={3} style={{ border: `1px solid ${UI.border}`, borderRadius: 8 }}>
        <Switch value={isCreating} onChange={setIsCreating} label="Створити нову опцію?" marginBottom={2} />
        {isCreating ? (
          <Box display="flex" marginBottom={2} style={{ gap: 8 }}>
            <Input placeholder="Група (напр. Колір ніжок)" value={newOptGroup} onChange={(e) => setNewOptGroup(e.target.value)} />
            <Input placeholder="Колір (напр. Чорний)" value={newOptColor} onChange={(e) => setNewOptColor(e.target.value)} />
            <Input placeholder="#HEX/Значення" value={newOptValue} onChange={(e) => setNewOptValue(e.target.value)} />
          </Box>
        ) : (
          <Select
            marginBottom={2}
            options={[{ value: '', label: 'Оберіть існуючу…' }, ...(allOptions?.map((o) => ({ value: o.id, label: o.name })) || [])]}
            value={selectedOptId}
            onChange={(val) => setSelectedOptId(val as string)}
          />
        )}
        <Button variant="primary" onClick={handleAdd}>Прив&apos;язати опцію</Button>
      </Box>
    </Section>
  );
}
