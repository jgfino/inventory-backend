import LocationModel from "../schema/location.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import UserModel from "../schema/user.schema";
import AuthErrors from "../error/errors/auth.errors";
import { BaseUser } from "../types/User";
import { Item } from "../types/Item";
import { Types } from "mongoose";
import { ItemModel } from "../schema/item.schema";
import { paginateNestedArrayPipeline, parsePaginationQuery } from "./utils";

/**
 * Create a new Location for the requesting user. Users with free accounts can
 * create up to one Location (either a fridge or a pantry). Users with premium
 * accounts can create unlimited Locations
 */
export const createLocation = catchAsync(async (req, res, next) => {
  const isPremium = UserModel.isPremium(req.user);
  const { name, iconName, notes } = req.body;

  // Restrictions apply if the user is not premium
  if (!isPremium) {
    // They cannot create a second Location
    if (req.user.defaultLocation) {
      return next(
        AuthErrors.PREMIUM_FEATURE(
          "A paid account is required to create more than one Location"
        )
      );
    }

    // They can only create "fridge" or "pantry" Locations
    if (
      iconName.toLowerCase() != "fridge" &&
      iconName.toLowerCase() != "pantry"
    ) {
      return next(
        AuthErrors.PREMIUM_FEATURE(
          "Only Pantry and Fridge Locations can be created with a free account"
        )
      );
    }
  }

  // Create the new Location
  const newLocation = await LocationModel.create({
    name: name,
    iconName: iconName,
    owner: {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
      subscriptionExpires: req.user.subscriptionExpires,
    },
    notificationDays: [
      {
        user: req.user._id,
        days: [],
      },
    ],
    lastOpened: [
      {
        user: req.user._id,
        date: new Date(),
      },
    ],
    lastUpdatedBy: {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
    },
    notes: notes,
  });

  // If this is the user's first Location, specify this
  if (!req.user.defaultLocation) {
    await UserModel.updateOne(
      { _id: req.user._id },
      { defaultLocation: newLocation._id },
      { runValidators: true }
    );
  }

  res
    .status(200)
    .send({ message: `Location ${newLocation._id} created successfully` });
});

/**
 * Get a list of all the Locations the current user has access to. Users with a
 * free account can view Locations that they own and the one shared Location
 * they are allowed to join. Premium users can view Locations that they own or
 * are a member of.
 *
 * - Limit/offset supported
 * - Search by Location name
 * - Sort by name, createdAt, updatedAt, lastOpened
 */
