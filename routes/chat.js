const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// OpenAI API Configuration
const OPENAI_API_URL = process.env.OPENAI_API_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Map levels to SOLO taxonomy)
const soloLevels = [
	'Prestructural',
	'Unistructural',
	'Multistructural',
	'Relational',
	'Extended Abstract',
];

// Start interaction with OpenAI
router.post('/start', async (req, res) => {
	const { prompt, currentLevel = 'Unistructural' } = req.body;

	try {
		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: `You are an expert educator. Generate a ${currentLevel} level question.`,
					},
					{ role: 'user', content: prompt },
				],
				max_tokens: 100,
				temperature: 0.5,
			},
			{
				headers: {
					Authorization: `Bearer ${OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
			}
		);

		const output =
			response.data.choices[0]?.message?.content ||
			'No response from model';

		res.status(200).json({ question: output });
	} catch (error) {
		console.error('Error generating question:', error.message);
		res.status(500).json({ error: 'Failed to generate question.' });
	}
});

router.post('/evaluate', async (req, res) => {
	const { answer, initialPrompt, currentLevel } = req.body;

	try {
		const evaluationPrompt = `
You are an expert educator conducting a Socratic dialogue about ${initialPrompt}.
Current SOLO taxonomy level: ${currentLevel}

Previous student answer: ${answer}

Evaluate the answer and respond following these rules:
1. Never explicitly mention Bloom's taxonomy levels
2. If the answer shows understanding at the current level:
   - Provide encouraging feedback
   - Generate the next question at a slightly higher difficulty
   - If appropriate, advance to the next level with subtle encouragement
3. If the answer shows partial understanding:
   - Provide constructive feedback
   - Ask a follow-up question at the same level to clarify understanding
4. If the answer shows significant gaps:
   - Provide helpful feedback without using terms like "incorrect"
   - Ask a simpler question at the same level
5. Include elements from Item Response Theory by adjusting question difficulty based on previous responses
6. Keep feedback concise and focused

Format your response exactly as:
Feedback: [your feedback]
Next Question: [your next question]
Next Level: [current level or next level if advancing]`;

		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant and expert educator.',
					},
					{ role: 'user', content: evaluationPrompt },
				],
				max_tokens: 400,
				temperature: 0.7, // Adjusted for varied responses
			},
			{
				headers: {
					Authorization: `Bearer ${OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
			}
		);

		const output =
			response.data.choices[0]?.message?.content ||
			'No response from model';

		// Extract feedback, next question, and next level using regex
		const feedbackMatch = output.match(/Feedback:\s*(.*?)(?=\n|$)/s);
		const nextQuestionMatch = output.match(
			/Next Question:\s*(.*?)(?=\n|$)/s
		);
		const nextLevelMatch = output.match(/Next Level:\s*(.*?)(?=\n|$)/s);

		const feedback = feedbackMatch
			? feedbackMatch[1].trim()
			: 'No feedback provided.';
		const nextQuestion = nextQuestionMatch
			? nextQuestionMatch[1].trim()
			: 'No next question provided.';
		const nextLevel = nextLevelMatch
			? nextLevelMatch[1].trim()
			: currentLevel;

		res.status(200).json({
			feedback,
			nextQuestion,
			nextLevel,
		});
	} catch (error) {
		console.error('Error evaluating response:', error.message);
		res.status(500).json({ error: 'Failed to evaluate answer.' });
	}
});

// Rephrase endpoint
router.post('/rephrase', async (req, res) => {
	const { currentQuestion } = req.body;

	try {
		const rephrasePrompt = `Please rephrase the following question: "${currentQuestion}"`;

		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-4',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant.' },
					{ role: 'user', content: rephrasePrompt },
				],
				max_tokens: 100,
				temperature: 0.5,
			},
			{
				headers: {
					Authorization: `Bearer ${OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
			}
		);

		const rephrasedQuestion =
			response.data.choices[0]?.message?.content ||
			'No response from model';

		res.status(200).json({ rephrasedQuestion });
	} catch (error) {
		console.error(
			'Error rephrasing question:',
			error.response?.data || error.message
		);
		res.status(500).json({ error: 'Failed to rephrase question.' });
	}
});

module.exports = router;

//
