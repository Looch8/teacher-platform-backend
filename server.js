const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// CORS configuration
const allowedOrigins = [
	'http://localhost:5173', // Vite default development port
	'http://localhost:3000', // Alternative development port
	'https://teacher-platform-ochre.vercel.app', // Your Vercel production domain
];

app.use(
	cors({
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps or curl requests)
			if (!origin) return callback(null, true);

			if (allowedOrigins.indexOf(origin) === -1) {
				const msg =
					'The CORS policy for this site does not allow access from the specified Origin.';
				return callback(new Error(msg), false);
			}
			return callback(null, true);
		},
		credentials: true,
	})
);

app.use('/api', chatRoutes);

// Root Route
app.get('/', (req, res) => {
	res.send(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
});

// Log the environment variable to ensure it's loaded correctly
console.log(
	`OpenAI API Key Loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`
);

console.log('OpenAI API URL:', process.env.OPENAI_API_URL);
console.log(
	'OpenAI API Key Loaded:',
	process.env.OPENAI_API_KEY ? 'Yes' : 'No'
);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
