import React, { useMemo, useState } from 'react';
import { Box, Button, Heading, Text } from '@airtable/blocks/ui';
import { FieldType, Record, Table } from '@airtable/blocks/models';
import { mediaApi } from '../services/mediaApi';
import { BANNER_TYPES, FIELDS, TABLES, UI } from '../constants';
import { Card, Section } from './ui';

interface BannersManagerProps {
  bannersTable: Table | null;
  bannersRecords: Record[] | null;
  onGoBack: () => void;
}

// Допустимі значення ширини плитки категорії в сітці на головній (single-select «Ширина»).
const CATEGORY_COLSPANS = ['1', '2', '3', '4'] as const;

/** Прев'ю зображення банера. */
function Preview({ url }: { url: string }): JSX.Element {
  if (!url) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        style={{ width: 200, height: 112, background: UI.rowBg, border: `1px dashed ${UI.borderStrong}`, borderRadius: 8, flexShrink: 0 }}
      >
        <Text textColor="light" size="small">Немає фото</Text>
      </Box>
    );
  }
  return (
    <img
      src={url}
      alt=""
      style={{ width: 200, height: 112, objectFit: 'cover', borderRadius: 8, border: `1px solid ${UI.border}`, flexShrink: 0 }}
    />
  );
}

export default function BannersManager({ bannersTable, bannersRecords, onGoBack }: BannersManagerProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const sliderRecords = useMemo(
    () =>
      (bannersRecords || [])
        .filter((r) => r.getCellValueAsString(FIELDS.banner.type) === BANNER_TYPES.slider)
        .sort(
          (a, b) =>
            (Number(a.getCellValue(FIELDS.banner.order)) || 0) - (Number(b.getCellValue(FIELDS.banner.order)) || 0)
        ),
    [bannersRecords]
  );

  const catalogRecord = useMemo(
    () => (bannersRecords || []).find((r) => r.getCellValueAsString(FIELDS.banner.type) === BANNER_TYPES.catalog) || null,
    [bannersRecords]
  );

  // Категорійні банери, відсортовані за «Порядок» — порядок плиток на головній.
  const categoryRecords = useMemo(
    () =>
      (bannersRecords || [])
        .filter((r) => r.getCellValueAsString(FIELDS.banner.type) === BANNER_TYPES.category)
        .sort(
          (a, b) =>
            (Number(a.getCellValue(FIELDS.banner.order)) || 0) - (Number(b.getCellValue(FIELDS.banner.order)) || 0)
        ),
    [bannersRecords]
  );

  if (!bannersTable) {
    return (
      <Card padding={5} display="flex" flexDirection="column" style={{ gap: 12 }}>
        <Button icon="chevronLeft" onClick={onGoBack} alignSelf="flex-start">Назад</Button>
        <Heading size="small" margin={0}>Таблиця «{TABLES.banners}» не знайдена</Heading>
        <Text textColor="light">
          Створіть у базі таблицю «{TABLES.banners}» з колонками: «{FIELDS.banner.name}» (текст, первинна),
          «{FIELDS.banner.type}» (single select: «{BANNER_TYPES.slider}», «{BANNER_TYPES.catalog}»),
          «{FIELDS.banner.image}» (текст/URL), «{FIELDS.banner.order}» (число), «{FIELDS.banner.active}» (чекбокс).
        </Text>
      </Card>
    );
  }

  // Гарантуємо, що в single-select полі «Тип» існує потрібна опція перед створенням запису.
  // Без цього createRecordAsync падає — саме це ламало завантаження для категорій:
  // опції «Категорія» могло не бути серед варіантів поля (на відміну від «Слайдер»/«Каталог»).
  const ensureBannerType = async (typeName: string) => {
    const field = bannersTable.getFieldByNameIfExists(FIELDS.banner.type);
    // Якщо це не single-select (напр. текстове поле) — додавати опцію не треба.
    if (!field || field.type !== FieldType.SINGLE_SELECT) return;
    const choices = (field.options?.choices as Array<{ name: string }>) ?? [];
    if (choices.some((c) => c.name === typeName)) return;
    const updated = { choices: [...choices, { name: typeName }] };
    if (!field.hasPermissionToUpdateOptions(updated)) {
      throw new Error(
        `У полі «${FIELDS.banner.type}» немає опції «${typeName}», і бракує прав додати її. Додайте цю опцію вручну в Airtable.`
      );
    }
    await field.updateOptionsAsync(updated);
  };

  // Створює колонку, якщо її ще немає (для «Посилання» / «Ширина» на категорійних банерах).
  // Якщо бракує прав — кидаємо зрозумілу помилку, щоб клієнт додав колонку вручну.
  const ensureField = async (name: string, type: FieldType, options?: unknown) => {
    if (bannersTable.getFieldByNameIfExists(name)) return;
    if (!bannersTable.hasPermissionToCreateField(name, type, options as never)) {
      throw new Error(`Немає колонки «${name}» у таблиці «${TABLES.banners}», і бракує прав створити її. Додайте її вручну в Airtable.`);
    }
    await bannersTable.createFieldAsync(name, type, options as never);
  };

  // Гарантуємо наявність колонки «Ширина» — текстове поле (число рядком "1"–"4"),
  // щоб уникнути формату single-select і працювати з колонкою, створеною вручну.
  const ensureCategoryFields = async () => {
    await ensureField(FIELDS.banner.colSpan, FieldType.SINGLE_LINE_TEXT);
  };

  const addSlide = async (file: File) => {
    setBusy(true);
    try {
      const url = await mediaApi.uploadBanner(file);
      await ensureBannerType(BANNER_TYPES.slider);
      const nextOrder = sliderRecords.length
        ? Math.max(...sliderRecords.map((r) => Number(r.getCellValue(FIELDS.banner.order)) || 0)) + 1
        : 1;
      await bannersTable.createRecordAsync({
        [FIELDS.banner.name]: `Слайд ${nextOrder}`,
        [FIELDS.banner.type]: { name: BANNER_TYPES.slider },
        [FIELDS.banner.image]: url,
        [FIELDS.banner.order]: nextOrder,
        [FIELDS.banner.active]: true,
      });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не вдалося завантажити зображення.');
    } finally {
      setBusy(false);
    }
  };

  const replaceImage = async (record: Record, file: File) => {
    setBusy(true);
    try {
      const oldUrl = record.getCellValueAsString(FIELDS.banner.image);
      const url = await mediaApi.uploadBanner(file);
      await bannersTable.updateRecordAsync(record.id, { [FIELDS.banner.image]: url });
      if (oldUrl && oldUrl !== url) await mediaApi.deleteBanner(oldUrl).catch(() => {});
    } catch (e) {
      console.error(e);
      alert('Не вдалося оновити зображення.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSlide = async (record: Record) => {
    if (!window.confirm('Видалити цей слайд разом із фото?')) return;
    setBusy(true);
    try {
      const url = record.getCellValueAsString(FIELDS.banner.image);
      await bannersTable.deleteRecordAsync(record.id);
      if (url) await mediaApi.deleteBanner(url).catch(() => {});
    } catch (e) {
      console.error(e);
      alert('Не вдалося видалити слайд.');
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= sliderRecords.length) return;
    const a = sliderRecords[index];
    const b = sliderRecords[target];
    const aOrder = Number(a.getCellValue(FIELDS.banner.order)) || 0;
    const bOrder = Number(b.getCellValue(FIELDS.banner.order)) || 0;
    setBusy(true);
    try {
      await bannersTable.updateRecordsAsync([
        { id: a.id, fields: { [FIELDS.banner.order]: bOrder } },
        { id: b.id, fields: { [FIELDS.banner.order]: aOrder } },
      ]);
    } catch (e) {
      console.error(e);
      alert('Не вдалося змінити порядок.');
    } finally {
      setBusy(false);
    }
  };

  const setCatalogImage = async (file: File) => {
    setBusy(true);
    try {
      const url = await mediaApi.uploadBanner(file);
      if (catalogRecord) {
        const oldUrl = catalogRecord.getCellValueAsString(FIELDS.banner.image);
        await bannersTable.updateRecordAsync(catalogRecord.id, { [FIELDS.banner.image]: url });
        if (oldUrl && oldUrl !== url) await mediaApi.deleteBanner(oldUrl).catch(() => {});
      } else {
        await ensureBannerType(BANNER_TYPES.catalog);
        await bannersTable.createRecordAsync({
          [FIELDS.banner.name]: 'Каталог Hero',
          [FIELDS.banner.type]: { name: BANNER_TYPES.catalog },
          [FIELDS.banner.image]: url,
          [FIELDS.banner.active]: true,
        });
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не вдалося завантажити зображення.');
    } finally {
      setBusy(false);
    }
  };

  const onPick = (handler: (file: File) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handler(file);
    e.target.value = '';
  };

  const catalogUrl = catalogRecord?.getCellValueAsString(FIELDS.banner.image) || '';

  const addCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await ensureBannerType(BANNER_TYPES.category);
      await ensureCategoryFields();
      const nextOrder = categoryRecords.length
        ? Math.max(...categoryRecords.map((r) => Number(r.getCellValue(FIELDS.banner.order)) || 0)) + 1
        : 1;
      await bannersTable.createRecordAsync({
        [FIELDS.banner.name]: trimmed,
        [FIELDS.banner.type]: { name: BANNER_TYPES.category },
        [FIELDS.banner.order]: nextOrder,
        [FIELDS.banner.colSpan]: '1',
        [FIELDS.banner.active]: true,
      });
      setNewCategoryName('');
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не вдалося додати категорію.');
    } finally {
      setBusy(false);
    }
  };

  const setCategoryColSpan = async (record: Record, colSpan: string) => {
    setBusy(true);
    try {
      await ensureCategoryFields();
      await bannersTable.updateRecordAsync(record.id, { [FIELDS.banner.colSpan]: colSpan });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Не вдалося змінити ширину.');
    } finally {
      setBusy(false);
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= categoryRecords.length) return;
    const a = categoryRecords[index];
    const b = categoryRecords[target];
    const aOrder = Number(a.getCellValue(FIELDS.banner.order)) || 0;
    const bOrder = Number(b.getCellValue(FIELDS.banner.order)) || 0;
    setBusy(true);
    try {
      await bannersTable.updateRecordsAsync([
        { id: a.id, fields: { [FIELDS.banner.order]: bOrder } },
        { id: b.id, fields: { [FIELDS.banner.order]: aOrder } },
      ]);
    } catch (e) {
      console.error(e);
      alert('Не вдалося змінити порядок.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (record: Record) => {
    const name = record.getCellValueAsString(FIELDS.banner.name);
    if (!window.confirm(`Видалити категорію «${name}» разом із фото?`)) return;
    setBusy(true);
    try {
      const url = record.getCellValueAsString(FIELDS.banner.image);
      await bannersTable.deleteRecordAsync(record.id);
      if (url) await mediaApi.deleteBanner(url).catch(() => {});
    } catch (e) {
      console.error(e);
      alert('Не вдалося видалити категорію.');
    } finally {
      setBusy(false);
    }
  };

  const removeCategoryImage = async (record: Record) => {
    if (!window.confirm('Видалити зображення категорії?')) return;
    setBusy(true);
    try {
      const url = record.getCellValueAsString(FIELDS.banner.image);
      await bannersTable.updateRecordAsync(record.id, { [FIELDS.banner.image]: '' });
      if (url) await mediaApi.deleteBanner(url).catch(() => {});
    } catch (e) {
      console.error(e);
      alert('Не вдалося видалити зображення.');
    } finally {
      setBusy(false);
    }
  };

  const removeCatalogImage = async () => {
    if (!catalogRecord) return;
    if (!window.confirm('Видалити зображення банера каталогу?')) return;
    setBusy(true);
    try {
      const url = catalogRecord.getCellValueAsString(FIELDS.banner.image);
      await bannersTable.updateRecordAsync(catalogRecord.id, { [FIELDS.banner.image]: '' });
      if (url) await mediaApi.deleteBanner(url).catch(() => {});
    } catch (e) {
      console.error(e);
      alert('Не вдалося видалити зображення.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" style={{ gap: 16 }}>
      <Card padding={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" flexDirection="column">
            <Heading size="large" margin={0}>Банери</Heading>
            <Text textColor="light" size="small">Фото головного слайдера та банера каталогу (Cloudflare R2)</Text>
          </Box>
          <Button icon="chevronLeft" onClick={onGoBack}>Назад</Button>
        </Box>
      </Card>

      <Card padding={4}>
        {/* HERO SLIDER */}
        <Section first title={`Hero Slider — слайди (${sliderRecords.length})`}>
          <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
            {sliderRecords.map((rec, idx, arr) => {
              const url = rec.getCellValueAsString(FIELDS.banner.image);
              return (
                <Box
                  key={rec.id}
                  display="flex"
                  alignItems="center"
                  padding={2}
                  style={{ gap: 16, background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}
                >
                  <Preview url={url} />
                  <Box flex="1" display="flex" flexDirection="column" style={{ gap: 6 }}>
                    <Text size="small" fontWeight={600}>{rec.getCellValueAsString(FIELDS.banner.name) || `Слайд ${idx + 1}`}</Text>
                    <Box>
                      <Text size="small" textColor="light" marginBottom={1}>Замінити фото:</Text>
                      <input type="file" accept="image/*" disabled={busy} onChange={onPick((f) => replaceImage(rec, f))} />
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" flexShrink={0} style={{ gap: 4 }}>
                    <Button size="small" icon="chevronUp" disabled={busy || idx === 0} onClick={() => move(idx, 'up')} />
                    <Button size="small" icon="chevronDown" disabled={busy || idx === arr.length - 1} onClick={() => move(idx, 'down')} />
                    <Button size="small" icon="trash" variant="danger" disabled={busy} onClick={() => deleteSlide(rec)} />
                  </Box>
                </Box>
              );
            })}
            {sliderRecords.length === 0 && <Text textColor="light">Слайдів ще немає</Text>}
          </Box>

          <Box marginTop={3}>
            <Text size="small" textColor="light" marginBottom={1}>Додати слайд (завантажити фото):</Text>
            <input type="file" accept="image/*" disabled={busy} onChange={onPick(addSlide)} />
          </Box>
        </Section>

        {/* CATALOG HERO */}
        <Section title="Catalog Hero — банер каталогу">
          <Box display="flex" alignItems="center" style={{ gap: 16 }}>
            <Preview url={catalogUrl} />
            <Box flex="1" display="flex" flexDirection="column" style={{ gap: 8 }}>
              <Box>
                <Text size="small" textColor="light" marginBottom={1}>
                  {catalogUrl ? 'Замінити фото:' : 'Завантажити фото:'}
                </Text>
                <input type="file" accept="image/*" disabled={busy} onChange={onPick(setCatalogImage)} />
              </Box>
              {catalogUrl && (
                <Box>
                  <Button size="small" icon="trash" variant="danger" disabled={busy} onClick={removeCatalogImage}>
                    Видалити фото
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </Section>

        {/* CATEGORIES */}
        <Section title={`Категорії — плитки на головній (${categoryRecords.length})`}>
          <Text size="small" textColor="light" marginBottom={2}>
            Назва має точно збігатися зі значенням поля «Каталог» у товарах — плитка веде на /catalog?type=Назва.
          </Text>
          <Box display="flex" flexDirection="column" style={{ gap: 12 }}>
            {categoryRecords.map((rec, idx, arr) => {
              const name = rec.getCellValueAsString(FIELDS.banner.name);
              const url = rec.getCellValueAsString(FIELDS.banner.image);
              const colSpan = rec.getCellValueAsString(FIELDS.banner.colSpan) || '1';
              return (
                <Box
                  key={rec.id}
                  display="flex"
                  alignItems="center"
                  padding={2}
                  style={{ gap: 16, background: UI.rowBg, border: `1px solid ${UI.border}`, borderRadius: 8 }}
                >
                  <Preview url={url} />
                  <Box flex="1" display="flex" flexDirection="column" style={{ gap: 8 }}>
                    <Text size="small" fontWeight={600}>{name}</Text>
                    <Box>
                      <Text size="small" textColor="light" marginBottom={1}>
                        {url ? 'Замінити фото:' : 'Завантажити фото:'}
                      </Text>
                      <input type="file" accept="image/*" disabled={busy} onChange={onPick((f) => replaceImage(rec, f))} />
                    </Box>
                    <Box>
                      <Text size="small" textColor="light" marginBottom={1}>Ширина (1–4):</Text>
                      <select
                        value={colSpan}
                        disabled={busy}
                        onChange={(e) => setCategoryColSpan(rec, e.target.value)}
                        style={{ padding: '6px 8px', border: `1px solid ${UI.border}`, borderRadius: 6 }}
                      >
                        {CATEGORY_COLSPANS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Box>
                    <Box display="flex" style={{ gap: 4 }}>
                      {url && (
                        <Button size="small" icon="trash" variant="danger" disabled={busy} onClick={() => removeCategoryImage(rec)}>
                          Прибрати фото
                        </Button>
                      )}
                      <Button size="small" icon="trash" variant="danger" disabled={busy} onClick={() => deleteCategory(rec)}>
                        Видалити категорію
                      </Button>
                    </Box>
                  </Box>
                  <Box display="flex" flexDirection="column" flexShrink={0} style={{ gap: 4 }}>
                    <Button size="small" icon="chevronUp" disabled={busy || idx === 0} onClick={() => moveCategory(idx, 'up')} />
                    <Button size="small" icon="chevronDown" disabled={busy || idx === arr.length - 1} onClick={() => moveCategory(idx, 'down')} />
                  </Box>
                </Box>
              );
            })}
            {categoryRecords.length === 0 && <Text textColor="light">Категорій ще немає</Text>}
          </Box>

          <Box marginTop={3} display="flex" alignItems="flex-end" style={{ gap: 8 }}>
            <Box flex="1">
              <Text size="small" textColor="light" marginBottom={1}>Назва нової категорії:</Text>
              <input
                type="text"
                value={newCategoryName}
                placeholder="Напр. Стільці"
                disabled={busy}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: `1px solid ${UI.border}`, borderRadius: 6 }}
              />
            </Box>
            <Button icon="plus" disabled={busy || !newCategoryName.trim()} onClick={() => addCategory(newCategoryName)}>
              Додати категорію
            </Button>
          </Box>
        </Section>

        {busy && <Text textColor="light" marginTop={3}>Завантаження в Cloudflare R2… ⏳</Text>}
      </Card>
    </Box>
  );
}
