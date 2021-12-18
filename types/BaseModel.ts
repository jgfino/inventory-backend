import { FilterQuery, Model, Query, Document } from "mongoose";
import BaseQuery from "./BaseQuery";

export default interface BaseModel<DocType, QueryHelperType>
  extends Model<DocType, QueryHelperType> {
  findByIdAuthorized(
    id: String,
    user: String
  ): BaseQuery<DocType, QueryHelperType>;
  findAuthorized(
    user: String,
    filter?: FilterQuery<DocType>
  ): BaseQuery<DocType, QueryHelperType>;
  getAuthFilter(user: String): any;
}

function findByIdAuthorized<DocType, QueryHelperType>(
  this: BaseModel<DocType, QueryHelperType>,
  id: String,
  user: String
) {
  return this.findById(id).find(this.getAuthFilter(user));
}

function findAuthorized<DocType, QueryHelperType>(
  this: BaseModel<DocType, QueryHelperType>,
  user: String,
  filter: FilterQuery<DocType> = {}
) {
  return this.find(filter).find(this.getAuthFilter(user));
}

export const modelDefaults = {
  findByIdAuthorized,
  findAuthorized,
};
