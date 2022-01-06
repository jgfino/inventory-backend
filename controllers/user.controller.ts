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

  LocationModel.authorize(req.user, "view", async (err, query) => {
    if (err) return next(err);

    try {
      const mutualLocations = await query.find(
        { $or: [{ owner: id }, { members: id }] },
        "name iconName owner members numItems"
      );
      const json: any = user.toJSON();
      json.mutualLocations = mutualLocations;
      res.status(200).send(json);
    } catch (error) {
      return next(error);
    }
  });
});
