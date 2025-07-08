import express from "express";
import { register, login, logout, profile } from "../controller/userController.js";
import { auth } from "../middleware/auth.js";
const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", auth, profile);
export default router;