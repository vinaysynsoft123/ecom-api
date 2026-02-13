const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productRoutes = require("./product.routes");
const categoryRoutes = require("./category.routes");
const addressRoutes = require("./address.routes");
const orderRoutes = require("./order.routes");
const paymentRoutes = require("./payment.routes");
const dashboardRoutes = require("./dashboard.routes");
const settingsRoutes = require("./settings.routes");

router.use("/user", userRoutes);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/addresses", addressRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/company-settings", settingsRoutes);

router.get("/health", (req, res) => {
  res.json({ status: "API working" });
});

module.exports = router;
