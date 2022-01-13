import { model, Model, Schema, Types } from "mongoose";
import { Item } from "../types/Item";
import QueryChain from "../types/QueryChain";
import { BaseUserSchema } from "./baseUser.schema";

export type ItemQuery = QueryChain<Item>;

/**
 * Item model with static methods
 */
interface ItemModel extends Model<Item> {}

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
    owner: {
      type: BaseUserSchema,
      required: true,
    },
    expirationDate: {
      type: Date,
    },
    added: {
      type: Date,
    },
    opened: {
      type: Date,
    },
    purchaseLocation: {
      type: String,
      maxlength: 100,
    },
    price: {
      type: Schema.Types.Decimal128,
      default: new Types.Decimal128("0.00"),
    },
    notes: {
      type: String,
      maxlength: 300,
    },
  },
  {
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;

        const price: Types.Decimal128 = ret.price;
        if (price) {
          ret.price = price.toString();
        }
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

export const ItemModel = model<Item, ItemModel>("Item", ItemSchema);
export default ItemSchema;
