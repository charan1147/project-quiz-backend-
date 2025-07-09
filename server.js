import express from "express";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import { initializeSocket } from "./sockets/socket.js";

// ✅ Load env and DB
dotenv.config();
connectDB();

// ✅ Ensure production mode (needed for secure cookies)
process.env.NODE_ENV = process.env.NODE_ENV || "production";

const app = express();
const server = http.createServer(app);
initializeSocket(server);

// ✅ Allowed frontend origins
const allowedOrigins = [
  "https://app-like-quiz.netlify.app",
  "http://localhost:5173"
];

// ✅ Handle CORS headers (for all responses)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// ✅ CORS middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);

// ✅ Default route
app.get("/", (req, res) => {
  res.send("Quiz App API & WebSocket server is running...");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
