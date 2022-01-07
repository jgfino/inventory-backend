import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import AuthErrors from "../error/errors/auth.errors";
import DatabaseErrors from "../error/errors/database.errors";
import ItemModel from "../schema/item.schema";
import ShoppingListModel from "../schema/shoppingList.schema";
import UserModel from "../schema/user.schema";

export const createList = catchAsync(async (req, res, next) => {
  const list = await ShoppingListModel.createAuthorized(req.user, req.body);
  res.status(200).send(list);
});

export const getLists = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const lists = await listModel.sort({ createdAt: -1 });
    res.status(200).send(lists);
  },
  [ShoppingListModel, "view"]
);

export const getList = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const list = await listModel.findOne({ _id: req.params.id });
    res.status(200).send(list);
  },
  [ShoppingListModel, "view"]
);

export const updateLocation = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const { name, notes } = req.body;
    const newData = {
      name: name,
      notes: notes,
    };

    const updateResult = await listModel.updateOne(
      { _id: req.params.id },
      newData
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

export const addItem = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const { name, notes, checked } = req.body;
    const newItem = {
      name: name,
      notes: notes,
      checked: checked,
    };

    const updateResult = await listModel.updateOne(
      { _id: req.params.id },
      { $push: { items: newItem } }
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

export const updateItem = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const { name, notes, checked } = req.body;
    const updatedItem = {
      "items.$.name": name,
      "items.$.notes": notes,
      "items.$.checked": checked,
    };

    const updateResult = await listModel.updateOne(
      { _id: req.params.id, "items._id": req.params.itemId },
      updatedItem
    );

    if (updateResult.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item ${req.params.itemId} in Shopping List ${req.params.id} updated successfully.`,
    });
  },
  [ShoppingListModel, "update"]
);

export const deleteItem = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const updateResult = await listModel.updateOne(
      { _id: req.params.id },
      { $pull: { items: req.params.itemId } }
    );

    if (updateResult.matchedCount < 1) {
      return next(
        DatabaseErrors.NOT_FOUND(
          "A Shopping List with this id does not exist or you do not have permission to modify it."
        )
      );
    }

    res.status(200).send({
      message: `Item removed from Shopping List ${req.params.id} successfully.`,
    });
  },
  [ShoppingListModel, "update"]
);

export const addMember = catchAsync(async (req, res, next) => {
  const id = req.user._id;
  const isPremium = await UserModel.verifySubscription(id);

  if (!isPremium) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "You must be a premium member to join collaborative Shopping Lists"
      )
    );
  }

  const owner: string = await ShoppingListModel.findById(id).distinct(
    "owner"
  )[0];
  const ownerIsPremium = await UserModel.verifySubscription(owner);

  if (!ownerIsPremium) {
    return next(
      AuthErrors.PREMIUM_FEATURE(
        "The owner of this Shopping List is not a Premium member. Have them upgrade in order to share collaborative Shopping Lists"
      )
    );
  }

  const updatedList = await ShoppingListModel.updateOne(
    { _id: id, owner: { $ne: id } },
    { $addToSet: { members: id } }
  );

  if (updatedList.matchedCount < 1) {
    return next(
      DatabaseErrors.NOT_FOUND(
        "A ShoppingList with this id does not exist or you do not have permission to add this user to it."
      )
    );
  }

  res.status(200).send({
    message: `User added to Shopping List ${req.params.id} successfully.`,
  });
});

export const removeMember = authorizeAndCatchAsync(
  async (req, res, next, listModel) => {
    const updatedList = await listModel.updateOne(
      { _id: req.params.id },
      { $pull: { members: req.params.memberId } }
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
  [ShoppingListModel, "update"]
);
