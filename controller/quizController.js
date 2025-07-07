import axios from "axios"
import Match from "../models/matchModel.js";

export const getQuestions = async (req, res) => {
  try {
    const response = await axios.get('https://opentdb.com/api.php?amount=5&type=multiple');
    const questions = response.data.results.map(q => ({
      ...q,
      timer: 15,
    }));
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

export const saveMatch = async (req, res) => {
  const { roomId, players, scores } = req.body;
  try {
    const match = new Match({ roomId, players, scores });
    await match.save();
    res.status(200).json({ message: 'Match saved', match });
  } catch (error) {
    res.status(500).json({ message: 'Error saving match' });
  }
};