import { Types } from "mongoose";
import TimestampType from "./TimestampType";

/**
 * Represents a single Item in a Location.
 */
export interface Item extends TimestampType {
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
   * The user id of the owner of the item
   */
  owner: Types.ObjectId;
  /**
   * The id of the location of the item
   */
  location: Types.ObjectId;
  /**
   * The expiration date of the item
   */
  expirationDate?: Date;
  /**
   * When the item was opened
   */
  opened?: Date;
  /**
   * When to notify different users about this item expiring
   */
  notificationDays?: Types.Array<{
    /**
     * The user id to notify
     */
    user: Types.ObjectId;
    /**
     * The array of days to use to notify this user
     */
    days: Types.Array<number>;
  }>;
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
