import React, { useMemo, useState } from 'react';
import { Box, Button, Heading, Input, Select, Text } from '@airtable/blocks/ui';
import { Record, Table } from '@airtable/blocks/models';
import { FIELDS, UI } from '../constants';
import { Card, Section } from './ui';

interface CommentsManagerProps {
  commentsTable: Table | null;
  commentsRecords: Record[] | null;
  productsRecords: Record[] | null;
  onGoBack: () => void;
}

interface DraftComment {
  productId: string;
  authorName: string;
  rating: string;
  text: string;
}

const EMPTY_DRAFT: DraftComment = { productId: '', authorName: '', rating: '5', text: '' };

// Airtable UI не має <Textarea> — нативний textarea під стиль <Input>.
const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 72,
  padding: '8px 12px',
  borderRadius: 6,
  border: `1px solid ${UI.borderStrong}`,
  fontFamily: 'inherit',
  fontSize: 13,
  resize: 'vertical',
  boxSizing: 'border-box',
};

function StarRating({ value }: { value: number }): JSX.Element {
  return (
    <span style={{ color: '#F59E0B', fontSize: 14 }}>
      {'★'.repeat(Math.max(0, Math.min(5, value)))}{'☆'.repeat(Math.max(0, 5 - Math.min(5, value)))}
    </span>
  );
}

