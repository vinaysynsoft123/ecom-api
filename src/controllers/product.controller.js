const db = require("../config/db");
const fs = require("fs");
const path = require("path");

// ADD PRODUCT
const add_product = async (req, res) => {
  try {
    const { name, category_id, details, price, status } = req.body;
    let images = "";

    // Handle single image if uploaded via multer
    if (req.file) {
      images = req.file.path;
    }

    if (!name || !category_id || !price) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, category_id, price)",
      });
    }

    await db.query(
      "INSERT INTO products (name, category_id, details, price, images, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        category_id,
        details || "",
        price,
        images,
        status || "active",
        new Date(),
        new Date(),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product addition failed",
      error: error.message,
    });
  }
};

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
      error: error.message,
    });
  }
};

// GET SINGLE PRODUCT (EDIT VIEW)
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve product",
      error: error.message,
    });
  }
};

// UPDATE PRODUCT
const update_product = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, details, price, status } = req.body;

    // Check if product exists
    const [existing] = await db.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let images = existing[0].images;
    // Update image if a new file is uploaded
    if (req.file) {
      // Delete old image from filesystem
      if (existing[0].images && fs.existsSync(existing[0].images)) {
        fs.unlinkSync(existing[0].images);
      }
      images = req.file.path;
    }

    await db.query(
      "UPDATE products SET name = ?, category_id = ?, details = ?, price = ?, images = ?, status = ?, updated_at = ? WHERE id = ?",
      [
        name || existing[0].name,
        category_id || existing[0].category_id,
        details || existing[0].details,
        price || existing[0].price,
        images,
        status || existing[0].status,
        new Date(),
        id,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Product update failed",
      error: error.message,
    });
  }
};

// DELETE PRODUCT
const delete_product = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Check if product exists
    const [existing] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2. Check for dependencies (Orders)
    const [orders] = await db.query("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?", [id]);
    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product because it has associated orders. Please deactivate it instead.",
        hasOrders: true
      });
    }

    // 3. Perform deletion
    if (existing[0].images && fs.existsSync(existing[0].images)) {
      fs.unlinkSync(existing[0].images);
    }

    const [result] = await db.query("DELETE FROM products WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    // Handle database specific errors (like FK constraints if the check above misses something)
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(400).json({
        success: false,
        message: "This product is linked to other records (like orders) and cannot be deleted. Try setting its status to Inactive instead.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Product deletion failed",
      error: error.message,
    });
  }
};

// SEARCH PRODUCTS
const search_products = async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Search keyword is required",
      });
    }

    const searchQuery = `
      SELECT * FROM products 
      WHERE name LIKE ? OR details LIKE ? 
      ORDER BY id DESC
    `;
    const [rows] = await db.query(searchQuery, [`%${keyword}%`, `%${keyword}%`]);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

module.exports = {
  add_product,
  getProducts,
  getProduct,
  update_product,
  delete_product,
  search_products,
};
