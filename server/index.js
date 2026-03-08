require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(helmet());
const port = 3000;

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

// Set up Wasabi S3 Configuration from environment
const WASABI_REGION = process.env.WASABI_REGION || 'eu-central-2';
const WASABI_BUCKET = process.env.WASABI_BUCKET || 'catlover-media-123';

const s3Client = new S3Client({
    region: WASABI_REGION,
    endpoint: `https://s3.${WASABI_REGION}.wasabisys.com`,
    credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY,
        secretAccessKey: process.env.WASABI_SECRET_KEY
    }
});

// Endpoint for generating pre-signed URL for upload
app.post('/api/s3/presigned-url', async (req, res) => {
    const { fileName, fileType } = req.body;
    const key = `media/${Date.now()}_${fileName}`;

    try {
        const command = new PutObjectCommand({
            Bucket: WASABI_BUCKET,
            Key: key,
            ContentType: fileType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ signedUrl, key, publicUrl: `https://s3.${WASABI_REGION}.wasabisys.com/${WASABI_BUCKET}/${key}` });
    } catch (err) {
        console.error('Error generating pre-signed URL:', err);
        res.status(500).json({ error: 'Failed to generate pre-signed URL' });
    }
});

// Endpoint for deleting S3 objects
app.delete('/api/s3/delete-object', async (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.status(400).json({ error: 'Key is required' });
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: WASABI_BUCKET,
            Key: key,
        });

        await s3Client.send(command);
        res.json({ success: true, message: 'Object deleted successfully' });
    } catch (err) {
        console.error('Error deleting S3 object:', err);
        res.status(500).json({ error: 'Failed to delete S3 object' });
    }
});

// Log all requests for debugging
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });
}

function generateAccessToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function hashPassword(password) {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    return bcrypt.hash(password, saltRounds);
}

// Matrix-compatible discovery
app.get('/.well-known/matrix/client', (req, res) => {
    res.json({
        'm.homeserver': {
            base_url: 'http://localhost:3000'
        }
    });
});

// Database setup
const dbPath = path.resolve(__dirname, 'catlover.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      about TEXT,
      status TEXT,
      avatar_frame TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        db.all('PRAGMA table_info(users)', (pragmaErr, columns) => {
            if (pragmaErr) return;
            const hasPasswordHash = Array.isArray(columns) && columns.some((c) => c && c.name === 'password_hash');
            if (!hasPasswordHash) {
                db.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
            }
        });
    }
});

// Matrix-compatible endpoints
app.get(['/_matrix/client/versions', '/_matrix/client/v3/versions'], (req, res) => {
    res.json({ versions: ['r0.6.0', 'v1.1', 'v1.2'], unstable_features: {} });
});

app.get(/.*pushrules.*/, (req, res) => {
    res.json({ global: { content: [], override: [], room: [], sender: [], underride: [] } });
});

app.get(/.*capabilities.*/, (req, res) => {
    res.json({
        capabilities: {
            "m.change_password": { enabled: true },
            "m.room_versions": { default: "1", available: { "1": "stable" } }
        }
    });
});

app.get(['/_matrix/client/r0/login', '/_matrix/client/v3/login'], (req, res) => {
    res.json({ flows: [{ type: 'm.login.password' }] });
});

app.get(['/_matrix/client/r0/register', '/_matrix/client/v3/register'], (req, res) => {
    res.json({ flows: [{ stages: ['m.login.dummy'] }] });
});

app.post(['/_matrix/client/r0/register', '/_matrix/client/v3/register'], (req, res) => {
    const { username, password, auth } = req.body;
    if (!username || !password) {
        if (!auth) {
            // Initial UIA probe - MUST be 401 for Matrix clients to trigger UIA
            return res.status(401).json({
                flows: [{ stages: ['m.login.dummy'] }],
                session: 'fake_session'
            });
        }
        return res.status(400).json({ errcode: 'M_INVALID_PARAMETER', error: 'Missing username or password' });
    }

    hashPassword(password)
        .then((passwordHash) => {
            db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, passwordHash], function (err) {
                if (err) {
                    return res.status(400).json({ errcode: 'M_USER_IN_USE', error: 'Username already taken' });
                }
                res.json({
                    user_id: `@${username}:localhost:3000`,
                    access_token: generateAccessToken(),
                    home_server: 'localhost:3000',
                    device_id: 'LOCAL_DEV'
                });
            });
            return null;
        })
        .catch(() => res.status(500).json({ errcode: 'M_UNKNOWN', error: 'Registration failed' }));
});

app.post(['/_matrix/client/r0/login', '/_matrix/client/v3/login'], (req, res) => {
    const { identifier, password } = req.body;
    const username = identifier ? (identifier.user || identifier.address) : null;

    if (!username) {
        return res.status(400).json({ errcode: 'M_INVALID_PARAMETER', error: 'Missing username' });
    }

    db.get(`SELECT username, password_hash FROM users WHERE username = ?`, [username], (err, row) => {
        if (err || !row) {
            return res.status(403).json({ errcode: 'M_FORBIDDEN', error: 'Invalid username or password' });
        }

        bcrypt.compare(password || '', row.password_hash || '')
            .then((ok) => {
                if (!ok) {
                    return res.status(403).json({ errcode: 'M_FORBIDDEN', error: 'Invalid username or password' });
                }
                return res.json({
                    user_id: `@${username}:localhost:3000`,
                    access_token: generateAccessToken(),
                    home_server: 'localhost:3000',
                    device_id: 'LOCAL_DEV'
                });
            })
            .catch(() => res.status(500).json({ errcode: 'M_UNKNOWN', error: 'Login failed' }));

        return null;
    });
});