export default function CommentsManager({
  commentsTable,
  commentsRecords,
  productsRecords,
  onGoBack,
}: CommentsManagerProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [filterProductId, setFilterProductId] = useState('');
  const [draft, setDraft] = useState<DraftComment>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftComment>(EMPTY_DRAFT);

  // product id → name lookup
  const productNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (productsRecords || []).forEach((r) => m.set(r.id, r.name));
    return m;
  }, [productsRecords]);

  const productOptions = useMemo(
    () => [
      { value: '', label: 'Всі товари' },
      ...(productsRecords || []).map((r) => ({ value: r.id, label: r.name })),
    ],
    [productsRecords]
  );

  const productOptionsForForm = useMemo(
    () => [
      { value: '', label: '— Оберіть товар —' },
      ...(productsRecords || []).map((r) => ({ value: r.id, label: r.name })),
    ],
    [productsRecords]
  );

  const ratingOptions = ['1', '2', '3', '4', '5'].map((v) => ({ value: v, label: `${v} ★` }));

  const filtered = useMemo(() => {
    const all = commentsRecords || [];
    if (!filterProductId) return all;
    return all.filter((r) => {
      const raw = r.getCellValue(FIELDS.comment.product);
      const id = Array.isArray(raw) ? raw[0]?.id : (raw as any)?.id;
      return id === filterProductId;
    });
  }, [commentsRecords, filterProductId]);

  const getProductId = (r: Record): string => {
    const raw = r.getCellValue(FIELDS.comment.product);
    return (Array.isArray(raw) ? raw[0]?.id : (raw as any)?.id) ?? '';
  };

  if (!commentsTable) {
    return (
      <Card padding={5} display="flex" flexDirection="column" style={{ gap: 12 }}>
        <Button icon="chevronLeft" onClick={onGoBack} alignSelf="flex-start">Назад</Button>
        <Heading size="small" margin={0}>Таблиця «Коментарі» не знайдена</Heading>
        <Text textColor="light">
          Створіть у базі таблицю «Коментарі» з колонками: «{FIELDS.comment.product}» (Linked record → Товари),
          «{FIELDS.comment.authorName}», «{FIELDS.comment.rating}» (число), «{FIELDS.comment.text}» (текст).
        </Text>
      </Card>
    );
  }

  const save = async () => {
    if (!draft.productId) return alert('Оберіть товар.');
    if (!draft.authorName.trim()) return alert('Введіть ім\'я автора.');
    if (!draft.text.trim()) return alert('Введіть текст коментаря.');
    setBusy(true);
    try {
      await commentsTable.createRecordAsync({
        [FIELDS.comment.product]: [{ id: draft.productId }],
        [FIELDS.comment.authorName]: draft.authorName.trim(),
        [FIELDS.comment.rating]: Number(draft.rating),
        [FIELDS.comment.text]: draft.text.trim(),
      });
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      console.error(e);
      alert('Не вдалося створити коментар.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (r: Record) => {
    setEditingId(r.id);
    setEditDraft({
      productId: getProductId(r),
      authorName: r.getCellValueAsString(FIELDS.comment.authorName),
      rating: String(r.getCellValue(FIELDS.comment.rating) || 5),
      text: r.getCellValueAsString(FIELDS.comment.text),
    });
  };

  const saveEdit = async (r: Record) => {
    if (!editDraft.productId) return alert('Оберіть товар.');
    if (!editDraft.authorName.trim()) return alert('Введіть ім\'я автора.');
    if (!editDraft.text.trim()) return alert('Введіть текст коментаря.');
    setBusy(true);
    try {
      await commentsTable.updateRecordAsync(r.id, {
        [FIELDS.comment.product]: [{ id: editDraft.productId }],
        [FIELDS.comment.authorName]: editDraft.authorName.trim(),
        [FIELDS.comment.rating]: Number(editDraft.rating),
        [FIELDS.comment.text]: editDraft.text.trim(),
      });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('Не вдалося зберегти зміни.');
    } finally {
      setBusy(false);
    }
  };

  const deleteComment = async (r: Record) => {
    if (!window.confirm(`Видалити коментар від «${r.getCellValueAsString(FIELDS.comment.authorName)}»?`)) return;
    setBusy(true);
    try {
      await commentsTable.deleteRecordAsync(r.id);
      if (editingId === r.id) setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('Не вдалося видалити коментар.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" style={{ gap: 16 }}>
      <Card padding={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" flexDirection="column">
            <Heading size="large" margin={0}>Коментарі</Heading>
            <Text textColor="light" size="small">Відгуки покупців, прив'язані до товарів</Text>
          </Box>
          <Button icon="chevronLeft" onClick={onGoBack}>Назад</Button>
        </Box>
      </Card>

      <Card padding={4}>
        {/* ADD FORM */}
        <Section first title="Додати коментар">
          <Box display="flex" flexDirection="column" style={{ gap: 10 }}>
            <Box display="flex" style={{ gap: 10 }}>
              <Box flex="1">
                <Text size="small" textColor="light" marginBottom={1}>Товар</Text>
                <Select
                  options={productOptionsForForm}
                  value={draft.productId}
                  onChange={(v) => setDraft((d) => ({ ...d, productId: String(v) }))}
                  disabled={busy}
                />
              </Box>
              <Box style={{ width: 100 }}>
                <Text size="small" textColor="light" marginBottom={1}>Рейтинг</Text>
                <Select
                  options={ratingOptions}
                  value={draft.rating}
                  onChange={(v) => setDraft((d) => ({ ...d, rating: String(v) }))}
                  disabled={busy}
                />
              </Box>
            </Box>
            <Box>
              <Text size="small" textColor="light" marginBottom={1}>Ім'я автора</Text>
              <Input
                value={draft.authorName}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({ ...d, authorName: v }));
                }}
                placeholder="Ім'я Прізвище"
                disabled={busy}
              />
            </Box>
            <Box>
              <Text size="small" textColor="light" marginBottom={1}>Текст коментаря</Text>
              <textarea
                style={textareaStyle}
                value={draft.text}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({ ...d, text: v }));
                }}
                placeholder="Текст відгуку..."
                disabled={busy}
              />
            </Box>
            <Box>
              <Button icon="plus" variant="primary" disabled={busy} onClick={save}>Додати</Button>
            </Box>
          </Box>
        </Section>

        {/* FILTER */}
        <Section title={`Список коментарів (${filtered.length})`}>
          <Box marginBottom={3} style={{ maxWidth: 320 }}>
            <Text size="small" textColor="light" marginBottom={1}>Фільтр за товаром</Text>
            <Select
              options={productOptions}
              value={filterProductId}
              onChange={(v) => setFilterProductId(String(v))}
            />
          </Box>

          <Box display="flex" flexDirection="column" style={{ gap: 10 }}>
            {filtered.length === 0 && <Text textColor="light">Коментарів немає</Text>}

            {filtered.map((rec) => {
              const isEditing = editingId === rec.id;
              const productId = getProductId(rec);
              const productName = productNameMap.get(productId) || '—';

              if (isEditing) {
                return (
                  <Box
                    key={rec.id}
                    padding={3}
                    display="flex"
                    flexDirection="column"
                    style={{ gap: 10, background: UI.rowBg, border: `2px solid ${UI.primary}`, borderRadius: 8 }}
                  >
                    <Box display="flex" style={{ gap: 10 }}>
                      <Box flex="1">
                        <Text size="small" textColor="light" marginBottom={1}>Товар</Text>
                        <Select
                          options={productOptionsForForm}
                          value={editDraft.productId}
                          onChange={(v) => setEditDraft((d) => ({ ...d, productId: String(v) }))}
                          disabled={busy}
                        />
                      </Box>
                      <Box style={{ width: 100 }}>
                        <Text size="small" textColor="light" marginBottom={1}>Рейтинг</Text>
                        <Select
                          options={ratingOptions}
                          value={editDraft.rating}
                          onChange={(v) => setEditDraft((d) => ({ ...d, rating: String(v) }))}
                          disabled={busy}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Text size="small" textColor="light" marginBottom={1}>Ім'я автора</Text>
                      <Input
                        value={editDraft.authorName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditDraft((d) => ({ ...d, authorName: v }));
                        }}
                        disabled={busy}
                      />
                    </Box>
                    <Box>
                      <Text size="small" textColor="light" marginBottom={1}>Текст</Text>
                      <textarea
                        style={textareaStyle}
                        value={editDraft.text}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditDraft((d) => ({ ...d, text: v }));
                        }}
                        disabled={busy}
                      />
                    </Box>
                    <Box display="flex" style={{ gap: 8 }}>
                      <Button variant="primary" disabled={busy} onClick={() => saveEdit(rec)}>Зберегти</Button>
                      <Button disabled={busy} onClick={() => setEditingId(null)}>Скасувати</Button>
                    </Box>
                  </Box>
                );
              }

              return (
                <Box
                  key={rec.id}
                  padding={3}
                  display="flex"
                  alignItems="flex-start"
                  style={{ gap: 12, background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}
                >
                  <Box flex="1" display="flex" flexDirection="column" style={{ gap: 4 }}>
                    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                      <Text size="small" fontWeight={600}>
                        {rec.getCellValueAsString(FIELDS.comment.authorName) || '—'}
                      </Text>
                      <StarRating value={Number(rec.getCellValue(FIELDS.comment.rating)) || 0} />
                      <Text size="small" textColor="light">→ {productName}</Text>
                    </Box>
                    <Text size="small">{rec.getCellValueAsString(FIELDS.comment.text) || '—'}</Text>
                    {rec.getCellValueAsString(FIELDS.comment.createdAt) && (
                      <Text textColor="light">
                        {rec.getCellValueAsString(FIELDS.comment.createdAt)}
                      </Text>
                    )}
                  </Box>
                  <Box display="flex" style={{ gap: 4, flexShrink: 0 }}>
                    <Button size="small" icon="edit" disabled={busy} onClick={() => startEdit(rec)} />
                    <Button size="small" icon="trash" variant="danger" disabled={busy} onClick={() => deleteComment(rec)} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Section>
      </Card>
    </Box>
  );
}
