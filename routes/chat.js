const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

// OpenAI API Configuration
const OPENAI_API_URL = process.env.OPENAI_API_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Map levels to SOLO taxonomy)
// const soloLevels = [
// 	'Prestructural',
// 	'Unistructural',
// 	'Multistructural',
// 	'Relational',
// 	'Extended Abstract',
// ];

// Start interaction with OpenAI
router.post('/start', async (req, res) => {
	const { prompt, currentLevel = 'Unistructural' } = req.body;

	const fetchQuestion = async (retryCount = 0) => {
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
					max_tokens: 400,
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

			// ✅ Send the response once
			return res.status(200).json({ question: output });
		} catch (error) {
			if (error.response?.status === 429 && retryCount < 3) {
				const delay = (retryCount + 1) * 3000;
				console.warn(
					`429 Too Many Requests. Retrying in ${
						delay / 1000
					} seconds... (Attempt ${retryCount + 1})`
				);

				// 🔑 Use "return" to avoid multiple responses
				return setTimeout(() => fetchQuestion(retryCount + 1), delay);
			} else {
				console.error('Error generating question:', error.message);
				return res
					.status(500)
					.json({ error: 'Failed to generate question.' });
			}
		}
	};

	await fetchQuestion(); // Ensure proper execution
});

router.post('/evaluate', async (req, res) => {
	const { messages, initialPrompt, currentLevel } = req.body;

	if (!messages || !Array.isArray(messages)) {
		return res.status(400).json({ error: 'Invalid message format.' });
	}

	try {
		// 📝 Updated evaluation prompt with anti-repetition instructions
		const evaluationPrompt = `
You are an expert educator conducting a Socratic dialogue about ${initialPrompt}.
Current SOLO taxonomy level: ${currentLevel}.

Here is the conversation so far:
${messages
	.map(
		(msg) =>
			`${msg.sender === 'student' ? 'Student' : 'Educator'}: ${
				msg.content
			}`
	)
	.join('\n')}

Guidelines:
1. **Feedback:** Provide constructive feedback on the student's answer.
2. **Next Question:** Ask a new, more informative question without repeating previous ones.
3. **Next Level:** Indicate if the student should progress, stay at the same level, or go back.
4. Avoid asking the same or similar questions. Refer to the conversation history to guide your next question.

**Respond in this exact format:**

Feedback: [Your feedback here]  
Next Question: [Your next question here]  
Next Level: [Current or next level here]
		`;

		const formattedMessages = [
			{ role: 'system', content: evaluationPrompt },
		];

		const response = await axios.post(
			OPENAI_API_URL,
			{
				model: 'gpt-4',
				messages: formattedMessages,
				max_tokens: 500,
				temperature: 0.7,
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

		const feedbackMatch = output.match(
			/Feedback:\s*(.*?)(?=\nNext Question:|\n|$)/s
		);
		const nextQuestionMatch = output.match(
			/Next Question:\s*(.*?)(?=\nNext Level:|\n|$)/s
		);
		const nextLevelMatch = output.match(/Next Level:\s*(.*?)(?=\n|$)/s);

		const feedback = feedbackMatch
			? feedbackMatch[1].trim()
			: 'I was unable to provide feedback.';
		const nextQuestion = nextQuestionMatch
			? nextQuestionMatch[1].trim()
			: 'I was unable to generate a next question.';
		const nextLevel = nextLevelMatch
			? nextLevelMatch[1].trim()
			: currentLevel;

		res.status(200).json({
			feedback,
			nextQuestion,
			nextLevel,
		});
	} catch (error) {
		if (error.response) {
			console.error('OpenAI Error:', error.response.data);
		} else {
			console.error('Error evaluating response:', error.message);
		}

		if (error.response?.status === 429) {
			return res.status(429).json({
				error: 'Rate limit exceeded. Please wait and try again.',
			});
		}

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
