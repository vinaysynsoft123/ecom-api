const db = require("../config/db");

const getDashboardStats = async (req, res) => {
    try {
        // 1. Total Revenue (Excluding cancelled orders)
        const [revenueRes] = await db.query(
            "SELECT SUM(total_amount) as totalRevenue FROM orders WHERE status != 'cancelled'"
        );
        const totalRevenue = revenueRes[0].totalRevenue || 0;

        // 2. Total Users (Role = 'user')
        const [usersRes] = await db.query(
            "SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'"
        );
        const totalUsers = usersRes[0].totalUsers || 0;

        // 3. Total Orders
        const [ordersRes] = await db.query(
            "SELECT COUNT(*) as totalOrders FROM orders"
        );
        const totalOrders = ordersRes[0].totalOrders || 0;

        // 4. Total Products
        const [productsRes] = await db.query(
            "SELECT COUNT(*) as totalProducts FROM products"
        );
        const totalProducts = productsRes[0].totalProducts || 0;

        // 5. Recent Orders (Latest 5)
        const [recentOrders] = await db.query(
            "SELECT o.id, o.order_id, o.total_amount, o.status, o.created_at, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 5"
        );

        // 6. Low Stock Products (Placeholder for now, just 3 products)
        const [lowStockProducts] = await db.query(
            "SELECT name, price, images FROM products ORDER BY id DESC LIMIT 3"
        );

        res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalUsers,
                totalOrders,
                totalProducts,
                recentOrders,
                lowStockProducts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats",
            error: error.message,
        });
    }
};

module.exports = {
    getDashboardStats,
};
