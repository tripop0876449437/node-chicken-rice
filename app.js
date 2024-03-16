const express = require('express');
const { readdirSync } = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const { createTables } = require('./Model/db');

const app = express();
const port = 4000;

const allowedOrigins = ['http://localhost:3000', 'https://nextjs-chickenrice-vercel.vercel.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(express.json());
app.use(morgan('dev'));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Create DataBase
createTables();

// Dynamically include routes
readdirSync('./Routes').map((file) => {
  const routePath = `./Routes/${file}`;
  try {
    const route = require(routePath);
    if (typeof route === 'function') {
      // If the required module is a function, assume it's a valid middleware
      app.use('/api', route);
      console.log(`Route ${routePath} loaded.`);
    } else {
      console.warn(`Skipping non-middleware module: ${routePath}`);
    }
  } catch (error) {
    console.error(`Error loading route: ${routePath}`, error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
