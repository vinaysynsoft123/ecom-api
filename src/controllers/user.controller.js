const db = require("../config/db");
const bcrypt = require("bcryptjs");

/**
 * GET PROFILE
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await db.query(
            "SELECT id, name, email, mobile, role, status, created_at FROM users WHERE id = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            data: users[0],
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve profile",
            error: error.message,
        });
    }
};

/**
 * UPDATE PROFILE
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, mobile, password } = req.body;

        // 1. Fetch current user
        const [existing] = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        let updateFields = [];
        let values = [];

        // Profile updates
        if (name) {
            updateFields.push("name = ?");
            values.push(name);
        }

        if (email) {
            // Check if email is already taken by another user
            const [emailCheck] = await db.query(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                [email, userId]
            );
            if (emailCheck.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email is already taken",
                });
            }
            updateFields.push("email = ?");
            values.push(email);
        }


        if (mobile) {
            // Check if mobile is already taken by another user
            const [mobileCheck] = await db.query(
                "SELECT id FROM users WHERE mobile = ? AND id != ?",
                [mobile, userId]
            );
            if (mobileCheck.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Mobile is already taken",
                });
            }
            updateFields.push("mobile = ?");
            values.push(mobile);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push("password = ?");
            values.push(hashedPassword);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided for update",
            });
        }

        // Add updated_at
        updateFields.push("updated_at = ?");
        values.push(new Date());

        // Final ID for WHERE clause
        values.push(userId);

        const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`;
        await db.query(query, values);

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message,
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, name, email, mobile, role, status, created_at FROM users WHERE role = 'user' ORDER BY id DESC"
        );


        res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve users",
            error: error.message,
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const [users] = await db.query(
            "SELECT id, name, email, mobile, role, status, created_at FROM users WHERE id = ?",
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            data: users[0],
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve user details",
            error: error.message,
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete user",
            error: error.message,
        });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getAllUsers,
    getUserById,
    deleteUser,
};
