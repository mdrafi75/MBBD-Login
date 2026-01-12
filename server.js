// ==================== VS Code-এ টেস্ট করার জন্য সম্পূর্ণ কোড ====================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'movie-bazar-secret-key';

// ✅ CORS Middleware (এটাই আসল সমস্যা)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://mbbd2.blogspot.com', 'http://localhost:5500'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('❌ Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// ✅ ইন-মেমোরি ডাটাবেস (VS Code টেস্টের জন্য)
// MongoDB না থাকলেও কাজ করবে
let users = [];
let avatarsDB = [
  { id: 'avatar1', url: 'https://i.gifer.com/embedded/download/7VE.gif', level: 1, name: 'সিনেমা প্রেমী', unlocked: true },
  { id: 'avatar2', url: 'https://i.gifer.com/embedded/download/XOsX.gif', level: 1, name: 'পপকর্ন লোভী', unlocked: true },
  { id: 'avatar3', url: 'https://i.gifer.com/embedded/download/76YS.gif', level: 1, name: 'ফিল্ম ফ্যান', unlocked: true },
  { id: 'avatar4', url: 'https://i.gifer.com/embedded/download/7Kn6.gif', level: 2, name: 'মুভি এক্সপ্লোরার', unlocked: false },
  { id: 'avatar5', url: 'https://i.gifer.com/embedded/download/3T6c.gif', level: 2, name: 'হলিউড হিরো', unlocked: false },
  { id: 'avatar6', url: 'https://i.gifer.com/embedded/download/2GU.gif', level: 3, name: 'সিনেপিল', unlocked: false },
  { id: 'avatar7', url: 'https://i.gifer.com/embedded/download/3T7d.gif', level: 3, name: 'বলিউড স্টার', unlocked: false },
  { id: 'avatar8', url: 'https://i.gifer.com/embedded/download/4N0w.gif', level: 4, name: 'মুভি মাস্টার', unlocked: false },
  { id: 'avatar9', url: 'https://i.gifer.com/embedded/download/3T7e.gif', level: 5, name: 'সিনেমা কিং', unlocked: false }
];

// ✅ টেস্ট ইউজার (VS Code-এ চেক করার জন্য)
users.push({
  id: 'test123',
  username: 'testuser',
  email: 'test@example.com',
  password: bcrypt.hashSync('password123', 10),
  avatar: 'https://i.gifer.com/embedded/download/7VE.gif',
  level: 1,
  points: 50,
  badges: ['🎬 Movie Explorer'],
  unlockedAvatars: ['avatar1', 'avatar2', 'avatar3'],
  favorites: [],
  downloadHistory: [],
  createdAt: new Date()
});

// ==================== API ENDPOINTS ====================

// 1. হেলথ চেক
app.get('/api/health', (req, res) => {
  res.json({ 
    status: '✅ API Running', 
    message: 'Movie Bazar Login System',
    usersCount: users.length 
  });
});

// 2. সাইনআপ
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // ভ্যালিডেশন
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'সব ফিল্ড পূরণ করুন' });
    }
    
    // ইউনিক চেক
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? 'ইমেইল already exists' : 'ইউজারনেম already exists' 
      });
    }
    
    // পাসওয়ার্ড হ্যাশ
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // লেভেল ও পয়েন্ট ক্যালকুলেশন
    const userLevel = 1;
    const points = 0;
    
    // আনলকড অ্যাভাটার (লেভেল 1 এর জন্য)
    const unlockedAvatars = avatarsDB
      .filter(a => a.level === 1)
      .map(a => a.id);
    
    // নতুন ইউজার
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      avatar: unlockedAvatars[0] || 'avatar1',
      level: userLevel,
      points,
      badges: ['🎬 Movie Explorer'],
      unlockedAvatars,
      favorites: [],
      downloadHistory: [],
      createdAt: new Date()
    };
    
    users.push(newUser);
    
    // JWT টোকেন তৈরি
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

// 3. লগইন
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // ইউজার খুঁজুন
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'ভুল ইমেইল বা পাসওয়ার্ড' });
    }
    
    // পাসওয়ার্ড চেক
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'ভুল ইমেইল বা পাসওয়ার্ড' });
    }
    
    // JWT টোকেন
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // পয়েন্ট আপডেট (ডেইলি লগইন বোনাস)
    user.points += 2;
    
    // ব্যাজ চেক
    if (user.points >= 50 && !user.badges.includes('🎬 Movie Explorer')) {
      user.badges.push('🎬 Movie Explorer');
    }
    
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

// 4. ইউজার প্রোফাইল
app.get('/api/user/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
  }
  
  // পাসওয়ার্ড সরান
  const { password, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    user: userWithoutPassword
  });
});

