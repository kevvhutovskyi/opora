import React, { useState } from 'react';
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
import { mediaApi } from '../services/mediaApi';

const NEXT_API_BASE_URL = 'http://localhost:3000';

interface VariantEditorProps {
  variantId: string | null;
  productId: string | null;
  variantsTable: Table | null;
  allVariants: Record[] | null;
  optionsTable: Table | null;
  allOptions: Record[] | null;
  onGoBack: () => void;
  // Callback for when a completely new variant is created so the parent can update the ID
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
}: VariantEditorProps) {
  
  // Find the active record if we are editing
  const activeVariant = allVariants?.find(v => v.id === variantId);

  // 1. Variant Core State
  const [sku, setSku] = useState(activeVariant?.getCellValueAsString('Артикул') || '');
  const [price, setPrice] = useState<number>(Number(activeVariant?.getCellValue('Ціна')) || 0);
  const [inStock, setInStock] = useState<boolean>(
    activeVariant ? Boolean(activeVariant.getCellValue('Наявність')) : true
  );

  // 2. Options State
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [selectedOptId, setSelectedOptId] = useState<string>('');
  const [newOptName, setNewOptName] = useState('');
  const [newOptValue, setNewOptValue] = useState('');

  // 3. Media State
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // --- Derived Data ---
  const activeVariantOptionsIds = (activeVariant?.getCellValue('Опції') as any[])?.map(o => o.id) || [];
  const activeVariantOptions = allOptions?.filter(o => activeVariantOptionsIds.includes(o.id)) || [];
  const galleryUrls = activeVariant?.getCellValueAsString('Фото (URLs)')?.split('\n').filter(Boolean) || [];

  // --- Handlers: Core ---
  const handleSaveVariant = async () => {
    if (!variantsTable || !productId) return;
    const fields = { 
      'Артикул': sku, 
      'Ціна': price, 
      'Наявність': inStock, 
      'Товар': [{ id: productId }] 
    };
    
    try {
      if (variantId) {
        await variantsTable.updateRecordAsync(variantId, fields);
        alert('Варіацію оновлено!');
      } else {
        const newVarId = await variantsTable.createRecordAsync(fields);
        alert('Варіацію створено!');
        if (onVariantCreated) onVariantCreated(newVarId);
      }
    } catch (error) {
      console.error(error);
      alert('Помилка при збереженні варіації');
    }
  };

  const handleDeleteVariant = async () => {
    if (!variantsTable || !variantId) return;
    if (window.confirm('Видалити цю варіацію (SKU)?')) {
      await variantsTable.deleteRecordAsync(variantId);
      onGoBack();
    }
  };

  // --- Handlers: Gallery (Cloudflare R2) ---
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !variantId) return;

    setIsUploadingImages(true);
    try {
        // ONE LINE OF CODE!
        await mediaApi.uploadImages(files, variantId);
        alert('Фотографії успішно завантажено!');
    } catch (error) {
        console.error(error);
        alert('Не вдалося завантажити картинки.');
    } finally {
        setIsUploadingImages(false);
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!variantId) return;
    if (!window.confirm('Видалити це фото з Cloudflare R2?')) return;

    try {
      await mediaApi.deleteImage(url, variantId);
      alert('Фото видалено!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося видалити фото.');
    }
  };

  const handleMoveImage = async (index: number, direction: 'up' | 'down') => {
    if (!variantsTable || !variantId) return;
    let urls = [...galleryUrls];

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === urls.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = urls[index];
    urls[index] = urls[targetIndex];
    urls[targetIndex] = temp;

    await variantsTable.updateRecordAsync(variantId, {
      'Фото (URLs)': urls.join('\n')
    });
  };

  // --- Handlers: Options ---
  const handleAddOption = async () => {
    if (!variantsTable || !optionsTable || !variantId) return;
    let optionIdToLink = selectedOptId;

    if (isCreatingOption && newOptName && newOptValue) {
      optionIdToLink = await optionsTable.createRecordAsync({
        'Назва': newOptName,
        'Значення': newOptValue
      });
    }

    if (!optionIdToLink) { alert('Оберіть або створіть опцію!'); return; }

    await variantsTable.updateRecordAsync(variantId, {
      'Опції': [...activeVariantOptionsIds.map(id => ({ id })), { id: optionIdToLink }]
    });

    setNewOptName(''); setNewOptValue(''); setIsCreatingOption(false); setSelectedOptId('');
  };

  const removeOption = async (optionIdToRemove: string) => {
    if (!variantsTable || !variantId) return;
    if (window.confirm('Відв\'язати цю опцію?')) {
      const filteredOptions = activeVariantOptionsIds
        .filter(id => id !== optionIdToRemove)
        .map(id => ({ id }));
      await variantsTable.updateRecordAsync(variantId, { 'Опції': filteredOptions });
    }
  };

  return (
    <Box backgroundColor="white" padding={4} borderRadius="large">
      <Button onClick={onGoBack} marginBottom={3}>← Назад до товару</Button>
      <Heading marginBottom={3}>{variantId ? 'Редагування варіації' : 'Нова варіація'}</Heading>

      <FormField label="Артикул"><Input value={sku} onChange={e => setSku(e.target.value)} /></FormField>
      <FormField label="Ціна (₴)"><Input type="number" value={String(price)} onChange={e => setPrice(Number(e.target.value))} /></FormField>
      <FormField label="Наявність"><Switch value={inStock} onChange={setInStock} /></FormField>
      <Button variant="primary" onClick={handleSaveVariant} marginBottom={4}>Зберегти варіацію</Button>

      {/* RENDER ONLY IF VARIANT EXISTS (Has ID) */}
      {variantId && (
        <>
          {/* Gallery Section */}
          <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
            <Heading size="small" marginBottom={3}>Галерея Варіації (Cloudflare R2)</Heading>
            <Box marginBottom={3}>
              {galleryUrls.map((url, idx, arr) => (
                <Box key={idx} display="flex" alignItems="center" justifyContent="space-between" padding={2} backgroundColor={colors.BLUE_LIGHT_2} marginBottom={2} borderRadius="medium">
                  <Box flex="1" overflow="hidden" marginRight={3}>
                    <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{url}</a>
                  </Box>
                  <Box display="flex" alignItems="center" flexShrink={0}>
                    <Button size="small" icon="chevronUp" onClick={() => handleMoveImage(idx, 'up')} disabled={idx === 0} marginRight={1} />
                    <Button size="small" icon="chevronDown" onClick={() => handleMoveImage(idx, 'down')} disabled={idx === arr.length - 1} marginRight={3} />
                    <Button size="small" icon="trash" variant="danger" onClick={() => handleDeleteImage(url)} />
                  </Box>
                </Box>
              ))}
              {galleryUrls.length === 0 && <Text textColor="light">Фотографій ще немає</Text>}
            </Box>
            
            <Box>
              <input type="file" accept="image/*" multiple onChange={handleImagesUpload} disabled={isUploadingImages} style={{ display: 'block', marginBottom: '10px' }} />
              {isUploadingImages && <Text textColor="light">Завантаження картинок в Cloudflare R2... ⏳</Text>}
            </Box>
          </Box>

          {/* Options Section */}
          <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
            <Heading size="small" marginBottom={3}>Опції кольорів / Деталей</Heading>
            <Box display="flex" flexWrap="wrap" marginBottom={3}>
              {activeVariantOptions.map(opt => (
                <Box key={opt.id} padding={2} backgroundColor={colors.ORANGE_LIGHT_2} marginRight={2} marginBottom={2} borderRadius="medium" display="flex" alignItems="center">
                  <Text marginRight={2}>{opt.getCellValueAsString('Назва')}: {opt.getCellValueAsString('Значення')}</Text>
                  <Button size="small" icon="x" onClick={() => removeOption(opt.id)} />
                </Box>
              ))}
            </Box>

            <Box padding={3} border="thick" borderColor={colors.GRAY_LIGHT_2} borderRadius="medium">
              <Switch value={isCreatingOption} onChange={setIsCreatingOption} label="Створити нову опцію?" marginBottom={2} />
              {isCreatingOption ? (
                <Box display="flex" marginBottom={2}>
                  <Input placeholder="Назва" value={newOptName} onChange={e => setNewOptName(e.target.value)} marginRight={2}/>
                  <Input placeholder="HEX/Значення" value={newOptValue} onChange={e => setNewOptValue(e.target.value)} />
                </Box>
              ) : (
                <Select 
                  options={[{value: '', label: 'Оберіть існуючу...'}, ...(allOptions?.map(o => ({ value: o.id, label: o.name })) || [])]} 
                  value={selectedOptId} onChange={val => setSelectedOptId(val as string)} marginBottom={2}
                />
              )}
              <Button variant="primary" onClick={handleAddOption}>Прив'язати опцію</Button>
            </Box>
          </Box>

          {/* Delete Action */}
          <Box borderTop="thick" borderColor={colors.RED_LIGHT_1} paddingTop={4} marginTop={4}>
            <Button variant="danger" icon="trash" onClick={handleDeleteVariant}>Видалити варіацію повністю</Button>
          </Box>
        </>
      )}
    </Box>
  );
}