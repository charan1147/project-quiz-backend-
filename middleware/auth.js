import cookie from "cookie";
import { verifyToken } from "../config/token.js";
export const auth = (req, res, next) => {
  try {
    const cookies = cookie.parse(req?.headers?.cookie || "");
    const token = cookies.jwt;
    if (!token) return res.status(401).json({ message: "Not authenticated" });
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

