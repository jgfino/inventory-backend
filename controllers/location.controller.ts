import LocationModel from "../schema/location.schema";
import { authorizeAndCatchAsync, catchAsync } from "../error/catchAsync";
import DatabaseErrors from "../error/errors/database.errors";

export const createLocation = catchAsync(async (req, res, next) => {
  const newLocation = await LocationModel.create({
    ...req.body,
    owner: req.user._id,
  });
  return res.status(200).json(newLocation);
});

export const getLocations = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const query = req.query;
    const conditions: any = {};

    query.owner && (conditions.owner = String(query.owner));
    query.search && (conditions.$text = { $search: String(query.search) });

    const locationQuery = locationModel
      .find(conditions)
      .populate("owner", "_id name photoUrl");

    const locations = await locationQuery;
    res.status(200).send(locations);
  },
  [LocationModel, "view"]
);

export const getLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    let locationQuery = locationModel.findOne({ _id: req.params.id });
    //.populate("owner", "_id name photoUrl")
    //.populate("numItems");

    if (
      req.path.substring(req.path.lastIndexOf("/") + 1).toLowerCase() ==
      "details"
    ) {
      locationQuery = locationQuery.populateDetails().findOne();
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

export const updateLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const newData = {
      name: req.body.name,
      iconName: req.body.iconName,
      colorName: req.body.colorName,
    };

    const updateResult = await locationModel.updateOne(
      { _id: req.params.id ?? null },
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

export const deleteLocation = authorizeAndCatchAsync(
  async (req, res, next, locationModel) => {
    const location = await locationModel.findOne({
      _id: req.params.id ?? null,
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
