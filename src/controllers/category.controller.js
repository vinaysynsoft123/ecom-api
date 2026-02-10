const fs = require("fs");
const path = require("path");
const db = require("../config/db");

// Helper to generate slug
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/-+/g, "-") // Remove multiple -
    .trim();
};

// ADD CATEGORY
const add_category = async (req, res) => {
  try {
    const { name, description, status, slug } = req.body;
    let images = "";

    if (req.file) {
      images = req.file.path;
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    // Auto-generate slug if not provided
    const categorySlug = slug || generateSlug(name);

    await db.query(
      "INSERT INTO categories (name, description, status, images, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        description || "",
        status !== undefined && status !== null ? status : "1",
        images,
        categorySlug,
        new Date(),
        new Date(),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category addition failed",
      error: error.message,
    });
  }
};

// GET ALL CATEGORIES
const getCategories = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM categories ORDER BY id DESC");
    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
      error: error.message,
    });
  }
};

// GET SINGLE CATEGORY
const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve category",
      error: error.message,
    });
  }
};

// UPDATE CATEGORY
const update_category = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, slug } = req.body;

    // Check if exists
    const [existing] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    let images = existing[0].images;
    if (req.file) {
      // Delete old image if it exists
      if (existing[0].images && fs.existsSync(existing[0].images)) {
        fs.unlinkSync(existing[0].images);
      }
      images = req.file.path;
    }

    // Update slug if name changes or custom slug provided
    const categorySlug = slug || (name ? generateSlug(name) : existing[0].slug);

    await db.query(
      "UPDATE categories SET name = ?, description = ?, status = ?, images = ?, slug = ?, updated_at = ? WHERE id = ?",
      [
        name || existing[0].name,
        description || existing[0].description,
        status !== undefined && status !== null ? status : existing[0].status,
        images,
        categorySlug,
        new Date(),
        id,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category update failed",
      error: error.message,
    });
  }
};

// DELETE CATEGORY
const delete_category = async (req, res) => {
  try {
    const { id } = req.params;

    // Get category info to delete file
    const [existing] = await db.query("SELECT images FROM categories WHERE id = ?", [id]);

    const [result] = await db.query("DELETE FROM categories WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Cleanup image file
    if (existing.length > 0 && existing[0].images && fs.existsSync(existing[0].images)) {
      fs.unlinkSync(existing[0].images);
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Category deletion failed",
      error: error.message,
    });
  }
};

module.exports = {
  add_category,
  getCategories,
  getCategory,
  update_category,
  delete_category,
};
