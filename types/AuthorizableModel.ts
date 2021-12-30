import { Model, HydratedDocument } from "mongoose";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "./QueryChain";

/**
 * Different modes for authorizing a model before use
 */
export type AuthModes = ("view" | "update" | "delete" | "preview") & string;

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
  authorize(
    authId: string,
    mode: AuthModes,
    cb: (
      err: ErrorResponse,
      query: QueryChain<T, TQueryHelpers, TMethods, TVirtuals>
    ) => any
  ): void;
  /**
   * Create a document securely
   * @param authId The user id to use in creation.
   * @param data The data to use to create the document.
   */
  createAuthorized(
    authId: string,
    data: Partial<T>
  ): Promise<HydratedDocument<T, TMethods, TVirtuals>>;
}
