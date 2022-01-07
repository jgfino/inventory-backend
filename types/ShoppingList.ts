import { Types } from "mongoose";
import TimestampType from "./TimestampType";

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
  owner: Types.ObjectId;
  /**
   * The items on the list
   */
  items: Types.Array<{
    /**
     * The name of the item
     */
    name: string;
    /**
     * Any notes for the item
     */
    notes: string;
    /**
     * Whether a user has checked off this item
     */
    checked: boolean;
  }>;

  /**
   * Members of this list (for premium users)
   */
  members: Types.Array<Types.ObjectId>;
}

export default ShoppingList;
