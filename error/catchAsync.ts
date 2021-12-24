import { NextFunction, Request, Response } from "express";
import AuthorizableModel from "../schema/AuthorizableModel";
import async from "async";
import QueryChain from "../schema/QueryChain";

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

/**
 * The type for a basic middleware function
 */
type middlewareFunc = (req: Request, res: Response, next: NextFunction) => any;

/**
 * The type for a middleware function which also includes authorized queries.
 */
type authMiddlewareFunc<T extends AnyAuthorizableModel[]> = (
  req: Request,
  res: Response,
  next: NextFunction,
  ...authorizedQueries: ModelsToQueryMap<T>
) => any;

/**
 * Authorize the given models and catch async errors to pass to the next
 * middleware.
 * @param models The n number of MongoDB models to authorize.
 * @param fn The function to catch errors for. This is where all async/await
 *           logic should be. After req, res, next, it contains n QueryChain
 *           objects to perform authorized queries on the respective models
 * @returns An express-style req, res, next function.
 */
export function authorizeAndCatchAsync<T extends AnyAuthorizableModel[]>(
  models: T,
  fn: authMiddlewareFunc<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    async
      .map(models, (model, callback) => {
        model.authorize(req.user._id, (err, query) => {
          if (err) {
            return callback(err);
          }
          callback(null, query);
        });
      })
      .then((authorizedQueries) => {
        fn(req, res, next, ...(authorizedQueries as ModelsToQueryMap<T>)).catch(
          next
        );
      })
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
export const catchAsync = (fn: middlewareFunc) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
