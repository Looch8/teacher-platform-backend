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
Evaluate this response based on SOLO Taxonomy:
- Question Context: ${initialPrompt}
- Level: ${currentLevel}
- Answer: ${answer}
Determine correctness as "Correct: true" or "Correct: false" and provide detailed feedback.

If the response is correct:
1. Clearly state "Correct: true".
2. Provide the next question labeled as "Next Question: [your question here]".
3. Include detailed feedback as "Feedback: [your feedback here]".

If the response is incorrect:
1. Clearly state "Correct: false".
2. Suggest rephrasing the current question as "Next Question: [rephrased question]".
3. Include feedback as "Feedback: [your feedback here]".
`;

		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-4',
				messages: [
					{ role: 'system', content: 'You are a helpful assistant.' },
					{ role: 'user', content: evaluationPrompt },
				],
				max_tokens: 300,
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

		const isCorrectMatch = output.match(/Correct:\s*(true|false)/i);
		const feedbackMatch = output.match(/Feedback:(.*?)(?=\n|$)/s);
		const levelUpMatch = output.match(/Next Level:\s*(.*)/);
		const nextQuestionMatch = output.match(/Next Question:\s*(.*)/);

		const isCorrect = isCorrectMatch
			? isCorrectMatch[1].trim().toLowerCase() === 'true'
			: false;

		const feedback = feedbackMatch
			? feedbackMatch[1].trim()
			: 'No feedback provided.';
		const nextLevel = levelUpMatch ? levelUpMatch[1].trim() : currentLevel;
		const nextQuestion = nextQuestionMatch
			? nextQuestionMatch[1].trim()
			: 'No next question provided.';

		// Send response
		return res.status(200).json({
			isCorrect,
			feedback,
			nextLevel,
			nextQuestion,
		});
	} catch (error) {
		console.error('Error evaluating response:', error.message);

		// Send error response
		if (!res.headersSent) {
			return res
				.status(500)
				.json({ error: 'Failed to evaluate answer.' });
		}
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
