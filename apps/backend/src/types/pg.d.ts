declare module 'pg' {
  export type QueryResult<TRow = Record<string, unknown>> = {
    rows: TRow[];
  };

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<TRow = Record<string, unknown>>(
      sql: string,
      values?: readonly unknown[],
    ): Promise<QueryResult<TRow>>;
    end(): Promise<void>;
  }
}
