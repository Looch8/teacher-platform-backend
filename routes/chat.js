const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// Hugging Face Bloom API configuration
const HF_API_URL =
	'https://api-inference.huggingface.co/models/bigscience/bloom';
const HF_ACCESS_TOKEN = process.env.BLOOM_ACCESS_TOKEN;

// Start interaction with Bloom
router.post('/start', async (req, res) => {
	const { prompt } = req.body;

	try {
		const response = await axios.post(
			HF_API_URL,
			{ inputs: prompt },
			{
				headers: {
					Authorization: `Bearer ${HF_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			}
		);

		const output =
			response.data?.generated_text || 'No response from model';

		res.status(200).json({
			question: output,
			helperPrompts: [
				'Think critically',
				'Provide examples',
				'Use logical reasoning',
			], // Example helper prompts
		});
	} catch (error) {
		console.error(
			'Error starting interaction:',
			error.response?.data || error.message
		);
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
			HF_API_URL,
			{ inputs: evaluationPrompt },
			{
				headers: {
					Authorization: `Bearer ${HF_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			}
		);

		const output =
			response.data?.generated_text || 'No response from model';

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
