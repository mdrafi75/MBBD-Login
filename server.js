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
// ✅ নতুন লেভেল সিস্টেম (পুরানো avatarsDB এর জায়গায় এটা বসান)
const levels = [
    {
        level: 1,
        name: "🎬 Novice Explorer",
        pointsNeeded: 0,
        description: "Just starting your movie journey",
        avatars: [
            'https://i.ibb.co.com/twmPncy7/photo-2026-01-25-00-02-27.jpg',
            'https://i.ibb.co.com/qMQxrpKK/photo-2026-01-25-00-02-29.jpg',
            'https://i.ibb.co.com/84PSC5hp/photo-2026-01-25-00-02-30.jpg',
            'https://i.ibb.co.com/XxHLvYYG/photo-2026-01-25-00-02-32.jpg',
            'https://i.ibb.co.com/qYc1jNy4/photo-2026-01-25-00-02-37.jpg',
            'https://i.ibb.co.com/84Y5QBf0/photo-2026-01-25-00-02-39.jpg'
        ]
    },
    {
        level: 2,
        name: "🎥 Movie Enthusiast",
        pointsNeeded: 200,
        description: "Building your movie collection",
        avatars: [
            'https://i.ibb.co.com/Y4CdXcP2/photo-2026-01-25-00-02-52.jpg',
            'https://i.ibb.co.com/bjn3MyhB/photo-2026-01-25-00-03-04.jpg',
            'https://i.ibb.co.com/C3f4kzqC/photo-2026-01-25-00-03-09.jpg',
            'https://i.ibb.co.com/BKGTg1HV/photo-2026-01-25-00-03-16.jpg',
            'https://i.ibb.co.com/F46FQ47d/photo-2026-01-25-00-03-19.jpg',
            'https://i.ibb.co.com/fd5r0KDn/photo-2026-01-25-00-03-21.jpg',
            'https://i.ibb.co.com/KjgKBYXx/photo-2026-01-25-00-03-23.jpg'
        ]
    },
    {
        level: 3,
        name: "🏆 Cinema Expert",
        pointsNeeded: 450,
        description: "You know your movies well",
        avatars: [
            'https://i.ibb.co.com/v4J1ZVMH/photo-2026-01-25-00-02-57.jpg',
            'https://i.ibb.co.com/WW004nwd/photo-2026-01-25-00-02-58.jpg',
            'https://i.ibb.co.com/HfmTx4JV/photo-2026-01-25-00-03-07.jpg',
            'https://i.ibb.co.com/BV5hsvFP/photo-2026-01-25-00-03-11.jpg',
            'https://i.ibb.co.com/fdyF8SVz/photo-2026-01-25-00-03-13.jpg',
            'https://i.ibb.co.com/60RPhKbN/photo-2026-01-25-00-03-14.jpg'
        ]
    },
    {
        level: 4,
        name: "👑 Film Master",
        pointsNeeded: 700,
        description: "Master of all cinema genres",
        avatars: [
            'https://i.ibb.co.com/Y7q2NYxJ/photo-2026-01-25-00-02-40.jpg',
            'https://i.ibb.co.com/zT15XGRQ/photo-2026-01-25-00-02-42.jpg',
            'https://i.ibb.co.com/xKBYY7FJ/photo-2026-01-25-00-02-44.jpg',
            'https://i.ibb.co.com/VcDW7np0/photo-2026-01-25-00-02-47.jpg',
            'https://i.ibb.co.com/S79RnZs7/photo-2026-01-25-00-02-50.jpg',
            'https://i.ibb.co.com/zTCNG9Yt/photo-2026-01-25-00-02-53.jpg',
            'https://i.ibb.co.com/qFL3PWgh/photo-2026-01-25-00-02-55.jpg',
            'https://i.ibb.co.com/kVdntYyS/photo-2026-01-25-00-03-01.jpg'
        ]
    }
];

// ✅ লেভেল চেক করার ফাংশন
function getUserLevel(points) {
    for (let i = levels.length - 1; i >= 0; i--) {
        if (points >= levels[i].pointsNeeded) {
            return levels[i];
        }
    }
    return levels[0];
}

// ✅ আনলক করা অ্যাভাটার দেখার ফাংশন
function getUnlockedAvatars(points) {
    const userLevel = getUserLevel(points);
    const unlocked = [];
    
    for (let level of levels) {
        if (points >= level.pointsNeeded) {
            unlocked.push(...level.avatars);
        }
    }
    
    const nextLevel = levels.find(l => l.pointsNeeded > userLevel.pointsNeeded);
    const progress = nextLevel 
        ? ((points - userLevel.pointsNeeded) / (nextLevel.pointsNeeded - userLevel.pointsNeeded)) * 100
        : 100;
    
    return {
        currentLevel: userLevel,
        unlockedAvatars: unlocked,
        nextLevel: nextLevel,
        progress: progress
    };
}

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
        // ✅ নতুন কোড (পুরানো কোডের জায়গায় এটা বসান):
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            avatar: levels[0].avatars[0], // ✅ levels ব্যবহার করুন
            level: 1,
            points: 0,
            badges: ['🎬 Movie Explorer'],
            unlockedAvatars: levels[0].avatars, // ✅ levels ব্যবহার করুন
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

// ✅ নতুন API ১: সব লেভেলের তথ্য দেখাবে
app.get('/api/levels', (req, res) => {
    res.json({
        success: true,
        levels: levels,
        maxLevelPoints: 1000
    });
});

// ✅ নতুন API ২: ইউজারের লেভেল প্রগ্রেস দেখাবে
app.get('/api/user/level-progress', (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token');
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === decoded.userId);
        
        if (!user) throw new Error('User not found');
        
        const levelInfo = getUnlockedAvatars(user.points);
        
        res.json({
            success: true,
            currentLevel: levelInfo.currentLevel,
            unlockedAvatars: levelInfo.unlockedAvatars,
            nextLevel: levelInfo.nextLevel,
            progress: levelInfo.progress,
            totalPoints: user.points
        });
        
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
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


