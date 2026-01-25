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

// 👇 এই কোডগুলো আপনার server.js ফাইলে যোগ করবেন

// ==================== পয়েন্ট সিস্টেম ডাটাবেস ====================
let userActivities = {}; // ইন-মেমোরি স্টোরেজ

// ==================== ইউজার অ্যাক্টিভিটি মডেল ====================
function initUserActivity(userId) {
    if (!userActivities[userId]) {
        userActivities[userId] = {
            dailyLogin: { lastDate: null, streak: 0 },
            movieViews: [],
            reactions: [],
            comments: [],
            shares: [],
            lastActivity: Date.now(),
            totalPoints: 0
        };
    }
    return userActivities[userId];
}

// ==================== ডেইলি লগইন চেক ====================
function checkDailyLogin(userId) {
    const activity = initUserActivity(userId);
    const today = new Date().toDateString();
    
    if (activity.dailyLogin.lastDate !== today) {
        // স্ট্রিক চেক
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (activity.dailyLogin.lastDate === yesterday) {
            activity.dailyLogin.streak++;
        } else {
            activity.dailyLogin.streak = 1;
        }
        
        activity.dailyLogin.lastDate = today;
        
        // পয়েন্ট ক্যালকুলেশন
        let points = 1;
        if (activity.dailyLogin.streak >= 3) points = 3;
        if (activity.dailyLogin.streak >= 7) points = 7;
        if (activity.dailyLogin.streak >= 30) points = 30;
        
        return { earned: points, streak: activity.dailyLogin.streak };
    }
    return { earned: 0, streak: activity.dailyLogin.streak };
}

// ==================== নতুন API endpoints যোগ করুন ====================

// API 1: ইউজার প্রোফাইল পয়েন্ট ডাটা
app.get('/api/user/:id/points', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const activity = initUserActivity(user.id);
    const loginBonus = checkDailyLogin(user.id);
    
    // টাইটেল ক্যালকুলেশন
    const titles = [
        { min: 0, max: 50, title: '🎬 মুভি নিউবি' },
        { min: 51, max: 150, title: '🎥 ফিল্ম ফ্যান' },
        { min: 151, max: 300, title: '🎞️ সিনেপিল' },
        { min: 301, max: 500, title: '⭐ স্টার ভিউয়ার' },
        { min: 501, max: 750, title: '🌟 প্রিমিয়াম ফ্যান' },
        { min: 751, max: 1000, title: '👑 সিনেমা কিং' },
        { min: 1001, max: 1500, title: '🏆 এলিট ভিউয়ার' },
        { min: 1501, max: 2000, title: '💎 লিজেন্ডারি' }
    ];
    
    const currentTitle = titles.find(t => user.points >= t.min && user.points <= t.max)?.title || titles[0].title;
    
    res.json({
        points: user.points,
        title: currentTitle,
        dailyStreak: loginBonus.streak,
        nextTitle: titles.find(t => user.points < t.max)?.title,
        pointsNeeded: (titles.find(t => user.points < t.max)?.min || 0) - user.points,
        activities: {
            views: activity.movieViews.length,
            reactions: activity.reactions.length,
            comments: activity.comments.length,
            shares: activity.shares.length
        }
    });
});

// API 2: মুভি ভিউ ট্র্যাক
app.post('/api/activity/view', (req, res) => {
    const { userId, movieId, movieTitle } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const activity = initUserActivity(userId);
    const today = new Date().toDateString();
    
    // ডেইলি লিমিট চেক (৫ ভিউ/দিন)
    const todayViews = activity.movieViews.filter(v => v.date === today);
    if (todayViews.length >= 5) {
        return res.json({ 
            success: false, 
            message: 'Daily view limit reached',
            points: 0 
        });
    }
    
    // নতুন ভিউ যোগ
    activity.movieViews.push({
        movieId,
        movieTitle,
        date: today,
        timestamp: Date.now()
    });
    
    // পয়েন্ট যোগ
    user.points += 1;
    activity.totalPoints += 1;
    
    res.json({
        success: true,
        pointsEarned: 1,
        totalPoints: user.points,
        dailyViews: todayViews.length + 1,
        viewsLeft: 5 - (todayViews.length + 1)
    });
});

