import LocationModel from "../schema/location.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import ItemModel from "../schema/item.schema";

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
  await LocationModel.addMember(req.user, req.params.id);
  res
    .status(200)
    .send({ message: `Location ${req.params.id} updated successfully.` });
});

/**
 * Remove a member from a location
 */
export const removeMember = catchAsync(async (req, res, next) => {
  await LocationModel.removeMember(
    req.user,
    req.params.id,
    req.params.memberId
  );

  res
    .status(200)
    .send({ message: `Location ${req.params.id} updated successfully.` });
});
