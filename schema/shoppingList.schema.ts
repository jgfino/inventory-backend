import { model, Schema, Types } from "mongoose";
import ErrorResponse from "../error/ErrorResponse";
import QueryChain from "../types/QueryChain";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import AuthErrors from "../error/errors/auth.errors";
import UserModel from "./user.schema";
import ShoppingList from "../types/ShoppingList";

//#region Types

type ShoppingListQuery = QueryChain<ShoppingList>;

interface ShoppingListModel extends AuthorizableModel<ShoppingList> {}

//#endregion

//#region Schema definition

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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        default: [],
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
      },
    ],
    members: [{ type: Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
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

  next();
});

//#endregion

//#region Static Methods

/**
 * See if a user is authorized to view a list. Users are authorized if:
 * Free:
 *  - The list is their default list (all)
 * Premium:
 *  - They own or are a member of the list (view, update)
 *  - They own the list (view, update, delete)
 * @param auth The user to check
 * @param mode The auth mode to use
 * @param cb Callback with the authorized query
 */
ShoppingListSchema.statics.authorize = function (
  auth: Express.User,
  mode: AuthModes,
  cb: (err: ErrorResponse, query: ShoppingListQuery) => void
) {
  const id = auth._id;
  UserModel.verifySubscription(id)
    .then((isPremium) => {
      let query = this.find();

      // Restrict to default list
      if (!isPremium) {
        query = query.find({ $and: [{ _id: auth.defaultShoppingList }] });
      }

      switch (mode) {
        case "delete":
          query = query.find({ owner: id });
          break;
        case "update":
        case "view":
          query = query.find({ $or: [{ owner: id }, { members: id }] });
          break;
      }

      cb(null, query);
    })
    .catch((err) => cb(err, null));
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
  const isPremium = await UserModel.verifySubscription(id);

  if (!isPremium && !auth.defaultShoppingList) {
    return Promise.reject(
      AuthErrors.PREMIUM_FEATURE(
        "A paid account is required to create more than one Shopping List"
      )
    );
  }

  const newList = await ShoppingListModel.create({ ...data, owner: id });

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
