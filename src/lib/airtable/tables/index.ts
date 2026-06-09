import Airtable from 'airtable';
import { TABLES } from '../schema';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

export const tableProducts = base(TABLES.products);
export const tableVariants = base(TABLES.variants);
export const tableOptions = base(TABLES.options);
export const tableProductSpecs = base(TABLES.productSpecs);
export const tableSpecs = base(TABLES.specs);
export const tableRequests = base(TABLES.requests);
