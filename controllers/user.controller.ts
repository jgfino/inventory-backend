import UserModel from "../schema/user.schema";
import { catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import { Types } from "mongoose";
import LocationModel from "../schema/location.schema";
import ItemModel from "../schema/item.schema";

/**
 * Get a user's public information
 */
export const getUserProfile = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  const authId = req.user._id;

  if (id == authId) {
    return res.redirect("/api/v1/profile");
  }

  const user = await UserModel.findOne(
    { _id: req.params.id },
    "_id name photoUrl"
  );

  if (!user) {
    return next(DatabaseErrors.NOT_FOUND("A user with this id was not found."));
  }

  const mutualLocations = await LocationModel.find(
    {
      $or: [
        { members: { $all: [id, authId] } },
        { owner: id, members: authId },
        { owner: authId, members: id },
      ],
    },
    "name iconName owner members"
  );

  const mutualItems = await ItemModel.find(
    {
      location: { $in: mutualLocations.map((doc) => doc._id) },
      owner: id,
    },
    {},
    { autopopulate: false }
  );

  const json: any = user.toJSON();

  const locationsWithItems = mutualLocations.map((loc) => {
    const items = mutualItems.filter((item) => item.location.equals(loc._id));
    const locationWithItems: any = loc.toJSON();
    locationWithItems.items = items;
    return locationWithItems;
  });

  json.locations = locationsWithItems;

  res.status(200).send(json);
});
