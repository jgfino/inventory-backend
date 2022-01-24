import { Types } from "mongoose";
import { BaseUser } from "./User";

/**
 * Represents a single Item in a Location.
 */
export interface Item {
  /**
   * The id of the item
   */
  _id: Types.ObjectId;
  /**
   * The name of the item
   */
  name: string;
  /**
   * The name of the category of the item
   */
  category: string;
  /**
   * The name of the display icon for the item
   */
  iconName: string;
  /**
   * The owner of the item
   */
  owner: BaseUser;
  /**
   * When this item was added to the location
   */
  added: Date;
  /**
   * The expiration date of the item
   */
  expirationDate?: Date;
  /**
   * When the item was opened
   */
  opened?: Date;
  /**
   * Where this item was purchased
   */
  purchaseLocation?: string;
  /**
   * Any additional notes about this item
   */
  notes?: string;
  /**
   * The price of this item
   */
  price?: Types.Decimal128;
}
