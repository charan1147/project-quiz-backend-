import express from "express"
import { getQuestions,saveMatch } from '../controller/quizController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/questions', auth, getQuestions);
router.post('/match', auth, saveMatch);
export default router