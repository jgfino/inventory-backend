/**
 * Defines CRUD operations for Locations and performs security checks.
 */

import LocationModel, {
  LocationPopulatedDocument,
} from "../schema/location.schema";
import { Request, Response } from "express";
import _, { Dictionary } from "lodash";

export const createLocation = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendEmptyError();
  }

  console.log(req.user);

  const location = new LocationModel({
    name: req.body.name,
    iconName: req.body.iconName,
    colorName: req.body.colorName,
    owner: req.user._id,
    shared: req.body.shared,
    members: req.body.members,
  });

  try {
    const newLocation = await location.save();
    return res.send(newLocation);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured creating a new Location: ${err.message}`
    );
  }
};

export const findLocations = async (req: Request, res: Response) => {
  const search = req.query.search ? String(req.query.search) : undefined;
  const shared = req.query.shared ? Boolean(req.query.shared) : undefined;

  const userId = req.user._id;

  try {
    const locations = await LocationModel.findAuthorized(userId)
      .byShared(shared)
      .searchByName(search);

    return res.send(locations);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured retreiving Locations: ${err.message}`
    );
  }
};

export const findLocation = async (req: Request, res: Response) => {
  const locationId = req.params.id;
  const userId = req.user._id;

  try {
    const location = await LocationModel.findByIdAuthorized(locationId, userId);

    if (!location) {
      return res.sendNotFoundError(`Location with id=${locationId} not found.`);
    }

    return res.send(location);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured retrieving Location with id=${locationId}: ${err.message}`
    );
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendEmptyError();
  }

  const locationId = req.params.id;
  const userId = req.user._id;

  let newBody: Dictionary<String> = {
    name: req.body.name,
    iconName: req.body.iconName,
    colorName: req.body.colorName,
    shared: req.body.shared,
  };
  newBody = _.omitBy(newBody, _.isNil);

  try {
    const oldLocation = await LocationModel.findByIdAuthorized(
      locationId,
      userId
    ).update(newBody);
    if (!oldLocation) {
      return res.sendNotFoundError(
        `Could not find Location with id ${locationId} to update.`
      );
    }
    return res.send(oldLocation);
  } catch (err: any) {
    return res.sendInternalError(
      `Error updating Location with id=${locationId}: ${err.message}`
    );
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendEmptyError();
  }

  const locationId = req.params.id;
  const memberId = req.params.memberId;
  const userId = req.user._id;

  try {
    const location: LocationPopulatedDocument =
      await LocationModel.findByIdAuthorized(locationId, userId);

    if (!location) {
      return res.sendNotFoundError(
        `Could not find Location with id ${locationId} to update.`
      );
    }

    await location.removeMember(memberId);
    res.send(location);
  } catch (err: any) {
    res.sendInternalError(
      `Error updating Location with id=${locationId}: ${err.message}`
    );
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  const locationId = req.params.id;
  const userId = req.user._id;

  try {
    const oldLocation = await LocationModel.findByIdAuthorized(
      locationId,
      userId
    ).deleteOne();

    if (!oldLocation) {
      return res.sendNotFoundError(
        `Could not find Location with id ${locationId} to delete.`
      );
    }

    res.send(oldLocation);
  } catch (err: any) {
    res.sendInternalError(
      `Error deleting Location with id=${locationId}: ${err.message}`
    );
  }
};
