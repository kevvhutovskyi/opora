import React from 'react';
import { Box, Button, Heading, Text, Icon } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { FIELDS, UI } from '../../constants';
import { Badge } from '../ui';

interface ProductRowProps {
  product: Record;
  variantCount: number;
  isPopular: boolean;
  onEdit: (productId: string) => void;
}

export function ProductRow({ product, variantCount, isPopular, onEdit }: ProductRowProps): JSX.Element {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      padding={3}
      style={{ border: `1px solid ${UI.border}`, borderRadius: 10, background: UI.rowBg }}
    >
      <Box display="flex" flexDirection="column" style={{ gap: 6 }}>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <Heading size="small" margin={0}>
            {product.getCellValueAsString(FIELDS.product.model) || 'Без моделі'}
          </Heading>
          {isPopular && <Badge tone="warn">★ Популярне</Badge>}
        </Box>
        <Box display="flex" alignItems="center" style={{ gap: 12 }}>
          <Box display="flex" alignItems="center">
            <Icon name="cube" size={12} marginRight={1} />
          </Box>
          <Badge tone={variantCount > 0 ? 'info' : 'neutral'}>{variantCount} варіацій</Badge>
        </Box>
      </Box>

      <Button size="small" icon="edit" onClick={() => onEdit(product.id)}>Редагувати</Button>
    </Box>
  );
}
