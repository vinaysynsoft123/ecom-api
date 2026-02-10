const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { getProfile, updateProfile, getAllUsers, getUserById } = require("../controllers/user.controller");

// USER PROFILE ROUTES
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);
router.get("/all-users", auth, getAllUsers);
router.get("/:id", auth, getUserById);

module.exports = router;
