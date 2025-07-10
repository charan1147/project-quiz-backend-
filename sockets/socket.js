import { Server } from "socket.io";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.QUIZ_API_KEY;
const BASE_URL = "https://quizapi.io/api/v1/questions";

const allowedOrigins = [
  "https://app-like-quiz.netlify.app",
  "http://localhost:5173"
];

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.error(" Socket.IO CORS blocked for origin:", origin);
          callback(new Error("Not allowed by Socket.IO CORS"));
        }
      },
      credentials: true,
    },
  });

  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("🔌 Client connected:", socket.id);

    socket.on("leavePreviousRoom", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) socket.leave(room);
      }
    });

    socket.on("createRoom", ({ roomId, username }) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [],
          questions: [],
          scores: {},
          currentQuestion: 0,
          timer: null,
          answeredPlayers: new Set(),
          timeLeft: 15,
          quizStarted: false,
          messages: [],
        });
        console.log(`🏠 Room ${roomId} created`);
      }
      joinRoom(socket, roomId, username);
    });

    socket.on("joinRoom", ({ roomId, username }) => {
      if (!rooms.has(roomId)) {
        socket.emit("quizError", "Room not found");
        return;
      }
      joinRoom(socket, roomId, username);
    });

    socket.on("rejoinRoom", ({ roomId, username }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const existing = room.players.find((p) => p.username === username);
      if (!existing) {
        room.players.push({ id: socket.id, username });
        room.scores[username] = 0;
      } else {
        existing.id = socket.id;
      }

      socket.join(roomId);
      socket.emit("scoreUpdate", room.scores);
      socket.emit("receiveMessage", room.messages); 
      io.to(roomId).emit("playerUpdate", { players: room.players, roomId });

      const currentQ = room.questions[room.currentQuestion];
      if (room.quizStarted && currentQ) {
        socket.emit("startQuiz", {
          question: currentQ,
          currentQuestion: room.currentQuestion + 1,
          totalQuestions: room.questions.length,
          timeLeft: room.timeLeft,
        });
      }
    });

    socket.on("startQuizManually", async ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && !room.quizStarted) {
        await startQuiz(io, roomId, room);
      }
    });

    socket.on("submitAnswer", ({ roomId, answer, timeTaken }) => {
      const room = rooms.get(roomId);
      if (!room || !room.timer) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player || room.answeredPlayers.has(player.username)) return;

      room.answeredPlayers.add(player.username);

      const currentQuestion = room.questions[room.currentQuestion];
      const isCorrect = answer === currentQuestion.correct_answer;

      if (isCorrect) {
        const timeBonus = Math.max(0, 10 - Math.floor(timeTaken / 1000));
        room.scores[player.username] =
          (room.scores[player.username] || 0) + 10 + timeBonus;
      }

      io.to(roomId).emit("scoreUpdate", room.scores);

      const allAnswered = room.players.every((p) =>
        room.answeredPlayers.has(p.username)
      );

      if (allAnswered) {
        clearInterval(room.timer);
        goToNextQuestion(io, roomId, room);
      }
    });

    socket.on("sendMessage", ({ roomId, message, username }) => {
      const msg = {
        username,
        message,
        timestamp: new Date(),
      };

      const room = rooms.get(roomId);
      if (room) {
        room.messages.push(msg); 
      }

      io.to(roomId).emit("receiveMessage", msg); 
    });

    socket.on("disconnect", () => {
      console.log(" Disconnected:", socket.id);
      for (const [roomId, room] of rooms.entries()) {
        const index = room.players.findIndex((p) => p.id === socket.id);
        if (index !== -1) {
          const username = room.players[index].username;
          room.players.splice(index, 1);
          delete room.scores[username];
          io.to(roomId).emit("playerUpdate", { players: room.players });
        }
        if (room.players.length === 0) {
          clearInterval(room.timer);
          rooms.delete(roomId);
        }
      }
    });
  });

  const joinRoom = (socket, roomId, username) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players.length >= 10) {
      socket.emit("roomFull");
      return;
    }

    const existing = room.players.find((p) => p.username === username);
    if (!existing) {
      room.players.push({ id: socket.id, username });
      room.scores[username] = 0;
    } else {
      existing.id = socket.id;
    }

    socket.join(roomId);
    socket.emit("receiveMessage", room.messages); 
    io.to(roomId).emit("playerUpdate", { players: room.players });
  };

  const startQuiz = async (io, roomId, room) => {
    const questions = await fetchQuestions(10);
    if (!questions.length) {
      io.to(roomId).emit("quizError", "No questions available.");
      return;
    }

    room.questions = questions;
    room.currentQuestion = 0;
    room.quizStarted = true;
    startQuestionTimer(io, roomId, room);
  };

  const startQuestionTimer = (io, roomId, room) => {
    const question = room.questions[room.currentQuestion];
    room.timeLeft = 15;
    room.answeredPlayers = new Set();

    io.to(roomId).emit("startQuiz", {
      question,
      currentQuestion: room.currentQuestion + 1,
      totalQuestions: room.questions.length,
      timeLeft: room.timeLeft,
    });

    room.timer = setInterval(() => {
      room.timeLeft--;
      io.to(roomId).emit("timerUpdate", { timeLeft: room.timeLeft });

      if (room.timeLeft <= 0) {
        clearInterval(room.timer);
        goToNextQuestion(io, roomId, room);
      }
    }, 1000);
  };

  const goToNextQuestion = (io, roomId, room) => {
    if (room.currentQuestion < room.questions.length - 1) {
      room.currentQuestion++;
      startQuestionTimer(io, roomId, room);
    } else {
      io.to(roomId).emit("quizEnd", { scores: room.scores });
      clearInterval(room.timer);
      rooms.delete(roomId);
    }
  };

  const fetchQuestions = async (limit = 10) => {
    try {
      const res = await axios.get(BASE_URL, {
        params: {
          apiKey: API_KEY,
          limit,
          difficulty: "Medium",
          type: "multiple",
        },
      });

      return res.data.map((q) => {
        const options = Object.values(q.answers).filter(Boolean);
        const correctKey = Object.keys(q.correct_answers).find(
          (k) => q.correct_answers[k] === "true"
        );
        const answerKey = correctKey?.replace("_correct", "");
        const correctAnswer = q.answers[answerKey];

        return {
          question: q.question,
          options: options.sort(() => Math.random() - 0.5),
          correct_answer: correctAnswer,
          timer: 15,
        };
      });
    } catch (err) {
      console.error(" Error fetching questions:", err.message);
      return [];
    }
  };
};