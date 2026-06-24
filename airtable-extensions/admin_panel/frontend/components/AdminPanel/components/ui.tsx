import React from 'react';
import { Box, Heading } from '@airtable/blocks/ui';
import { UI } from '../constants';

type Tone = 'success' | 'danger' | 'warn' | 'neutral' | 'info';

const TONES: Record<Tone, { bg: string; color: string }> = {
  success: { bg: UI.successBg, color: UI.successText },
  danger: { bg: UI.dangerBg, color: UI.dangerText },
  warn: { bg: UI.warnBg, color: UI.warnText },
  info: { bg: '#E8F0FE', color: UI.primary },
  neutral: { bg: '#EEF1F4', color: UI.textMuted },
};

/** Біла картка з тінню та м'якою рамкою — базовий контейнер CRM. */
export function Card({
  children,
  padding = 4,
  style,
  ...rest
}: React.ComponentProps<typeof Box>): JSX.Element {
  return (
    <Box
      backgroundColor={UI.cardBg}
      borderRadius="large"
      padding={padding}
      style={{ boxShadow: UI.shadow, border: `1px solid ${UI.border}`, ...style }}
      {...rest}
    >
      {children}
    </Box>
  );
}

/** Компактна кольорова мітка статусу (в наявності / немає / популярне тощо). */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }): JSX.Element {
  const t = TONES[tone];
  return (
    <Box
      as="span"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: t.bg,
        color: t.color,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: '18px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

/** Секція з верхньою лінією-роздільником, заголовком і необов'язковою дією праворуч. */
export function Section({
  title,
  action,
  first = false,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  first?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Box
      style={{
        borderTop: first ? 'none' : `1px solid ${UI.border}`,
        paddingTop: first ? 0 : 24,
        marginTop: first ? 0 : 24,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={3}>
        <Heading size="small" style={{ margin: 0 }}>
          {title}
        </Heading>
        {action}
      </Box>
      {children}
    </Box>
  );
}
