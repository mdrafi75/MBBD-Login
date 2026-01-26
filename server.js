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




// ✅ CORS Pre-Flight Requests
app.options('*', cors());

// ✅ সরাসরি Render রুট
app.get('/', (req, res) => {
    res.json({
        service: 'Movie Bazar Login API',
        status: '✅ Live',
        cors: 'Enabled for: ' + (process.env.ALLOWED_ORIGINS || 'mbbd2.blogspot.com')
    });
});
// ==================== সার্ভার শুরু ====================
app.listen(PORT, () => {
  console.log(`✅ Movie Bazar API running on http://localhost:${PORT}`);
  console.log(`📡 Test UI: http://localhost:${PORT}/test-ui`);

});
