import { FieldSet, Record as AirtableRecord, Records } from "airtable";

// Минимальная структурная типизация таблиці Airtable, достатня для select().all().
type SelectableTable = {
  select: (params?: Record<string, unknown>) => { all: () => Promise<Records<FieldSet>> };
};

/**
 * Будує формулу `filterByFormula` для вибірки записів за їхніми RECORD_ID().
 * Один id повертається без обгортки OR() (Airtable так надійніше).
 */
export function recordIdFormula(ids: string[]): string {
  const conditions = ids.map((id) => `RECORD_ID()='${id}'`);
  return conditions.length === 1 ? conditions[0] : `OR(${conditions.join(",")})`;
}

/**
 * Дістає записи за списком record id, розбиваючи запит на частини, щоб не
 * впертися в обмеження довжини формули Airtable. Дублікати id ігноруються,
 * порожній список повертає [] без жодного запиту.
 */
export async function fetchRecordsByIds(
  table: SelectableTable,
  ids: string[],
  chunkSize = 50
): Promise<AirtableRecord<FieldSet>[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const records: AirtableRecord<FieldSet>[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const chunkRecords = await table
      .select({ filterByFormula: recordIdFormula(chunk) })
      .all();
    records.push(...chunkRecords);
  }
  return records;
}

/** Індексує записи Airtable за їхнім id для O(1) доступу. */
export function indexById(
  records: AirtableRecord<FieldSet>[]
): Map<string, AirtableRecord<FieldSet>> {
  return new Map(records.map((record) => [record.id, record]));
}

/** Парсить поле з URL-ами зображень (розділені комами або новими рядками). */
export function parseImageUrls(raw: unknown): string[] {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}
