import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; 
import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import { initializeSocket } from "./sockets/socket.js";
import connectDB from "./config/db.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const CLIENT_ORIGIN = process.env.NODE_ENV === "production"
  ? "https://your-frontend.onrender.com"
  : "http://localhost:5173";

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser()); 

connectDB();


app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


initializeSocket(server);
