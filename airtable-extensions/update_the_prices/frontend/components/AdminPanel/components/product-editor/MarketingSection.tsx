import React from 'react';
import { Switch } from '@airtable/blocks/ui';
import { Record } from '@airtable/blocks/models';
import { useProductMutations } from '../../hooks/useProductMutations';
import { Section } from '../ui';

interface MarketingSectionProps {
  productId: string;
  popularRecord: Record | null;
}

export function MarketingSection({ productId, popularRecord }: MarketingSectionProps): JSX.Element {
  const { togglePopularStatus } = useProductMutations();

  return (
    <Section title="Маркетинг">
      <Switch
        value={!!popularRecord}
        onChange={() => togglePopularStatus(productId, popularRecord?.id || null)}
        label="Відображати в «Найпопулярніші Товари»"
      />
    </Section>
  );
}
