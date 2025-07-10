import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import { logout } from "../controller/userController.js";
import serverless from "serverless-http";

dotenv.config();
connectDB();

const app = express();
app.use(cors({
  origin: ["https://app-like-quiz.netlify.app", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.post("/api/auth/logout", logout);

export const handler = serverless(app);
