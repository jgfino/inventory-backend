/**
 * Defines CRUD operations for Users and performs security checks.
 */

const User = require("../schema/user.schema");
const Location = require("../schema/location.schema");
const db = require("../schema");

/**
 * Get a user's profile. If no id is specified, get the current user's profile.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns The requested user.
 */
exports.findOne = async (req, res) => {
  const id = req.params.id ?? req.user.id;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).send({ message: `User with id=${id} not found.` });
    }

    res.send(user);
  } catch (err) {
    return res.status(500).send({
      message: `An error occured retrieving user with id=${id}: ${err.message}`,
    });
  }
};

/**
 * Updates the requesting user's profile. Fields which can be updated are name
 * and email.
 * @param {*} req The request object.
 * @param {*} res The response object.
 * @returns A status message.
 */
exports.update = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ message: "Request cannot be empty." });
  }

  const id = req.user.id;

  let newBody = {
    name: req.body.name,
    email: req.body.email,
  };
  newBody = _.omitBy(newBody, _.isNil);

  try {
    const user = await User.findByIdAndUpdate(id, newBody);
    if (!user) {
      return res
        .status(404)
        .send({ message: `Could not find user with id=${id} to update.` });
    }
    res.send({ message: `User with id=${id} updated successfully.` });
  } catch (err) {
    return res
      .status(500)
      .send({ message: `Error updating user with id=${id}.` });
  }
};

/**
 * Delete the current user, and delete any locations they own as well as remove
 * membership in any shared containers
 * @param {*} req The request object.
 * @param {*} res The response object.
 */
exports.delete = async (req, res) => {
  const id = req.user.id;
  const session = await db.mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await User.findByIdAndDelete(id);
      await Location.deleteMany({ owner: id });
      await Location.updateMany({ members: id }, { $pull: { members: id } });
    });

    res.send({ message: `User with id=${id} deleted successfully.` });
  } catch (err) {
    res.status(500).send({
      message: `Error deleting User with id=${id}: ${err.message}`,
    });
  } finally {
    await session.endSession();
  }
};
