import express from "express";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import { initializeSocket } from "./sockets/socket.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
initializeSocket(server);

// ✅ SAFER origin checking without trailing slash
const allowedOrigins = [
  "https://app-like-quiz.netlify.app",
  "http://localhost:5173"
];

// ✅ CORS logging
app.use((req, res, next) => {
  console.log("🌐 Incoming request from:", req.headers.origin);
  next();
});

// ✅ Use CORS before any route handlers
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error("❌ CORS blocked for origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ✅ Add these BEFORE routes
app.use(express.json());
app.use(cookieParser());

// ✅ Use routes
app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Quiz App API & WebSocket server is running...");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
