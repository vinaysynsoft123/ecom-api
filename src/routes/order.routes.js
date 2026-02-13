const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");
const {
    placeOrder,
    cancelOrder,
    getUserOrders,
    getOrderDetails,
    getAllOrdersAdmin,
    updateOrderStatus,
    getAllOrders,
    getOrderDetailsAdmin,
} = require("../controllers/order.controller");

// USER ORDER ROUTES (Require Auth)
router.post("/", auth, placeOrder);
router.get("/my-orders", auth, getUserOrders);
router.get("/:id", auth, getOrderDetails);
router.put("/cancel/:id", auth, cancelOrder);
router.get("/all-orders", auth, getAllOrders);

// ADMIN ORDER ROUTES (Require Auth & Admin)
router.get("/admin/all", auth, admin, getAllOrdersAdmin);
router.get("/admin/:id", auth, admin, getOrderDetailsAdmin);
router.put("/admin/status/:id", auth, admin, updateOrderStatus);

module.exports = router;
