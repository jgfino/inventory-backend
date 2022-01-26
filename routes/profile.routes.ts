import * as profile from "../controllers/profile.controller";
import express from "express";
import multer from "multer";

const storage = multer.memoryStorage();

const filefilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ storage: storage, fileFilter: filefilter });

const router = express.Router();

/**
 * GET /api/v1/profile
 */
router.get("/", profile.getProfile);

/**
 * PUT /api/v1/profile
 */
router.put("/", profile.updateProfile);

/**
 * DELETE /api/v1/profile
 */
router.delete("/", profile.deleteProfile);

/**
 * POST /api/v1/profile/photo
 */
router.put("/photo", upload.single("image"), profile.addPhoto);

/**
 * DELETE /api/v1/profile/photo
 */
router.delete("/photo", profile.removePhoto);

/**
 * POST /api/v1/profile/verify/email/send
 */
router.post("/verify/email/send", profile.sendVerificationEmail);

/**
 * POST /api/v1/profile/verify/email
 */
router.post("/verify/email", profile.verifyEmail);

/**
 * POST /api/v1/profile/verify/phone/send
 */
router.post("/verify/phone/send", profile.sendTextVerificationCode);

/**
 * POST /api/v1/profile/verify/phone
 */
router.post("/verify/phone", profile.verifyPhone);

/**
 * POST /api/v1/profile/mfa/enable
 */
router.post("/mfa/enable", profile.enableMfa);

/**
 * POST /api/v1/profile/mfa/disable
 */
router.post("/mfa/disable", profile.disableMfa);

export default router;
