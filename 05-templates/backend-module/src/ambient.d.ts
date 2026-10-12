/**
 * Ambient declarations needed because `skipLibCheck` is false (locked flag).
 *
 * `tinybench` (a dependency of vitest) types `performance.now()` as the DOM-lib alias
 * `DOMHighResTimeStamp`. This is a backend; the DOM lib is not loaded and `@types/node` 22 does
 * not declare the alias. It is a plain `number` in every runtime, so declare it as such rather
 * than pulling `lib: ["DOM"]` into the compiler. Remove when `@types/node` ships the alias.
 */
type DOMHighResTimeStamp = number;

/**
 * `@fastify/csrf` (a dependency of `@fastify/csrf-protection`) types its optional `hmacKey` as
 * the WebCrypto `CryptoKey`, again a DOM-lib global that `@types/node` 22 exposes only as
 * `webcrypto.CryptoKey`. Alias it to Node's own type; the api never passes an `hmacKey`.
 */
type CryptoKey = import('node:crypto').webcrypto.CryptoKey;
