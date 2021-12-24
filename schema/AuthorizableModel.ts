import { Model, HydratedDocument } from "mongoose";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "./QueryChain";

export default interface AuthorizableModel<
  T,
  TQueryHelpers = {},
  TMethods = {},
  TVirtuals = {}
> extends Model<T, TQueryHelpers, TMethods, TVirtuals> {
  authorize(
    authId: string,
    cb: (
      err: ErrorResponse,
      query: QueryChain<T, TQueryHelpers, TMethods, TVirtuals>
    ) => any
  ): void;
  createAuthorized(
    authId: string,
    data: any
  ): Promise<HydratedDocument<T, TMethods, TVirtuals>>;
}
