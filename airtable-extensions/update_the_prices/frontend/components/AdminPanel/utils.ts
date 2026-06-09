import { Record } from '@airtable/blocks/models';

// Лінковані поля Airtable повертають масив об'єктів { id, name }.
type LinkedCell = Array<{ id: string; name?: string }> | null;

/** Повертає id пов'язаних записів у linked-полі (або []). */
export function getLinkedIds(record: Record, fieldName: string): string[] {
  const value = record.getCellValue(fieldName) as LinkedCell;
  return value?.map((link) => link.id) || [];
}

/** Чи пов'язаний запис із заданим id у вказаному linked-полі. */
export function isLinkedTo(record: Record, fieldName: string, id: string | null): boolean {
  if (!id) return false;
  return getLinkedIds(record, fieldName).includes(id);
}

/** Перетворює список id у формат запису linked-поля Airtable. */
export function toLinks(ids: string[]): Array<{ id: string }> {
  return ids.map((id) => ({ id }));
}
