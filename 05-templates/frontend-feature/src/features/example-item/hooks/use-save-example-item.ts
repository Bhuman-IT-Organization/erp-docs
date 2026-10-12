import {
  EXAMPLE_ITEM_ENDPOINTS,
  EXAMPLE_ITEM_PATH,
  exampleItemPath,
} from '@/features/example-item/api/example-item.endpoints';
import { useCommonMutation, type CommonMutation } from '@/lib/api/use-common-mutation';
import {
  exampleItemSchema,
  type ExampleItem,
  type ExampleItemFormValues,
} from '@/features/example-item/schemas/example-item.schema';

/** The two writes of the form, one for each screen. */
export interface ExampleItemSave {
  readonly create: CommonMutation<ExampleItemFormValues, ExampleItem>;
  readonly update: CommonMutation<ExampleItemFormValues, ExampleItem>;
}

/**
 * The writes (FE-03): `EXAMPLE_ITEM_ENDPOINTS.create` and `.update`: the method and the path
 * come from the table the api module serves, NEVER
 * retried automatically (ADR-0031 §5); a 400 carries `issues` for the form. They invalidate
 * nothing: the screen swaps the saved row into the cached list pages after an edit and revalidates
 * them after a create, so no list page is asked again for an edit (D-36). With no id (the create
 * screen) `update` is never triggered.
 */
export function useSaveExampleItem(id: string | null): ExampleItemSave {
  const create = useCommonMutation<ExampleItemFormValues, ExampleItem>(EXAMPLE_ITEM_PATH, {
    method: EXAMPLE_ITEM_ENDPOINTS.create.method,
    schema: exampleItemSchema,
    invalidate: [],
  });
  const update = useCommonMutation<ExampleItemFormValues, ExampleItem>(
    id === null ? EXAMPLE_ITEM_PATH : exampleItemPath(id),
    { method: EXAMPLE_ITEM_ENDPOINTS.update.method, schema: exampleItemSchema, invalidate: [] },
  );
  return { create, update };
}
