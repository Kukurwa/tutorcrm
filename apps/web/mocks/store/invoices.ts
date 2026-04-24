import type { Invoice, InvoiceEvent } from '@tutorcrm/contracts';

import { MockCollection } from './collection';

export const invoicesStore = new MockCollection<Invoice>('invoices', []);
export const invoiceEventsStore = new MockCollection<InvoiceEvent>('invoice_events', []);
