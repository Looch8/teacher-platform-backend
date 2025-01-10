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
Evaluate the following response based on Bloom's Taxonomy:
- Question Context: ${initialPrompt}
- Level: ${currentLevel}
- Answer: ${answer}

1. Provide clear feedback on the answer.
2. If correct, indicate success and provide the next question.
3. If incorrect, explain the mistake and provide a follow-up question.
Use a conversational tone and avoid rigid terms like "correct" or "incorrect".
Format response as:
Feedback: [your feedback]
Next Question: [next question]
Next Level: [next level, if applicable]
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
			: 'No feedback provide.';
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
