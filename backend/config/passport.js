import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/User.js';

passport.use(new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

            if (!user || !user.password) {
                return done(null, false, { message: 'Invalid email or password' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Invalid email or password' });
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: 'http://localhost:3000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                const email = profile.emails[0].value.toLowerCase();
                user = await User.findOne({ email });

                if (user) {
                    user.googleId = profile.id;
                    if (!user.avatar && profile.photos?.[0]?.value) {
                        user.avatar = profile.photos[0].value;
                    }
                    await user.save();
                    console.log(`✅ Linked Google account for: ${user.email}`);
                } else {
                    user = await User.create({
                        googleId: profile.id,
                        email,
                        name: profile.displayName,
                        avatar: profile.photos[0]?.value || '',
                    });
                    console.log(`✅ New user created: ${user.email}`);
                }
            } else {
                console.log(`✅ Existing user logged in: ${user.email}`);
            }

            return done(null, user);
        } catch (err) {
            console.error('❌ Passport Google Strategy Error:', err.message);
            return done(err, null);
        }
    }));
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
