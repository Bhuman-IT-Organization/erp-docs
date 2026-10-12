// STUB of erp-api/src/shared/db/prisma.service.ts — never copied into erp-api; the real service wraps the generated, ownership-guarded client
/**
 * The template compiles without `@prisma/client` or a generated client, so this stub types the one
 * member the skeleton's repository uses: the tagged-template `$queryRaw`. Inside erp-api the same
 * import path resolves to the real `PrismaService`, whose `client` is the generated client wrapped by
 * the ownership guard (ADR-0029) — a `SELECT` passes, a write to a table `node` does not own is
 * rejected. Nothing a module can do against this stub is admitted by the real client unless the
 * ownership register says so; `shared-manifest.json` lists this file under `stubs`, not `copied`.
 */
export interface PrismaClientLike {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

/** The stub service: `client` is typed as `PrismaClientLike` and is never constructed here. */
export class PrismaService {
  readonly client!: PrismaClientLike;
}
