import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import AuthErrors from "../error/errors/auth.errors";
import DatabaseErrors from "../error/errors/database.errors";
import ShoppingListModel from "../schema/shoppingList.schema";
import UserModel from "../schema/user.schema";
import { BaseUser } from "../types/User";
import { parsePaginationQuery } from "./utils";

/**
 * Create a new Shopping List for the requesting user. Users with free accounts
 * can create up to one Shopping List at a time. Premium users can create
 * unlimited Shopping Lists.
 */
export const createList = catchAsync(async (req, res, next) => {
  const isPremium = UserModel.isPremium(req.user);
  const { name, notes } = req.body;

  if (!isPremium && req.user.defaultShoppingList) {
    return Promise.reject(
      AuthErrors.PREMIUM_FEATURE(
        "A paid account is required to create more than one Shopping List"
      )
    );
  }

  const newList = await ShoppingListModel.create({
    name: name,
    notes: notes,
    owner: {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
      subscriptionExpires: req.user.subscriptionExpires,
    },
    lastUpdatedBy: {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
    },
  });

  // If this is the user's first ShoppingList, specify this
  if (!req.user.defaultShoppingList) {
    await UserModel.updateOne(
      { _id: req.user._id },
      { defaultShoppingList: newList._id },
      { runValidators: true }
    );
  }
  res
    .status(200)
    .send({ message: `Shopping List ${newList._id} created successfully` });
});

/**
 * Get a list of all Shopping Lists. Free users can view Shopping Lists which
 * they own. Premium users can view Shopping Lists which they own or are a
 * member of. Lists are sorted by last updated time. Lists can be filtered by
 * owner or member.
 */
export const getLists = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const query = req.query;
    const { order, limit, offset } = parsePaginationQuery(query, "desc");

    const sortField = query.sort ? String(query.sort) : "updatedAt";

    const conditions = {};
    query.owner && (conditions["owner._id"] = query.owner);
    query.member && (conditions["members._id"] = query.member);

    const listQuery = listModel
      .find(conditions)
      .sort({ [sortField]: order })
      .limit(limit)
      .skip(offset);
    const projection = {
      name: 1,
      notes: 1,
      owner: 1,
      "items._id": 1,
      members: 1,
      lastUpdatedBy: 1,
      createdAt: 1,
      updatedAt: 1,
    };
    listQuery.projection(projection);

    const lists: any[] = await listQuery;
    const listsWithCount = lists.map((list) => {
      return {
        ...list.toJSON(),
        items: list.items.length,
      };
    });

    res.status(200).send(listsWithCount);
  },
  [ShoppingListModel, "view"]
);

/**
 * Get a Shopping List by ID. Will only return a Shopping List if a user is
 * authorized to view it. Free users can view Shopping Lists which they own.
 * Premium users can view Shopping Lists which they own or are a member of.

 */
export const getList = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const list = await listModel.findOne({ _id: req.params.id });

    if (!list) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to view it."
        )
      );
    }

    res.status(200).send(list);
  },
  [ShoppingListModel, "view"]
);

/**
 * Update the Shopping List with the given ID. Updatable fields include name and
 * notes. Users with free accounts can update their default Shopping List.
 * Premium users can update Shopping Lists which they own or are a member of,
 * provided that the owner has an active subscription.
 */
