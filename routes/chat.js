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
Evaluate this response based on BLOOM Taxonomy:
- Question Context: ${initialPrompt}
- Level: ${currentLevel}
- Answer: ${answer}

Provide feedback in a conversational, encouraging style, avoiding rigid terms like "correct" or "incorrect." Instead, give detailed feedback explaining why the answer is good or how it can be improved. Conclude with the next question using "Next Question: [your question here]".
        `;

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
				max_tokens: 300,
				temperature: 0.7, // Increased for more varied responses
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
		const feedbackMatch = output.match(/Feedback:(.*?)(?=\n|$)/s);
		const nextQuestionMatch = output.match(/Next Question:\s*(.*)/);

		const feedback = feedbackMatch
			? feedbackMatch[1].trim()
			: 'No feedback provided.';
		const nextQuestion = nextQuestionMatch
			? nextQuestionMatch[1].trim()
			: 'No next question provided.';

		// Send the response back to the front-end
		return res.status(200).json({
			isCorrect: null, // We no longer need this in the front-end
			feedback,
			nextLevel: currentLevel, // Assuming the level doesn't change for now
			nextQuestion,
		});
	} catch (error) {
		console.error('Error evaluating response:', error.message);
		return res.status(500).json({ error: 'Failed to evaluate answer.' });
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
