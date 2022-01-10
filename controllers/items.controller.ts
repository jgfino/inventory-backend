import nameFromUPC from "../edamam/nameFromUPC";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import LocationModel from "../schema/location.schema";

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
  async (req, res, next, locationModel) => {
    const query = req.query;
    const conditions: any = {};

    query.category && (conditions.items.category = String(query.category));
    query.owner && (conditions.items.owner._id = String(query.owner));
    query.expired &&
      (conditions.items.expirationDate = Boolean(query.expired)
        ? { $lt: new Date() }
        : { $gte: new Date() });
    query.search && (conditions.$text = { $search: String(query.search) });

    const locations = await locationModel.find(conditions, { "items.$": 1 });
    const items = locations.flatMap((location) => location.items);

    res.status(200).send(items);
  },
  [LocationModel, "view"]
);
