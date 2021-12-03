require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const db = require("./schema");
const passport = require("./passport/setup");

const locations = require("./routes/location.routes");
const auth = require("./routes/auth.routes");
const users = require("./routes/user.routes");

var app = express();

db.mongoose
  .connect(db.url)
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

const jwtAuth = passport.authenticate("jwt", { session: false });

app.use("/api/auth", auth);
app.use("/api/users", jwtAuth, users);
app.use("/api/locations", jwtAuth, locations);

const PORT = process.env.PORT || 8080;
app.listen(PORT, "localhost", () => {
  console.log(`Server is running on port ${PORT}.`);
});
