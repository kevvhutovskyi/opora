import React, { useMemo, useState } from 'react';
import { Box, Button, Heading, Text, Icon, Input } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { FIELDS, UI } from '../constants';
import { Card } from './ui';
import { ProductRow } from './products-list/ProductRow';

interface ProductListProps {
  productsRecords: Record[] | null;
  variantsRecords: Record[] | null;
  popularProductsRecords: Record[] | null;
  onNavigateToRequests: () => void;
  onNavigateToJsonUpload: () => void;
  onNavigateToBulkImages: () => void;
  onNavigateToFilters: () => void;
  onNavigateToBanners: () => void;
  onCreateProduct: () => void;
  onEditProduct: (productId: string) => void;
}

export default function ProductList({
  productsRecords,
  variantsRecords,
  popularProductsRecords,
  onNavigateToRequests,
  onNavigateToJsonUpload,
  onNavigateToBulkImages,
  onNavigateToFilters,
  onNavigateToBanners,
  onCreateProduct,
  onEditProduct,
}: ProductListProps): JSX.Element {
  const [search, setSearch] = useState('');

  // Кількість варіацій на кожен товар (для бейджа).
  const variantCountByProduct = useMemo(() => {
    const counts = new Map<string, number>();
    (variantsRecords || []).forEach((v) => {
      ((v.getCellValue(FIELDS.variant.product) as Array<{ id: string }> | null) || []).forEach((link) => {
        counts.set(link.id, (counts.get(link.id) || 0) + 1);
      });
    });
    return counts;
  }, [variantsRecords]);

  const popularIds = useMemo(() => {
    const ids = new Set<string>();
    (popularProductsRecords || []).forEach((rec) => {
      ((rec.getCellValue(FIELDS.popular.products) as Array<{ id: string }> | null) || []).forEach((l) => ids.add(l.id));
    });
    return ids;
  }, [popularProductsRecords]);

  const filteredProducts = useMemo(() => {
    if (!productsRecords) return null;
    const q = search.trim().toLowerCase();
    if (!q) return productsRecords;
    return productsRecords.filter((p) =>
      `${p.getCellValueAsString(FIELDS.product.model)} ${p.getCellValueAsString(FIELDS.product.manufacturer)}`
        .toLowerCase()
        .includes(q)
    );
  }, [productsRecords, search]);

  if (!productsRecords) {
    return (
      <Card padding={5} display="flex" justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <Text textColor="light" size="large">Завантаження товарів…</Text>
      </Card>
    );
  }

  return (
    <Box display="flex" flexDirection="column" style={{ gap: 16 }}>
      {/* Top bar */}
      <Card padding={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" flexDirection="column">
            <Heading size="large" margin={0}>Каталог товарів</Heading>
            <Text textColor="light" size="small">{productsRecords.length} позицій у базі</Text>
          </Box>
          <Box display="flex" style={{ gap: 8 }}>
            <Button icon="aiAssistant" onClick={onNavigateToRequests}>Заявки</Button>
            <Button icon="upload" onClick={onNavigateToJsonUpload}>JSON</Button>
            <Button icon="attachment" onClick={onNavigateToBulkImages}>Фото</Button>
            <Button icon="filter" onClick={onNavigateToFilters}>Фільтри</Button>
            <Button icon="gallery" onClick={onNavigateToBanners}>Банери</Button>
            <Button variant="primary" icon="plus" onClick={onCreateProduct}>Додати товар</Button>
          </Box>
        </Box>
      </Card>

      {/* List */}
      <Card padding={3}>
        <Box marginBottom={3}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук за моделлю або виробником…" />
        </Box>

        {filteredProducts && filteredProducts.length === 0 ? (
          <Box
            padding={5}
            display="flex"
            flexDirection="column"
            alignItems="center"
            style={{ border: `1px dashed ${UI.borderStrong}`, borderRadius: 12, background: UI.rowBg }}
          >
            <Icon name="search" size={24} marginBottom={2} />
            <Text textColor="light" size="large" marginBottom={3}>
              {search ? 'Нічого не знайдено' : 'Товарів поки немає'}
            </Text>
            {!search && <Button variant="primary" icon="plus" onClick={onCreateProduct}>Створити перший товар</Button>}
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
            {filteredProducts?.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                variantCount={variantCountByProduct.get(product.id) || 0}
                isPopular={popularIds.has(product.id)}
                onEdit={onEditProduct}
              />
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
}
