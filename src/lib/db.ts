import Dexie, { type EntityTable } from 'dexie';
import type { TPDocument } from '@/domain/document';
import type { Rehearsal } from '@/domain/rehearsal';

/** IndexedDB。テーブルを増やすときは version を上げて stores を追記する */
export class TimeParagraphDB extends Dexie {
  documents!: EntityTable<TPDocument, 'id'>;
  rehearsals!: EntityTable<Rehearsal, 'id'>;

  constructor() {
    super('timeparagraph');
    this.version(1).stores({
      documents: 'id, updatedAt',
    });
    this.version(2).stores({
      rehearsals: 'id, docId, startedAt',
    });
  }
}

export const db = new TimeParagraphDB();
