// STUB of erp-web/src/config/permissions.ts: the TYPE only; erp-web's holds the 507-code catalogue, which changes with every module.

/**
 * The template's one reader, `src/lib/auth/use-permissions.ts`, imports the type and nothing
 * else, so the stub carries the type alone. A byte copy of erp-web's catalogue would go stale
 * every time a module declares its codes; a copy of the template never takes this file, and a copied feature gates its screens on
 * `ADMIN_GATE` until its own view code exists in erp-web's catalogue.
 */

/** One clean permission code. erp-web's `(typeof PERMISSION_CODES)[number]` widens to `string` too. */
export type PermissionCode = string;
