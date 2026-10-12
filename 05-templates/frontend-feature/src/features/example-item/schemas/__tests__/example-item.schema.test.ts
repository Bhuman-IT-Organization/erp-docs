import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_ITEM_MESSAGE_KEYS,
  exampleItemFormSchema,
  exampleItemSchema,
  isExampleItemField,
  toExampleItemForm,
  validationIssuesSchema,
} from '../example-item.schema';
import en from '../../messages/en.json';

const ITEM = { id: 'a1', name: 'Alpha', label: 'A', createdAt: '2026-01-02T20:30:00.000Z' };

describe('example-item schemas', () => {
  it('parses a wire item and rejects a missing field', () => {
    expect(exampleItemSchema.parse(ITEM)).toEqual(ITEM);
    expect(exampleItemSchema.safeParse({ id: 'a1', name: 'Alpha' }).success).toBe(false);
  });

  it('the form schema trims the name and reports the message KEY, which exists in en.json', () => {
    expect(exampleItemFormSchema.parse({ name: '  Alpha ' })).toEqual({ name: 'Alpha' });
    const result = exampleItemFormSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(EXAMPLE_ITEM_MESSAGE_KEYS.name);
    }
    expect(en['example-item']).toHaveProperty(EXAMPLE_ITEM_MESSAGE_KEYS.name);
  });

  it('a record becomes form values; only the form fields are api issue targets', () => {
    expect(toExampleItemForm(ITEM)).toEqual({ name: 'Alpha' });
    expect(isExampleItemField('name')).toBe(true);
    expect(isExampleItemField('id')).toBe(false);
  });

  it('validationIssuesSchema accepts the api issue shape and rejects anything else (T-3-26)', () => {
    expect(
      validationIssuesSchema.parse([{ path: ['name'], message: 'Too short', code: 'too_small' }]),
    ).toEqual([{ path: ['name'], message: 'Too short' }]);
    expect(validationIssuesSchema.safeParse('garbage').success).toBe(false);
    expect(validationIssuesSchema.safeParse([{ path: 'name' }]).success).toBe(false);
  });
});
