import React, { useState } from 'react';
import { Button, FormField, Input } from '@airtable/blocks/ui';
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
  const [manufacturer, setManufacturer] = useState(productRecord?.getCellValueAsString(FIELDS.product.manufacturer) || '');
  const [description, setDescription] = useState(productRecord?.getCellValueAsString(FIELDS.product.description) || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProduct(productId, { model, manufacturer, description });
      alert('Дані збережено');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Section title="Основна інформація" first>
      <FormField label="Модель"><Input value={model} onChange={(e) => setModel(e.target.value)} /></FormField>
      <FormField label="Виробник"><Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} /></FormField>
      <FormField label="Опис"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
      <Button variant="primary" icon="check" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Збереження…' : 'Зберегти товар'}
      </Button>
    </Section>
  );
}
