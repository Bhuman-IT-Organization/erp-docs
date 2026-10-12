// STUB of erp-web/src/config/route-gates.ts: never copied into erp-web; erp-web's declares every migrated screen (staff, roles, …) and mirrors @erp/contracts, with the same markers.

/**
 * The template's route → gate map. The signatures are erp-web's (`ADMIN_GATE`, `RouteGate`,
 * `ROUTE_GATES`, `GATED_ROUTES`, `isAdminGate`, `routeGateIn`, `routeGateOf`), so `withPermission`
 * compiles against it as it does in erp-web; the declarations are only the skeleton's three
 * routes. It does not import erp-web's 507-code catalogue: a gate here is the administrator flag.
 *
 * A feature copied from this template as `<name>` adds `<name>`'s three routes by hand between the
 * `route-gates` markers of erp-web's file, each on `ADMIN_GATE` (fail closed: administrator-only) until someone replaces it
 * with the module's own view code in erp-web AND in erp-api `packages/contracts/src/route-gates.ts`
 * (the two are kept in sync by hand).
 *
 * Never a runtime authorisation source: the api gates every request.
 */

/** The administrator flag as a gate value (ADR-0034 decision 2: no permission code may express it). */
export const ADMIN_GATE = 'admin';

/** One clean permission code (a string in erp-web too: its catalogue widens to `string`), or the flag. */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- `'admin'` is documentation, as in erp-web's copy.
export type RouteGate = string | typeof ADMIN_GATE;

/** Route → gate, frozen. Keys are route paths with `:id` for a dynamic segment. */
export const ROUTE_GATES: Readonly<Record<string, RouteGate>> = Object.freeze({
  // registry start: route-gates
  '/example-item': ADMIN_GATE,
  '/example-item/new': ADMIN_GATE,
  '/example-item/:id': ADMIN_GATE,
  // registry end: route-gates
});

/** Every declared route path, sorted. */
export const GATED_ROUTES: readonly string[] = Object.keys(ROUTE_GATES).sort();

/** True when the route is gated on the administrator flag rather than on a permission code. */
export function isAdminGate(gate: RouteGate): gate is typeof ADMIN_GATE {
  return gate === ADMIN_GATE;
}

/** True when a declared route has the pathname's segments, `:id` standing for any one segment. */
function routeMatches(route: string, segments: readonly string[]): boolean {
  const declared = route.split('/').filter((part) => part !== '');
  return (
    declared.length === segments.length &&
    declared.every((segment, index) => segment === ':id' || segment === segments[index])
  );
}

/** The gate `gates` declares for a pathname: an exact key first, then an `:id` pattern; a query is ignored. */
export function routeGateIn(
  gates: Readonly<Record<string, RouteGate>>,
  pathname: string,
): RouteGate | undefined {
  const path = pathname.split('?')[0] ?? '';
  if (Object.hasOwn(gates, path)) return gates[path];
  const segments = path.split('/').filter((part) => part !== '');
  const route = Object.keys(gates)
    .sort()
    .find((key) => routeMatches(key, segments));
  return route === undefined ? undefined : gates[route];
}

/** The gate `ROUTE_GATES` declares for a pathname. */
export function routeGateOf(pathname: string): RouteGate | undefined {
  return routeGateIn(ROUTE_GATES, pathname);
}
