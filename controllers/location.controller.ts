/**
 * Defines CRUD operations for Locations and performs security checks.
 */

import LocationModel, {
  LocationDocument,
  LocationPopulatedDocument,
  LocationQuery,
  PopulatedLocationQuery,
} from "../schema/location.schema";
import Mongoose from "mongoose";
import { Request, Response } from "express";
import _ from "lodash";
import Location from "../types/Location";

/**
 * Create a new Location owned by the requesting user.
 * @param req The request object.
 * @param res The response object.
 * @returns The newly created Location.
 */
export const createLocation = async (req: Request, res: Response) => {
  // Make sure the request has at least some body information
  if (!req.body) {
    return res.sendEmptyError();
  }

  // Create a new location
  const location = new LocationModel({
    name: req.body.name,
    iconName: req.body.iconName,
    colorName: req.body.colorName,
    owner: req.user.id,
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

/**
 * Get all locations that the requesting user either owns or is a member of.
 * Can be filtered with query parameters "shared" and "search" to specify
 * only shared/not shared locations as well as perform full-text search on the
 * location name.
 * @param req The request object.
 * @param res The response object.
 * @returns The found Locations.
 */
export const findAllLocations = async (req: Request, res: Response) => {
  // Determine query parameters
  const search = req.query.search ? String(req.query.search) : undefined;
  const shared = req.query.shared;
  const populate = req.query.populate;

  const id = req.user.id;

  try {
    let query: LocationQuery | PopulatedLocationQuery = LocationModel.find()
      .byAllowed(id)
      .search(search);

    if (shared && Boolean(shared)) {
      query = query.byShared(Boolean(shared));
    }

    if (populate) {
      query = query.populateAll();
    }

    const locations: LocationDocument[] | LocationPopulatedDocument[] =
      await query;

    return res.send(locations);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured retreiving Locations: ${err.message}`
    );
  }
};

/**
 * Get a location by id. Users can only access locations they own or are members
 * of.
 * @param req The request object.
 * @param res The response object.
 * @returns The found Location.
 */
export const findOneLocation = async (req: Request, res: Response) => {
  const id = req.params.id;
  const populate = req.query.populate;

  try {
    let query: LocationQuery | PopulatedLocationQuery =
      LocationModel.findById(id).byAllowed(id);

    if (populate) {
      query = query.populateAll();
    }

    const location: LocationDocument | LocationPopulatedDocument = await query;

    if (!location) {
      return res.sendNotFoundError(`Location with id=${id} not found.`);
    }
    return res.send(location);
  } catch (err: any) {
    return res.sendInternalError(
      `An error occured retrieving Location with id=${id}: ${err.message}`
    );
  }
};

/**
 * Update a location by id. Users can only update locations they own or are
 * members of. The fields which can be updated are name, iconName, colorName,
 * and shared.
 * @param req The request object.
 * @param res The response object.
 * @returns The old location.
 */
export const updateLocation = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendEmptyError();
  }

  const id = req.params.id;

  let newBody: Partial<Location> = {
    name: req.body.name,
    iconName: req.body.iconName,
    colorName: req.body.colorName,
    shared: req.body.shared,
  };
  newBody = _.omitBy(newBody, _.isNil);

  try {
    const oldLocation = await LocationModel.findById(id)
      .byAllowed(id)
      .update(newBody);
    if (!oldLocation) {
      return res.sendNotFoundError(
        `Could not find Location with id ${id} to update.`
      );
    }
    return res.send(oldLocation);
  } catch (err: any) {
    return res.sendInternalError(
      `Error updating Location with id=${id}: ${err.message}`
    );
  }
};

/**
 * Modifies the members of a location. A PUT request adds members, while a
 * DELETE request removes them.
 * @param req The request object.
 * @param res The response object.
 * @returns The old location.
 */
export const modifyMembers = async (req: Request, res: Response) => {
  if (!req.body) {
    return res.sendEmptyError();
  }

  const id = req.params.id;
  const members = req.body.members ?? [];

  const newData =
    req.method == "PUT"
      ? { $push: { members: { $each: members } } }
      : req.method == "DELETE"
      ? { $pull: { members: { $in: members } } }
      : {};

  try {
    const oldLocation = await LocationModel.findById(id)
      .byAllowed(id)
      .update(newData);
    if (!oldLocation) {
      return res.sendNotFoundError(
        `Could not find Location with id ${id} to update.`
      );
    }
    res.send(oldLocation);
  } catch (err: any) {
    res.sendInternalError(
      `Error updating Location with id=${id}: ${err.message}`
    );
  }
};

/**
 * Delete a location by id. Users can only delete locations that they own.
 * @param req The request object.
 * @param res The response object.
 * @returns The old location.
 */
export const deleteLocation = async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const oldLocation = await LocationModel.findById(id)
      .byAllowed(id)
      .deleteOne();

    if (!oldLocation) {
      return res.sendNotFoundError(
        `Could not find Location with id ${id} to delete.`
      );
    }

    res.send(oldLocation);
  } catch (err: any) {
    res.sendInternalError(
      `Error deleting Location with id=${id}: ${err.message}`
    );
  }
};
