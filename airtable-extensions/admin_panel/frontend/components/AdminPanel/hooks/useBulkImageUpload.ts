import { useMemo, useState } from 'react';
import { Record } from '@airtable/blocks/models';
import { FIELDS } from '../constants';
import { mediaApi } from '../services/mediaApi';

// Скільки фото відправляємо в одному запиті (щоб не впертися в ліміт тіла Worker'а).
const CHUNK_SIZE = 8;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i;
// Службові теки в дереві фото, які треба ігнорувати.
const SKIP_DIRS = new Set(['refs', 'output']);

// ─── Кольорова мапа ───────────────────────────────────────────────────────────
// Зіставлення англ. токена з теки (напр. "beige") з тим, що реально зберігається
// в Airtable: назвою опції (укр., напр. «Беж») та/або кодом в артикулі (напр. "BEI").
// Збіг шукаємо В ОБОХ джерелах, тож працює незалежно від того, як заповнена база.
// Якщо якийсь колір не зіставляється — додайте сюди його корінь/код (один рядок).
const BASE_COLORS: { [base: string]: { lat: string[]; ukr: string[] } } = {
  beige: { lat: ['bei', 'beige', 'bej', 'be'], ukr: ['беж'] },
  black: { lat: ['blk', 'black', 'bl'], ukr: ['чорн', 'черн'] },
  white: { lat: ['wht', 'white', 'wh'], ukr: ['біл', 'бел'] },
  brown: { lat: ['brn', 'brown', 'brw', 'br'], ukr: ['коричн', 'браун'] },
  gray: { lat: ['gry', 'gray', 'grey', 'gr'], ukr: ['сір', 'сер'] },
  taupe: { lat: ['tau', 'taupe', 'tpe', 'tp'], ukr: ['тауп', 'мокко'] },
};
// Маркери відтінку (світло-/темно-) в назвах та артикулах.
const LIGHT_MARKERS = ['світл', 'light', 'свет'];
const DARK_MARKERS = ['темн', 'dark'];

interface ColorSpec {
  base: string;             // ключ у BASE_COLORS
  shade: 'light' | 'dark' | null;
}

// "light-beige" -> { base: 'beige', shade: 'light' }; "beige" -> { base, shade: null }.
function parseColor(token: string): ColorSpec | null {
  let shade: ColorSpec['shade'] = null;
  let base = token.toLowerCase().trim();
  if (base.startsWith('light-')) { shade = 'light'; base = base.slice('light-'.length); }
  else if (base.startsWith('dark-')) { shade = 'dark'; base = base.slice('dark-'.length); }
  base = base.replace(/-/g, '');
  return BASE_COLORS[base] ? { base, shade } : null;
}

// Чи відповідає колір рядку-назви опції (укр.) та/або коду в артикулі.
function colorMatches(spec: ColorSpec, optionName: string, skuCode: string): boolean {
  const name = optionName.toLowerCase();
  const code = skuCode.toLowerCase();
  const dict = BASE_COLORS[spec.base];

  const baseInName = dict.ukr.some((r) => name.includes(r)) || dict.lat.some((r) => name.includes(r));
  const baseInCode = dict.lat.some((r) => code.includes(r));
  if (!baseInName && !baseInCode) return false;

  // Відтінок: у назві — словом ("світло"/"темно"), в артикулі — префіксом L/D.
  const sawLight = LIGHT_MARKERS.some((m) => name.includes(m)) || code.startsWith('l');
  const sawDark = DARK_MARKERS.some((m) => name.includes(m)) || code.startsWith('d');

  if (spec.shade === 'light') return sawLight;
  if (spec.shade === 'dark') return sawDark;
  // Без відтінку — переконуємось, що це НЕ світла/темна варіація того ж кольору.
  return !sawLight && !sawDark;
}

// Розкладає артикул на коди кольорів: PRODUCT-SIT-LEGS -> { sit, legs }.
// Перший сегмент — код товару; останній — ніжки; решта (можливо складена) — сидіння.
function skuColorCodes(sku: string): { sit: string; legs: string } {
  const segs = sku.split(/[-_\s]+/).filter(Boolean);
  if (segs.length < 2) return { sit: '', legs: '' };
  const colorSegs = segs.slice(1); // прибираємо код товару
  if (colorSegs.length === 1) return { sit: '', legs: colorSegs[0] };
  return { sit: colorSegs.slice(0, -1).join(''), legs: colorSegs[colorSegs.length - 1] };
}

