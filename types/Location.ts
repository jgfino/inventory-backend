import { Types } from "mongoose";
import TimestampType from "./TimestampType";
import { BaseUser, BaseUserWithExpiry } from "./User";

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

/**
 * Represents a Location which users can add items to.
 */
export interface Location extends TimestampType {
  /**
   * The name of the Location
   */
  name: string;
  /**
   * The display icon for the Location
   */
  iconName: string;
  /**
   * The owner of the Location
   */
  owner: BaseUserWithExpiry;
  /**
   * The members of the Location
   */
  members: Types.Array<BaseUser>;
  /**
   * The items in this Location
   */
  items: Types.Array<Item>;
  /**
   * When to notify different users about items in this location expiring
   */
  notificationDays: Types.Array<{
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
   * When each User last opened the Location (for home page sorting)
   */
  lastOpened: Types.Array<{
    /**
     * The user id
     */
    user: Types.ObjectId;
    /**
     * When the user last opened the Location
     */
    date: Date;
  }>;
  /**
   * The user who last updated the Location
   */
  lastUpdatedBy: BaseUser;
  /**
   * Any notes about this Location
   */
  notes?: string;
}
