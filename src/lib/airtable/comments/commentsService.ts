import { airtableBase } from "..";
import { Comment } from "./types";

export async function getComments(productName?: string | null): Promise<Comment[]> {
  // If a variation is passed, we filter. Otherwise, we fetch everything.
  
  const filterByFormula = productName 
    ? `{Товар} = '${productName}'` 
    : "";

  const records = await airtableBase("Коментарі").select({
    ...(filterByFormula ? { filterByFormula } : {})
  }).all(); // .all() ensures we get everything without manual pagination

  return records.map((record) => {
    // Note: If "Варіація Товару" is a Linked Record/Lookup, Airtable might return an array. 
    // We safely stringify it just in case.
    const variationField = record.get("Товар");
    const parsedVariation = Array.isArray(variationField) ? variationField[0] : variationField;

    return {
      id: record.id,
      authorName: String(record.get("Ім'я Прізвище") || ""),
      rating: Number(record.get("Рейтинг") || 0),
      text: String(record.get("Текст") || ""),
      variation: parsedVariation ? String(parsedVariation) : undefined,
      createdAt: record.get("Створено") ? String(record.get("Створено")) : undefined, // Витягуємо дату
    };
  });
}
