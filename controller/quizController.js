import axios from "axios";
import Match from "../models/matchModel.js";

export const getQuestions = async (req, res) => {
  try {
    const response = await axios.get("https://quizapi.io/api/v1/questions", {
      params: {
        apiKey: process.env.QUIZ_API_KEY,
        limit: 5,
        type: "multiple",
      },
    });
    const questions = response.data.map(q => ({
      question: q.question,
      options: Object.values(q.answers).filter(Boolean).sort(() => Math.random() - 0.5),
      correct_answer: Object.keys(q.correct_answers).find(k => q.correct_answers[k] === "true").replace("_correct", ""),
      timer: 15,
    }));
    res.status(200).json(questions);
  } catch (error) {
    console.error("Fetch questions error:", error.message);
    res.status(500).json({ message: "Failed to fetch questions" });
  }
};

export const saveMatch = async (req, res) => {
  const { roomId, players, scores } = req.body;
  try {
    if (!roomId || !players || !scores)
      return res.status(400).json({ message: "Missing match data" });

    const match = new Match({ roomId, players, scores });
    await match.save();
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ message: "Failed to save match" });
  }
};