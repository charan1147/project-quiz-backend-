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

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "https://your-frontend.netlify.app"],
  credentials: true,
}));

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);

app.get("/", (req, res) => {
  res.send("🎉 Quiz App API & WebSocket server is running...");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});