const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  add_category,
  getCategories,
  getCategory,
  update_category,
  delete_category,
} = require("../controllers/category.controller");

// Set up multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/categories/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// CATEGORY ROUTES
router.post("/", upload.single("image"), add_category); // Single image for category usually
router.get("/", getCategories);
router.get("/:id", getCategory);
router.put("/:id", upload.single("image"), update_category);
router.delete("/:id", delete_category);

module.exports = router;
