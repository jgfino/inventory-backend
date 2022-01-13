import LocationModel from "../schema/location.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";
import UserModel from "../schema/user.schema";
import AuthErrors from "../error/errors/auth.errors";
import { BaseUser } from "../types/User";
import { Item } from "../types/Item";
import { Types } from "mongoose";
import { ItemModel } from "../schema/item.schema";

/**
 * Create a new Location for the requesting user. Users with free accounts can
 * create up to one Location (either a fridge or a pantry). Users with premium
 * accounts can create unlimited Locations
 */
export const createLocation = catchAsync(async (req, res, next) => {
  const isPremium = UserModel.isPremium(req.user);
  const { _id, ...data } = req.body;

  if (!isPremium) {
    if (req.user.defaultLocation) {
      return next(
        AuthErrors.PREMIUM_FEATURE(
          "A paid account is required to create more than one Location"
        )
      );
    }

    if (
      data.iconName.toLowerCase() != "fridge" &&
      data.iconName.toLowerCase() != "pantry"
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
    name: data.name,
    iconName: data.iconName,
    owner: {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
      subscription_expires: req.user.subscription_expires,
    },
    notificationDays: [
      {
        user: req.user._id,
        days: [],
      },
    ],
  });

  // If this is the user's first Location, specify this
  if (!req.user.defaultLocation) {
    await UserModel.updateOne(
      { _id: req.user._id },
      { defaultLocation: newLocation._id }
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
 * are a member of. Locations can be searched by name
 */
export const getLocations = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const conditions: any = {};
    query.q && (conditions.name = new RegExp(String(query.q), "i"));

    const { sort, limit, offset } = parsePaginationQuery(query);

    const locationQuery = locationModel
      .find(conditions)
      .sort(sort)
      .limit(limit)
      .skip(offset);

    const projection = {
      _id: 1,
      name: 1,
      iconName: 1,
      owner: 1,
      members: 1,
      "items._id": 1,
      notificationDays: { $elemMatch: { user: req.user._id } },
      notes: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    locationQuery.projection(projection);

    const locations: any = await locationQuery;
    const locationsWithCount = locations.map((location) => {
      return {
        ...location.toJSON(),
        items: location.items.length,
      };
    });

    res.status(200).send(locationsWithCount);
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
    const locationQuery = locationModel.findOne({ _id: req.params.id });

    const projection = {
      _id: 1,
      name: 1,
      iconName: 1,
      owner: 1,
      members: 1,
      "items._id": 1,
      notificationDays: { $elemMatch: { user: req.user._id } },
      notes: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    locationQuery.projection(projection);

    const location = await locationQuery;

    if (!location) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A location with this id does not exist or you do not have permission to view it."
        )
      );
    }

    const locationJSON: any = location.toJSON();
    locationJSON.items = locationJSON.items.length;

    res.status(200).send(locationJSON);
  },
  [LocationModel, "view"]
);

/**
 * Update the Location with the given ID. Updatable fields include name,
 * iconName, and notificationDays. Users with free accounts can update their
 * default personal Location and their default shared Location, as long as the
 * owner of the shared Location has an active subscription. Premium users can
 * update Locations that they own or that they are a member of, provided that
 * the owner of the Location has an active subscription
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
 * Add the requesting user as a member of the Location with the given ID.
 * Free users can join up to one Location owned by a premium user, and premium
 * users can join unlimited Locations owned by premium users
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
    "_id owner"
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

  // Update the user's default shared location, if necessary
  if (!req.user.defaultSharedLocation) {
    await UserModel.updateOne(
      { _id: userId },
      { defaultSharedLocation: req.params.id }
    );
  }
});

/**
 * Remove the member with the given ID from the Location with the given ID.
 * Free users can remove members from their default shared Location, given that
 * the owner has an active subscription. Premium users can remove members from
 * Locations which they own or are a member of, provided that the owner has an
 * active subscription.
 */
export const removeMember = authorizeAndCatchAsync(
  async (req, res, next, locationUpdate, locationView) => {
    // Determine authorization based on requesting user
    let locationModel = locationView;
    let member = req.user._id.toString();

    if (req.user._id.toString() != req.params.id) {
      locationModel = locationUpdate;
      member = req.params.memberId;
    }

    const updatedLocation = await locationModel.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          members: { _id: member },
          notificationDays: { user: member },
          items: { "owner._id": member },
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
      { $addToSet: { items: item } }
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
    const { offset, limit, sort } = parsePaginationQuery(query, "items");

    const pipeline: any[] = [
      {
        $match: {
          $and: [
            locationModel.getFilter(),
            { _id: new Types.ObjectId(req.params.id) },
          ],
        },
      },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      { $sort: sort },
      {
        $group: {
          _id: "$_id",
          items: {
            $push: "$items",
          },
        },
      },
      {
        $project: {
          items: {
            $slice: ["$items", offset, limit],
          },
        },
      },
    ];

    if (query.q) {
      pipeline.splice(2, 0, {
        $match: { "items.name": new RegExp(String(query.q), "i") },
      });
    }

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
 * Get the Item with the given ID from the Location with the given ID.
 */
export const getItem = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne(
      { _id: req.params.id, "items._id": req.params.item },
      { "items.$": 1, name: 1, _id: 1 }
    );

    if (location.items.length < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id was not found or you do not have permission to view it."
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

/**
 * Search all Items in all Locations a user has access to. Users with a free
 * account can view Items in Locations that they own and the one shared Location
 * they are allowed to join. Premium users can view Items in Locations that they
 * own or are a member of. Items can be searched by name.
 */
export const searchItems = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const { limit, offset, sort } = parsePaginationQuery(query, "items");

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
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      {
        $match: { "items.name": new RegExp(String(query.q), "i") },
      },
      { $sort: sort },
      { $group: { _id: null, items: { $push: "$items" } } },
      {
        $project: {
          items: {
            $slice: ["$items", offset, limit],
          },
        },
      },
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

type PaginationQuery = {
  order?: string;
  sort?: string;
  offset?: string;
  limit?: string;
};

/**
 * Determines order, sort, limit, and offset for a query
 * @param query The query to parse
 * @returns Order, sort, limit, and offset.
 */
const parsePaginationQuery = (
  query: PaginationQuery,
  sortFieldPrefix?: string,
  defaultSortField = "name"
) => {
  let order = 1;
  if (query.order && query.order == "desc") {
    order = -1;
  }

  let sort: any;
  if (sortFieldPrefix) {
    sort = { [`${sortFieldPrefix}.${defaultSortField}`]: order, _id: 1 };
  } else {
    sort = { [defaultSortField]: order, _id: 1 };
  }

  if (query.sort) {
    if (sortFieldPrefix) {
      sort = { [`${sortFieldPrefix}.${String(query.sort)}`]: order, _id: 1 };
    } else {
      sort = { [String(query.sort)]: order, _id: 1 };
    }
  }

  let limit = 30;
  if (query.limit && !isNaN(Number(query.limit))) {
    limit = Math.min(Number(query.limit), limit);
  }

  let offset = 0;
  if (query.offset && !isNaN(Number(query.offset))) {
    offset = Math.max(Number(query.offset), 0);
  }

  return { sort, limit, offset };
};
