const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// OpenAI API Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Start interaction with OpenAI
router.post('/start', async (req, res) => {
	const { prompt } = req.body;

	try {
		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-3.5-turbo', // or "gpt-4" if using GPT-4
				messages: [
					{
						role: 'system',
						content: 'Act as an expert and evaluate the response.',
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
			console.error('Rate Limit Headers:', error.response.headers);
		} else {
			console.error('Error:', error.message);
		}
		res.status(500).json({ error: 'Failed to generate question.' });
	}
});

// Evaluate the student’s response
router.post('/evaluate', async (req, res) => {
	const { answer, initialPrompt } = req.body;

	try {
		const evaluationPrompt = `
        Acting as an expert, evaluate this response based on the SOLO taxonomy:
        Question Context: ${initialPrompt}
        Student's Answer: ${answer}
        Provide feedback and the next question.`;

		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-3.5-turbo', // or "gpt-4"
				messages: [
					{ role: 'system', content: 'You are a helpful assistant.' },
					{ role: 'user', content: evaluationPrompt },
				],
				max_tokens: 200,
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

		// Split the feedback into next question and explanation
		const nextQuestion =
			output.match(/Next Question:(.*)/)?.[1]?.trim() || '';
		const helpfulFeedback = output.replace(/Next Question:(.*)/, '').trim();

		res.status(200).json({
			feedback: helpfulFeedback,
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

module.exports = router;
