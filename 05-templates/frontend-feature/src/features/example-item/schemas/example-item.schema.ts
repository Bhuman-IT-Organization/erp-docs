import { z } from 'zod';

/**
 * The zod messages are message KEYS under the `example-item` namespace, not text (FE-12): this
 * module stays free of React and of any locale, and SchemaForm's `translateError` resolves them.
 */
export const EXAMPLE_ITEM_MESSAGE_KEYS = {
  name: 'enter_name',
  nameTooLong: 'name_too_long',
} as const;

/** The longest name the api's body takes (`EXAMPLE_ITEM_NAME_MAX` in its dto; the pair test compares them). */
export const EXAMPLE_ITEM_NAME_MAX = 100;

// Mirrors the erp-api module's response schema (the item of `GET /api/v1/example-item`, the module
// copied from erp-docs `05-templates/backend-module`); moves to @erp/contracts (ADR-0010).
export const exampleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  createdAt: z.string(),
});
export type ExampleItem = z.infer<typeof exampleItemSchema>;

/**
 * One list row: the record plus whatever the api's list row adds (a usage count the delete refuses
 * on, say). Extend it here when the list row is wider than the record. The list reads it, the form
 * seeds with it, and an edit swaps `{ ...seed, ...saved }` into the list so the extra fields
 * survive (plan 04.1-05).
 */
export const exampleItemRowSchema = exampleItemSchema.extend({});
export type ExampleItemRow = z.infer<typeof exampleItemRowSchema>;

/** The form's values, for both create (`POST`) and edit (`PATCH`): the body the api takes. */
export const exampleItemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, EXAMPLE_ITEM_MESSAGE_KEYS.name)
    .max(EXAMPLE_ITEM_NAME_MAX, EXAMPLE_ITEM_MESSAGE_KEYS.nameTooLong),
});
export type ExampleItemFormValues = z.infer<typeof exampleItemFormSchema>;

export const EMPTY_EXAMPLE_ITEM_FORM: ExampleItemFormValues = { name: '' };

/** A loaded (or seeded) record as form values. */
export function toExampleItemForm(item: ExampleItem): ExampleItemFormValues {
  return { name: item.name };
}

/** The fields a 400 `ERP-VALIDATION-0001` may point at (`issues[].path[0]`). */
export const EXAMPLE_ITEM_FIELDS = ['name'] as const;
export type ExampleItemField = (typeof EXAMPLE_ITEM_FIELDS)[number];

export function isExampleItemField(value: unknown): value is ExampleItemField {
  return (EXAMPLE_ITEM_FIELDS as readonly unknown[]).includes(value);
}

/**
 * The `issues` array a 400 `ERP-VALIDATION-0001` problem body carries (zod issues from the api's
 * validator). It is parsed with this schema BEFORE any field error is set (T-3-26); a body that
 * does not parse yields no field errors. `message` is never rendered.
 */
export const validationIssuesSchema = z.array(
  z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  }),
);
export type ValidationIssue = z.infer<typeof validationIssuesSchema>[number];
