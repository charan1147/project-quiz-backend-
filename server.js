import express from "express";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import { register, login, logout, profile } from "./controller/userController.js";
import { getQuestions, saveMatch } from "./controller/quizController.js";
import { auth } from "./middleware/auth.js";
import { initializeSocket } from "./sockets/socket.js";

dotenv.config();
connectDB();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
initializeSocket(server);

const allowedOrigins = [
  "https://app-like-quiz.netlify.app",
  "http://localhost:5173"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);
app.get("/api/auth/profile", auth, profile);

// Quiz routes
app.get("/api/quiz/questions", auth, getQuestions);
app.post("/api/quiz/match", auth, saveMatch);

app.get("/", (req, res) => {
  res.send("Quiz App API & WebSocket server is running...");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});                            