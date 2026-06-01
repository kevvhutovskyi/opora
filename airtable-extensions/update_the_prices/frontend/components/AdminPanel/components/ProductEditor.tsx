import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  FormField,
  Input,
  Heading,
  Text,
  Switch,
  Select,
  colors,
} from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { useProductMutations } from '../hooks/useProductMutations';

// Configuration 
// TODO
const NEXT_API_BASE_URL = 'http://localhost:3000';

interface ProductEditorProps {
  productId: string | null;
  productRecord: Record | null;
  variantsTable: Table | null;
  allVariants: Record[] | null;
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
  allSpecs,
  productSpecs,
  popularRecord,
  onGoBack,
  onEditVariant,
  onCreateVariant,
}: ProductEditorProps) {
  const { 
    saveProduct, 
    deleteProduct, 
    togglePopularStatus, 
    addProductSpec, 
    removeProductSpec 
  } = useProductMutations();

  // 1. General Product State
  const [model, setModel] = useState(productRecord?.getCellValueAsString('Модель') || '');
  const [manufacturer, setManufacturer] = useState(productRecord?.getCellValueAsString('Виробник') || '');
  const [description, setDescription] = useState(productRecord?.getCellValueAsString('Опис') || '');

  // 2. Characteristics (EAV) State
  const [isCreatingSpec, setIsCreatingSpec] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [specValue, setSpecValue] = useState('');

  // 3. Bulk Price State
  const [bulkPriceMode, setBulkPriceMode] = useState<'set' | 'amount' | 'percent'>('set');
  const [bulkPriceValue, setBulkPriceValue] = useState(0);

  // 4. Media State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  // --- Helpers ---
  const isPopular = !!popularRecord;
  const currentProductVariants = allVariants?.filter(v => {
    const links = v.getCellValue('Товар') as Array<{id: string}> | null;
    return links?.some(link => link.id === productId);
  }) || [];

  const videoUrls = productRecord?.getCellValueAsString('Відео Збірки')?.split('\n').filter(Boolean) || [];

  // --- Handlers ---
  const handleSaveProduct = async () => {
    await saveProduct(productId, { model, manufacturer, description });
    alert('Дані збережено');
  };

  const handleApplyBulkPrice = async () => {
    if (!variantsTable || currentProductVariants.length === 0) return;
    if (!window.confirm('Оновити ціни для всіх варіацій?')) return;

    const updates = currentProductVariants.map(v => {
      const currentPrice = Number(v.getCellValue('Ціна')) || 0;
      let newPrice = currentPrice;

      if (bulkPriceMode === 'set') newPrice = bulkPriceValue;
      else if (bulkPriceMode === 'amount') newPrice = currentPrice + bulkPriceValue;
      else if (bulkPriceMode === 'percent') newPrice = currentPrice * (1 + bulkPriceValue / 100);

      return { id: v.id, fields: { 'Ціна': Number(newPrice.toFixed(2)) } };
    });

    await variantsTable.updateRecordsAsync(updates);
    alert('Ціни оновлено!');
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !productId) return;

    setIsUploadingVideo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);

    try {
      const res = await fetch(`${NEXT_API_BASE_URL}/api/products/media/videos`, { method: 'POST', body: formData });
      if (res.ok) alert('Відео завантажено!');
    } catch (err) {
      alert('Помилка завантаження');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  return (
    <Box backgroundColor="white" padding={4} borderRadius="large">
      <Button onClick={onGoBack} marginBottom={3}>← Назад до списку</Button>
      <Heading marginBottom={3}>{productId ? 'Редагування' : 'Створення'} товару</Heading>

      {/* Basic Info */}
      <FormField label="Модель"><Input value={model} onChange={e => setModel(e.target.value)} /></FormField>
      <FormField label="Виробник"><Input value={manufacturer} onChange={e => setManufacturer(e.target.value)} /></FormField>
      <Button variant="primary" onClick={handleSaveProduct} marginBottom={4}>Зберегти товар</Button>

      {productId && (
        <>
          {/* Marketing Section */}
          <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
            <Heading size="small" marginBottom={3}>Маркетинг</Heading>
            <Switch
              value={isPopular}
              onChange={() => togglePopularStatus(productId, popularRecord?.id || null)}
              label="Відображати в «Найпопулярніші Товари»"
            />
          </Box>

          {/* Video Section */}
          <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
            <Heading size="small" marginBottom={3}>Відео Збірки (R2)</Heading>
            {videoUrls.map((url, idx) => (
              <Box key={idx} display="flex" alignItems="center" justifyContent="space-between" padding={2} backgroundColor={colors.BLUE_LIGHT_2} marginBottom={2} borderRadius="medium">
                <Text>{url}</Text>
              </Box>
            ))}
            {videoUrls.length === 0 && (
              <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideo} />
            )}
            {isUploadingVideo && <Text>Завантаження... ⏳</Text>}
          </Box>

          {/* Specs Section (EAV) */}
          <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
            <Heading size="small" marginBottom={3}>Характеристики</Heading>
            {productSpecs?.map(spec => (
              <Box key={spec.id} display="flex" justifyContent="space-between" marginBottom={2}>
                <Text>{spec.getCellValueAsString('Характеристика')}: {spec.getCellValueAsString('Значення')}</Text>
                <Button size="small" icon="trash" onClick={() => removeProductSpec(spec.id)} />
              </Box>
            ))}
            <Box padding={3} border="thick" borderColor={colors.GRAY_LIGHT_2} borderRadius="medium">
              <Switch value={isCreatingSpec} onChange={setIsCreatingSpec} label="Нова властивість?" />
              {isCreatingSpec ? (
                <Input placeholder="Назва" value={newSpecName} onChange={e => setNewSpecName(e.target.value)} />
              ) : (
                <Select 
                  options={[{value: '', label: 'Оберіть...'}, ...(allSpecs?.map(s => ({ value: s.id, label: s.name })) || [])]} 
                  value={selectedSpecId} onChange={v => setSelectedSpecId(v as string)}
                />
              )}
              <Input placeholder="Значення" value={specValue} onChange={e => setSpecValue(e.target.value)} marginTop={2} />
              <Button marginTop={2} onClick={() => addProductSpec(productId, specValue, selectedSpecId, newSpecName)}>Додати</Button>
            </Box>
          </Box>

          {/* Variations Section */}
          <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4}>
            <Box display="flex" justifyContent="space-between" marginBottom={3}>
              <Heading size="small">Варіації / SKU</Heading>
              <Button onClick={onCreateVariant}>Нова варіація</Button>
            </Box>

            {/* Bulk Update UI */}
            {currentProductVariants.length > 0 && (
              <Box padding={3} backgroundColor={colors.BLUE_LIGHT_2} borderRadius="medium" marginBottom={3}>
                <Text fontWeight="bold">Масове оновлення цін</Text>
                <Box display="flex" marginTop={2}>
                   <Select 
                    options={[{value: 'set', label: 'Встановити'}, {value: 'amount', label: '+/- Сума'}, {value: 'percent', label: '+/- %'}]} 
                    value={bulkPriceMode} onChange={v => setBulkPriceMode(v as any)}
                   />
                   <Input type="number" value={String(bulkPriceValue)} onChange={e => setBulkPriceValue(Number(e.target.value))} marginX={2} />
                   <Button onClick={handleApplyBulkPrice}>OK</Button>
                </Box>
              </Box>
            )}

            {currentProductVariants.map(v => (
              <Box key={v.id} display="flex" justifyContent="space-between" padding={2} backgroundColor={colors.GRAY_LIGHT_1} marginBottom={1}>
                <Text>{v.getCellValueAsString('Артикул')} — {v.getCellValueAsString('Ціна')} ₴</Text>
                <Button size="small" onClick={() => onEditVariant(v.id)}>Редагувати</Button>
              </Box>
            ))}
          </Box>

          <Box borderTop="thick" borderColor={colors.RED_LIGHT_1} paddingTop={4} marginTop={4}>
            <Button variant="danger" icon="trash" onClick={() => { if(confirm('Видалити?')) deleteProduct(productId).then(onGoBack); }}>
              Видалити товар
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}