const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
    addAddress,
    getAddresses,
    getAddress,
    updateAddress,
    deleteAddress,
} = require("../controllers/address.controller");

// All address routes require authentication
router.use(auth);

router.post("/", addAddress);
router.get("/", getAddresses);
router.get("/:id", getAddress);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

module.exports = router;
