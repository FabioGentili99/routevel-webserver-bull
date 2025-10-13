const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const saltRounds = 10;

// Password helpers
const hashPassword = async (password) => bcrypt.hash(password, saltRounds);
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);

// Register
const registerUser = async (username, email, password) => {
    const hashedPassword = await hashPassword(password);
    try {
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, is_admin)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, is_admin`,
            [username, email, hashedPassword, false]
        );
        return { success: true, user: result.rows[0] };
    } catch (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Username or email already exists' };
        }
        throw error;
    }
};

// Login
const loginUser = async (username, password) => {
    const result = await db.query(
        'SELECT id, username, email, password_hash, is_admin FROM users WHERE username = $1 OR email = $1',
        [username]
    );

    if (result.rows.length === 0) return { success: false, error: 'Invalid credentials' };
    const user = result.rows[0];

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return { success: false, error: 'Invalid credentials' };

    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    delete user.password_hash;

    return { success: true, user };
};

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) return next();
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session?.user?.is_admin) return next();
    res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Access Denied</title><link rel="stylesheet" href="/css/bootstrap.min.css"></head>
        <body>
            <div class="container mt-5">
                <div class="alert alert-danger">
                    <h4 class="alert-heading">Access Denied</h4>
                    <p>Admin privileges required to access this page.</p>
                    <hr>
                    <a href="/route" class="btn btn-primary">Go to User Dashboard</a>
                    <a href="/auth/logout" class="btn btn-secondary">Logout</a>
                </div>
            </div>
        </body>
        </html>
    `);
};

const attachUserToSocket = (socket, next) => {
    // Try session (browser's cookies)
    const session = socket.request.session;
    if (session?.user) {
        socket.userId = session.user.id;
        socket.username = session.user.username;
        socket.isAdmin = session.user.is_admin;
        return next();
    }

    // Fallback to JWT (Python worker)
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
                if (payload.role === 'worker' && payload.service === 'route2vel') {
                    socket.isWorker = true;
                    socket.username = 'python_worker';
                    return next();
                } 
            }catch (err) {
            console.error('JWT verification failed:', err.message);
            return next(new Error('Authentication error'));
        }
    }

    next(new Error('Authentication error'));
};

module.exports = {
    hashPassword,
    verifyPassword,
    registerUser,
    loginUser,
    isAuthenticated,
    isAdmin,
    attachUserToSocket
};
