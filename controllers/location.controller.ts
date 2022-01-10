import LocationModel from "../schema/location.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import UserModel from "../schema/user.schema";
import AuthErrors from "../error/errors/auth.errors";
import { BaseUser } from "../types/User";
import { Item } from "../types/Item";

/**
 * Create a location. Users can create one location on a free account and
 * unlimited on premium
 */
export const createLocation = catchAsync(async (req, res, next) => {
  const location = await LocationModel.createAuthorized(req.user, req.body);
  res.status(200).send(location);
});

/**
 * Get multiple locations. Items not included
 */
export const getLocations = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const conditions: any = {};

    query.owner && (conditions.owner = String(query.owner));
    query.search && (conditions.$text = { $search: String(query.search) });

    const locations = await locationModel.find(
      { name: "test" },
      {},
      { projection: { name: 1 } }
    );

    res.status(200).send(locations);
  },
  [LocationModel, "view"]
);

/**
 * Get one location, include items with details
 */
export const getLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    let locationQuery = locationModel.findOne({ _id: req.params.id });

    if (req.path.substring(req.path.lastIndexOf("/") + 1) != "items") {
      locationQuery.projection({ items: 0 });
    }

    const location = await locationQuery;

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
  const isPremium = UserModel.isPremium(req.user);

  if (!isPremium && req.user.defaultSharedLocation) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "You must be a premium member to join more than one Location"
      )
    );
  }

  const location = await LocationModel.findOne(
    { _id: req.params.id, "owner._id": { $ne: userId } },
    "_id owner"
  ).lean();

  if (!location) {
    return next(
      DatabaseErrors.NOT_FOUND(
        "A location with this id does not exist or you do not have permission to add this user to it."
      )
    );
  }

  const ownerIsPremium = UserModel.isPremium(location.owner);

  if (!ownerIsPremium) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "The owner of this Location is not a Premium member. Have them upgrade in order to join this Location"
      )
    );
  }

  const newMember: BaseUser = {
    _id: req.user._id,
    name: req.user.name,
    photoUrl: req.user.photoUrl,
  };

  await LocationModel.updateOne(
    { _id: req.params.id, "owner._id": { $ne: userId } },
    {
      $addToSet: {
        members: newMember,
        notificationDays: { user: userId, days: [] },
      },
    }
  );

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
          members: { _id: req.params.memberId },
          notificationDays: { user: req.params.memberId },
          items: { "owner._id": req.params.memberId },
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

export const addItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = req.params.id;

    const item: Item = {
      ...req.body,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
    };

    const update = await locationModel.updateOne(
      { _id: location },
      { $addToSet: { items: item } }
    );

    if (update.matchedCount < 1) {
      DatabaseErrors.NOT_FOUND(
        "A location with this id does not exist or you do not have permission to modify it."
      );
    }

    res
      .status(200)
      .send({ message: `Item add to Location ${req.params.id} successfully.` });
  },
  [LocationModel, "update"]
);

export const getItems = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne(
      { _id: req.params.id },
      "items"
    );

    if (!location) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    res.status(200).send(location.items);
  },
  [LocationModel, "view"]
);

export const searchItems = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query.q as string;

    const matches = await locationModel.find(
      {
        $text: { $search: query },
        items: { $elemMatch: { $regex: `/${query}/i` } },
      },
      { _id: 1, name: 1, "items.$": 1 }
    );

    res.status(200).send(matches);
  },
  [LocationModel, "view"]
);

export const getItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne(
      { _id: req.params.id, "items._id": req.params.item },
      { "items.$": 1 }
    );

    if (location.items.length < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id was not found or you do not have permission to view it."
        )
      );
    }

    const item = location.items[0];
    res.status(200).send(item);
  },
  [LocationModel, "view"]
);

export const updateItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const {
      name,
      category,
      iconName,
      expirationDate,
      opened,
      purchaseLocation,
      notes,
      price,
    } = req.body;
    const newItem = {
      "items.$.name": name,
      "items.$.category": category,
      "items.$.iconName": iconName,
      "items.$.expirationDate": expirationDate,
      "items.$.opened": opened,
      "items.$.purchaseLocation": purchaseLocation,
      "items.$.notes": notes,
      "items.$.price": price,
    };

    const update = await locationModel.updateOne(
      { _id: req.params.id, "items._id": req.params.item },
      newItem
    );

    if (update.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item ${req.params.item} in ${req.params.id} updated successfully`,
    });
  },
  [LocationModel, "update"]
);

export const removeItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const update = await locationModel.updateOne(
      { _id: req.params.id },
      { $pull: { items: { _id: req.params.item } } }
    );

    if (update.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item ${req.params.item} in ${req.params.id} updated successfully`,
    });
  },
  [LocationModel, "update"]
);
