import { ObjectId, Types } from "mongoose";
import TimestampType from "./TimestampType";
import { BaseUser, BaseUserWithExpiry } from "./User";

export interface ShoppingListItem {
  /**
   * The id of the item
   */
  _id: Types.ObjectId;
  /**
   * The name of the item
   */
  name: string;
  /**
   * Any notes for the item
   */
  notes?: string;
  /**
   * Whether a user has checked off this item
   */
  checked: boolean;

  /**
   * The user who added the item to the list
   */
  owner: BaseUser;

  /**
   * The position of the Item in the List
   */
  pos: number;
}

/**
 * Represents a shopping list for a user
 */
interface ShoppingList extends TimestampType {
  /**
   * The name of the list
   */
  name: string;
  /**
   * Notes/description for the list
   */
  notes: string;
  /**
   * The owner of this ShoppingList
   */
  owner: BaseUserWithExpiry;
  /**
   * The items on the list
   */
  items: Types.Array<ShoppingListItem>;
  /**
   * The user who last updated the Shopping List
   */
  lastUpdatedBy: BaseUser;
  /**
   * Members of this list (for premium users)
   */
  members: Types.Array<BaseUser>;
}

export default ShoppingList;
