import { QueryWithHelpers, HydratedDocument } from "mongoose";

/**
 * The type returned from a query that allows chaining.
 */
type QueryChain<T, TQueryHelpers = {}, TMethods = {}, TVirtuals = {}> =
  QueryWithHelpers<
    Array<HydratedDocument<T, TMethods, TVirtuals>>,
    HydratedDocument<T, TMethods, TVirtuals>,
    TQueryHelpers,
    T
  >;

export default QueryChain;
