const mongoose = require("mongoose");

/**
 * Builds a mongoose schema with the given structure.
 * @param {Any}     structure The structure of the schema.
 * @param {Boolean} timestamps Whether to include timestamps in the schema, default is true.
 * @returns A mongoose schema with the given structure.
 */
const buildSchema = (structure, timestamps = true) => {
  const schema = mongoose.Schema(structure, {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        const { __v, _id, ...object } = doc.toObject();
        object.id = _id;
        return object;
      },
    },
  });

  return schema;
};

/**
 * Creates a schema and mongoose model of the given structure.
 * @param {String}  name The name of the model.
 * @param {Any}     structure The structure of the model.
 * @param {Boolean} timestamps Whether to include timestamps, default is true.
 * @returns A mongoose model with the given structure.
 */
const buildModel = (name, structure, timestamps = true) => {
  const Model = mongoose.model(name, buildSchema(structure, timestamps));
  return Model;
};

exports.buildSchema = buildSchema;
exports.buildModel = buildModel;
