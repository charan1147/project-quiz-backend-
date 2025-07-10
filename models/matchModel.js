import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scores: { type: Map, of: Number },
  createdAt: { type: Date, default: Date.now },
});

const Match = mongoose.model("Match", matchSchema);
export default Match;

