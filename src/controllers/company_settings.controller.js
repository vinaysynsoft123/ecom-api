const fs = require("fs");
const path = require("path");
const db = require("../config/db");

/**
 * ADD COMPANY SETTINGS (Now handles basic insertion)
 */
const addCompanySettings = async (req, res) => {
    try {
        const {
            companyName, email, phone, alternatePhone,
            address, city, state, pincode, gstNumber, panNumber
        } = req.body;

        let finalLogoUrl = req.body.logoUrl || "";
        if (req.file) {
            finalLogoUrl = req.file.path;
        }

        const [result] = await db.query(
            "INSERT INTO company_settings (company_name, email, phone, alternate_phone, address, city, state, pincode, gst_number, pan_number, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [companyName, email, phone, alternatePhone, address, city, state, pincode, gstNumber, panNumber, finalLogoUrl]
        );

        res.status(201).json({
            success: true,
            id: result.insertId,
            message: "Settings added successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to add settings", message: error.message });
    }
};

/**
 * GET COMPANY SETTINGS
 */
const getCompanySettings = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM company_settings LIMIT 1");

        // Map snake_case from DB to camelCase for Frontend
        if (rows.length > 0) {
            const row = rows[0];
            const data = {
                id: row.id,
                companyName: row.company_name,
                email: row.email,
                phone: row.phone,
                alternatePhone: row.alternate_phone,
                address: row.address,
                city: row.city,
                state: row.state,
                pincode: row.pincode,
                gstNumber: row.gst_number,
                panNumber: row.pan_number,
                logoUrl: row.logo_url,
                created_at: row.created_at,
                updated_at: row.updated_at
            };
            res.status(200).json(data);
        } else {
            res.status(200).json(null);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to get settings", message: error.message });
    }
};

/**
 * UPDATE COMPANY SETTINGS (Now handles Upsert logic: Update if exists, else Insert)
 */
const updateCompanySettings = async (req, res) => {
    try {
        const {
            companyName, email, phone, alternatePhone,
            address, city, state, pincode, gstNumber, panNumber, logoUrl
        } = req.body;

        if (!companyName || !email || !phone) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Check if settings already exist
        const [existing] = await db.query("SELECT * FROM company_settings LIMIT 1");

        let finalLogoUrl = logoUrl;

        if (existing.length > 0) {
            const settingsId = existing[0].id;
            finalLogoUrl = existing[0].logo_url;

            if (req.file) {
                // Delete old logo file if it exists
                if (existing[0].logo_url && fs.existsSync(existing[0].logo_url)) {
                    try {
                        fs.unlinkSync(existing[0].logo_url);
                    } catch (err) {
                        console.error("Failed to delete old logo:", err);
                    }
                }
                finalLogoUrl = req.file.path;
            }

            await db.query(
                "UPDATE company_settings SET company_name = ?, email = ?, phone = ?, alternate_phone = ?, address = ?, city = ?, state = ?, pincode = ?, gst_number = ?, pan_number = ?, logo_url = ?, updated_at = NOW() WHERE id = ?",
                [companyName, email, phone, alternatePhone, address, city, state, pincode, gstNumber, panNumber, finalLogoUrl, settingsId]
            );

            res.status(200).json({
                success: true,
                message: "Settings updated successfully",
                id: settingsId
            });
        } else {
            // INSERT if not exists
            if (req.file) {
                finalLogoUrl = req.file.path;
            }

            const [result] = await db.query(
                "INSERT INTO company_settings (company_name, email, phone, alternate_phone, address, city, state, pincode, gst_number, pan_number, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [companyName, email, phone, alternatePhone, address, city, state, pincode, gstNumber, panNumber, finalLogoUrl]
            );

            res.status(201).json({
                success: true,
                id: result.insertId,
                message: "Settings created successfully"
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to save settings", message: error.message });
    }
};

/**
 * DELETE COMPANY SETTINGS
 */
const deleteCompanySettings = async (req, res) => {
    try {
        // Fetch logo info to delete file
        const [existing] = await db.query("SELECT logo_url FROM company_settings");

        const [result] = await db.query("DELETE FROM company_settings");

        if (result.affectedRows > 0 && existing.length > 0) {
            existing.forEach(row => {
                if (row.logo_url && fs.existsSync(row.logo_url)) {
                    try {
                        fs.unlinkSync(row.logo_url);
                    } catch (err) {
                        console.error("Failed to delete logo file during deletion:", err);
                    }
                }
            });
        }

        res.status(200).json({ success: true, message: "Settings deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to delete settings", message: error.message });
    }
};

module.exports = {
    addCompanySettings,
    getCompanySettings,
    updateCompanySettings,
    deleteCompanySettings,
};
