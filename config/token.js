import cookie from "cookie";
import jwt from "jsonwebtoken";
export const generateToken = (user, res) => {
  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  res.setHeader("Set-Cookie", cookie.serialize("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 60 * 60 * 24,
    path: "/",
  }));
  
  return token;
};
export const verifyToken = (token) => {
  if (!token) throw new Error("No token provided");
  return jwt.verify(token, process.env.JWT_SECRET);
};