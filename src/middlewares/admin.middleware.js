module.exports = (req, res, next) => {
    if (req.user && req.user.role === "Admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required.",
        });
    }
};
