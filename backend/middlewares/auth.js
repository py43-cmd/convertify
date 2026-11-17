export const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.',
        message: 'Authentication required. Please log in.',
        code: 'AUTH_REQUIRED',
    });
};
