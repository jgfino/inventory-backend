declare global {
  namespace Express {
    interface User {
      _id: String;
      email: String;
    }
    interface Response {
      sendNotFoundError(msg: String): void;
      sendInternalError(msg: String): void;
      sendEmptyError(): void;
    }
  }
}

require("dotenv").config();

import express from "express";

import passport from "./passport/setup";
import mongoose from "mongoose";

import UserModel from "./schema/user.schema";
import LocationModel from "./schema/location.schema";
import InvitationModel from "./schema/invitation.schema";

import locations from "./routes/location.routes";
import auth from "./routes/auth.routes";
// import users from "./routes/user.routes";
import invitations from "./routes/invitation.routes";

var _ = require("lodash");
global._ = _;

var app = express();

const db = {
  mongoose: mongoose,
  url: process.env.MONGODB_URL,
  users: UserModel,
  locations: LocationModel,
  invitations: InvitationModel,
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

app.use("/api/auth", auth);
// app.use("/api/users", jwtAuth, users);
app.use("/api/locations", jwtAuth, locations);
app.use("/api/invitations", jwtAuth, invitations);

const PORT = 8080;
app.listen(PORT, "localhost", () => {
  console.log(`Server is running on port ${PORT}.`);
});
