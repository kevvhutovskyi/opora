import React, { useState } from 'react';
import { Button, FormField, Input, Text } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { useProductMutations } from '../../hooks/useProductMutations';
import { FIELDS } from '../../constants';
import { Section } from '../ui';

interface BasicInfoFormProps {
  productId: string | null;
  productRecord: Record | null;
}

export function BasicInfoForm({ productId, productRecord }: BasicInfoFormProps): JSX.Element {
  const { saveProduct } = useProductMutations();

  const [model, setModel] = useState(productRecord?.getCellValueAsString(FIELDS.product.model) || '');
  const [description, setDescription] = useState(productRecord?.getCellValueAsString(FIELDS.product.description) || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProduct(productId, { model, description });
      alert('Дані збережено');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Section title="Основна інформація" first>
      <FormField label="Модель"><Input value={model} onChange={(e) => setModel(e.target.value)} /></FormField>
      <FormField label="Опис">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={12}
          placeholder="Опис товару. Підтримується Markdown: **жирний**, *курсив*, списки (- пункт), заголовки (## Заголовок)…"
          style={{
            width: '100%',
            minHeight: 220,
            padding: 8,
            border: '2px solid hsl(0,0%,90%)',
            borderRadius: 3,
            fontFamily: 'inherit',
            fontSize: 13,
            lineHeight: 1.5,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <Text textColor="light" size="small" marginTop={1}>
          Підтримується Markdown — текст зберігається як є й рендериться на сайті.
        </Text>
      </FormField>
      <Button variant="primary" icon="check" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Збереження…' : 'Зберегти товар'}
      </Button>
    </Section>
  );
}
