var schemaUtils = require("./schemaUtils");
var mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ThirdPartyAuth = schemaUtils.buildSchema({
  provider_name: {
    type: String,
    default: null,
  },
  provider_id: {
    type: String,
    default: null,
  },
  provider_data: {
    type: {},
    default: null,
  },
});

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    encrypted_password: {
      type: String,
    },
    password_reset_token: {
      type: String,
      default: null,
    },
    password_reset_expiry: {
      type: Date,
      default: null,
    },
    third_party_auth: [ThirdPartyAuth],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const {
          __v,
          _id,
          encrypted_password,
          password_reset_expiry,
          password_reset_token,
          ...object
        } = doc.toObject();
        object.id = _id;
        return object;
      },
    },
  }
);

const User = mongoose.model("user", UserSchema);

module.exports = User;
