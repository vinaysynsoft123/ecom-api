const db = require("../config/db");
const { sendEmail } = require("../utils/email");

/**
 * PLACE ORDER (Public for authenticated users)
 */
const placeOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { address_id, items, total_amount, payment_method } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        if (!address_id || !items || items.length === 0 || !total_amount) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: address_id, items, and total_amount are required",
            });
        }

        // Generate Custom Order ID (e.g., SE123456)
        const customOrderId = "SE" + Math.floor(100000 + Math.random() * 900000);

        const method = payment_method || "COD";
        // If COD, we can move to 'processing' immediately. If Stripe, wait for payment in 'pending'.
        const initialStatus = (method === "COD") ? "processing" : "pending";

        // 1. Create the order record
        const [orderResult] = await connection.query(
            "INSERT INTO orders (order_id, user_id, address_id, total_amount, payment_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [customOrderId, userId, address_id, total_amount, method, initialStatus, new Date(), new Date()]
        );

        const orderId = orderResult.insertId;

        // 2. Insert order items
        const itemValues = items.map((item) => [
            orderId,
            item.product_id,
            item.quantity,
            item.price,
        ]);

        await connection.query(
            "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
            [itemValues]
        );

        await connection.commit();

        // 3. Send Confirmation Email (Async)
        const emailHtml = `
      <h1>Order Confirmation</h1>
      <p>Thank you for your order! Your order ID is <strong>#${customOrderId}</strong>.</p>
      <p>Total Amount: <strong>$${total_amount}</strong></p>
      <p>We will notify you once your order is shipped.</p>
    `;
        sendEmail(userEmail, `Order Placed Successfully #${customOrderId}`, emailHtml);

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            orderId: customOrderId, // Return the custom ID
            id: orderId, // Still return the DB primary key if needed
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: "Failed to place order",
            error: error.message,
        });
    } finally {
        connection.release();
    }
};

/**
 * CANCEL ORDER (User)
 */
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userEmail = req.user.email;

        // Check if order exists and belongs to user
        const [orders] = await db.query(
            "SELECT status FROM orders WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (orders[0].status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled because it is already ${orders[0].status}`,
            });
        }

        await db.query(
            "UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?",
            [new Date(), id]
        );

        // Send Cancellation Email
        const emailHtml = `
      <h1>Order Cancelled</h1>
      <p>Your order <strong>#${id}</strong> has been cancelled successfully.</p>
      <p>If you didn't request this, please contact support.</p>
    `;
        sendEmail(userEmail, `Order Cancelled #${id}`, emailHtml);

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to cancel order",
            error: error.message,
        });
    }
};

/**
 * GET USER ORDERS (My Orders)
 */
const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const [orders] = await db.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC",
            [userId]
        );

        res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message,
        });
    }
};

/**
 * GET ORDER DETAILS (With items)
 */
const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Fetch order
        const [orders] = await db.query(
            "SELECT o.*, a.address_line1, a.city, a.state, a.zip_code, a.country FROM orders o JOIN user_addresses a ON o.address_id = a.id WHERE o.id = ? AND o.user_id = ?",
            [id, userId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Fetch order items
        const [items] = await db.query(
            "SELECT oi.*, p.name as product_name, p.images FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?",
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                ...orders[0],
                items,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch order details",
            error: error.message,
        });
    }
};

/**
 * GET ALL ORDERS (Admin Only)
 */
const getAllOrdersAdmin = async (req, res) => {
    try {
        const [orders] = await db.query(
            "SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC"
        );

        res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message,
        });
    }
};

/**
 * UPDATE ORDER STATUS (Admin Only)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required",
            });
        }

        // Get user email before update
        const [orders] = await db.query(
            "SELECT o.id, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?",
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        await db.query(
            "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
            [status, new Date(), id]
        );

        // Send Status Update Email
        const emailHtml = `
      <h1>Order Status Update</h1>
      <p>Your order <strong>#${id}</strong> status has been updated to: <strong>${status}</strong>.</p>
    `;
        sendEmail(orders[0].email, `Order Status Updated #${id}`, emailHtml);

        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update order status",
            error: error.message,
        });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const [orders] = await db.query(
            "SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC"
        );

        res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message,
        });
    }
};

module.exports = {
    placeOrder,
    cancelOrder,
    getUserOrders,
    getOrderDetails,
    getAllOrdersAdmin,
    updateOrderStatus,
    getAllOrders,
};
