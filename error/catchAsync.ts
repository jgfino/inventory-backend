import { NextFunction, Request, Response } from "express";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import async from "async";
import QueryChain from "../types/QueryChain";

/**
 * Type to match a model to its respective QueryChain type.
 */
type ModelToQuery<T> = T extends AuthorizableModel<
  infer U,
  infer Q,
  infer M,
  infer V
>
  ? QueryChain<U, Q, M, V>
  : never;

/**
 * Type to match multiple models to multiple query types.
 */
type ModelsToQueryMap<T> = { [P in keyof T]: ModelToQuery<T[P]> };

/**
 * Represents any authorizable model type.
 */
type AnyAuthorizableModel = AuthorizableModel<
  unknown,
  unknown,
  unknown,
  unknown
>;

type AnyQueryChain = QueryChain<unknown, unknown, unknown, unknown>;

type AuthTuple = readonly [AnyAuthorizableModel, AuthModes];
type TupleToQuery<T> = T extends AuthTuple ? ModelToQuery<T[0]> : never;
type TuplesToQueries<T> = { [K in keyof T]: TupleToQuery<T[K]> };

export function authorizeAndCatchAsync<T extends AuthTuple[]>(
  fn: (
    req: Request,
    res: Response,
    next: NextFunction,
    ...authorizedQueries: TuplesToQueries<T>
  ) => Promise<any>,
  ...models: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const mappedModels = models.map((tuple) => {
      return tuple[0].authorize(req.user, tuple[1]);
    });
    fn(req, res, next, ...(mappedModels as TuplesToQueries<T>)).catch(next);
  };
}

/**
 * Catch async errors to pass to the next middleware to avoid using try/catch
 * everywhere.
 * @param fn The function to catch errors for. This is where async/await logic
 *           should be.
 * @returns An express-style req, res, next function.
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
