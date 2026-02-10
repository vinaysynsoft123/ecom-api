const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { getDashboardStats } = require("../controllers/dashboard.controller");

router.get("/stats", auth, getDashboardStats);

module.exports = router;
