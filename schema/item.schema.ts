import { HydratedDocument, model, Schema, Types } from "mongoose";
import ErrorResponse from "../error/ErrorResponse";
import DatabaseErrors from "../error/errors/database.errors";
import { Item } from "../types/Item";
import AuthorizableModel, { AuthModes } from "../types/AuthorizableModel";
import LocationModel from "./location.schema";
import QueryChain from "../types/QueryChain";

export type ItemQuery = QueryChain<Item, {}, {}, ItemVirtuals>;

interface ItemVirtuals {
  /**
   * Convenience property to calculate if this item has expired at the time
   * of retrieval
   */
  expired: boolean;
}

interface ItemModel extends AuthorizableModel<Item, {}, {}, ItemVirtuals> {}

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
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Item owner required"],
      autopopulate: { select: "_id name photoUrl" },
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Item location required"],
    },
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
ItemSchema.plugin(require("mongoose-autopopulate"));

//#region Virtuals

// Determine if item has expired
ItemSchema.virtual("expired").get(function (this: HydratedDocument<Item>) {
  return this.expirationDate ? this.expirationDate < new Date() : false;
});

//#endregion

/**
 * See if a user is authorized to access an item. Users are authorized if:
 * - They own or are a member of the location containing the item (all)
 * @param authId The user id to check.
 * @param mode The auth mode to authorize for.
 * @param cb Callback with the authorized query.
 */
ItemSchema.statics.authorize = function (
  authId: string,
  mode: AuthModes,
  cb: (err: ErrorResponse, query: ItemQuery) => void
) {
  LocationModel.find({ $or: [{ members: authId }, { owner: authId }] })
    .distinct("_id")
    .then((locations) => {
      cb(null, this.find({ location: { $in: locations } }));
    })
    .catch((error) => cb(error, null));
};

/**
 * Create an item safely. An item can be created if its owner is the
 * requesting user and the requesting user has update permissions on the
 * item's location.
 * @param authId The user id to use in creation.
 * @param data The data to create the item with.
 */
ItemSchema.statics.createAuthorized = async function (
  authId: string,
  data: Partial<Item>
) {
  return new Promise((resolve, reject) => {
    LocationModel.authorize(authId, "update", async (err, query) => {
      if (err) {
        return reject(err);
      }

      try {
        const canAccessLocation = await query
          .findOne({ _id: data.location }, "_id")
          .lean();

        if (!canAccessLocation) {
          return reject(
            DatabaseErrors.NOT_FOUND(
              "The specified location does not exist or you do not have permission to access it."
            )
          );
        }

        const item = await ItemModel.create({
          ...data,
          owner: authId,
        });

        resolve(item);
      } catch (error) {
        reject(error);
      }
    });
  });
};

const ItemModel = model<Item, ItemModel>("Item", ItemSchema);

export default ItemModel;
