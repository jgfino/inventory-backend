/**
 * Generic type for types with created and updated timestamps.
 */
interface TimestampType {
  /**
   * When this object was created
   */
  createdAt: Date;

  /**
   * When this object was last updated
   */
  updatedAt: Date;
}

export default TimestampType;
