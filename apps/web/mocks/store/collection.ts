import { simulateLatency, shouldSimulateError } from '../settings';

export class MockStoreError extends Error {
  readonly code: 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

  constructor(code: 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR', message: string) {
    super(message);
    this.code = code;
    this.name = 'MockStoreError';
  }
}

export interface CollectionEntity {
  id: string;
}

/**
 * In-memory, typed collection with artificial latency/error support.
 * Data lives in module scope — survives navigation within a single Node.js process.
 * Not safe for horizontal scaling, but FE-0 has a single web container.
 */
export class MockCollection<T extends CollectionEntity> {
  private readonly rows = new Map<string, T>();
  private readonly name: string;

  constructor(name: string, seed: T[] = []) {
    this.name = name;
    for (const row of seed) {
      this.rows.set(row.id, row);
    }
  }

  private async gate(): Promise<void> {
    await simulateLatency();
    if (shouldSimulateError()) {
      throw new MockStoreError('INTERNAL_ERROR', `Simulated error in ${this.name}`);
    }
  }

  async list(): Promise<T[]> {
    await this.gate();
    return Array.from(this.rows.values());
  }

  async findById(id: string): Promise<T | null> {
    await this.gate();
    return this.rows.get(id) ?? null;
  }

  async requireById(id: string): Promise<T> {
    const row = await this.findById(id);
    if (!row) {
      throw new MockStoreError('NOT_FOUND', `${this.name}:${id} not found`);
    }
    return row;
  }

  async upsert(row: T): Promise<T> {
    await this.gate();
    this.rows.set(row.id, row);
    return row;
  }

  async remove(id: string): Promise<void> {
    await this.gate();
    if (!this.rows.has(id)) {
      throw new MockStoreError('NOT_FOUND', `${this.name}:${id} not found`);
    }
    this.rows.delete(id);
  }

  size(): number {
    return this.rows.size;
  }
}
