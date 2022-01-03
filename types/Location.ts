import { Types } from "mongoose";
import TimestampType from "./TimestampType";

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
   * The user id of the owner of the Location
   */
  owner: Types.ObjectId;
  /**
   * The user ids of the members of the Location
   */
  members: Types.Array<Types.ObjectId>;
  /**
   * The user ids of the members invited to this Location
   */
  invitedMembers: Types.Array<Types.ObjectId>;
  /**
   * When to notify different users about items in this location expiring
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
}

export type LocationAggregateData = {
  totalValue?: Types.Decimal128;
};
