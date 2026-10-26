import Dexie, { type EntityTable } from 'dexie';
import type { TPDocument } from '@/domain/document';

/** IndexedDB。テーブルを増やすときは version を上げて stores を追記する */
export class TimeParagraphDB extends Dexie {
  documents!: EntityTable<TPDocument, 'id'>;

  constructor() {
    super('timeparagraph');
    this.version(1).stores({
      documents: 'id, updatedAt',
    });
  }
}

export const db = new TimeParagraphDB();
