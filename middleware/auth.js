import cookie from "cookie";
import { verifyToken } from "../config/token.js";

export const auth = (req, res, next) => {
  try {
    // Parse cookies from request
    const cookies = cookie.parse(req.headers.cookie || "");

    // Extract JWT token from cookies
    const token = cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify and decode token
    const decoded = verifyToken(token);
    req.user = decoded; // Attach user data to request
    next(); // Proceed to next middleware or route
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
