const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");


const {
    addCompanySettings,
    getCompanySettings,
    updateCompanySettings,
} = require("../controllers/company_settings.controller");

const multer = require("multer");

// Set up multer for local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/logo/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({ storage: storage });

router.use(auth);

router.post("/", upload.single("logo"), addCompanySettings);
router.get("/", getCompanySettings);
router.put("/:id?", upload.single("logo"), updateCompanySettings);

module.exports = router;
