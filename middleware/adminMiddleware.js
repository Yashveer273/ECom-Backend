

module.exports = function (req, res, next) {
  try {
    // In real project verify JWT
    const { role } = req.headers; // example: role: "admin"

    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: "Unauthorized" });
  }
};
