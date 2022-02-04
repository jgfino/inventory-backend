import { Joi } from "express-validation";
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