// Minimal Sync and Profile for Client Stability
app.get(['/_matrix/client/r0/sync', '/_matrix/client/v3/sync'], (req, res) => {
    res.json({
        next_batch: 's1_0',
        rooms: {
            join: {
                "!support:localhost:3000": {
                    summary: { "m.joined_member_count": 2 },
                    state: {
                        events: [
                            {
                                type: "m.room.name",
                                state_key: "",
                                content: { name: "Catlover Support" },
                                sender: "@admin:localhost:3000",
                                origin_server_ts: Date.now()
                            },
                            {
                                type: "m.room.topic",
                                state_key: "",
                                content: { topic: "Welcome to the Catlover Neon Universe!" },
                                sender: "@admin:localhost:3000",
                                origin_server_ts: Date.now()
                            },
                            {
                                type: "m.room.join_rules",
                                state_key: "",
                                content: { join_rule: "public" },
                                sender: "@admin:localhost:3000",
                                origin_server_ts: Date.now()
                            }
                        ]
                    },
                    timeline: {
                        events: [
                            {
                                type: "m.room.message",
                                content: { body: "Hey! Welcome to Catlover. How do you like the neon?", msgtype: "m.text" },
                                sender: "@admin:localhost:3000",
                                origin_server_ts: Date.now(),
                                event_id: "$msg1"
                            }
                        ],
                        prev_batch: "p1",
                        limited: false
                    },
                    ephemeral: { events: [] },
                    account_data: { events: [] }
                }
            },
            invite: {},
            leave: {}
        },
        presence: { events: [] },
        account_data: { events: [] },
        to_device: { events: [] },
        device_lists: { changed: [], left: [] }
    });
});

app.get(['/_matrix/client/r0/profile/:userId', '/_matrix/client/v3/profile/:userId'], (req, res) => {
    const userId = req.params.userId;
    const username = userId.split(':')[0].substring(1);
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err || !row) {
            return res.json({ displayname: username });
        }
        res.json({
            displayname: row.username,
            avatar_url: null,
            custom_fields: {
                about: row.about,
                status: row.status,
                avatar_frame: row.avatar_frame
            }
        });
    });
});

app.get(['/_matrix/client/r0/joined_rooms', '/_matrix/client/v3/joined_rooms'], (req, res) => {
    res.json({ joined_rooms: ["!support:localhost:3000"] });
});

app.get(['/_matrix/client/r0/pushrules', '/_matrix/client/v3/pushrules', '/_matrix/client/r0/pushrules/', '/_matrix/client/v3/pushrules/'], (req, res) => {
    res.json({ global: { content: [], override: [], room: [], sender: [], underride: [] } });
});

app.get(['/_matrix/client/r0/presence/:userId/status', '/_matrix/client/v3/presence/:userId/status'], (req, res) => {
    res.json({ presence: 'online', last_active_ago: 0 });
});

app.get(['/_matrix/client/r0/account/whoami', '/_matrix/client/v3/account/whoami'], (req, res) => {
    res.json({ user_id: '@admin:localhost:3000' });
});

app.get(['/_matrix/client/r0/account/3pid', '/_matrix/client/v3/account/3pid'], (req, res) => {
    res.json({ threepids: [] });
});

app.get(['/_matrix/client/r0/capabilities', '/_matrix/client/v3/capabilities'], (req, res) => {
    res.json({
        capabilities: {
            "m.change_password": { enabled: true },
            "m.room_versions": { default: "1", available: { "1": "stable" } }
        }
    });
});

app.get(['/_matrix/client/r0/room_keys/version', '/_matrix/client/v3/room_keys/version'], (req, res) => {
    res.status(404).json({ errcode: 'M_NOT_FOUND', error: 'No backup' });
});

app.get(['/_matrix/client/r0/voip/turnServer', '/_matrix/client/v3/voip/turnServer'], (req, res) => {
    res.json({ uris: [], ttl: 3600 });
});

app.get(['/_matrix/client/r0/user/:userId/filter/:filterId', '/_matrix/client/v3/user/:userId/filter/:filterId'], (req, res) => {
    res.json({});
});

app.post(['/_matrix/client/r0/user/:userId/filter', '/_matrix/client/v3/user/:userId/filter'], (req, res) => {
    res.json({ filter_id: 'fake_filter' });
});

app.get('/', (req, res) => {
    res.send('Catlover Backend is running!');
});

// Mock Registration for now
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

app.use('/_matrix/client', (req, res) => {
    console.log(`404 Matrix: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ errcode: 'M_NOT_FOUND', error: 'Not implemented in Catlover mock' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
