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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Fetch paginated orders
        const [orders] = await db.query(
            "SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );

        // Fetch total count for pagination info
        const [[{ total }]] = await db.query("SELECT COUNT(*) as total FROM orders");

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
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

        // Get user email and custom order_id before update
        const [orders] = await db.query(
            "SELECT o.order_id, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?",
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        const orderData = orders[0];

        await db.query(
            "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
            [status, new Date(), id]
        );

        // Send Status Update Email with professional template
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">Order Status Update</h2>
                <p>Hello <strong>${orderData.name}</strong>,</p>
                <p>Your order <strong>#${orderData.order_id}</strong> has been updated.</p>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">New Status</span><br/>
                    <strong style="font-size: 24px; color: #1e293b; text-transform: capitalize;">${status}</strong>
                </div>

                <p>You can track your order progress by logging into your account on our website.</p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Order Details</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">If you have any questions, please reply to this email or contact support.</p>
            </div>
        `;

        sendEmail(orderData.email, `Order Status Updated: #${orderData.order_id}`, emailHtml);

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

const getOrderDetailsAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch order with user info
        const [orders] = await db.query(
            "SELECT o.*, u.name as user_name, u.email as user_email, a.address_line1, a.city, a.state, a.zip_code, a.country FROM orders o JOIN users u ON o.user_id = u.id JOIN user_addresses a ON o.address_id = a.id WHERE o.id = ?",
            [id]
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

module.exports = {
    placeOrder,
    cancelOrder,
    getUserOrders,
    getOrderDetails,
    getAllOrdersAdmin,
    updateOrderStatus,
    getAllOrders,
    getOrderDetailsAdmin,
};
