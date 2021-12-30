import { Types } from "mongoose";
import TimestampType from "./TimestampType";

/**
 * Invitations are used for managing user membership in locations. In order for
 * a user to be added to a location, they must be sent and accept an invitation
 * to it from the owner or another member of the location.
 */
export default interface Invitation extends TimestampType {
  /**
   * The user id of the Invitation's recipient
   */
  to: Types.ObjectId;

  /**
   * The user id of the Invitation's sender
   */
  from: Types.ObjectId;

  /**
   * The id of the Location this Invitation is for
   */
  location: Types.ObjectId;

  /**
   * A custom message included with the location
   */
  message: string;

  /**
   * When this Invitation expires. This value is 7 days from the creation time.
   */
  expires: Date;
}
