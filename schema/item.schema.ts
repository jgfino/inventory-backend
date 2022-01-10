import { Model, Schema, Types } from "mongoose";
import { Item } from "../types/Item";
import QueryChain from "../types/QueryChain";
import { BaseUserSchema } from "./baseUser.schema";

export type ItemQuery = QueryChain<Item, {}, {}, ItemVirtuals>;

interface ItemVirtuals {
  /**
   * Convenience property to calculate if this item has expired at the time
   * of retrieval
   */
  expired: boolean;
}

interface ItemModel extends Model<Item, {}, {}, ItemVirtuals> {}

const ItemSchema = new Schema<Item, ItemModel, {}>(
  {
    name: {
      type: String,
      required: [true, "Item name is required."],
      maxlength: 100,
    },
    category: {
      type: String,
      required: true,
      default: "Other",
      maxlength: 100,
      lowercase: true,
    },
    iconName: {
      type: String,
      required: [true, "Icon name required"],
      maxlength: 100,
    },
    owner: BaseUserSchema,
    expirationDate: {
      type: Date,
    },
    opened: {
      type: Date,
    },
    purchaseLocation: {
      type: String,
      maxlength: 300,
    },
    price: {
      type: Schema.Types.Decimal128,
      default: new Types.Decimal128("0.00"),
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;

        const price: Types.Decimal128 = ret.price;
        ret.price = price ? price.toString() : undefined;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

//#region Virtuals

// Determine if item has expired
ItemSchema.virtual("expired").get(function (this: Item) {
  return this.expirationDate ? this.expirationDate < new Date() : false;
});

//#endregion

export default ItemSchema;
