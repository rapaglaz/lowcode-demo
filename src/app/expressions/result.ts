/**
 * Errors as values: every stage of the expression pipeline returns a Result
 * so that a broken expression in a config never throws inside `computed()`.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err = { readonly ok: false; readonly error: string };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = (error: string): Err => ({ ok: false, error });
