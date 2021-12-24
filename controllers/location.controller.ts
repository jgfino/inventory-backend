/**
 * Defines CRUD operations for Locations and performs security checks.
 */

import LocationModel from "../schema/location.schema";
import { Request, Response } from "express";
import _, { Dictionary } from "lodash";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import UserModel from "../schema/user.schema";

export const createLocation = catchAsync(async (req, res, next) => {
  const newLocation = await LocationModel.createAuthorized(req.user._id, {
    ...req.body,
  });
  return res.status(200).json(newLocation);
});

export const findLocation = authorizeAndCatchAsync(
  [LocationModel],
  async (req, res, next, locations) => {
    //const location = await locations.findOne({ _id: req.params.id ?? null });

    const update = await locations.updateOne(
      { _id: req.params.id ?? null },
      { $set: { name: "Updated name" } }
    );
    console.log(update);

    // if (!location) {
    //   return next(
    //     DatabaseErrors.NOT_FOUND(
    //       "A Location with this id was not found or you do not have permission to access it."
    //     )
    //   );
    // }

    res.status(200).send(update);
  }
);

// export const findLocation = catchAsync(async (req, res, next) => {

//   /**
//    * catchAuthorized([LocationModel, UserModel], (authorized, req, res, next) => {
//    *  await authorized.LocationModel.find()
//    *  await authorized.UserModel.find()
//    * })
//    */

//   LocationModel.authorized(req.user._id, async (err, query) => {
//     if (err) {
//       return next(err);
//     }

//     await new Promise(function (resolve, reject) {
//       setTimeout(function () {
//         reject("or nah");
//       }, 1000);
//     });

//     const location = await query.findOne({ _id: req.params.id }).lean();
//     if (!location) {
//       return next(
//         DatabaseErrors.NOT_FOUND(
//           "A Location with this id was not found or you do not have permission to access it."
//         )
//       );
//     }
//     res.status(200).send(location);
//   });
// });

export const findLocations = catchAsync(async (req, res, next) => {});
