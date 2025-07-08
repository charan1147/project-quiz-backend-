import axios from "axios";
import Match from "../models/matchModel.js";

export const getQuestions = async (req, res) => {
  try {
    const response = await axios.get("https://opentdb.com/api.php?amount=5&type=multiple");
    const questions = response.data.results.map(q => ({
      ...q,
      timer: 15,
    }));
    res.status(200).json(questions);
  } catch (error) {
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
