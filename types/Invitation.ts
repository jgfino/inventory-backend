import { ObjectId, Types } from "mongoose";
import { BaseLocation } from "./Location";
import { BaseUser } from "./User";

export default interface Invitation {
  _id: Types.ObjectId;
  to: Types.ObjectId;
  from: Types.ObjectId;
  location: Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
