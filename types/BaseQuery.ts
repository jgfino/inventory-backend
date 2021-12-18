import { Document, Query } from "mongoose";
import BaseQueryHelper from "./BaseQueryHelper";

type BaseQuery<DocType, HelperType> = Query<any, Document<DocType>> &
  HelperType;

export = BaseQuery;
