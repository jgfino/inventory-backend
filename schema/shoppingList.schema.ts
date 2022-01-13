import { FilterQuery, Model, model, Schema } from "mongoose";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import AuthErrors from "../error/errors/auth.errors";
import { BaseUserSchema, BaseUserWithExpirySchema } from "./baseUser.schema";
import ShoppingList, { ShoppingListItem } from "../types/ShoppingList";
import UserModel from "./user.schema";

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
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  checked: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const ShoppingListSchema = new Schema<ShoppingList, ShoppingListModel, {}>(
  {
    name: {
      type: String,
      required: true,
      default: "My Shopping List",
    },
    notes: {
      type: String,
    },
    owner: {
      type: BaseUserWithExpirySchema,
      required: true,
    },
    items: [ShoppingListItemSchema],
    members: [BaseUserSchema],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.owner?.subscription_expires;
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
  const isSubscribed = auth.subscription_expires > new Date();

  // The list is the user's default list
  const isDefaultList: FilterQuery<ShoppingList> = {
    _id: auth.defaultShoppingList,
  };

  // The user owns the list
  const owned = { "owner._id": userId };

  if (!isSubscribed) {
    return this.find({ $or: [isDefaultList, owned] });
  }

  let premiumQuery: FilterQuery<ShoppingList>;

  // The owner of the list has an active subscription
  const ownerIsSubscribed = {
    "owner.subscription_expires": { $gt: new Date() },
  };

  // The user has an active subscription and is a member of the list
  const isMember = { "members._id": userId };

  switch (mode) {
    case "delete":
      // The user owns the list. They can delete it with or without a subscription
      premiumQuery = owned;
      break;
    case "update":
      // The user either owns the list or is a member of a list which is owned by a user with an active subscription
      premiumQuery = { $or: [owned, { $and: [isMember, ownerIsSubscribed] }] };
      break;
    case "view":
      // The user owns the list or is a member of the list.
      // Ignores list owner's subscription status.
      premiumQuery = { $or: [owned, isMember] };
      break;
  }

  return this.find({ $or: [isDefaultList, premiumQuery] });
};

/**
 * Create a shopping list safely. Sets the owner to the requesting user id.
 * ShoppingLists can be created if:
 * Free:
 *  - The user does not have a default ShoppingList
 * Premium:
 *  - Always
 * @param auth The user to create with
 * @param data The shopping list data
 */
ShoppingListSchema.statics.createAuthorized = async function (
  auth: Express.User,
  data: Partial<ShoppingList>
) {
  const id = auth._id;
  const isPremium = auth.subscription_expires > new Date();

  if (!isPremium && auth.defaultShoppingList) {
    return Promise.reject(
      AuthErrors.PREMIUM_FEATURE(
        "A paid account is required to create more than one Shopping List"
      )
    );
  }

  const newList = await ShoppingListModel.create({
    ...data,
    owner: {
      _id: id,
      name: auth.name,
      photoUrl: auth.photoUrl,
      subscription_expires: auth.subscription_expires,
    },
  });

  // If this is the user's first ShoppingList, specify this
  if (!auth.defaultLocation) {
    await UserModel.updateOne(
      { _id: id },
      { defaultShoppingList: newList._id }
    );
  }

  return newList;
};

const ShoppingListModel = model<ShoppingList, ShoppingListModel>(
  "ShoppingList",
  ShoppingListSchema
);

export default ShoppingListModel;