export const getLocations = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const conditions: any = {};

    const { order, limit, offset } = parsePaginationQuery(query);
    query.q && (conditions.name = new RegExp(String(query.q), "i"));
    const sortField = query.sort ? String(query.sort) : "lastOpened";

    const aggregation = await LocationModel.aggregate([
      {
        $match: { $and: [locationModel.getFilter(), conditions] },
      },
      {
        $addFields: {
          lastOpenedByUser: {
            $filter: {
              input: "$lastOpened",
              as: "lo",
              cond: { $eq: ["$$lo.user", new Types.ObjectId(req.user._id)] },
            },
          },
        },
      },
      {
        $sort: {
          [sortField == "lastOpened" ? "lastOpenedByUser.date" : sortField]:
            order,
        },
      },
      { $limit: limit },
      { $skip: offset },
      {
        $project: {
          _id: 1,
          name: 1,
          iconName: 1,
          owner: 1,
          members: 1,
          items: { $sum: "$items" },
          notificationDays: {
            $filter: {
              input: "$notificationDays",
              as: "nd",
              cond: { eq: ["$$nd.user", new Types.ObjectId(req.user._id)] },
            },
          },
          lastOpened: "$lastOpenedByUser",
          notes: 1,
          lastUpdatedBy: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    const locations = aggregation.map((location) => {
      const json = LocationModel.hydrate(location).toJSON();
      json.items = location.items;
      return json;
    });

    res.status(200).send(locations);
  },
  [LocationModel, "view"]
);

/**
 * Get a Location by ID. Will only return a Location if a user is authorized to
 * see it. Users with a free account can view Locations that they own and the
 * one shared Location they are allowed to join. Premium users can view
 * Locations that they own or are a member of.
 */
export const getLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const aggregation = await LocationModel.aggregate([
      {
        $match: {
          $and: [
            locationModel.getFilter(),
            { _id: new Types.ObjectId(req.params.id) },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          iconName: 1,
          owner: 1,
          members: 1,
          items: { $sum: "$items" },
          totalValue: { $sum: "$items.price" },
          notificationDays: {
            $filter: {
              input: "$notificationDays",
              as: "nd",
              cond: { eq: ["$$nd.user", new Types.ObjectId(req.user._id)] },
            },
          },
          lastOpened: {
            $filter: {
              input: "$lastOpened",
              as: "lo",
              cond: { $eq: ["$$lo.user", new Types.ObjectId(req.user._id)] },
            },
          },
          notes: 1,
          lastUpdatedBy: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (aggregation.length < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    const { totalValue, ...location } = aggregation[0];
    const json: any = LocationModel.hydrate(location).toJSON();
    json.totalValue = totalValue;

    res.status(200).send(json);
  },
  [LocationModel, "view"]
);

/**
 * Update the Location with the given ID. Updatable fields include name,
 * iconName, lastUpdated, notes, and notificationDays. Users with free accounts
 * can update their default personal Location and their default shared Location,
 * as long as the owner of the shared Location has an active subscription.
 * Premium users can update Locations that they own or that they are a member
 * of, provided that the owner of the Location has an active subscription
 */
export const updateLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const { notificationDays, name, iconName, lastOpened, notes } = req.body;

    const error = DatabaseErrors.NOT_FOUND(
      "A location with this id does not exist or you do not have permission to modify it."
    );

    const newData: any = {
      name: name,
      iconName: iconName,
      notes: notes,
      lastUpdatedBy: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
    };

    const filter: any = { _id: req.params.id };

    if (notificationDays != null && lastOpened) {
      const updateResult = await locationModel.updateOne(
        { _id: req.params.id, "notificationDays.user": req.user._id },
        { "notificationDays.$.days": notificationDays },
        { runValidators: true }
      );

      if (updateResult.matchedCount < 1) {
        return next(error);
      }

      newData.lastOpened.$.days = lastOpened;
      filter.lastOpened.user = req.user._id;
    } else if (notificationDays != null) {
      newData.notificationDays.$.days = notificationDays;
      filter.notificationDays.user = req.user._id;
    } else if (lastOpened) {
      newData.lastOpened.$.days = lastOpened;
      filter.lastOpened.user = req.user._id;
    }

    const updateResult = await locationModel.updateOne(filter, newData, {
      runValidators: true,
    });

    if (updateResult.matchedCount < 1) {
      return next(error);
    }

    res
      .status(200)
      .send({ message: `Location ${req.params.id} updated successfully.` });
  },
  [LocationModel, "update"]
);

/**
 * Delete a Location by ID. Users can delete Locations that they own,
 * regardless of subscription status.
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
 * Add the requesting user as a member of the Location with the given ID. Free
 * users can join up to one Location owned by a premium user, and premium users
 * can join unlimited Locations owned by premium users. If a free user does not
 * have a default shared location but is a member of another location from when
 * they had a previous subscription, rejoining that location will set that
 * location as their default shared location
 */
export const joinLocation = catchAsync(async (req, res, next) => {
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
    "_id owner members._id"
  ).lean();

  if (!location) {
    return next(
      DatabaseErrors.NOT_FOUND(
        "A location with this id does not exist or you do not have permission to join it."
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

  if (
    location.members.some(
      (member) => member._id.toString() == userId.toString()
    )
  ) {
    if (!isPremium && !req.user.defaultSharedLocation) {
      await UserModel.updateOne(
        { _id: userId },
        { defaultSharedLocation: req.params.id },
        { runValidators: true }
      );

      res.status(200).send({
        message: `Location ${req.params.id} set as user's default shared Location.`,
      });
    } else {
      return next(
        DatabaseErrors.INVALID_FIELD(
          "You are already a member of this Location."
        )
      );
    }
  } else {
    const newMember: BaseUser = {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
    };

    // Add the member
    await LocationModel.updateOne(
      { _id: req.params.id, "owner._id": { $ne: userId } },
      {
        $addToSet: {
          members: newMember,
          notificationDays: { user: userId, days: [] },
          lastOpened: { user: userId, date: new Date() },
        },
      },
      { runValidators: true }
    );

    // Update the user's default shared location, if necessary
    if (!req.user.defaultSharedLocation) {
      await UserModel.updateOne(
        { _id: userId },
        { defaultSharedLocation: req.params.id },
        { runValidators: true }
      );
    }

    res.status(200).send({
      message: `User added to Location ${req.params.id} successfully.`,
    });
  }
});

/**
 * Remove the member with the given ID from the Location with the given ID.
 * Free users can remove members from their default shared Location, given that
 * the owner has an active subscription. Premium users can remove members from
 * Locations which they own or are a member of, provided that the owner has an
 * active subscription. Free users can remove themselves from their default
 * shared Location, and premium users can remove themselves from any Location
 * they are a member of.
 */
export const removeMember = authorizeAndCatchAsync(
  async (req, res, next, locationUpdate, locationView) => {
    let locationModel = locationView;
    let member = req.user._id.toString();

    if (
      req.path.substring(req.path.lastIndexOf("/") + 1).toLowerCase() != "leave"
    ) {
      locationModel = locationUpdate;
      member = req.params.memberId;
    }

    const updatedLocation = await locationModel.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          members: { _id: member },
          notificationDays: { user: member },
          lastOpened: { user: member },
          items: { "owner._id": member },
        },
      },
      { runValidators: true }
    );

    if (updatedLocation.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    // Update user's default shared location
    await UserModel.updateOne(
      { _id: member, defaultSharedLocation: req.params.id },
      { $unset: { defaultSharedLocation: "" } }
    );

    res
      .status(200)
      .send({ message: `Location ${req.params.id} updated successfully.` });
  },
  [LocationModel, "update"],
  [LocationModel, "view"]
);

/**
 * Add an Item to the Location with the given ID. Free users can add Items to
 * their default owned Location or their default shared Location, provided that
 * the owner has an active subscription. Premium users can add Items to
 * Locations which they own or are a member or, provided that the owner has an
 * active subscription.
 */
export const addItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = req.params.id;
    const { _id, ...data } = req.body;

    const item: Item = {
      ...data,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
      added: data.added ?? new Date(),
    };

    const update = await locationModel.updateOne(
      { _id: location },
      {
        $push: { items: { $each: [item], $sort: { name: 1 } } },
        $set: {
          lastUpdatedBy: {
            _id: req.user._id,
            name: req.user.name,
            photoUrl: req.user.photoUrl,
          },
        },
      },
      { runValidators: true }
    );

    if (update.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item added to Location ${req.params.id} successfully.`,
    });
  },
  [LocationModel, "update"]
);

/**
 * Get a list of all of the Items in the given Location. Items can be searched
 * by name
 */
export const getItems = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const pipeline: any[] = [
      {
        $match: {
          $and: [
            locationModel.getFilter(),
            { _id: new Types.ObjectId(req.params.id) },
          ],
        },
      },
      ...paginateNestedArrayPipeline(query, {
        arrayField: "items",
        defaultSortField: "name",
        searchField: "name",
      }),
    ];

    const aggregation: any = await LocationModel.aggregate(pipeline);

    // Prevent empty array errors
    if (aggregation.length == 0) {
      return res.status(200).send([]);
    }

    // Format the outputted items
    const items = aggregation[0].items.map((item) =>
      ItemModel.hydrate(item).toJSON()
    );

    res.status(200).send(items);
  },
  [LocationModel, "view"]
);

/**
 * Get the Item with the given ID from the Location with the given ID. Users
 * with a free account can view Items in Locations that they own and the one
 * shared Location they are allowed to join. Premium users can view Items in
 * Locations that they own or are a member of. Items can be searched by name
 */
export const getItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne(
      { _id: req.params.id, "items._id": req.params.itemId },
      { "items.$": 1, name: 1, _id: 1 }
    );

    if (location.items.length < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An Item with this id was not found or you do not have permission to view it."
        )
      );
    }

    const itemJson = location.toJSON().items[0];
    const item = {
      ...itemJson,
      location: {
        id: location.id,
        name: location.name,
      },
    };

    res.status(200).send(item);
  },
  [LocationModel, "view"]
);

/**
 * Update the Item with the given ID in the Location with the given ID.
 * Updatable fields include name, category, iconName, added, expirationDate,
 * opened, purchaseLocation, notes, price. Users with free accounts can update
 * Items in their default personal Location and their default shared Location,
 * as long as the owner of the shared Location has an active subscription.
 * Premium users can update Items in Locations that they own or that they are a
 * member of, provided that the owner of the Location has an active subscription
 */
export const updateItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const {
      name,
      category,
      iconName,
      added,
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
      "items.$.added": added,
      "items.$.expirationDate": expirationDate,
      "items.$.opened": opened,
      "items.$.purchaseLocation": purchaseLocation,
      "items.$.notes": notes,
      "items.$.price": price,
      lastUpdatedBy: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
    };

    const update = await locationModel.updateOne(
      { _id: req.params.id, "items._id": req.params.itemId },
      newItem,
      { runValidators: true }
    );

    if (update.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item ${req.params.itemId} in ${req.params.id} updated successfully`,
    });
  },
  [LocationModel, "update"]
);

/**
 * Delete the Item with the given ID from the Location with the given ID. Users
 * with free accounts can delete Items in their default personal Location and
 * their default shared Location, as long as the owner of the shared Location
 * has an active subscription. Premium users can delete Items in Locations that
 * they own or that they are a member of, provided that the owner of the
 * Location has an active subscription
 */
export const removeItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const update = await locationModel.updateOne(
      { _id: req.params.id, "items._id": req.params.itemId },
      {
        $pull: { items: { _id: req.params.itemId } },
        $set: {
          lastUpdatedBy: {
            _id: req.user._id,
            name: req.user.name,
            photoUrl: req.user.photoUrl,
          },
        },
      }
    );

    if (update.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item ${req.params.itemId} in ${req.params.id} updated successfully`,
    });
  },
  [LocationModel, "update"]
);

/**
 * Search all Items in all Locations a user has access to. Users with a free
 * account can view Items in Locations that they own and the one shared Location
 * they are allowed to join. Premium users can view Items in Locations that they
 * own or are a member of. Items can be searched by name.
 */
export const searchItems = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;

    const pipeline: any[] = [
      {
        $match: {
          $and: [
            locationModel.getFilter(),
            { "items.name": new RegExp(String(query.q), "i") },
          ],
        },
      },
      { $addFields: { items: { location: { name: "$name", id: "$_id" } } } },
      ...paginateNestedArrayPipeline(query, {
        arrayField: "items",
        defaultSortField: "name",
        searchField: "name",
      }),
    ];

    const aggregation: any = await LocationModel.aggregate(pipeline);

    // Prevent empty array errors
    if (aggregation.length == 0) {
      return res.status(200).send([]);
    }

    // Format the outputted items
    const items = aggregation[0].items.map((itemLocation) => {
      const { location, ...item } = itemLocation;
      const itemJSON: any = ItemModel.hydrate(item).toJSON();
      itemJSON.location = location;
      return itemJSON;
    });

    res.status(200).send(items);
  },
  [LocationModel, "view"]
);
