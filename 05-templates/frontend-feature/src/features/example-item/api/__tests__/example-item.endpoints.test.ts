import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_ITEM_ENDPOINTS,
  EXAMPLE_ITEM_ERRORS,
  EXAMPLE_ITEM_EXPORT_COLUMNS,
  EXAMPLE_ITEM_EXPORT_PATH,
  EXAMPLE_ITEM_PATH,
  exampleItemHooks,
  exampleItemPath,
  NOT_FOUND_CODE,
  VALIDATION_CODE,
} from '../example-item.endpoints';

describe('example-item endpoints', () => {
  it('declares exactly the five calls the api module serves, method and path (05-templates/backend-module)', () => {
    expect(EXAMPLE_ITEM_ENDPOINTS).toEqual({
      list: { method: 'GET', path: '/api/v1/example-item' },
      export: { method: 'GET', path: '/api/v1/example-item/export' },
      detail: { method: 'GET', path: '/api/v1/example-item/:id' },
      create: { method: 'POST', path: '/api/v1/example-item' },
      update: { method: 'PATCH', path: '/api/v1/example-item/:id' },
    });
  });

  it('derives the list, the export and a record path from the table, the id encoded', () => {
    expect(EXAMPLE_ITEM_PATH).toBe(EXAMPLE_ITEM_ENDPOINTS.list.path);
    expect(EXAMPLE_ITEM_EXPORT_PATH).toBe(EXAMPLE_ITEM_ENDPOINTS.export.path);
    expect(exampleItemPath('a b')).toBe('/api/v1/example-item/a%20b');
    expect(exampleItemPath('a/1')).toBe('/api/v1/example-item/a%2F1');
  });

  it('lists the export columns in the api order, one label each (D-42)', () => {
    expect(EXAMPLE_ITEM_EXPORT_COLUMNS).toEqual(['id', 'name', 'label', 'createdAt']);
  });

  it("names the feature's own error code: a record that does not exist, or that the caller may not read (D-32)", () => {
    expect(NOT_FOUND_CODE).toBe('ERP-CORE-0004');
    expect(EXAMPLE_ITEM_ERRORS).toEqual({ namespace: 'example-item', codes: [NOT_FOUND_CODE] });
  });

  it('exposes the resource hooks and the validation code whose issues the form maps', () => {
    expect(Object.keys(exampleItemHooks).sort()).toEqual([
      'useCreate',
      'useList',
      'useOne',
      'useRemove',
      'useUpdate',
    ]);
    expect(VALIDATION_CODE).toBe('ERP-VALIDATION-0001');
  });
});
