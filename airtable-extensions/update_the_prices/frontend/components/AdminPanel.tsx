import { useBase, useRecords } from '@airtable/blocks/ui';
import React, { useMemo, useState } from 'react';
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

export default function AdminPanel(): JSX.Element {
  const base = useBase();
  
  // Підключаємо всі 5 таблиць
  const productsTable = base.getTableByNameIfExists('Товари');
  const variantsTable = base.getTableByNameIfExists('Варіації Товарів');
  const optionsTable = base.getTableByNameIfExists('Опції');
  const specsTable = base.getTableByNameIfExists('Характеристики');
  const prodSpecsTable = base.getTableByNameIfExists('Товари/Характеристики');
  const popularProductsTable = base.getTableByNameIfExists('Найпопулярніші Товари');
  const requestsTable = base.getTableByNameIfExists('Запити');

  const productsRecords = useRecords(productsTable);
  const variantsRecords = useRecords(variantsTable);
  const optionsRecords = useRecords(optionsTable);
  const specsRecords = useRecords(specsTable);
  const prodSpecsRecords = useRecords(prodSpecsTable);
  const popularProductsRecords = useRecords(popularProductsTable);
  const requestsRecords = useRecords(requestsTable, {
    sorts: [{ field: 'Номер', direction: 'desc' }],
  });

  const [view, setView] = useState<'list' | 'edit_product' | 'edit_variant' | 'requests'>('list');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Стан форми Товару
  const [prodModel, setProdModel] = useState('');
  const [prodManufacturer, setProdManufacturer] = useState('');
  const [prodDescription, setProdDescription] = useState('');

  // Стан форми Варіації
  const [varSku, setVarSku] = useState('');
  const [varPrice, setVarPrice] = useState<number>(0);
  const [varInStock, setVarInStock] = useState<boolean>(true);

  // Стан для додавання Опцій
  const [isCreatingOption, setIsCreatingOption] = useState(false);
  const [selectedOptId, setSelectedOptId] = useState<string>('');
  const [newOptName, setNewOptName] = useState('');
  const [newOptValue, setNewOptValue] = useState('');

  // Стан для додавання Характеристик
  const [isCreatingSpec, setIsCreatingSpec] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState<string>('');
  const [newSpecName, setNewSpecName] = useState('');
  const [specValue, setSpecValue] = useState(''); 

  // Стан для МАСОВОГО оновлення цін
  const [bulkPriceMode, setBulkPriceMode] = useState<'set' | 'amount' | 'percent'>('set');
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0);

  // Стан для завантаження МЕДІА (R2)
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);

  // Стан для пагінації запитів
  const [currentRequestPage, setCurrentRequestPage] = useState(1);
  const requestsPerPage = 10;

  // ТОБІ ПОТРІБНО ВКАЗАТИ СВІЙ БАЗОВИЙ URL ДОМЕНУ, ДЕ ПРАЦЮЄ NEXT.JS БЕКЕНД
  const NEXT_API_BASE_URL = 'http://localhost:3000'; // наприклад http://localhost:3000

  // --- ЛОГІКА ТОВАРІВ ---
  const handleEditProduct = (productId: string) => {
    const product = productsRecords?.find(r => r.id === productId);
    if (product) {
      setProdModel(product.getCellValueAsString('Модель') || '');
      setProdManufacturer(product.getCellValueAsString('Виробник') || '');
      setProdDescription(product.getCellValueAsString('Опис') || '');
      setSelectedProductId(product.id);
      setView('edit_product');
    }
  };

  const handleCreateProduct = () => {
    setProdModel('');
    setProdManufacturer('');
    setProdDescription('');
    setSelectedProductId(null);
    setView('edit_product');
  };

  const saveProduct = async () => {
    if (!productsTable) return;
    const fields = { 'Модель': prodModel, 'Виробник': prodManufacturer, 'Опис': prodDescription };
    if (selectedProductId) {
      await productsTable.updateRecordAsync(selectedProductId, fields);
      alert('Товар оновлено!');
    } else {
      const newRecordId = await productsTable.createRecordAsync(fields);
      setSelectedProductId(newRecordId);
      alert('Товар створено!');
    }
  };

  const handleDeleteProduct = async () => {
    if (!productsTable || !selectedProductId) return;
    if (window.confirm('Ви впевнені, що хочете ПОВНІСТЮ видалити цей товар?')) {
      await productsTable.deleteRecordAsync(selectedProductId);
      setView('list');
      setSelectedProductId(null);
    }
  };

  // --- ВІДЕО: ЗАВАНТАЖЕННЯ ТА ВИДАЛЕННЯ ---
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProductId) return;

    setIsUploadingVideos(true);
    const formData = new FormData();
    // Беремо тільки ПЕРШИЙ файл, бо в нас обмеження 1 відео на товар
    formData.append('file', files[0]);
    formData.append('productId', selectedProductId);

    try {
      const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/videos`, { 
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Помилка завантаження відео');
      alert('Відео успішно додано!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося завантажити відео.');
    } finally {
      setIsUploadingVideos(false);
    }
  };

  const handleDeleteVideo = async (url: string) => {
    if (!selectedProductId) return;
    if (!window.confirm('Ви впевнені, що хочете видалити це відео з Cloudflare R2?')) return;

    try {
      const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/videos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, productId: selectedProductId }),
      });

      if (!response.ok) throw new Error('Помилка видалення відео');
      alert('Відео видалено!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося видалити відео.');
    }
  };

  // --- КАРТИНКИ ВАРІАЦІЙ: ЗАВАНТАЖЕННЯ ТА ВИДАЛЕННЯ ---
  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedVariantId) return;

    setIsUploadingImages(true);
    const formData = new FormData();
    
    Array.from(files).forEach((file) => {
      formData.append('file', file);
    });
    formData.append('variationId', selectedVariantId);

    try {
      const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/images`, { 
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Помилка завантаження картинок');
      alert('Усі фотографії успішно завантажено!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося завантажити картинки.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleDeleteImage = async (url: string) => {
    if (!selectedVariantId) return;
    if (!window.confirm('Ви впевнені, що хочете видалити це фото з Cloudflare R2?')) return;

    try {
      const response = await fetch(`${NEXT_API_BASE_URL}/api/products/media/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, variantId: selectedVariantId }),
      });

      if (!response.ok) throw new Error('Помилка видалення фото');
      alert('Фото видалено!');
    } catch (error) {
      console.error(error);
      alert('Не вдалося видалити фото.');
    }
  };

  const handleMoveImage = async (index: number, direction: 'up' | 'down') => {
    if (!variantsTable || !selectedVariantId) return;

    const currentVariant = variantsRecords?.find(r => r.id === selectedVariantId);
    const existingUrlsStr = currentVariant?.getCellValueAsString('Фото (URLs)') || '';
    
    // Розбиваємо текст на масив лінків
    let urls = existingUrlsStr.split('\n').filter(Boolean);

    // Перевіряємо, чи не виходимо за межі масиву
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === urls.length - 1) return;

    // Міняємо елементи місцями
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = urls[index];
    urls[index] = urls[targetIndex];
    urls[targetIndex] = temp;

    // Збираємо назад у рядок і зберігаємо
    const newUrlsString = urls.join('\n');
    await variantsTable.updateRecordAsync(selectedVariantId, {
      'Фото (URLs)': newUrlsString
    });
  };

  // --- ЛОГІКА ХАРАКТЕРИСТИК (EAV) ---
  const handleAddSpec = async () => {
    if (!prodSpecsTable || !specsTable || !selectedProductId) return;
    let specIdToLink = selectedSpecId;

    if (isCreatingSpec && newSpecName) {
      specIdToLink = await specsTable.createRecordAsync({ 'Значення': newSpecName });
    }

    if (!specIdToLink || !specValue) {
      alert('Заповніть характеристику та її значення!'); return;
    }

    await prodSpecsTable.createRecordAsync({
      'Товар': [{ id: selectedProductId }],
      'Характеристика': [{ id: specIdToLink }],
      'Значення': specValue
    });

    setNewSpecName(''); setSpecValue(''); setIsCreatingSpec(false); setSelectedSpecId('');
  };

  const handleRemoveSpec = async (prodSpecId: string) => {
    if (!prodSpecsTable) return;
    if (window.confirm('Відв\'язати цю характеристику від товару?')) {
      await prodSpecsTable.deleteRecordAsync(prodSpecId);
    }
  };

  // --- ЛОГІКА ВАРІАЦІЙ ---
  const handleEditVariant = (variantId: string) => {
    const variant = variantsRecords?.find(r => r.id === variantId);
    if (variant) {
      setVarSku(variant.getCellValueAsString('Артикул') || '');
      setVarPrice(Number(variant.getCellValue('Ціна')) || 0);
      setVarInStock(Boolean(variant.getCellValue('Наявність')));
      setSelectedVariantId(variant.id);
      setView('edit_variant');
    }
  };

  const handleCreateVariant = () => {
    setVarSku('');
    setVarPrice(0);
    setVarInStock(true);
    setSelectedVariantId(null);
    setView('edit_variant');
  };

  const saveVariant = async () => {
    if (!variantsTable || !selectedProductId) return;
    const fields = { 'Артикул': varSku, 'Ціна': varPrice, 'Наявність': varInStock, 'Товар': [{ id: selectedProductId }] };
    
    if (selectedVariantId) {
      await variantsTable.updateRecordAsync(selectedVariantId, fields);
      alert('Варіацію оновлено!');
    } else {
      const newVarId = await variantsTable.createRecordAsync(fields);
      setSelectedVariantId(newVarId); 
      alert('Варіацію створено!');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!variantsTable) return;
    if (window.confirm('Видалити цю варіацію (SKU)?')) {
      await variantsTable.deleteRecordAsync(variantId);
      if (selectedVariantId === variantId) {
        setView('edit_product');
        setSelectedVariantId(null);
      }
    }
  };

  // --- МАСОВЕ ОНОВЛЕННЯ ЦІН ---
  const applyBulkPrice = async () => {
    if (!variantsTable || !currentProductVariants || currentProductVariants.length === 0) return;
    if (!window.confirm('Оновити ціну для всіх варіацій цього товару?')) return;

    const updates = currentProductVariants.map(v => {
      const currentPrice = Number(v.getCellValue('Ціна')) || 0;
      let newPrice = currentPrice;

      if (bulkPriceMode === 'set') newPrice = bulkPriceValue;
      else if (bulkPriceMode === 'amount') newPrice = currentPrice + bulkPriceValue;
      else if (bulkPriceMode === 'percent') newPrice = currentPrice * (1 + bulkPriceValue / 100);

      if (newPrice < 0) newPrice = 0;

      return { id: v.id, fields: { 'Ціна': Number(newPrice.toFixed(2)) } };
    });

    const chunkSize = 50;
    for (let i = 0; i < updates.length; i += chunkSize) {
      await variantsTable.updateRecordsAsync(updates.slice(i, i + chunkSize));
    }
    alert(`Успішно оновлено ціни для ${updates.length} варіацій!`);
    setBulkPriceValue(0);
  };

  // --- ЛОГІКА ОПЦІЙ ---
  const handleAddOption = async () => {
    if (!variantsTable || !optionsTable || !selectedVariantId) return;
    let optionIdToLink = selectedOptId;

    if (isCreatingOption && newOptName && newOptValue) {
      optionIdToLink = await optionsTable.createRecordAsync({
        'Назва': newOptName,
        'Значення': newOptValue
      });
    }

    if (!optionIdToLink) { alert('Оберіть або створіть опцію!'); return; }

    const currentVariant = variantsRecords?.find(r => r.id === selectedVariantId);
    const existingOptions = (currentVariant?.getCellValue('Опції') as any[]) || [];
    
    await variantsTable.updateRecordAsync(selectedVariantId, {
      'Опції': [...existingOptions, { id: optionIdToLink }]
    });

    setNewOptName(''); setNewOptValue(''); setIsCreatingOption(false); setSelectedOptId('');
  };

  const removeOption = async (optionIdToRemove: string) => {
    if (!variantsTable || !selectedVariantId) return;
    if (window.confirm('Відв\'язати цю опцію?')) {
      const currentVariant = variantsRecords?.find(r => r.id === selectedVariantId);
      const existingOptions = (currentVariant?.getCellValue('Опції') as any[]) || [];
      const filteredOptions = existingOptions.filter(opt => opt.id !== optionIdToRemove);
      await variantsTable.updateRecordAsync(selectedVariantId, { 'Опції': filteredOptions });
    }
  };

  const handleToggleProhret = async (recordId: string, currentValue: boolean) => {
    if (!requestsTable) return;
    await requestsTable.updateRecordAsync(recordId, {
      'Прогрет': !currentValue
    });
  };

  // Розрахунок елементів для поточної сторінки
  const indexOfLastRequest = currentRequestPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = requestsRecords?.slice(indexOfFirstRequest, indexOfLastRequest) || [];
  const totalPages = Math.ceil((requestsRecords?.length || 0) / requestsPerPage);

  const paginate = (pageNumber: number) => setCurrentRequestPage(pageNumber);

  // --- ФІЛЬТРИ ДЛЯ РЕНДЕРУ ---
  const currentProductVariants = variantsRecords?.filter(v => {
    const links = v.getCellValue('Товар') as Array<{id: string}> | null;
    return links?.some(link => link.id === selectedProductId);
  });

  const currentProductSpecs = useMemo(() => {
    return prodSpecsRecords?.filter(spec => {
      const linkedProducts = spec.getCellValue('Товар') as Array<{id: string}> | null;
      return linkedProducts?.some(link => link.id === selectedProductId);
    });
  }, [prodSpecsRecords, selectedProductId]);

  const popularRecord = useMemo(() => {
    return popularProductsRecords?.find(record => {
      const linkedProducts = record.getCellValue('Товари') as Array<{id: string}> | null;
      return linkedProducts?.some(link => link.id === selectedProductId);
    });
  }, [popularProductsRecords, selectedProductId]);

  const isPopular = !!popularRecord;

  const handleTogglePopular = async () => {
    if (!popularProductsTable || !selectedProductId) return;

    if (isPopular && popularRecord) {
      // Якщо товар вже там — видаляємо запис
      await popularProductsTable.deleteRecordAsync(popularRecord.id);
    } else {
      // Якщо немає — створюємо новий запис із лінкою на товар
      await popularProductsTable.createRecordAsync({
        'Товари': [{ id: selectedProductId }]
      });
    }
  };

  const activeVariant = variantsRecords?.find(v => v.id === selectedVariantId);
  const activeVariantOptionsIds = (activeVariant?.getCellValue('Опції') as any[])?.map(o => o.id) || [];
  const activeVariantOptions = optionsRecords?.filter(o => activeVariantOptionsIds.includes(o.id));

  // Отримуємо існуючі відео товару (за логікою, має бути не більше одного)
  const existingVideoUrls = productsRecords?.find(r => r.id === selectedProductId)?.getCellValueAsString('Відео Збірки')?.split('\n').filter(Boolean) || [];
  const hasVideo = existingVideoUrls.length > 0;

  if (!productsTable) return <Box padding={3}>Завантаження...</Box>;

  return (
    <Box padding={4} height="100vh" overflowY="auto" backgroundColor={colors.GRAY_LIGHT_2}>
      
      {/* 1. СПИСОК ТОВАРІВ */}
      {view === 'list' && (
        <Box backgroundColor="white" padding={4} borderRadius="large">
          <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
            <Button marginRight={2} onClick={() => setView('requests')}> Заявки клієнтів</Button>
            <Heading>Каталог товарів</Heading>
            <Button variant="primary" onClick={handleCreateProduct}>Додати товар</Button>
          </Box>
          {productsRecords?.map(product => (
            <Box key={product.id} display="flex" justifyContent="space-between" padding={3} borderBottom="thick" borderColor={colors.GRAY_LIGHT_2}>
              <Box>
                <Heading size="small">{product.getCellValueAsString('Модель') || 'Без моделі'}</Heading>
                <Text textColor="light">{product.getCellValueAsString('Виробник')}</Text>
              </Box>
              <Button onClick={() => handleEditProduct(product.id)}>Редагувати</Button>
            </Box>
          ))}
        </Box>
      )}

      {/* 2. РЕДАГУВАННЯ ТОВАРУ */}
      {view === 'edit_product' && (
        <Box backgroundColor="white" padding={4} borderRadius="large">
          <Button onClick={() => setView('list')} marginBottom={3}>← Назад до списку</Button>
          <Heading marginBottom={3}>{selectedProductId ? 'Редагування товару' : 'Створення товару'}</Heading>
          
          <FormField label="Модель"><Input value={prodModel} onChange={e => setProdModel(e.target.value)} /></FormField>
          <FormField label="Виробник"><Input value={prodManufacturer} onChange={e => setProdManufacturer(e.target.value)} /></FormField>
          
          <Button variant="primary" onClick={saveProduct} marginBottom={4}>Зберегти товар</Button>

          {selectedProductId && (
            <>
              <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
                <Heading size="small" marginBottom={3}>Маркетинг</Heading>
                <Box padding={3} backgroundColor={isPopular ? colors.GREEN_LIGHT_2 : colors.GRAY_LIGHT_1} borderRadius="medium" display="flex" alignItems="center">
                  <Switch
                    value={isPopular}
                    onChange={handleTogglePopular}
                    label="Відображати в блоці «Найпопулярніші Товари» на сайті"
                  />
                </Box>
              </Box>

              {/* ВІДЕО ТОВАРУ (1 ВІДЕО МАКСИМУМ) */}
              <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
                <Heading size="small" marginBottom={3}>Відео Збірки (Cloudflare R2)</Heading>
                <Box marginBottom={3}>
                  {existingVideoUrls.map((url, idx) => (
                    <Box key={idx} display="flex" alignItems="center" justifyContent="space-between" padding={2} backgroundColor={colors.BLUE_LIGHT_2} marginBottom={2} borderRadius="medium">
                      <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', marginRight: '10px' }}>{url}</a>
                      <Button size="small" icon="trash" variant="danger" onClick={() => handleDeleteVideo(url)} aria-label="Видалити відео" />
                    </Box>
                  ))}
                  {!hasVideo && <Text textColor="light">Відео ще немає</Text>}
                </Box>
                
                {/* Ховаємо інпут, якщо відео вже є */}
                {!hasVideo && (
                  <Box>
                    <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideos} style={{ display: 'block', marginBottom: '10px' }} />
                    {isUploadingVideos && <Text textColor="light">Завантаження відео в Cloudflare R2... ⏳</Text>}
                  </Box>
                )}
              </Box>

              {/* ХАРАКТЕРИСТИКИ */}
              <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
                <Heading size="small" marginBottom={3}>Характеристики (EAV)</Heading>
                {currentProductSpecs?.map(spec => (
                  <Box key={spec.id} display="flex" alignItems="center" justifyContent="space-between" padding={2} backgroundColor={colors.BLUE_LIGHT_2} marginBottom={2} borderRadius="medium">
                    <Box display="flex">
                      <Text marginRight={2}>{spec.getCellValueAsString('Характеристика')}:</Text>
                      <Text>{spec.getCellValueAsString('Значення')}</Text>
                    </Box>
                    <Button size="small" icon="trash" onClick={() => handleRemoveSpec(spec.id)} aria-label="Видалити" />
                  </Box>
                ))}
                <Box display="flex" alignItems="flex-end" marginTop={3} padding={3} border="thick" borderColor={colors.GRAY_LIGHT_2} borderRadius="medium">
                  <Box flex="1" marginRight={2}>
                    <Switch value={isCreatingSpec} onChange={setIsCreatingSpec} label="Створити нову властивість?" marginBottom={2}/>
                    {isCreatingSpec ? (
                      <Input placeholder="Назва (напр. 'Матеріал')" value={newSpecName} onChange={e => setNewSpecName(e.target.value)} />
                    ) : (
                      <Select 
                        options={[{value: '', label: 'Оберіть з довідника'}, ...(specsRecords?.map(s => ({ value: s.id, label: s.getCellValueAsString('Значення') || s.name })) || [])]} 
                        value={selectedSpecId} onChange={val => setSelectedSpecId(val as string)} 
                      />
                    )}
                  </Box>
                  <Box flex="1" marginRight={2}><Input placeholder="Значення (напр. 'Дерево')" value={specValue} onChange={e => setSpecValue(e.target.value)} /></Box>
                  <Button variant="primary" onClick={handleAddSpec}>Додати</Button>
                </Box>
              </Box>

              {/* ВАРІАЦІЇ ТА МАСОВЕ ОНОВЛЕННЯ */}
              <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
                <Box display="flex" justifyContent="space-between" marginBottom={3}>
                  <Heading size="small">Варіації / SKU</Heading>
                  <Button onClick={handleCreateVariant}>Нова варіація</Button>
                </Box>

                {currentProductVariants && currentProductVariants.length > 0 && (
                  <Box padding={3} backgroundColor={colors.BLUE_LIGHT_2} borderRadius="medium" marginBottom={3}>
                    <Heading size="xsmall" marginBottom={2}>Масове оновлення цін для всіх варіацій</Heading>
                    <Box display="flex" alignItems="flex-end">
                      <Box flex="1" marginRight={2}>
                        <FormField label="Дія" marginBottom={0}>
                          <Select 
                            options={[{ value: 'set', label: 'Встановити точну ціну' }, { value: 'amount', label: 'Додати/відняти суму (+/-)' }, { value: 'percent', label: 'Додати/відняти відсоток (+/- %)' }]}
                            value={bulkPriceMode}
                            onChange={val => setBulkPriceMode(val as 'set'|'amount'|'percent')}
                          />
                        </FormField>
                      </Box>
                      <Box flex="1" marginRight={2}>
                        <FormField label="Значення" marginBottom={0}>
                          <Input type="number" value={String(bulkPriceValue)} onChange={e => setBulkPriceValue(Number(e.target.value))} />
                        </FormField>
                      </Box>
                      <Button variant="primary" onClick={applyBulkPrice}>Застосувати</Button>
                    </Box>
                  </Box>
                )}

                {currentProductVariants?.map(v => (
                  <Box key={v.id} padding={2} marginBottom={2} backgroundColor={colors.GRAY_LIGHT_1} borderRadius="medium" display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Text >{v.getCellValueAsString('Артикул')}</Text>
                      <Text size="small" textColor="light">Ціна: {v.getCellValueAsString('Ціна')} ₴</Text>
                    </Box>
                    <Box display="flex">
                      <Button size="small" marginRight={2} onClick={() => handleEditVariant(v.id)}>Редагувати</Button>
                      <Button size="small" icon="trash" onClick={() => handleDeleteVariant(v.id)} aria-label="Видалити" />
                    </Box>
                  </Box>
                ))}
              </Box>

              <Box borderTop="thick" borderColor={colors.RED_LIGHT_1} paddingTop={4} marginTop={4}>
                <Button variant="danger" icon="trash" onClick={handleDeleteProduct}>Видалити товар повністю</Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* 3. РЕДАГУВАННЯ ВАРІАЦІЇ */}
      {view === 'edit_variant' && (
        <Box backgroundColor="white" padding={4} borderRadius="large">
          <Button onClick={() => setView('edit_product')} marginBottom={3}>← Назад до товару</Button>
          <Heading marginBottom={3}>{selectedVariantId ? 'Редагування варіації' : 'Нова варіація'}</Heading>

          <FormField label="Артикул"><Input value={varSku} onChange={e => setVarSku(e.target.value)} /></FormField>
          <FormField label="Ціна (₴)"><Input type="number" value={String(varPrice)} onChange={e => setVarPrice(Number(e.target.value))} /></FormField>
          <FormField label="Наявність"><Switch value={varInStock} onChange={setVarInStock} /></FormField>
          <Button variant="primary" onClick={saveVariant} marginBottom={4}>Зберегти варіацію</Button>

          {selectedVariantId && (
            <>
              {/* ГАЛЕРЕЯ ВАРІАЦІЇ */}
              <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
                <Heading size="small" marginBottom={3}>Галерея Варіації (Cloudflare R2)</Heading>
                <Box marginBottom={3}>
                  {variantsRecords?.find(r => r.id === selectedVariantId)?.getCellValueAsString('Фото (URLs)')?.split('\n').filter(Boolean).map((url, idx, arr) => (
                    <Box key={idx} display="flex" alignItems="center" justifyContent="space-between" padding={2} backgroundColor={colors.BLUE_LIGHT_2} marginBottom={2} borderRadius="medium">
                      
                      {/* Сам лінк */}
                      <Box flex="1" overflow="hidden" marginRight={3}>
                        <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{url}</a>
                      </Box>
                      
                      {/* Кнопки керування */}
                      <Box display="flex" alignItems="center" flexShrink={0}>
                        <Button 
                          size="small" 
                          icon="chevronUp" 
                          onClick={() => handleMoveImage(idx, 'up')} 
                          disabled={idx === 0} // Блокуємо для першого елемента
                          marginRight={1}
                          aria-label="Підняти вище"
                        />
                        <Button 
                          size="small" 
                          icon="chevronDown" 
                          onClick={() => handleMoveImage(idx, 'down')} 
                          disabled={idx === arr.length - 1} // Блокуємо для останнього
                          marginRight={3}
                          aria-label="Опустити нижче"
                        />
                        <Button 
                          size="small" 
                          icon="trash" 
                          variant="danger" 
                          onClick={() => handleDeleteImage(url)} 
                          aria-label="Видалити фото" 
                        />
                      </Box>

                    </Box>
                  )) || <Text textColor="light">Фотографій ще немає</Text>}
                </Box>
                
                <Box>
                  <input type="file" accept="image/*" multiple onChange={handleImagesUpload} disabled={isUploadingImages} style={{ display: 'block', marginBottom: '10px' }} />
                  {isUploadingImages && <Text textColor="light">Завантаження картинок в Cloudflare R2... ⏳</Text>}
                </Box>
              </Box>

              {/* ОПЦІЇ ВАРІАЦІЇ */}
              <Box borderTop="thick" borderColor={colors.GRAY_LIGHT_2} paddingTop={4} marginBottom={4}>
                <Heading size="small" marginBottom={3}>Опції кольорів / Деталей</Heading>
                <Box display="flex" flexWrap="wrap" marginBottom={3}>
                  {activeVariantOptions?.map(opt => (
                    <Box key={opt.id} padding={2} backgroundColor={colors.ORANGE_LIGHT_2} marginRight={2} marginBottom={2} borderRadius="medium" display="flex" alignItems="center">
                      <Text marginRight={2}>{opt.getCellValueAsString('Назва')}: {opt.getCellValueAsString('Значення')}</Text>
                      <Button size="small" icon="x" onClick={() => removeOption(opt.id)} aria-label="Видалити" />
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
                      options={[{value: '', label: 'Оберіть існуючу...'}, ...(optionsRecords?.map(o => ({ value: o.id, label: o.name })) || [])]} 
                      value={selectedOptId} onChange={val => setSelectedOptId(val as string)} marginBottom={2}
                    />
                  )}
                  <Button variant="primary" onClick={handleAddOption}>Прив'язати опцію</Button>
                </Box>
              </Box>

              <Box borderTop="thick" borderColor={colors.RED_LIGHT_1} paddingTop={4} marginTop={4}>
                <Button variant="danger" icon="trash" onClick={() => handleDeleteVariant(selectedVariantId)}>Видалити варіацію повністю</Button>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* 4. СПИСОК ЗАПИТІВ (КЛІЄНТИ) */}
      {view === 'requests' && (
        <Box backgroundColor="white" padding={4} borderRadius="large" minHeight="500px" display="flex" flexDirection="column">
          <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
            <Box display="flex" alignItems="center">
              <Button onClick={() => setView('list')} marginRight={3} icon="chevronLeft" aria-label="Назад" />
              <Heading>Заявки клієнтів (CRM)</Heading>
            </Box>
            <Text textColor="light">Всього: {requestsRecords?.length || 0}</Text>
          </Box>

          <Box flex="1">
            {currentRequests.length === 0 ? (
              <Text textColor="light" textAlign="center" marginTop={4}>Заявок поки немає.</Text>
            ) : (
              currentRequests.map(request => {
                const isProhret = Boolean(request.getCellValue('Прогрет'));
                const linkedOrder = request.getCellValueAsString('Замовлення');
                
                return (
                  <Box 
                    key={request.id} 
                    display="flex" 
                    justifyContent="space-between" 
                    alignItems="center" 
                    padding={3} 
                    marginBottom={2}
                    backgroundColor={isProhret ? colors.GREEN_LIGHT_2 : colors.GRAY_LIGHT_1} 
                    borderRadius="medium"
                    border="thick"
                    borderColor={isProhret ? colors.GREEN_LIGHT_1 : 'transparent'}
                  >
                    <Box display="flex" flexDirection="column">
                      <Box display="flex" alignItems="center">
                        <Text marginRight={2}>#{request.getCellValueAsString('Номер')}</Text>
                        <Text>{request.getCellValueAsString('Ім\'я') || 'Без імені'}</Text>
                      </Box>
                      <Text size="small" textColor="light">
                        📞 {request.getCellValueAsString('Номер телефону') || '—'}
                      </Text>
                      {linkedOrder && (
                        <Text size="small" textColor="blue">🛒 Замовлення: {linkedOrder}</Text>
                      )}
                    </Box>
                    
                    <Box padding={2} backgroundColor="white" borderRadius="large">
                      <Switch 
                        value={isProhret} 
                        onChange={() => handleToggleProhret(request.id, isProhret)} 
                        label="Прогрет" 
                      />
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          {/* ПАГІНАЦІЯ */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" alignItems="center" marginTop={4} paddingTop={3} borderTop="thick" borderColor={colors.GRAY_LIGHT_2}>
              <Button 
                onClick={() => paginate(currentRequestPage - 1)} 
                disabled={currentRequestPage === 1}
                icon="chevronLeft"
                marginRight={2}
                aria-label="Попередня"
              />
              <Text marginRight={2} textColor="light">
                Сторінка {currentRequestPage} з {totalPages}
              </Text>
              <Button 
                onClick={() => paginate(currentRequestPage + 1)} 
                disabled={currentRequestPage === totalPages}
                icon="chevronRight"
                aria-label="Наступна"
              />
            </Box>
          )}
        </Box>
      )}

    </Box>
  );
}