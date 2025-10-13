const express = require('express');
const router = express.Router();
const path = require('path');
const { registerUser, loginUser } = require('../middleware/auth');

router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/route');
    }
    res.sendFile(path.join(__dirname, '..', '..', 'static', 'login.html'));
});

router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/route');
    }
    res.sendFile(path.join(__dirname, '..', '..', 'static', 'register.html'));
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await loginUser(username, password);

        if (!result.success) {
            return res.status(401).json({ success: false, error: result.error });
        }

        // Save user and token in the session
        req.session.user = result.user;

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ success: false, error: 'Session error' });
            }

            // Redirect based on user role
            const redirectUrl = result.user.is_admin ? '/admin' : '/route';

            res.json({
                success: true,
                redirect: redirectUrl,
                user: result.user
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


// Handle registration
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        const result = await registerUser(username, email, password);
        
        if (result.success) {
            req.session.user = result.user;
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ success: false, error: 'Session error' });
                }
                res.json({ success: true, redirect: '/route', user: result.user  });
            });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

router.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ success: false, error: 'Not authenticated' });
    }
});

module.exports = router;