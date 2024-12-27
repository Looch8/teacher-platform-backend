const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/api', chatRoutes);

// Log the environment variable to ensure it's loaded correctly
console.log(
	`OpenAI API Key Loaded: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// TODO:

// Add credits to OpenAI usage. Credits have expires, so getting the following error when testing ENDPOINTS:
// Error evaluating response: {
// 	error: {
// 	  message: 'You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.',
// 	  type: 'insufficient_quota',
// 	  param: null,
// 	  code: 'insufficient_quota'
// 	}
//   }
