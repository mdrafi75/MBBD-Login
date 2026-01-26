const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'movie-bazar-secret-key';

// ✅ CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://mbbd2.blogspot.com', 'http://localhost:5500'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('⚠️ CORS Blocked Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==================== MOCK DATABASE ====================
let users = [];
let avatarsDB = [
    { id: 'avatar1', url: 'https://i.imgur.com/1.png', name: 'Hero', level: 1 },
    { id: 'avatar2', url: 'https://i.imgur.com/2.png', name: 'Warrior', level: 1 },
    { id: 'avatar3', url: 'https://i.imgur.com/3.png', name: 'Mage', level: 2 },
    { id: 'avatar4', url: 'https://i.imgur.com/4.png', name: 'King', level: 3 },
    { id: 'avatar5', url: 'https://i.imgur.com/5.png', name: 'Legend', level: 5 }
];

// ==================== API ENDPOINTS ====================

// 1. Root Route
app.get('/', (req, res) => {
    res.json({
        service: '🎬 Movie Bazar Login API',
        status: '✅ LIVE',
        version: '1.0.0',
        cors: 'Enabled for: ' + (process.env.ALLOWED_ORIGINS || 'mbbd2.blogspot.com'),
        endpoints: {
            health: '/api/health',
            signup: '/api/signup',
            login: '/api/login',
            user: '/api/user/:id',
            avatars: '/api/avatars/:userId'
        }
    });
});

// 2. Health Check - এটা কাজ করবে
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ API Running', 
        message: 'Movie Bazar Login System',
        timestamp: new Date().toISOString(),
        usersCount: users.length 
    });
});

// 3. Signup
app.post('/api/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
        }
        
        const existingUser = users.find(u => u.email === email || u.username === username);
        if (existingUser) {
            return res.status(400).json({ 
                error: existingUser.email === email ? 'ইমেইল already exists' : 'ইউজারনেম already exists' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            avatar: 'avatar1',
            level: 1,
            points: 0,
            badges: ['🎬 Movie Explorer'],
            unlockedAvatars: ['avatar1'],
            favorites: [],
            downloadHistory: [],
            createdAt: new Date()
        };
        
        users.push(newUser);
        
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            message: 'সাইনআপ সফল! 🎉',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                avatar: newUser.avatar,
                level: newUser.level,
                points: newUser.points,
                badges: newUser.badges,
                unlockedAvatars: newUser.unlockedAvatars
            }
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'সাইনআপ ব্যর্থ হয়েছে' });
    }
});

// 4. Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'ভুল ইমেইল বা পাসওয়ার্ড' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'ভুল ইমেইল বা পাসওয়ার্ড' });
        }
        
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        user.points += 2;
        
        res.json({
            success: true,
            message: 'লগইন সফল! 🎬',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                level: user.level,
                points: user.points,
                badges: user.badges,
                unlockedAvatars: user.unlockedAvatars
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'লগইন ব্যর্থ হয়েছে' });
    }
});

// 5. User Profile
app.get('/api/user/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json({
        success: true,
        user: userWithoutPassword
    });
});

// 6. Avatars List
app.get('/api/avatars/:userId', (req, res) => {
    const user = users.find(u => u.id === req.params.userId);
    if (!user) {
        return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
    
    const availableAvatars = avatarsDB.map(avatar => ({
        ...avatar,
        unlocked: user.unlockedAvatars.includes(avatar.id),
        isCurrent: user.avatar === avatar.id
    }));
    
    res.json({
        success: true,
        avatars: availableAvatars,
        userLevel: user.level
    });
});

// 7. Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// 8. 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: {
            root: '/',
            health: '/api/health',
            signup: 'POST /api/signup',
            login: 'POST /api/login',
            user: 'GET /api/user/:id',
            avatars: 'GET /api/avatars/:userId'
        }
    });
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`✅ Movie Bazar API running on port ${PORT}`);
    console.log(`🌐 Base URL: https://mbbd-login-rbqx.onrender.com`);
});
});

