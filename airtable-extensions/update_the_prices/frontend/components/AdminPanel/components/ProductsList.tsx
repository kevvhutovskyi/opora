import React from 'react';
import { Box, Button, Heading, Text, colors } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';

interface ProductListProps {
  productsRecords: Record[] | null;
  onNavigateToRequests: () => void;
  onCreateProduct: () => void;
  onEditProduct: (productId: string) => void;
}

export default function ProductList({
  productsRecords,
  onNavigateToRequests,
  onCreateProduct,
  onEditProduct,
}: ProductListProps): JSX.Element {
  
  if (!productsRecords) {
    return (
      <Box padding={4} textAlign="center">
        <Text textColor="light">Завантаження товарів...</Text>
      </Box>
    );
  }

  return (
    <Box backgroundColor="white" padding={4} borderRadius="large">
      
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
        <Button marginRight={2} onClick={onNavigateToRequests}>
          Заявки клієнтів
        </Button>
        <Heading>Каталог товарів</Heading>
        <Button variant="primary" onClick={onCreateProduct}>
          Додати товар
        </Button>
      </Box>

      {/* Product List */}
      <Box display="flex" flexDirection="column">
        {productsRecords.length === 0 ? (
          <Text textColor="light" textAlign="center" marginTop={4}>
            Товарів поки немає. Створіть перший!
          </Text>
        ) : (
          productsRecords.map((product) => (
            <Box 
              key={product.id} 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center"
              padding={3} 
              borderBottom="thick" 
              borderColor={colors.GRAY_LIGHT_2}
            >
              <Box>
                <Heading size="small">
                  {product.getCellValueAsString('Модель') || 'Без моделі'}
                </Heading>
                <Text textColor="light">
                  {product.getCellValueAsString('Виробник') || 'Виробник не вказано'}
                </Text>
              </Box>
              <Button onClick={() => onEditProduct(product.id)}>
                Редагувати
              </Button>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}