import mongoose, {
  model,
  Model,
  Schema,
  SchemaDefinition,
  SchemaDefinitionType,
} from "mongoose";
import { createReturn } from "typescript";

/**
 * Builds a mongoose schema with the given structure. Overrides the toJSON
 * function to remove __v and replace _id with id.
 * @param structure   The structure of the schema.
 * @param timestamps  Whether to include timestamps in the schema, default is
 *                    true.
 * @returns A mongoose schema with the given structure.
 */
function buildSchema<T>(
  structure: SchemaDefinition<SchemaDefinitionType<T>>,
  timestamps: boolean = true
): Schema<T> {
  const schema = new Schema<T>(structure, {
    timestamps: timestamps,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  });

  return schema;
}

/**
 * Creates a mongoose model of the given structure.
 * @param name        The name of the model.
 * @param structure   The structure of the model.
 * @param timestamps  Whether to include timestamps, default is true.
 * @returns A mongoose model with the given structure.
 */
function buildModel<T>(
  name: string,
  structure: SchemaDefinition<SchemaDefinitionType<T>>,
  timestamps = true
): Model<T> {
  return model(name, buildSchema<T>(structure, timestamps));
}

export { buildSchema, buildModel };
