import express from 'express';
import passport from '../config/passport.js';
import User from '../models/User.js';

const router = express.Router();

const formatUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
});

const loginUser = (req, res, user) => {
    req.login(user, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not start session' });
        }
        res.json({ message: 'Logged in successfully', user: formatUser(user) });
    });
};

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });

        if (existing) {
            if (existing.googleId && !existing.password) {
                return res.status(409).json({ error: 'This email is registered with Google. Please log in with Google.' });
            }
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
        });

        console.log(`✅ New email user created: ${user.email}`);
        loginUser(req, res, user);
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Could not create account' });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ error: 'Login failed' });
        }
        if (!user) {
            return res.status(401).json({ error: info?.message || 'Invalid email or password' });
        }
        loginUser(req, res, user);
    })(req, res, next);
});

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
}));

router.get('/google/callback', (req, res, next) => {
    // Dynamically fallback to relative root '/' if FRONTEND_URL is missing 
    // This allows seamless local proxy setup and zero-config production hosting!
    const fallbackUrl = process.env.FRONTEND_URL || '/';
    
    passport.authenticate('google', { 
        failureRedirect: `${fallbackUrl.replace(/\/$/, '')}/?auth=failed` 
    })(req, res, () => {
        res.redirect(fallbackUrl);
    });
});

router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json(formatUser(req.user));
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

router.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.json({ message: 'Logged out successfully' });
        });
    });
});

export default router;