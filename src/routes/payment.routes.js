const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const {
    initiatePayment,
    verifyPayment,
    getPaymentHistory,
} = require("../controllers/payment.controller");

// All payment routes require authentication
router.use(auth);

router.post("/initiate", initiatePayment);
router.post("/verify", verifyPayment);
router.get("/history", getPaymentHistory);

module.exports = router;
