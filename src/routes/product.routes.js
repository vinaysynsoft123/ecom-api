const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  add_product,
  getProducts,
  getProduct,
  update_product,
  delete_product,
  search_products,
} = require("../controllers/product.controller");

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/products/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// PRODUCT ROUTES
router.post("/", upload.array("images", 5), add_product);
router.get("/", getProducts);
router.get("/search", search_products);
router.get("/:id", getProduct);
router.put("/:id", upload.array("images", 5), update_product);
router.delete("/:id", delete_product);

module.exports = router;