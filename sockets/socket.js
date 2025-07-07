import { Server } from 'socket.io';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.QUIZ_API_KEY;
const BASE_URL = 'https://quizapi.io/api/v1/questions';

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', async ({ roomId, username }) => {
      let room = rooms.get(roomId);
      if (!room) {
        room = {
          players: [],
          questions: [],
          scores: {},
          currentQuestion: 0,
          timer: null,
          answeredPlayers: new Set(),
        };
        rooms.set(roomId, room);
      }

      if (room.players.length >= 2) {
        socket.emit('roomFull');
        return;
      }

      room.players.push({ id: socket.id, username });
      room.scores[socket.id] = 0;
      socket.join(roomId);

      io.to(roomId).emit('playerUpdate', { players: room.players, roomId });

      if (room.players.length === 2) {
        await startQuiz(io, roomId, room);
      }
    });

    socket.on('rejoinRoom', ({ roomId, username }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("quizError", "Room not found.");
        return;
      }

      const existing = room.players.find(p => p.id === socket.id);
      if (!existing) {
        room.players.push({ id: socket.id, username });
        room.scores[socket.id] = 0;
      }

      socket.join(roomId);
      io.to(roomId).emit('playerUpdate', { players: room.players, roomId });

      const currentQ = room.questions[room.currentQuestion];
      if (currentQ) {
        socket.emit("startQuiz", {
          question: currentQ,
          currentQuestion: room.currentQuestion + 1,
          totalQuestions: room.questions.length,
          timeLeft: currentQ.timer,
        });
        socket.emit("scoreUpdate", room.scores);
      }
    });

    socket.on('submitAnswer', ({ roomId, answer, timeTaken }) => {
      const room = rooms.get(roomId);
      if (!room || !room.timer) return;

      if (room.answeredPlayers.has(socket.id)) return;
      room.answeredPlayers.add(socket.id);

      const currentQuestion = room.questions[room.currentQuestion];
      const isCorrect = answer === currentQuestion.correct_answer;

      if (isCorrect) {
        const timeBonus = Math.max(0, 10 - Math.floor(timeTaken / 1000));
        room.scores[socket.id] = (room.scores[socket.id] || 0) + 10 + timeBonus;
      }

      io.to(roomId).emit('scoreUpdate', room.scores);

      const allAnswered = room.players.every(player => room.answeredPlayers.has(player.id));

      if (allAnswered) {
        clearInterval(room.timer);
        if (room.currentQuestion < room.questions.length - 1) {
          room.currentQuestion++;
          startQuestionTimer(io, roomId, room);
        } else {
          io.to(roomId).emit('quizEnd', { scores: room.scores });
          rooms.delete(roomId);
        }
      }
    });

    socket.on('sendMessage', ({ roomId, message, username }) => {
      io.to(roomId).emit('receiveMessage', {
        username,
        message,
        timestamp: new Date(),
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          delete room.scores[socket.id];
          io.to(roomId).emit('playerUpdate', room.players);
          if (room.players.length === 0) {
            clearInterval(room.timer);
            rooms.delete(roomId);
          }
        }
      });
    });
  });

  const startQuiz = async (io, roomId, room) => {
    const questions = await fetchQuestions();
    if (!questions.length) {
      io.to(roomId).emit('quizError', 'No questions available.');
      return;
    }
    room.questions = questions;
    startQuestionTimer(io, roomId, room);
  };

  const startQuestionTimer = (io, roomId, room) => {
    const question = room.questions[room.currentQuestion];
    question.timer = 15;
    room.answeredPlayers = new Set();

    io.to(roomId).emit('startQuiz', {
      question,
      currentQuestion: room.currentQuestion + 1,
      totalQuestions: room.questions.length,
      timeLeft: question.timer,
    });

    room.timer = setInterval(() => {
      question.timer--;
      io.to(roomId).emit('timerUpdate', { timeLeft: question.timer });

      if (question.timer <= 0) {
        clearInterval(room.timer);
        if (room.currentQuestion < room.questions.length - 1) {
          room.currentQuestion++;
          startQuestionTimer(io, roomId, room);
        } else {
          io.to(roomId).emit('quizEnd', { scores: room.scores });
          rooms.delete(roomId);
        }
      }
    }, 1000);
  };

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(BASE_URL, {
        params: {
          apiKey: API_KEY,
          limit: 5,
          type: 'multiple',
        },
      });

      if (!Array.isArray(response.data) || response.data.length === 0) {
        console.error('QuizAPI returned no questions.');
        return [];
      }

      return response.data.map((q) => {
        const allAnswers = Object.values(q.answers).filter((ans) => ans !== null);

        const correctKey = Object.keys(q.correct_answers).find(
          (key) => q.correct_answers[key] === 'true'
        );

        const answerKey = correctKey?.replace('_correct', '');
        const correctAnswer = q.answers[answerKey];

        return {
          question: q.question,
          options: allAnswers.sort(() => Math.random() - 0.5),
          correct_answer: correctAnswer,
          timer: 15,
        };
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  };
};