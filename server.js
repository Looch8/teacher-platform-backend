const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
// Allow requests from your Vercel frontend domain
app.use(
	cors({
		origin: 'https://teacher-platform-gffnc2ud7-looch8s-projects.vercel.app',
	})
);

app.use('/api', chatRoutes);

// Root Route
app.get('/', (req, res) => {
	res.send('Hello, world! Backend is running.');
});

// Log the environment variable to ensure it's loaded correctly
console.log(
	`OpenAI API Key Loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// NOTES:

// // Evaluate endpoint provides this response when feeding it this JSON data: {
//     "answer": "The capital of France is Paris.",
//     "initialPrompt": "What is the capital of France?"
// }

// {"feedback":"Based on the SOLO taxonomy, the student's answer can be evaluated as at the \"multistructural\" level. This is because the student has provided a correct response to the question without demonstrating any deeper understanding or elaboration. \n\nFeedback: Good job on correctly identifying the capital of France as Paris. To enhance your response and move to a higher level of understanding, consider providing additional information such as why Paris is the capital, its significance, or any interesting facts about the city.","nextQuestion":"Can you explain the historical significance of Paris as the capital of France and how it has influenced the country's culture and identity?"}
