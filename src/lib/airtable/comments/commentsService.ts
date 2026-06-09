import { airtableBase } from "..";
import { FIELDS, TABLES } from "../schema";
import { Comment } from "./types";

export async function getComments(productName?: string | null): Promise<Comment[]> {
  // Якщо передано назву товару — фільтруємо, інакше беремо всі коментарі.
  const filterByFormula = productName ? `{${FIELDS.comment.product}} = '${productName}'` : "";

  const records = await airtableBase(TABLES.comments)
    .select(filterByFormula ? { filterByFormula } : {})
    .all(); // .all() гарантує отримання всіх записів без ручної пагінації

  return records.map((record) => {
    // "Товар" може бути Linked Record/Lookup → Airtable поверне масив. Безпечно розгортаємо.
    const variationField = record.get(FIELDS.comment.product);
    const parsedVariation = Array.isArray(variationField) ? variationField[0] : variationField;

    return {
      id: record.id,
      authorName: String(record.get(FIELDS.comment.authorName) || ""),
      rating: Number(record.get(FIELDS.comment.rating) || 0),
      text: String(record.get(FIELDS.comment.text) || ""),
      variation: parsedVariation ? String(parsedVariation) : undefined,
      createdAt: record.get(FIELDS.comment.createdAt) ? String(record.get(FIELDS.comment.createdAt)) : undefined,
    };
  });
}
