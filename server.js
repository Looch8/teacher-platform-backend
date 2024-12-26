const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chatRoutes = require('./routes/chat');
require('dotenv').config(); // Load .env file at the start

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use('/api', chatRoutes);

// Log the environment variable to ensure it's loaded correctly
console.log(`Bloom Access Token: ${process.env.BLOOM_ACCESS_TOKEN}`);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
