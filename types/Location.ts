import { ObjectId, Types } from "mongoose";
import { BaseUser } from "./User";

export interface BaseLocation {
  name: string;
  iconName: string;
  colorName: string;
  owner: Types.ObjectId;
  shared: boolean;
  members: Types.Array<Types.ObjectId>;
}

export interface Location extends BaseLocation {}
