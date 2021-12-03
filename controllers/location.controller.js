/**
 * Defines CRUD operations for Locations and performs security checks.
 */

const Location = require("../schema/location.schema");

/**
 * Create a new Location owned by the requesting user.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns The newly created Location.
 */
exports.create = async (req, res) => {
  // Make sure the request has at least some body information
  if (!req.body) {
    res.status(400).send({
      message: "Request cannot be empty.",
    });
    return;
  }

  // Create a new location
  const location = new Location({
    name: req.body.name,
    iconName: req.body.iconName,
    colorName: req.body.colorName,
    owner: req.user.id,
    shared: req.body.shared,
    members: req.body.members,
  });

  try {
    const newLocation = await location.save();
    return res.send(newLocation);
  } catch (err) {
    res.status(500).send({
      message: `An error occured creating a new Location: ${err.message}`,
    });
  }
};

/**
 * Get all locations that the requesting user either owns or is a member of.
 * Can be filtered with query parameters "shared" and "search" to specify
 * only shared/not shared locations as well as perform full-text search on the
 * location name.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns The found Locations.
 */
exports.findAll = async (req, res) => {
  // Determine query parameters
  const search = req.query.search;
  const shared = req.query.shared;

  const params = [{ $or: [{ owner: req.user.id }, { members: req.user.id }] }];

  if (search) {
    params.push({ $text: { $search: search } });
  }

  if (shared) {
    params.push({ shared: shared });
  }

  var filter;
  if (params.length > 1) {
    filter = { $and: params };
  } else {
    filter = params[0];
  }

  try {
    const locations = await Location.find(filter);
    return res.send(locations);
  } catch (err) {
    res.status(500).send({
      message: `An error occured retreiving Locations: ${err.message}`,
    });
  }
};

/**
 * Get a location by id. Users can only access locations they own or are members
 * of.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns The found Location.
 */
exports.findOne = async (req, res) => {
  const id = req.params.id;

  try {
    const location = await Location.findOne({
      $and: [
        { _id: id },
        { $or: [{ owner: req.user.id }, { members: req.user.id }] },
      ],
    });
    if (!location) {
      return res
        .status(404)
        .send({ message: `Location with id=${id} not found.` });
    }
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: `An error occured retrieving Location with id=${id}: ${err.message}`,
    });
  }
};

/**
 * Update a location by id. Users can only update locations they own or are
 * members of. The fields which can be updated are name, iconName, colorName,
 * and shared.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns A success message.
 */
exports.update = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Request cannot be empty.",
    });
  }

  const id = req.params.id;

  let newBody = {
    name: req.body.name,
    iconName: req.body.iconName,
    colorName: req.body.colorName,
    shared: req.body.shared,
  };
  newBody = _.omitBy(newBody, _.isNil);

  try {
    const newLocation = await Location.findOneAndUpdate(
      {
        $and: [
          { _id: id },
          { $or: [{ owner: req.user.id }, { members: req.user.id }] },
        ],
      },
      req.body
    );

    if (!newLocation) {
      return res.status(404).send({
        message: `Could not find Location with id ${id} to update.`,
      });
    }

    res.send({
      message: `Location with id ${id} updated successfully.`,
    });
  } catch (err) {
    res.status(500).send({
      message: `Error updating Location with id=${id}: ${err.message}`,
    });
  }
};

/**
 * Modifies the members of a location. A PUT request adds members, while a
 * DELETE request removes them.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns A success message.
 */
exports.modifyMembers = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({
      message: "Request cannot be empty.",
    });
  }

  const id = req.params.id;
  const members = req.body.members ?? [];

  try {
    const updatedLocation = await Location.findOneAndUpdate(
      {
        $and: [
          { _id: id },
          { $or: [{ owner: req.user.id }, { members: req.user.id }] },
        ],
      },
      req.method == "PUT"
        ? { $push: { members: { $each: members } } }
        : req.method == "DELETE"
        ? { $pull: { members: { $in: members } } }
        : {}
    );

    if (!updatedLocation) {
      return res.status(404).send({
        message: `Could not find Location with id ${id} to update.`,
      });
    }

    res.send({
      message: `Location with id ${id} updated successfully.`,
    });
  } catch (err) {
    res.status(500).send({
      message: `Error updating Location with id=${id}: ${err.message}`,
    });
  }
};

/**
 * Delete a location by id. Users can only delete locations that they own.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns A success message when deleted.
 */
exports.delete = async (req, res) => {
  const id = req.params.id;

  try {
    const oldLocation = await Location.findOneAndDelete({
      $and: [{ _id: id }, { owner: req.user.id }],
    });

    if (!oldLocation) {
      return res.status(404).send({
        message: `Could not find Location with id ${id} to delete.`,
      });
    }

    res.send({
      message: `Location with id=${id} deleted successfully.`,
    });
  } catch (err) {
    res.status(500).send({
      message: `Error deleting Location with id=${id}: ${err.message}`,
    });
  }
};
