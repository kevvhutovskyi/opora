import React from 'react';
import { Box, Icon, Text } from '@airtable/blocks/ui';
import { UI } from '../constants';

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export function Breadcrumbs({ items }: { items: Crumb[] }): JSX.Element {
  return (
    <Box display="flex" alignItems="center" marginBottom={3} style={{ gap: 6, flexWrap: 'wrap' }}>
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        const clickable = !!crumb.onClick && !isLast;
        return (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevronRight" size={14} fillColor={UI.textMuted} />}
            <Text
              size="small"
              // onClick={clickable ? crumb.onClick : undefined}
              style={{
                color: isLast ? UI.text : UI.textMuted,
                fontWeight: isLast ? 600 : 400,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              {crumb.label}
            </Text>
          </React.Fragment>
        );
      })}
    </Box>
  );
}
