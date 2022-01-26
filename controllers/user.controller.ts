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
    const id = req.user._id.toString();

    const profile = await UserModel.aggregate([
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
          mutualLocations: {
            $filter: {
              input: "$locations",
              as: "out",
              cond: locationModel.getFilter(),
            },
          },
        },
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          photoUrl: 1,

          ownedLocations: { $sum: "$ownedLocations" },
          memberLocations: { $sum: "$memberLocations" },
          totalItems: { $sum: "$locations.items" },

          mutualLocations: { $sum: "$mutualLocations" },
        },
      },
    ]);

    res.status(200).send(profile);
  },
  [LocationModel, "view"]
);