// Нормалізація назви товару для зіставлення з текою.
const normalize = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, '-');

const isImage = (file: File): boolean =>
  file.type.startsWith('image/') || IMAGE_EXT.test(file.name);

interface VariantInfo {
  id: string;
  sku: string;
  sitOptionName: string;
  legOptionName: string;
}

export interface MatchRow {
  key: string;            // "<product>/<combo>"
  product: string;        // тека товару (кирилиця, напр. "Міла")
  combo: string;          // тека кольору (англ., напр. "beige-black")
  productId: string | null;
  files: File[];
  variantId: string | null;
  matchedAuto: boolean;
}

export interface VariantOption {
  value: string;
  label: string;
}

interface BulkImageUploadArgs {
  productsRecords: Record[] | null;
  variantsRecords: Record[] | null;
  optionsRecords: Record[] | null;
}

// Розбиває webkitRelativePath на { product, combo }.
// Форми: "<product>/output/<combo>/<file>" або "<product>/<combo>/<file>".
function parsePath(path: string): { product: string; combo: string } | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const combo = parts[parts.length - 2];
  if (SKIP_DIRS.has(combo)) return null;
  let pi = parts.length - 3;
  while (pi >= 0 && SKIP_DIRS.has(parts[pi])) pi--;
  const product = pi >= 0 ? parts[pi] : '';
  return { product, combo };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useBulkImageUpload({ productsRecords, variantsRecords, optionsRecords }: BulkImageUploadArgs) {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  // optionId -> назва опції (напр. «Колір оббивки: Беж»).
  const optionNameById = useMemo(() => {
    const map = new Map<string, string>();
    (optionsRecords || []).forEach((o) => map.set(o.id, o.getCellValueAsString(FIELDS.option.name)));
    return map;
  }, [optionsRecords]);

  // normalize(Модель) -> productId, і productId -> Модель.
  const { productByName, modelById } = useMemo(() => {
    const byName = new Map<string, string>();
    const byId = new Map<string, string>();
    (productsRecords || []).forEach((p) => {
      const model = p.getCellValueAsString(FIELDS.product.model);
      byId.set(p.id, model);
      if (model) byName.set(normalize(model), p.id);
    });
    return { productByName: byName, modelById: byId };
  }, [productsRecords]);

  // productId -> [VariantInfo] (з назвами опцій сидіння/ніжок).
  const variantsByProduct = useMemo(() => {
    const map = new Map<string, VariantInfo[]>();
    (variantsRecords || []).forEach((v) => {
      const sku = v.getCellValueAsString(FIELDS.variant.sku);
      const optLinks = (v.getCellValue(FIELDS.variant.options) as Array<{ id: string; name?: string }> | null) || [];
      const optNames = optLinks.map((l) => optionNameById.get(l.id) || l.name || '');

      let sitOptionName = '';
      let legOptionName = '';
      optNames.forEach((n) => {
        const low = n.toLowerCase();
        if (low.includes('ніж')) legOptionName = n;
        else if (low.includes('оббив') || low.includes('сидін')) sitOptionName = n;
      });
      // Якщо префіксів немає — беремо за порядком: [0]=сидіння, [1]=ніжки.
      if (!sitOptionName && optNames[0]) sitOptionName = optNames[0];
      if (!legOptionName && optNames[1]) legOptionName = optNames[1];

      const info: VariantInfo = { id: v.id, sku, sitOptionName, legOptionName };
      const links = (v.getCellValue(FIELDS.variant.product) as Array<{ id: string }> | null) || [];
      links.forEach((link) => {
        const list = map.get(link.id) || [];
        list.push(info);
        map.set(link.id, list);
      });
    });
    return map;
  }, [variantsRecords, optionNameById]);

  // Опції дропдауна по товару (для ручного вибору) + плаский список.
  const variantOptionsByProduct = useMemo(() => {
    const map = new Map<string, VariantOption[]>();
    variantsByProduct.forEach((list, productId) => {
      const model = modelById.get(productId) || '';
      map.set(
        productId,
        list
          .map((v) => ({ value: v.id, label: model ? `${model} — ${v.sku}` : v.sku }))
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    });
    return map;
  }, [variantsByProduct, modelById]);

  const allVariantOptions = useMemo<VariantOption[]>(
    () => [...variantOptionsByProduct.values()].flat().sort((a, b) => a.label.localeCompare(b.label)),
    [variantOptionsByProduct]
  );

  const optionsForRow = (row: MatchRow): VariantOption[] =>
    (row.productId && variantOptionsByProduct.get(row.productId)) || allVariantOptions;

  // Підбирає варіацію товару за кольорами теки (сидіння-ніжки).
  function matchVariant(productId: string, combo: string): string | null {
    const tokens = combo.split('-');
    const legSpec = parseColor(tokens[tokens.length - 1]);
    const sitSpec = tokens.length > 1 ? parseColor(tokens.slice(0, -1).join('-')) : null;
    if (!legSpec && !sitSpec) return null;

    const candidates = variantsByProduct.get(productId) || [];
    const found = candidates.find((v) => {
      const codes = skuColorCodes(v.sku);
      const legOk = !legSpec || colorMatches(legSpec, v.legOptionName, codes.legs);
      const sitOk = !sitSpec || colorMatches(sitSpec, v.sitOptionName, codes.sit);
      return legOk && sitOk;
    });
    return found ? found.id : null;
  }

  const handleFiles = (fileList: FileList | null) => {
    setLog([]);
    setIsDone(false);
    if (!fileList || fileList.length === 0) {
      setRows([]);
      return;
    }

    const groups = new Map<string, { product: string; combo: string; files: File[] }>();
    Array.from(fileList).forEach((file) => {
      if (!isImage(file)) return;
      const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const parsed = parsePath(path);
      if (!parsed) return;
      const key = `${parsed.product}/${parsed.combo}`;
      const group = groups.get(key) || { product: parsed.product, combo: parsed.combo, files: [] };
      group.files.push(file);
      groups.set(key, group);
    });

    const next: MatchRow[] = [...groups.entries()]
      .map(([key, g]) => {
        const productId = productByName.get(normalize(g.product)) || null;
        const variantId = productId ? matchVariant(productId, g.combo) : null;
        return {
          key,
          product: g.product,
          combo: g.combo,
          productId,
          files: g.files,
          variantId,
          matchedAuto: !!variantId,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));

    setRows(next);
  };

  const setVariantForRow = (key: string, variantId: string | null) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, variantId, matchedAuto: false } : r)));
  };

  const stats = useMemo(() => {
    const files = rows.reduce((sum, r) => sum + r.files.length, 0);
    const matched = rows.filter((r) => r.variantId).length;
    return { folders: rows.length, files, matched, unmatched: rows.length - matched };
  }, [rows]);

  const handleUpload = async () => {
    setIsUploading(true);
    setLog([]);

    let okVariants = 0;
    let failVariants = 0;
    let totalFiles = 0;

    for (const row of rows) {
      if (!row.variantId) {
        addLog(`[${row.product} / ${row.combo}] ПРОПУЩЕНО — варіацію не призначено`);
        continue;
      }
      try {
        const chunks = chunk(row.files, CHUNK_SIZE);
        let done = 0;
        for (let i = 0; i < chunks.length; i++) {
          // Перший чанк перезаписує наявні фото, решта — додає.
          await mediaApi.uploadImages(chunks[i], row.variantId, i === 0);
          done += chunks[i].length;
          addLog(`[${row.product} / ${row.combo}] ${done}/${row.files.length} завантажено`);
        }
        okVariants++;
        totalFiles += row.files.length;
      } catch (error) {
        failVariants++;
        addLog(`[${row.product} / ${row.combo}] ПОМИЛКА: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    addLog(
      `--- Готово: ${okVariants} варіацій, ${totalFiles} фото${failVariants ? `, помилок: ${failVariants}` : ''} ---`
    );
    setIsDone(true);
    setIsUploading(false);
  };

  const handleReset = () => {
    setRows([]);
    setLog([]);
    setIsDone(false);
  };

  return {
    rows,
    stats,
    optionsForRow,
    isUploading,
    isDone,
    log,
    handleFiles,
    setVariantForRow,
    handleUpload,
    handleReset,
  };
}
