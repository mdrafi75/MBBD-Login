// ==================== MOVIE BAZAR LOGIN API ====================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'movie-bazar-secret-key-2024';

// ✅ FIXED CORS Middleware
const allowedOrigins = [
    'https://mbbd2.blogspot.com',
    'https://mb3bd.blogspot.com',
    'https://69mxxd.blogspot.com',
    'http://localhost:5500',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('🌐 Allowing origin:', origin);
            callback(null, true); // সবকিছু allow করছে
        }
    },
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ TEMPORARY DATABASE (মেমোরিতে)
let users = [];
let avatarsDB = [
    { id: 'avatar1', url: 'https://i.gifer.com/embedded/download/7VE.gif', level: 1 },
    { id: 'avatar2', url: 'https://i.pinimg.com/originals/2c/9b/7c/2c9b7c6092f8db8c90225eb29c2a8a2d.gif', level: 2 },
    { id: 'avatar3', url: 'https://media.tenor.com/4tHnQM3X7c8AAAAM/anime-smile.gif', level: 3 }
];

// ==================== API ENDPOINTS ====================

// 1. হেলথ চেক
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '✅ API Running', 
        message: 'Movie Bazar Login System',
        usersCount: users.length,
        timestamp: new Date().toISOString(),
        server: 'Render.com',
        version: '1.0.0'
    });
});

// 2. ইউজারনেম চেক
app.get('/api/check-username/:username', (req, res) => {
    const { username } = req.params;
    const existingUser = users.find(u => u.username === username);
    
    if (existingUser) {
        // কিছু suggestions দিচ্ছি
        const suggestions = [
            `${username}123`,
            `${username}_${Math.floor(Math.random() * 100)}`,
            `The_${username}`,
            `${username}${new Date().getFullYear()}`
        ];
        
        res.json({
            available: false,
            suggestions: suggestions
        });
    } else {
        res.json({
            available: true,
            suggestions: []
        });
    }
});

// 3. সাইনআপ
app.post('/api/signup', async (req, res) => {
    try {
        console.log('📝 Signup request received');
        
        const { username, email, password } = req.body;
        
        // Simple validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required' 
            });
        }
        
        // Check if user exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: 'Email already exists' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            avatar: avatarsDB[0].url,
            level: 1,
            points: 0,
            badges: ['🎬 Movie Explorer'],
            unlockedAvatars: ['avatar1'],
            favorites: [],
            downloadHistory: [],
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        // Create token
        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ User created:', newUser.username);
        
        res.json({
            success: true,
            message: 'Signup successful! 🎉',
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
        console.error('❌ Signup error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Signup failed. Please try again.' 
        });
    }
});

// 4. লগইন
app.post('/api/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body.email);
        
        const { email, password } = req.body;
        
        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }
        
        // Add points for daily login
        user.points += 2;
        
        // Create token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ Login successful:', user.username);
        
        res.json({
            success: true,
            message: 'Login successful! 🎬',
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
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed. Please try again.' 
        });
    }
});

// 5. Get user by ID
app.get('/api/user/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
        return res.status(404).json({ 
            success: false,
            error: 'User not found' 
        });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.json({
        success: true,
        user: userWithoutPassword
    });
});

// 6. Get current user (by token)
app.get('/api/user/current', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided' 
            });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('❌ Token error:', error);
        res.status(401).json({ 
            success: false,
            error: 'Invalid token' 
        });
    }
});

// 7. Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Movie Bazar Login API',
        status: '✅ Live and Running',
        endpoints: {
            health: '/api/health',
            signup: '/api/signup (POST)',
            login: '/api/login (POST)',
            checkUsername: '/api/check-username/:username'
        },
        cors: 'Enabled for all origins'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('🔥 Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== সার্ভার শুরু ====================
app.listen(PORT, () => {
    console.log(`✅ Movie Bazar API running on port ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📡 Test URL: http://localhost:${PORT}/`);
});
