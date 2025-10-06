-- Create database (run this separately if needed)
CREATE DATABASE route2vel_db;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Sessions table (for persistent sessions)
CREATE TABLE sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions (expire);

-- Task status enum
CREATE TYPE task_status AS ENUM ('waiting', 'executing', 'success', 'error', 'cancelled');
CREATE TYPE task_type AS ENUM ('coordinates', 'address');

-- Tasks queue table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    job_id VARCHAR(255),
    task_type task_type NOT NULL,
    status task_status DEFAULT 'waiting',
    priority INTEGER DEFAULT 0,
    request_data JSON NOT NULL,
    result_data JSON,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    output_dir VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_user_id ON tasks (user_id);
CREATE INDEX idx_tasks_created_at ON tasks (created_at);
CREATE INDEX idx_tasks_job_id ON tasks(job_id);

-- Insert default admin user (password: admin123 - change this!)
-- Password should be hashed using bcrypt in production
INSERT INTO users (username, email, password_hash, is_admin) 
VALUES ('admin', 'admin@route2vel.com', '$2b$10$guU5Mnj.8tVBkLugiWpDIOyav7FiZ1TAFSDfkw4zL10ho1hGmE57O', TRUE);