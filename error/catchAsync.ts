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

/**
 * Authorize the passed models with the given auth mode and catch async errors
 * to avoid using try/catch.
 * @param fn The function to catch errors for.
 * @param models The models to authorize, paired with their auth mode.
 * @returns An express-style req, res, next function
 */
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
    async
      .mapSeries<AuthTuple, AnyQueryChain, Error>(models, (model, callback) => {
        model[0].authorize(req.user._id, model[1], (err, query) => {
          if (err) {
            return callback(err);
          } else {
            return callback(null, query);
          }
        });
      })
      .then((queries) => fn(req, res, next, ...(queries as TuplesToQueries<T>)))
      .catch(next);
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
