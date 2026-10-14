import { Transform, type TransformFnParams } from 'class-transformer';

/**
 * Converts "true"/"false" query strings into booleans, keeping undefined when absent.
 * Implicit conversion runs first and turns every non-empty string into true, including "false".
 * The original query value is read from the source object so "false" stays false.
 */
export const ToOptionalBoolean = () =>
  Transform(({ value, obj, key }: TransformFnParams) => {
    const record = obj as Record<string, unknown> | undefined;
    const source: unknown = record && key in record ? record[key] : value;
    if (source === undefined || source === null || source === '') return undefined;
    if (source === true || source === 'true') return true;
    if (source === false || source === 'false') return false;
    return undefined;
  });
