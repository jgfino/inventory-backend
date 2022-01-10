import { User as MongoUser } from "./types/User";

declare global {
  namespace Express {
    interface User extends MongoUser {
      _id: Types.ObjectId;
    }
    interface Response {
      sendNotFoundError(msg: String): void;
      sendInternalError(msg: String): void;
      sendEmptyError(): void;
    }
  }
}

require("dotenv").config();

import express, { NextFunction, Request, Response } from "express";
import cron from "node-cron";

import passport from "./passport/setup";
import mongoose, { HydratedDocument, Types } from "mongoose";

import UserModel from "./schema/user.schema";
import LocationModel from "./schema/location.schema";
import ItemModel from "./schema/item.schema";

import locations from "./routes/location.routes";
import auth from "./routes/auth.routes";
import users from "./routes/user.routes";
import profiles from "./routes/profile.routes";
import items from "./routes/items.routes";
import ErrorResponse from "./error/ErrorResponse";

var _ = require("lodash");
global._ = _;

var app = express();

const db = {
  mongoose: mongoose,
  url: process.env.MONGODB_URL,
  users: UserModel,
  locations: LocationModel,
  items: ItemModel,
};

db.mongoose
  .connect(db.url!)
  .then(() => {
    console.log("Connected to the database!");
  })
  .catch((err) => {
    console.log("Cannot connect to the database!", err);
    process.exit();
  });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(passport.initialize());

app.use(function (req, res, next) {
  res.sendNotFoundError = (msg) => res.status(404).send({ error: msg });
  res.sendInternalError = (msg) => res.status(500).send({ error: msg });
  res.sendEmptyError = () =>
    res.status(400).send({ error: "Request body cannot be empty." });

  next();
});

const jwtAuth = passport.authenticate("jwt", { session: false });

app.use("/api/v1/auth", auth);
app.use("/api/v1/profile", jwtAuth, profiles);
app.use("/api/v1/users", jwtAuth, users);
app.use("/api/v1/locations", jwtAuth, locations);
app.use("/api/v1/items", jwtAuth, items);

app.all("*", (req, res, next) => {
  return next(
    new ErrorResponse("route-not-found", 404, `Can't find ${req.originalUrl}`)
  );
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  let error: ErrorResponse;

  if (err instanceof mongoose.Error) {
    switch (true) {
      case err instanceof mongoose.Error.ValidationError:
        const messages: string[] = [];
        const errors = (err as mongoose.Error.ValidationError).errors;

        Object.values(errors).forEach((e) => {
          if (e instanceof mongoose.Error.ValidatorError) {
            messages.push(e.properties.message);
          } else {
            messages.push(e.message);
          }
        });

        error = new ErrorResponse("database-error", 400, messages.join(", "));
        break;
      default:
        error = new ErrorResponse(
          "database-error",
          500,
          "An unknown database error occured."
        );
        break;
    }
  } else if (!(err instanceof ErrorResponse)) {
    error = new ErrorResponse(
      "database-error",
      500,
      "An unknown database error occured."
    );
  } else {
    error = err;
  }

  console.log(err);

  res.status(error.statusCode).json({
    name: error.name,
    statusCode: error.statusCode,
    message: error.message,
    detail: error.detail,
  });
});

//TODO: cron job to notify expired.

// Cron job to cleanup user codes that have expired
cron.schedule("0 0 * * *", async () => {
  try {
    const expiredPassword = await UserModel.updateMany(
      { password_reset_expiry: { $lt: new Date() } },
      { $unset: { password_reset_expiry: "" } }
    );
    const expiredVerify = await UserModel.updateMany(
      { account_verification_expiry: { $lt: new Date() } },
      { $unset: { account_verification_expiry: "" } }
    );

    console.log(
      `[${new Date()}] Removed ${
        expiredPassword.modifiedCount
      } expired password reset codes.`
    );

    console.log(
      `[${new Date()}] Removed ${
        expiredVerify.modifiedCount
      } expired account verification codes.`
    );
  } catch (err) {
    console.error("There was an error removing expired user tokens.");
  }
});

//TODO: cron job to delete old data of unsubscribed users and remove them from extra shared locations

mongoose.set("debug", true);

const PORT = 8080;
app.listen(PORT, "localhost", () => {
  console.log(`Server is running on port ${PORT}.`);
});
