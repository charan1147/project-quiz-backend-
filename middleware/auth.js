export const auth = (req, res, next) => {
  const cookies = req.headers.cookie;
  console.log("🍪 Incoming cookies:", cookies);

  if (!cookies) return res.status(401).json({ message: "No cookies found" });

  const token = cookie.parse(cookies).jwt;
  if (!token) {
    console.log("❌ No JWT token in cookies");
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token verified:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("❌ Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};
