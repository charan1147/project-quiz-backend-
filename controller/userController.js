import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "../config/token.js";
import User from "../models/userModel.js";
import cookie from "cookie";


export const register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    generateToken(user, res);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(" Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};


export const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

    generateToken(user, res);
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error(" Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};


export const logout = async (req, res) => {
  try {
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("jwt", "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      })
    );
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(" Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
};


export const profile = async (req, res) => {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.jwt;
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error(" Profile fetch error:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
