import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

export const tableProducts = base('Товари');
export const tableVariants = base('Варіації Товарів');
export const tableOptions = base('Опції');
export const tableProductSpecs = base('Товари/Характеристики');
export const tableSpecs = base('Характеристики');
export const tableRequests = base('Запити');