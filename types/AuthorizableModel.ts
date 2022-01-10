import {
  Model,
  HydratedDocument,
  FilterQuery,
  UpdateWithAggregationPipeline,
  UpdateQuery,
  QueryOptions,
  UpdateWriteOpResult,
  Document,
} from "mongoose";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "./QueryChain";

/**
 * Different modes for authorizing a model before use
 */
export type AuthModes = ("view" | "update" | "delete") & string;

/**
 * A mongoose model which can be authorized before querying
 */
export default interface AuthorizableModel<
  T,
  TQueryHelpers = {},
  TMethods = {},
  TVirtuals = {}
> extends Model<T, TQueryHelpers, TMethods, TVirtuals> {
  /**
   * Authorize this model for the given mode.
   * @param authId The user id to authorize.
   * @param mode The auth mode to use.
   * @param cb Callback with the authorized query
   */
  authorize_old(
    auth: Express.User,
    mode: AuthModes,
    cb: (
      err: ErrorResponse,
      query: QueryChain<T, TQueryHelpers, TMethods, TVirtuals>
    ) => any
  ): void;

  authorize(
    auth: Express.User,
    mode: AuthModes
  ): QueryChain<T, TQueryHelpers, TMethods, TVirtuals>;

  /**
   * Create a document securely
   * @param authId The user id to use in creation.
   * @param data The data to use to create the document.
   */
  createAuthorized(
    authId: Express.User,
    data: Partial<T>
  ): Promise<HydratedDocument<T, TMethods, TVirtuals>>;
}
