const bcrypt = require('bcrypt');
const db = require('../db/database');

const saltRounds = 10;

// Hash password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, saltRounds);
};

// Verify password
const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Register new user
const registerUser = async (username, email, password) => {
    const hashedPassword = await hashPassword(password);
    
    try {
        const result = await db.query(
            'INSERT INTO users (username, email, password_hash, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, email, is_admin',
            [username, email, hashedPassword, false]
        );
        return { success: true, user: result.rows[0] };
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return { success: false, error: 'Username or email already exists' };
        }
        throw error;
    }
};

// Login user
const loginUser = async (username, password) => {
    const result = await db.query(
        'SELECT id, username, email, password_hash, is_admin FROM users WHERE username = $1 OR email = $1',
        [username]
    );
    
    if (result.rows.length === 0) {
        return { success: false, error: 'Invalid credentials' };
    }
    
    const user = result.rows[0];
    const validPassword = await verifyPassword(password, user.password_hash);
    
    if (!validPassword) {
        return { success: false, error: 'Invalid credentials' };
    }
    
    // Update last login
    await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
    );
    
    delete user.password_hash;
    return { success: true, user };
};

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.is_admin) {
        return next();
    }
    res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Access Denied</title>
            <link rel="stylesheet" href="/css/bootstrap.min.css">
        </head>
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

// Middleware to attach user to socket
const attachUserToSocket = (socket, next) => {
    const session = socket.request.session;
    if (session && session.user) {
        socket.userId = session.user.id;
        socket.username = session.user.username;
        socket.isAdmin = session.user.is_admin;
        next();
    } else {
        next(new Error('Authentication error'));
    }
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