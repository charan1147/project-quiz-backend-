import cookie from "cookie";
import { verifyToken } from "../config/token.js";

export const auth = (req, res, next) => {
  try {
    const cookies = cookie.parse(req?.headers?.cookie || "");
    const token = cookies.jwt;

    if (!token) {
      console.warn("🚫 No JWT token found in cookies");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // You can access user info via req.user later
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
