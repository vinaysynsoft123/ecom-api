const db = require("../config/db");

// ADD CATEGORY
const add_category = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    let images = "";

    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path).join(",");
    } else if (req.file) {
      images = req.file.path;
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    await db.query(
      "INSERT INTO categories (name, description, status, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        name,
        description || "",
        status || "active",
        images,
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
    const { name, description, status } = req.body;

    // Check if exists
    const [existing] = await db.query("SELECT * FROM categories WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    let images = existing[0].images;
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path).join(",");
    } else if (req.file) {
      images = req.file.path;
    }

    await db.query(
      "UPDATE categories SET name = ?, description = ?, status = ?, images = ?, updated_at = ? WHERE id = ?",
      [
        name || existing[0].name,
        description || existing[0].description,
        status || existing[0].status,
        images,
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
    const [result] = await db.query("DELETE FROM categories WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
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
