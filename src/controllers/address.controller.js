const db = require("../config/db");

// ADD ADDRESS
const addAddress = async (req, res) => {
    try {
        const { address_line1, address_line2, city, state, zip_code, country, is_default } = req.body;
        const userId = req.user.id;

        if (!address_line1 || !city || !state || !zip_code || !country) {
            return res.status(400).json({
                success: false,
                message: "All fields except address_line2 are required",
            });
        }

        // If setting as default, unset other default addresses for this user
        if (is_default) {
            await db.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        }

        const [result] = await db.query(
            "INSERT INTO user_addresses (user_id, address_line1, address_line2, city, state, zip_code, country, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                userId,
                address_line1,
                address_line2 || "",
                city,
                state,
                zip_code,
                country,
                is_default ? 1 : 0,
                new Date(),
                new Date(),
            ]
        );

        res.status(201).json({
            success: true,
            message: "Address added successfully",
            addressId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to add address",
            error: error.message,
        });
    }
};

// GET ALL ADDRESSES FOR LOGGED IN USER
const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(
            "SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC",
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch addresses",
            error: error.message,
        });
    }
};

// GET SINGLE ADDRESS
const getAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [rows] = await db.query(
            "SELECT * FROM user_addresses WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0],
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch address",
            error: error.message,
        });
    }
};

// UPDATE ADDRESS
const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { address_line1, address_line2, city, state, zip_code, country, is_default } = req.body;

        // Check if address exists and belongs to user
        const [existing] = await db.query(
            "SELECT * FROM user_addresses WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        // If setting as default, unset other default addresses for this user
        if (is_default) {
            await db.query("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [userId]);
        }

        await db.query(
            "UPDATE user_addresses SET address_line1 = ?, address_line2 = ?, city = ?, state = ?, zip_code = ?, country = ?, is_default = ?, updated_at = ? WHERE id = ?",
            [
                address_line1 || existing[0].address_line1,
                address_line2 !== undefined ? address_line2 : existing[0].address_line2,
                city || existing[0].city,
                state || existing[0].state,
                zip_code || existing[0].zip_code,
                country || existing[0].country,
                is_default !== undefined ? (is_default ? 1 : 0) : existing[0].is_default,
                new Date(),
                id,
            ]
        );

        res.status(200).json({
            success: true,
            message: "Address updated successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update address",
            error: error.message,
        });
    }
};

// DELETE ADDRESS
const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [result] = await db.query(
            "DELETE FROM user_addresses WHERE id = ? AND user_id = ?",
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Address not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Address deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete address",
            error: error.message,
        });
    }
};

module.exports = {
    addAddress,
    getAddresses,
    getAddress,
    updateAddress,
    deleteAddress,
};
