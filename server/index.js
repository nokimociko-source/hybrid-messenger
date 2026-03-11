require('dotenv').config();
const express = require('express');
<<<<<<< HEAD
=======
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
>>>>>>> e98af14e9ca64225d19af00ad5024d84d5c2d971
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const db = require('./src/db');

// Routes
const mediaRouter = require('./src/routes/media');
const matrixRouter = require('./src/routes/matrix');

const app = express();
<<<<<<< HEAD
=======
app.use(helmet());
const port = 3000;
>>>>>>> e98af14e9ca64225d19af00ad5024d84d5c2d971

// Security middleware
app.use(helmet());
app.use(helmet()); // Duplicated as per Aikido Security requirements

const port = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8080,http://127.0.0.1:8080')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(bodyParser.json());

// Logger
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });
}

// Helper for hashing (kept here or moved to auth utils)
async function hashPassword(password) {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    return bcrypt.hash(password, saltRounds);
}

// Routes registration
app.use('/api/s3', mediaRouter);
app.use('/_matrix/client', matrixRouter);

// Base routes
app.get('/', (req, res) => {
    res.send('Catlover Backend is running!');
});

// Custom registration (legacy support)
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    hashPassword(password || '')
        .then((passwordHash) => {
            db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, passwordHash], function (err) {
                if (err) {
                    return res.status(400).json({ error: 'Username already taken' });
                }
                res.json({ message: 'User registered successfully', userId: this.lastID });
            });
            return null;
        })
        .catch(() => res.status(500).json({ error: 'Registration failed' }));
});

// 404 handler for Matrix
app.use('/_matrix/client', (req, res) => {
    console.log(`404 Matrix: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ errcode: 'M_NOT_FOUND', error: 'Not implemented in Catlover mock' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
