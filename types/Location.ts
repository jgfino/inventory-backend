import { ObjectId } from "mongoose";
import { BaseUser } from "./User";

export interface BaseLocation {
  _id: ObjectId;
  name: string;
  iconName: string;
  colorName: string;
  owner: ObjectId | BaseUser;
  shared: boolean;
  members: ObjectId[] | BaseUser[];
  itemCount: number;
}

export interface Location extends BaseLocation {}
