import * as locations from "../controllers/location.controller";
import express from "express";

const router = express.Router();

/**
 * Create a location
 */
router.post("/", locations.createLocation);

/**
 * Get all locations. Filter by owner id. Search by location
 * name. Populates owner field for display. Sorted by name
 */
router.get("/", locations.getLocations);

/**
 * Get a location with the given id. Populates owner
 */
router.get("/:id", locations.getLocation);

/**
 * Get a location with the given id. Populate owner, member, total value
 */
router.get("/:id/details", locations.getLocationDetails);

/**
 * Update the location with the given id. Updatable fields include name,
 * iconName
 */
router.put("/:id", locations.updateLocation);

/**
 * Delete the location with the given id.
 */
router.delete("/:id", locations.deleteLocation);

/**
 * Add the requesting user to the given location. Users can only add themselves
 * to a location.
 */
router.post("/:id/members/:memberId", locations.addMember);

/**
 * Remove a member from a location.
 */
router.delete("/:id/members/:memberId", locations.removeMember);

export default router;
