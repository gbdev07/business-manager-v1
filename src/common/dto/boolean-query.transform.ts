import { Transform } from 'class-transformer';

/** Converts "true"/"false" query strings into booleans, keeping undefined when absent. */
export const ToOptionalBoolean = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    return value === 'true';
  });
