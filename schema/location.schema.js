var schemaUtils = require("./schemaUtils");

var Location = schemaUtils.buildModel("location", {
  name: {
    type: String,
    trim: true,
    required: true,
  },
  iconName: {
    type: String,
    required: true,
  },
  colorName: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  shared: {
    type: Boolean,
    required: true,
    default: false,
  },
  members: {
    type: [String],
    required: true,
    default: [],
  },
});

module.exports = Location;
