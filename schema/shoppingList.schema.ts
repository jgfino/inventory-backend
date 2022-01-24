import { FilterQuery, Model, model, Schema, Types } from "mongoose";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import { BaseUserSchema, BaseUserWithExpirySchema } from "./baseUser.schema";
import ShoppingList, { ShoppingListItem } from "../types/ShoppingList";
import UserModel from "./user.schema";
import { isInteger } from "lodash";

//#region Types

type ShoppingListQuery = QueryChain<ShoppingList>;

interface ShoppingListModel extends AuthorizableModel<ShoppingList> {}
interface ShoppingListItemModel extends Model<ShoppingListItem> {}

//#endregion

//#region Schema definition

const ShoppingListItemSchema = new Schema<
  ShoppingListItem,
  ShoppingListItemModel,
  {}
>({
  _id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  notes: {
    type: String,
    maxlength: 300,
  },
  checked: {
    type: Boolean,
    required: true,
    default: false,
  },
  owner: BaseUserSchema,
  pos: {
    type: Number,
    required: true,
    min: 0,
    validate: isInteger,
  },
});

const ShoppingListSchema = new Schema<ShoppingList, ShoppingListModel, {}>(
  {
    name: {
      type: String,
      required: true,
      default: "My Shopping List",
      maxlength: 300,
    },
    notes: {
      type: String,
      maxlength: 300,
    },
    owner: {
      type: BaseUserWithExpirySchema,
      required: true,
    },
    items: [ShoppingListItemSchema],
    members: [BaseUserSchema],
    lastUpdatedBy: {
      type: BaseUserSchema,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.owner?.subscriptionExpires;
      },
      virtuals: true,
    },
    toObject: { virtuals: true },
  }
);

//#endregion

//#region Middleware

ShoppingListSchema.pre("remove", async function (next) {
  // Remove this list as a user's default list
  await UserModel.updateMany(
    { defaultShoppingList: this._id },
    { $unset: { defaultShoppingList: "" } }
  );
});

//#endregion

//#region Static Methods

/**
 * See if a user is authorized for a list. Users are authorized if:
 * Free:
 *  - The list is their default list (all)
 *  - They own the list (view, delete) - to allowed lapsed subs to delete lists
 * Premium:
 *  - They own the list (delete)
 *  - They own or are a member of the list AND the owner has an active subscription (update)
 *  - They own or are a member of the list (view)
 * @param auth The user to check
 * @param mode The auth mode to use
 */
ShoppingListSchema.statics.authorize = function (
  auth: Express.User,
  mode: AuthModes
) {
  const userId = auth._id;
  const isPremium = UserModel.isPremium(auth);

  const isDefaultList = { _id: auth.defaultShoppingList ?? null };

  const owned = { "owner._id": userId };
  const isMember = { "members._id": userId };

  const ownerIsSubscribed = {
    "owner.subscriptionExpires": { $gt: new Date() },
  };

  let query: FilterQuery<ShoppingList>;

  if (!isPremium) {
    switch (mode) {
      case "delete":
        query = owned;
        break;
      case "update":
        query = isDefaultList;
        break;
      case "view":
        query = owned;
        break;
    }
  } else {
    switch (mode) {
      case "delete":
        query = owned;
        break;
      case "update":
        query = { $or: [owned, { $and: [isMember, ownerIsSubscribed] }] };
        break;
      case "view":
        query = { $or: [owned, isMember] };
        break;
    }
  }

  return this.find(query);
};

const ShoppingListModel = model<ShoppingList, ShoppingListModel>(
  "ShoppingList",
  ShoppingListSchema
);

export default ShoppingListModel;
