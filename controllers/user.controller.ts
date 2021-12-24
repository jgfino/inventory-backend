/**
 * Methods for logged-in users
 */

import UserModel from "../schema/user.schema";
import { catchAsync } from "../error/catchAsync";
import HttpError from "../error/ErrorResponse";
import AuthErrors from "../error/errors/auth.errors";
import DatabaseErrors from "../error/errors/database.errors";

/**
 * Get a user's public information
 */
export const getUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const profile = await UserModel.getUserProfile(userId);

  if (!profile) {
    return next(DatabaseErrors.NOT_FOUND("A user with this id was not found."));
  }

  res.status(200).send(profile);
});
