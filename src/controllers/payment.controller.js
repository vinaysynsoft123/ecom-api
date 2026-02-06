const db = require("../config/db");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * INITIATE PAYMENT
 * Creates a Stripe Payment Intent and records it in our DB
 */
const initiatePayment = async (req, res) => {
    try {
        const { order_id } = req.body;
        const userId = req.user.id;

        // 1. Fetch order details
        const [orders] = await db.query(
            "SELECT id, total_amount, status FROM orders WHERE id = ? AND user_id = ?",
            [order_id, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const order = orders[0];

        if (order.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Payment cannot be initiated for an order that is ${order.status}`,
            });
        }

        // 2. Create Stripe Payment Intent
        // Note: Stripe expects amount in cents
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(order.total_amount * 100),
            currency: "usd",
            metadata: { order_id: order.id.toString(), user_id: userId.toString() },
        });

        // 3. Record pending payment in our DB
        await db.query(
            "INSERT INTO payments (order_id, user_id, transaction_id, amount, provider, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                order.id,
                userId,
                paymentIntent.id,
                order.total_amount,
                "stripe",
                "pending",
                new Date(),
            ]
        );

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            transactionId: paymentIntent.id,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Payment initiation failed",
            error: error.message,
        });
    }
};

/**
 * VERIFY PAYMENT (Success Callback)
 * In a real app, this logic would also be in a Webhook
 */
const verifyPayment = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { transaction_id } = req.body;

        await connection.beginTransaction();

        // 1. Check payment status with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(transaction_id);

        if (paymentIntent.status !== "succeeded") {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Payment status is ${paymentIntent.status}`,
            });
        }

        // 2. Update payment record in our DB
        const [paymentResult] = await connection.query(
            "UPDATE payments SET status = 'completed', updated_at = ? WHERE transaction_id = ?",
            [new Date(), transaction_id]
        );

        if (paymentResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Payment record not found",
            });
        }

        // 3. Get Order ID from metadata
        const orderId = paymentIntent.metadata.order_id;

        // 4. Update order status to 'processing'
        await connection.query(
            "UPDATE orders SET status = 'processing', updated_at = ? WHERE id = ?",
            [new Date(), orderId]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: "Payment verified and order status updated",
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error: error.message,
        });
    } finally {
        connection.release();
    }
};

/**
 * GET PAYMENT HISTORY
 */
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const [payments] = await db.query(
            "SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC",
            [userId]
        );

        res.status(200).json({
            success: true,
            data: payments,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment history",
            error: error.message,
        });
    }
};

module.exports = {
    initiatePayment,
    verifyPayment,
    getPaymentHistory,
};
