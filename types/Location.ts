import { ObjectId } from "mongoose";
import User from "./User";

/**
 * Represents an inventory location.
 */
export default interface Location {
  name: string;
  iconName: string;
  colorName: string;
  owner: ObjectId | User;
  shared: boolean;
  members: ObjectId[] | User[];
}
