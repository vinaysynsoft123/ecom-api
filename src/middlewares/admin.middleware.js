module.exports = (req, res, next) => {
    if (req.user && req.user.role && req.user.role.toLowerCase() === "admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required.",
        });
    }
};
