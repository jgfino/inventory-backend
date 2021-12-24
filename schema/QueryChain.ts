import { QueryWithHelpers, HydratedDocument } from "mongoose";

type QueryChain<T, TQueryHelpers = {}, TMethods = {}, TVirtuals = {}> =
  QueryWithHelpers<
    Array<HydratedDocument<T, TMethods, TVirtuals>>,
    HydratedDocument<T, TMethods, TVirtuals>,
    TQueryHelpers,
    T
  >;

export default QueryChain;