// 5. অ্যাভাটার লিস্ট
app.get('/api/avatars/:userId', (req, res) => {
  const user = users.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
  }
  
  // ইউজারের লেভেল অনুযায়ী অ্যাভাটার ফিল্টার
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

// 6. অ্যাভাটার পরিবর্তন
app.post('/api/avatar/update', (req, res) => {
  try {
    const { userId, avatarId } = req.body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
    
    // অ্যাভাটার আনলকড কিনা চেক
    if (!user.unlockedAvatars.includes(avatarId)) {
      return res.status(403).json({ error: 'এই অ্যাভাটার আপনার জন্য আনলকড নয়' });
    }
    
    // অ্যাভাটার আপডেট
    const selectedAvatar = avatarsDB.find(a => a.id === avatarId);
    user.avatar = selectedAvatar.url;
    
    // পয়েন্ট যোগ (প্রথম বার অ্যাভাটার চেঞ্জ)
    if (!user.avatarHistory) user.avatarHistory = [];
    if (!user.avatarHistory.includes(avatarId)) {
      user.points += 5;
      user.avatarHistory.push(avatarId);
    }
    
    res.json({
      success: true,
      message: 'অ্যাভাটার আপডেট হয়েছে! ✨',
      newAvatar: selectedAvatar.url,
      points: user.points
    });
    
  } catch (error) {
    console.error('Avatar update error:', error);
    res.status(500).json({ error: 'অ্যাভাটার আপডেট ব্যর্থ হয়েছে' });
  }
});

// 7. মুভি ডাউনলোড (পয়েন্ট যোগ)
app.post('/api/download', (req, res) => {
  try {
    const { userId, movieId, movieTitle, quality } = req.body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
    
    // ডাউনলোড হিস্ট্রি যোগ
    user.downloadHistory.push({
      movieId,
      movieTitle,
      date: new Date(),
      quality
    });
    
    // পয়েন্ট যোগ
    let pointsEarned = 10;
    if (quality.includes('720')) pointsEarned = 15;
    if (quality.includes('1080')) pointsEarned = 20;
    
    user.points += pointsEarned;
    
    // লেভেল আপ চেক
    const newLevel = Math.floor(user.points / 50) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
      
      // নতুন অ্যাভাটার আনলক
      const newAvatars = avatarsDB
        .filter(a => a.level === newLevel)
        .map(a => a.id);
      
      user.unlockedAvatars = [...user.unlockedAvatars, ...newAvatars];
      
      // নতুন ব্যাজ
      const badgeMap = {
        2: '🎥 Movie Lover',
        3: '🎞️ Cinephile',
        4: '🏆 Movie Master',
        5: '👑 Cinema King'
      };
      
      if (badgeMap[newLevel] && !user.badges.includes(badgeMap[newLevel])) {
        user.badges.push(badgeMap[newLevel]);
      }
    }
    
    res.json({
      success: true,
      message: `ডাউনলোড সম্পূর্ণ! +${pointsEarned} পয়েন্ট`,
      points: user.points,
      level: user.level,
      badges: user.badges,
      unlockedAvatars: user.unlockedAvatars
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'ডাউনলোড ব্যর্থ হয়েছে' });
  }
});

// 8. ফেভারিট যোগ
app.post('/api/favorite', (req, res) => {
  try {
    const { userId, movieId } = req.body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    }
    
    // ফেভারিটে আছে কিনা চেক
    const isFavorite = user.favorites.includes(movieId);
    
    if (isFavorite) {
      // রিমুভ
      user.favorites = user.favorites.filter(id => id !== movieId);
      user.points -= 2;
    } else {
      // যোগ
      user.favorites.push(movieId);
      user.points += 2;
    }
    
    res.json({
      success: true,
      isFavorite: !isFavorite,
      points: user.points,
      favorites: user.favorites
    });
    
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ error: 'ফেভারিট ব্যর্থ হয়েছে' });
  }
});

// ==================== VS Code টেস্ট UI সার্ভ ====================
app.get('/test-ui', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Movie Bazar - Login System Test</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body { background: linear-gradient(135deg, #0f0c29, #302b63); color: white; }
        .test-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .api-box { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 10px; }
        .btn-test { margin: 5px; }
        .avatar-gif { width: 80px; height: 80px; border-radius: 50%; border: 3px solid #e94560; }
      </style>
    </head>
    <body>
      <div class="test-container">
        <h1 class="text-center mb-4">🎬 Movie Bazar Login System Test</h1>
        <div class="row">
          <div class="col-md-4">
            <div class="api-box">
              <h4>📡 API Health Check</h4>
              <button class="btn btn-success btn-test" onclick="testHealth()">Test API</button>
              <div id="health-result"></div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="api-box">
              <h4>📝 Signup Test</h4>
              <input class="form-control mb-2" id="signup-username" placeholder="Username">
              <input class="form-control mb-2" id="signup-email" placeholder="Email">
              <input class="form-control mb-2" id="signup-password" placeholder="Password">
              <button class="btn btn-primary btn-test" onclick="testSignup()">Signup</button>
              <div id="signup-result"></div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="api-box">
              <h4>🔐 Login Test</h4>
              <input class="form-control mb-2" id="login-email" placeholder="Email" value="test@example.com">
              <input class="form-control mb-2" id="login-password" placeholder="Password" value="password123">
              <button class="btn btn-warning btn-test" onclick="testLogin()">Login</button>
              <div id="login-result"></div>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <h4>API Base URL:</h4>
          <code>http://localhost:3000</code>
        </div>
      </div>
      
      <script>
        const API_BASE = 'http://localhost:3000';
        
        async function testHealth() {
          const res = await fetch(API_BASE + '/api/health');
          const data = await res.json();
          document.getElementById('health-result').innerHTML = 
            '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
        
        async function testSignup() {
          const username = document.getElementById('signup-username').value;
          const email = document.getElementById('signup-email').value;
          const password = document.getElementById('signup-password').value;
          
          const res = await fetch(API_BASE + '/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
          });
          
          const data = await res.json();
          document.getElementById('signup-result').innerHTML = 
            '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
        
        async function testLogin() {
          const email = document.getElementById('login-email').value;
          const password = document.getElementById('login-password').value;
          
          const res = await fetch(API_BASE + '/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          
          const data = await res.json();
          document.getElementById('login-result').innerHTML = 
            '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
      </script>
    </body>
    </html>
  `);
});

// ==================== সার্ভার শুরু ====================
app.listen(PORT, () => {
  console.log(`✅ Movie Bazar API running on http://localhost:${PORT}`);
  console.log(`📡 Test UI: http://localhost:${PORT}/test-ui`);

});
