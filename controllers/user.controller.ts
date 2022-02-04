import UserModel from "../schema/user.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import { Types } from "mongoose";
import LocationModel from "../schema/location.schema";

/**
 * Get a user's public profile. Public information includes a user's id, name,
 * photo, number of mutual Locations, how many Locations this user owns as well
 * as how many they are a member of. It also includes the number Items they own
 * across all Locations
 */
export const getUserProfile = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const userId = req.params.id;

    const mutualLocationsQuery = locationModel.find({
      or: [{ owner: userId }, { members: userId }],
    });
    mutualLocationsQuery.projection({ _id: 1 });

    const mutualLocations = await mutualLocationsQuery;

    let profiles: any[] = await UserModel.aggregate([
      {
        $match: { _id: new Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "locations",
          localField: "_id",
          foreignField: "owner._id",
          as: "ownedLocations",
        },
      },
      {
        $lookup: {
          from: "locations",
          localField: "_id",
          foreignField: "members._id",
          as: "memberLocations",
        },
      },
      {
        $addFields: {
          locations: {
            $concatArrays: ["$ownedLocations", "$memberLocations"],
          },
        },
      },
      {
        $project: {
          id: "$_id",
          _id: 0,
          name: 1,
          photoUrl: 1,

          ownedLocations: { $sum: "$ownedLocations" },
          memberLocations: { $sum: "$memberLocations" },
          totalItems: { $sum: "$locations.items" },
        },
      },
    ]);

    if (profiles.length <= 0) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A profile for a user with this id was not found"
        )
      );
    }

    const profile = profiles[0];
    profile.mutualLocations = mutualLocations.length;

    res.status(200).send(profile);
  },
  [LocationModel, "view"]
);
