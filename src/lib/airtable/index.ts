require('dotenv').config()

import Airtable from 'airtable';

export * from './schema';
export * from './products';
export * from './tables';
export * from './comments';
export * from './requests';
export * from './catalog';

export const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!,
}).base(process.env.AIRTABLE_BASE_ID!);