// API 3: রিঅ্যাক্ট ট্র্যাক
app.post('/api/activity/react', (req, res) => {
    const { userId, movieId, movieTitle, reactionType } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const activity = initUserActivity(userId);
    
    // একই মুভিতে একাধিক রিঅ্যাক্ট চেক
    const existingReact = activity.reactions.find(r => r.movieId === movieId);
    if (existingReact) {
        return res.json({
            success: false,
            message: 'Already reacted to this movie',
            points: 0
        });
    }
    
    // রিঅ্যাক্ট পয়েন্ট ম্যাপ
    const reactionPoints = {
        'like': 2,
        'fire': 3,
        'wow': 4,
        'masterpiece': 5
    };
    
    const points = reactionPoints[reactionType] || 2;
    
    // নতুন রিঅ্যাক্ট যোগ
    activity.reactions.push({
        movieId,
        movieTitle,
        reactionType,
        date: new Date().toDateString(),
        timestamp: Date.now(),
        pointsEarned: points
    });
    
    // পয়েন্ট যোগ
    user.points += points;
    activity.totalPoints += points;
    
    res.json({
        success: true,
        pointsEarned: points,
        totalPoints: user.points,
        reactionType,
        reactionCount: activity.reactions.length
    });
});

// API 4: কমেন্ট ট্র্যাক
app.post('/api/activity/comment', (req, res) => {
    const { userId, movieId, movieTitle, comment, wordCount } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const activity = initUserActivity(userId);
    
    // কমেন্ট পয়েন্ট ক্যালকুলেশন
    let points = 1; // বেসিক কমেন্ট
    if (wordCount >= 50) points = 3;
    
    // রেটিং থাকলে অতিরিক্ত পয়েন্ট
    if (comment.includes('⭐') || comment.match(/\d+\/10/) || comment.match(/\d+\/5/)) {
        points += 2;
    }
    
    // নতুন কমেন্ট যোগ
    const newComment = {
        id: Date.now().toString(),
        movieId,
        movieTitle,
        comment,
        wordCount,
        date: new Date().toDateString(),
        timestamp: Date.now(),
        pointsEarned: points,
        likes: 0
    };
    
    activity.comments.push(newComment);
    
    // পয়েন্ট যোগ
    user.points += points;
    activity.totalPoints += points;
    
    res.json({
        success: true,
        pointsEarned: points,
        totalPoints: user.points,
        commentId: newComment.id,
        comment: newComment
    });
});

// API 5: শেয়ার ট্র্যাক
app.post('/api/activity/share', (req, res) => {
    const { userId, movieId, movieTitle, platform } = req.body;
    const user = users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const activity = initUserActivity(userId);
    const today = new Date().toDateString();
    
    // প্ল্যাটফর্ম পয়েন্ট ম্যাপ
    const platformPoints = {
        'whatsapp': 3,
        'facebook': 4,
        'telegram': 5,
        'link': 2
    };
    
    const points = platformPoints[platform] || 2;
    
    // নতুন শেয়ার যোগ
    activity.shares.push({
        movieId,
        movieTitle,
        platform,
        date: today,
        timestamp: Date.now(),
        pointsEarned: points
    });
    
    // পয়েন্ট যোগ
    user.points += points;
    activity.totalPoints += points;
    
    res.json({
        success: true,
        pointsEarned: points,
        totalPoints: user.points,
        platform,
        shareCount: activity.shares.length
    });
});

// API 6: লিডারবোর্ড
app.get('/api/leaderboard', (req, res) => {
    const topUsers = users
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 10)
        .map(user => ({
            username: user.username,
            points: user.points || 0,
            level: user.level || 1,
            avatar: user.avatar
        }));
    
    res.json({
        success: true,
        leaderboard: topUsers,
        updated: new Date().toISOString()
    });
});

// ==================== ডাটা পারসিসটেন্স ====================

// মেমোরি ডাটা সেভ (আপনি পরবর্তীতে MongoDB/Redis যোগ করবেন)
const fs = require('fs');
const DATA_FILE = './user-data.json';

// ডাটা লোড
function loadPersistentData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            users = data.users || [];
            userActivities = data.activities || {};
            console.log(`📂 Loaded ${users.length} users and ${Object.keys(userActivities).length} activities`);
        }
    } catch (error) {
        console.error('Data load error:', error);
    }
}

// ডাটা সেভ
function savePersistentData() {
    try {
        const data = {
            users,
            activities: userActivities,
            lastSave: new Date().toISOString()
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Data saved successfully');
    } catch (error) {
        console.error('Data save error:', error);
    }
}

// ৫ মিনিট পরপর অটো সেভ
setInterval(savePersistentData, 5 * 60 * 1000);

// সার্ভার শুরুতে ডাটা লোড
loadPersistentData();

// API কল হলে ডাটা সেভ
function autoSaveAfterAPI() {
    setTimeout(savePersistentData, 1000);
}


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
