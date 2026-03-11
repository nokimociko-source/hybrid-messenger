const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function generateAccessToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function hashPassword(password) {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    return bcrypt.hash(password, saltRounds);
}

// Matrix-compatible discovery
router.get('/.well-known/matrix/client', (req, res) => {
    res.json({
        'm.homeserver': {
            base_url: 'http://localhost:3000'
        }
    });
});

router.get(['/versions', '/v3/versions'], (req, res) => {
    res.json({ versions: ['r0.6.0', 'v1.1', 'v1.2'], unstable_features: {} });
});

router.get(/.*pushrules.*/, (req, res) => {
    res.json({ global: { content: [], override: [], room: [], sender: [], underride: [] } });
});

router.get(/.*capabilities.*/, (req, res) => {
    res.json({
        capabilities: {
            "m.change_password": { enabled: true },
            "m.room_versions": { default: "1", available: { "1": "stable" } }
        }
    });
});

router.get(['/r0/login', '/v3/login'], (req, res) => {
    res.json({ flows: [{ type: 'm.login.password' }] });
});

router.get(['/r0/register', '/v3/register'], (req, res) => {
    res.json({ flows: [{ stages: ['m.login.dummy'] }] });
});

router.post(['/r0/register', '/v3/register'], (req, res) => {
    const { username, password, auth } = req.body;
    if (!username || !password) {
        if (!auth) {
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

router.post(['/r0/login', '/v3/login'], (req, res) => {
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

router.get(['/r0/sync', '/v3/sync'], (req, res) => {
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

router.get(['/r0/profile/:userId', '/v3/profile/:userId'], (req, res) => {
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

router.get(['/r0/joined_rooms', '/v3/joined_rooms'], (req, res) => {
    res.json({ joined_rooms: ["!support:localhost:3000"] });
});

router.get(['/r0/presence/:userId/status', '/v3/presence/:userId/status'], (req, res) => {
    res.json({ presence: 'online', last_active_ago: 0 });
});

router.get(['/r0/account/whoami', '/v3/account/whoami'], (req, res) => {
    res.json({ user_id: '@admin:localhost:3000' });
});

router.get(['/r0/account/3pid', '/v3/account/3pid'], (req, res) => {
    res.json({ threepids: [] });
});

router.get(['/r0/room_keys/version', '/v3/room_keys/version'], (req, res) => {
    res.status(404).json({ errcode: 'M_NOT_FOUND', error: 'No backup' });
});

router.get(['/r0/voip/turnServer', '/v3/turnServer'], (req, res) => {
    res.json({ uris: [], ttl: 3600 });
});

router.get(['/r0/user/:userId/filter/:filterId', '/v3/user/:userId/filter/:filterId'], (req, res) => {
    res.json({});
});

router.post(['/r0/user/:userId/filter', '/v3/user/:userId/filter'], (req, res) => {
    res.json({ filter_id: 'fake_filter' });
});

module.exports = router;
