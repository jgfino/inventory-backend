import { UpdateWriteOpResult } from "mongoose";
import nameFromUPC from "../edamam/nameFromUPC";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import ItemModel from "../schema/item.schema";
import { Item } from "../types/Item";

/**
 * Create an item
 */
export const createItem = catchAsync(async (req, res, next) => {
  const item = await ItemModel.createAuthorized(req.user._id, req.body);
  res.status(200).send(item);
});

/**
 * Get an item name/brand from UPC
 */
export const getItemUPC = catchAsync(async (req, res, next) => {
  const itemName = await nameFromUPC(req.params.upc);
  res.status(200).send({ name: itemName });
});

/**
 * Get multiple items.
 */
export const getItems = authorizeAndCatchAsync(
  async (req, res, next, itemModel) => {
    const query = req.query;
    const conditions: any = {};

    query.location && (conditions.location = String(query.location));
    query.category && (conditions.category = String(query.category));
    query.owner && (conditions.owner = String(query.owner));
    query.expired &&
      (conditions.expirationDate = Boolean(query.expired)
        ? { $lt: new Date() }
        : { $gte: new Date() });
    query.search && (conditions.$text = { $search: String(query.search) });

    const items = await itemModel
      .find(conditions)
      .populate("location", "_id name");
    res.status(200).send(items);
  },
  [ItemModel, "view"]
);

/**
 * Get a single item
 */
export const getItem = authorizeAndCatchAsync(
  async (req, res, next, itemModel) => {
    const item = await itemModel
      .findOne({ _id: req.params.id })
      .populate("location", "_id name");
    if (!item) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id was not found or you do not have permission to view it."
        )
      );
    }
    res.status(200).send(item);
  },
  [ItemModel, "view"]
);

/**
 * Update an item.
 */
export const updateItem = authorizeAndCatchAsync(
  async (req, res, next, itemModel) => {
    const body = req.body;
    const { owner, location, notificationDays, ...newData } = req.body;

    let updateResult = itemModel.updateOne({ _id: req.params.id }, newData, {
      runValidators: true,
    });

    if (notificationDays) {
      updateResult = updateResult.updateOne(
        { _id: req.params.id, "notificationDays.user": req.user._id },
        { $set: { "notificationDays.$.days": notificationDays } }
      );
    }

    const result = await updateResult;

    if (result.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }
    res
      .status(200)
      .send({ message: `Item ${req.params.id} updated successfully` });
  },
  [ItemModel, "update"]
);

/**
 * Delete an item
 */
export const deleteItem = authorizeAndCatchAsync(
  async (req, res, next, itemModel) => {
    const item = await itemModel.findOne({ _id: req.params.id });

    if (!item) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to delete it."
        )
      );
    }

    await item.remove();

    res
      .status(200)
      .send({ message: `Item ${req.params.id} deleted successfully.` });
  },
  [ItemModel, "delete"]
);
