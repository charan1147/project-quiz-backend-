import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../config/token.js";
import User from "../models/userModel.js";
import cookie from "cookie";

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser)
      return res.status(400).json({ message: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    generateToken(user, res);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  console.log("📥 Login attempt body:", req.body);
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      console.log("❌ No user found for identifier:", identifier);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("❌ Password mismatch for user:", identifier);
      return res.status(401).json({ message: "Password is wrong" });
    }

    console.log("✅ Login successful, generating token for:", user.username);
    generateToken(user, res);
    return res.status(200).json({ message: "Login successful" });

  } catch (error) {
    console.error("❌ Login error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const logout = async (req, res) => {
  try {
    res.setHeader("Set-Cookie", cookie.serialize("jwt", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    }));
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
};

export const profile = async (req, res) => {
  try {
    console.log("📬 Headers received:", req.headers);

    const cookies = cookie.parse(req.headers.cookie || "");
    console.log("🍪 Parsed cookies:", cookies);

    const token = cookies.jwt;
    if (!token) {
      console.log("❌ No token found in cookies");
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = verifyToken(token);
    console.log("🔐 Decoded token:", decoded);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Profile fetched for:", user.username);
    res.status(200).json({
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("❌ Profile fetch error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
