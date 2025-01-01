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
	const { prompt, currentLevel = 'Prestructural' } = req.body;

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

		res.status(200).json({
			question: output,
			helperPrompts: [
				'Think critically',
				'Provide examples',
				'Use logical reasoning',
			], // Example helper prompts
		});
	} catch (error) {
		if (error.response) {
			console.error('API error response:', error.response.data);
		} else {
			console.error('Error:', error.message);
		}
		res.status(500).json({ error: 'Failed to generate question.' });
	}
});

// Evaluate the student's response
router.post('/evaluate', async (req, res) => {
	const { answer, initialPrompt, currentLevel } = req.body;

	try {
		const evaluationPrompt = `
Acting as an expert, evaluate this response based on the SOLO taxonomy:
- Question Context: ${initialPrompt}
- Current Level: ${currentLevel}
- Student's Answer: ${answer}
If the answer is accurate for the current level (e.g., it correctly identifies a fact), provide feedback and indicate the student's readiness to move to the next SOLO level.
If more context or explanation is required, guide the student to elaborate while staying within the current SOLO level.
Provide feedback on their understanding and suggest the next question based on their answer.
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

		// Extract feedback and the decision to level up
		const feedbackMatch = output.match(
			/Feedback:(.*?)(?=\nNext Level:|\n|$)/s
		);
		const levelUpMatch = output.match(/Next Level:\s*(.*)/);
		const nextQuestionMatch = output.match(/Next Question:\s*(.*)/);

		const feedback = feedbackMatch
			? feedbackMatch[1].trim()
			: 'No feedback provided.';
		const nextLevel = levelUpMatch ? levelUpMatch[1].trim() : currentLevel; // Default to current level
		const nextQuestion = nextQuestionMatch
			? nextQuestionMatch[1].trim()
			: `Please try again at the ${currentLevel} level.`;

		// Ensure the next level exists in SOLO taxonomy
		const nextLevelIndex = soloLevels.indexOf(nextLevel);
		const validNextLevel =
			nextLevelIndex >= 0 && nextLevelIndex < soloLevels.length
				? nextLevel
				: currentLevel;

		// Determine if the answer is correct (based on feedback)
		const isCorrect =
			output.toLowerCase().includes('correct') ||
			output.toLowerCase().includes('satisfactory') ||
			output.toLowerCase().includes('proficient'); // Customize this to match the feedback pattern

		res.status(200).json({
			isCorrect, // Add this flag to determine answer correctness
			feedback,
			nextLevel: validNextLevel,
			nextQuestion,
		});
	} catch (error) {
		console.error(
			'Error evaluating response:',
			error.response?.data || error.message
		);
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