export const updateList = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const { name, notes, newOrder } = req.body;

    if (newOrder) {
      const list = await listModel.findOne(
        { _id: req.params.id, "order.user": req.user._id },
        "items"
      );

      if (!list) {
        return next(
          DatabaseErrors.NOT_FOUND(
            "An item with this id does not exist or you do not have permission to modify it."
          )
        );
      }

      if (newOrder.length != list.items.length) {
        return next(
          DatabaseErrors.INVALID_FIELD(
            "Length of new order does not match the number of items in the list"
          )
        );
      }

      const sortedOrder = [...newOrder].sort();

      for (let i = 0; i < sortedOrder.length; i++) {
        if (
          i < sortedOrder.length - 1 &&
          sortedOrder[i + 1] - sortedOrder[i] > 1
        ) {
          return next(
            DatabaseErrors.INVALID_FIELD(
              "New order does not contain consecutive values"
            )
          );
        }

        const j = list.items.findIndex((item) => item.pos == i);
        list.items[j].pos = newOrder[j];
      }

      await list.save();
    }

    const newData = {
      name: name,
      notes: notes,
      lastUpdatedBy: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
    };

    const updateResult = await listModel.updateOne(
      { _id: req.params.id },
      newData,
      { runValidators: true }
    );

    if (updateResult.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Shopping List ${req.params.id} updated successfully.`,
    });
  },
  [ShoppingListModel, "update"]
);

/**
 * Delete a Shopping List. Users can delete Shopping Lists which they own,
 * regardless of subscription status.
 */
export const deleteList = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const list = await listModel.findOne({ _id: req.params.id });

    if (!list) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to delete it."
        )
      );
    }

    await list.remove();

    res
      .status(200)
      .send({ message: `Shopping List ${req.params.id} deleted successfully` });
  },
  [ShoppingListModel, "delete"]
);

/**
 * Add the requesting user as a member of the Shopping List with the given ID.
 * Only Premium users can join Shopping Lists, and the owner of the Shopping
 * List must have an active subscription.
 */
export const joinList = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const isPremium = UserModel.isPremium(req.user);

  if (!isPremium) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "You must be a premium member to join collaborative Shopping Lists"
      )
    );
  }

  const list = await ShoppingListModel.findOne(
    { _id: req.params.id, "owner._id": { $ne: userId } },
    { "members._id": 1, order: 1, owner: 1, "items._id": 1 }
  ).lean();

  if (!list) {
    return next(
      DatabaseErrors.NOT_FOUND(
        "A ShoppingList with this id does not exist or you do not have permission to add this user to it."
      )
    );
  }

  const ownerIsPremium = UserModel.isPremium(list.owner);

  if (!ownerIsPremium) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "The owner of this Shopping List is not a Premium member. Have them upgrade in order to share collaborative Shopping Lists"
      )
    );
  }

  if (
    list.members.some((member) => member._id.toString() == userId.toString())
  ) {
    return next(
      DatabaseErrors.INVALID_FIELD(
        "You are already a member of this Shopping List."
      )
    );
  }

  const newMember: BaseUser = {
    _id: req.user._id,
    name: req.user.name,
    photoUrl: req.user.photoUrl,
  };

  await ShoppingListModel.updateOne(
    { _id: req.params.id, "owner._id": { $ne: userId } },
    { $addToSet: { members: newMember } },
    { runValidators: true }
  );

  res.status(200).send({
    message: `User added to Shopping List ${req.params.id} successfully.`,
  });
});

/**
 * Remove the member with the given ID from the Shopping List with the given ID.
 * Premium users can remove members from Shopping Lists which they own or are a
 * member of, provided that the owner has an active subscription.
 */
export const removeMember = authorizeAndCatchAsync(
  async (req, res, next, listUpdate, listView) => {
    let listModel = listView;
    let member = req.user._id.toString();

    if (
      req.path.substring(req.path.lastIndexOf("/") + 1).toLowerCase() != "leave"
    ) {
      listModel = listUpdate;
      member = req.params.memberId;
    }

    const updatedList = await listModel.updateOne(
      { _id: req.params.id },
      {
        $pull: {
          members: { _id: member },
          items: { "owner._id": member },
        },
      }
    );

    if (updatedList.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `User removed from Shopping List ${req.params.id} successfully.`,
    });
  },
  [ShoppingListModel, "update"],
  [ShoppingListModel, "view"]
);

/**
 * Add an Item to the Shopping List with the given ID. Free users can add Items
 * to their default Shopping List. Premium users can add Items to Shopping Lists
 * which they own or are a member or, provided that the owner has an active
 * subscription.
 */
export const addItem = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const { name, notes, checked } = req.body;

    const items = await listModel
      .findOne({ _id: req.params.id })
      .distinct("items");

    const newItem = {
      name: name,
      notes: notes,
      checked: checked,
      owner: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
      pos: items.length,
    };

    const updateResult = await listModel.updateOne(
      { _id: req.params.id },
      {
        $push: { items: { $each: [newItem], $sort: { name: 1 } } },
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

    if (updateResult.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item added to Shopping List ${req.params.id} successfully.`,
    });
  },
  [ShoppingListModel, "update"]
);

/**
 * Update the Item with the given ID in the Shopping List with the given ID.
 * Updatable fields include name, notes, and checked. Users with free
 * accounts can update Items in their default Shopping List. Premium users can
 * update Items in Shopping Lists that they own or that they are a member of,
 * provided that the owner of the Location has an active subscription
 */
export const updateItem = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const { name, notes, checked } = req.body;

    const updatedItem = {
      "items.$.name": name,
      "items.$.notes": notes,
      "items.$.checked": checked,
      lastUpdatedBy: {
        _id: req.user._id,
        name: req.user.name,
        photoUrl: req.user.photoUrl,
      },
    };

    const updateResult = await listModel.updateOne(
      { _id: req.params.id, "items._id": req.params.itemId },
      updatedItem,
      { runValidators: true }
    );

    if (updateResult.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item ${req.params.itemId} in Shopping List ${req.params.id} updated successfully.`,
    });
  },
  [ShoppingListModel, "update"]
);

/**
 * Delete the Item with the given ID from the Shopping List with the given ID.
 * Users with free accounts can update Items in their default Shopping List.
 * Premium users can update Items in Shopping Lists that they own or that they
 * are a member of, provided that the owner of the Location has an active subscription
 */
export const deleteItem = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const list = await listModel.findOne(
      { _id: req.params.id, "order.user": req.user._id },
      "items"
    );

    if (!list) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "An item with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    const oldIndex = list.items.findIndex(
      (item) => item._id.toString() == req.params.itemId
    );
    const oldPos = list.items[oldIndex].pos;

    list.items.splice(oldIndex, 1);

    for (let i = oldPos; i < list.items.length; i++) {
      const j = list.items.findIndex((item) => item.pos == i);
      const newPos = list.items[j].pos - 1;
      list.items[j].pos = newPos;
    }

    list.lastUpdatedBy = {
      _id: req.user._id,
      name: req.user.name,
      photoUrl: req.user.photoUrl,
    };

    await list.save();

    res.status(200).send({
      message: `Item removed from Shopping List ${req.params.id} successfully.`,
    });
  },
  [ShoppingListModel, "update"]
);
