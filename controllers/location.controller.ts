import LocationModel from "../schema/location.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import ItemModel from "../schema/item.schema";
import UserModel from "../schema/user.schema";
import AuthErrors from "../error/errors/auth.errors";

/**
 * Create a location. Users can create one location on a free account and
 * unlimited on premium
 */
export const createLocation = catchAsync(async (req, res, next) => {
  const location = await LocationModel.createAuthorized(req.user, req.body);
  res.status(200).send(location);
});

/**
 * Get multiple locations.
 */
export const getLocations = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const conditions: any = {};

    query.owner && (conditions.owner = String(query.owner));
    query.search && (conditions.$text = { $search: String(query.search) });

    const locations = await locationModel.find(conditions);
    res.status(200).send(locations);
  },
  [LocationModel, "view"]
);

/**
 * Get one location
 */
export const getLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne({ _id: req.params.id });

    if (!location) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    res.status(200).send(location);
  },
  [LocationModel, "view"]
);

/**
 * Get location with details
 */
export const getLocationDetails = authorizeAndCatchAsync(
  async (req, res, next, locationModel, itemModel) => {
    const location = await locationModel
      .findOne({ _id: req.params.id })
      .populate("members", "_id name photoUrl");

    if (!location) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    const items = await itemModel.find({ location: req.params.id });
    const totalValue = items.reduce(
      (a, b) => a + Number.parseFloat(b.price?.toString()),
      0
    );

    const json: any = location.toJSON();
    json.totalValue = totalValue;
    json.items = items;

    res.status(200).send(json);
  },
  [LocationModel, "view"],
  [ItemModel, "view"]
);

/**
 * Update a location
 */
export const updateLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const { notificationDays, name, iconName } = req.body;

    const newData = {
      name: name,
      iconName: iconName,
      "notificationDays.$.days": notificationDays,
    };

    const updateResult = await locationModel.updateOne(
      { _id: req.params.id, "notificationDays.user": req.user._id },
      newData,
      { runValidators: true }
    );

    if (updateResult.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res
      .status(200)
      .send({ message: `Location ${req.params.id} updated successfully.` });
  },
  [LocationModel, "update"]
);

/**
 * Delete a location
 */
export const deleteLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne({
      _id: req.params.id,
    });

    if (!location) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to delete it."
        )
      );
    }

    await location.remove();

    res
      .status(200)
      .send({ message: `Location ${req.params.id} deleted successfully.` });
  },
  [LocationModel, "delete"]
);

/**
 * Add a member to a location. Users can only add themselves to a location.
 * Free users can only add themselves to one Location at a time
 */
export const addMember = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const isPremium = await UserModel.verifySubscription(userId);

  if (!isPremium && req.user.defaultSharedLocation) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "You must be a premium member to join more than one Location"
      )
    );
  }

  const owner: string = await LocationModel.findById(req.params.id, "owner", {
    autopopulate: false,
  }).distinct("owner")[0];
  const ownerIsPremium = await UserModel.verifySubscription(owner);

  if (!ownerIsPremium) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "The owner of this Location is not a Premium member. Have them upgrade in order to join this Location"
      )
    );
  }

  const updatedLocation = await LocationModel.updateOne(
    { _id: req.params.id, owner: { $ne: userId } },
    {
      $addToSet: {
        members: userId,
        notificationDays: { user: userId },
      },
    }
  );

  if (updatedLocation.matchedCount < 1) {
    return next(
      DatabaseErrors.NOT_FOUND(
        "A location with this id does not exist or you do not have permission to add this user to it."
      )
    );
  }

  if (!req.user.defaultSharedLocation) {
    await UserModel.updateOne(
      { _id: userId },
      { defaultSharedLocation: req.params.id }
    );
  }
});

/**
 * Remove a member from a location
 */
export const removeMember = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const updatedLocation = await locationModel.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          members: req.params.memberId,
          notificationDays: { user: req.params.memberId },
        },
      }
    );

    if (updatedLocation.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    // Delete items in this location owned by the removed member
    await ItemModel.deleteMany({
      owner: req.params.memberId,
      location: req.params.id,
    });

    // Update the user's default shared location, if necessary
    if (req.user.defaultSharedLocation.toString() == req.params.id) {
      await UserModel.updateOne(
        { _id: req.params.memberId },
        { $unset: { defaultSharedLocation: "" } }
      );
    }

    res
      .status(200)
      .send({ message: `Location ${req.params.id} updated successfully.` });
  },
  [LocationModel, "update"]
);
