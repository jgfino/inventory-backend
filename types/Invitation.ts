import { ObjectId } from "mongoose";
import { BaseLocation } from "./Location";
import { BaseUser } from "./User";

export default interface Invitation {
  _id: ObjectId;
  to: ObjectId | BaseUser;
  from: ObjectId | BaseUser;
  location: ObjectId | BaseLocation;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
