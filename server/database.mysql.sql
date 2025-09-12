-- MySQL Database schema for AI Life Insurance Sales Trainer

-- Users table for authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Practice sessions table
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    objection_type VARCHAR(50) NOT NULL,
    duration INT NOT NULL COMMENT 'Duration in seconds',
    audio_file_path VARCHAR(500),
    transcript TEXT,
    performance_score INT CHECK (performance_score >= 0 AND performance_score <= 100),
    performance_note TEXT,
    ai_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Objection scenarios table (for future extensibility)
CREATE TABLE objection_scenarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    objection_type VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty_level INT DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 3),
    ai_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default objection scenarios
INSERT INTO objection_scenarios (objection_type, display_name, description, difficulty_level, ai_prompt) VALUES
('price', 'Price concerns - "That sounds expensive"', 'Customer objects to the cost of life insurance', 1, 
'You are a potential life insurance customer who is concerned about price. Start by saying "Hello?" then when the agent makes their pitch, object with "That sounds expensive" or similar price-related concerns. Be realistic but don''t make it too easy - ask follow-up questions about cost, compare to other expenses, etc.'),

('time', 'No time - "I''m really busy right now"', 'Customer claims they don''t have time to discuss', 1,
'You are a potential life insurance customer who is very busy. Start by saying "Hello?" then when the agent begins their pitch, interrupt with "I''m really busy right now" or similar time-related objections. Show urgency and impatience but be realistic about how a busy person might respond.'),

('coverage', 'Already have coverage - "I already have life insurance"', 'Customer claims they already have sufficient coverage', 2,
'You are a potential life insurance customer who believes they already have adequate coverage through work or existing policies. Start by saying "Hello?" then object with "I already have life insurance through work" or similar. Be prepared to discuss coverage amounts and gaps when pressed by skilled agents.'),

('think', 'Need to think - "I need to think about it"', 'Customer wants time to consider the decision', 1,
'You are a potential life insurance customer who is hesitant to make decisions quickly. Start by saying "Hello?" then when presented with options, respond with "I need to think about it" or "This is a big decision." Be vague about your real concerns and require the agent to dig deeper.'),

('spouse', 'Need spouse approval - "I need to talk to my spouse first"', 'Customer needs to consult with their partner', 2,
'You are a potential life insurance customer who makes financial decisions jointly with your spouse. Start by saying "Hello?" then object with "I need to talk to my spouse first" or "My wife/husband handles our finances." Be realistic about couple dynamics and decision-making processes.'),

('young', 'Too young - "I''m too young to worry about this"', 'Customer believes they don''t need life insurance yet', 1,
'You are a young potential life insurance customer (mid-20s to early 30s) who doesn''t see the immediate need for life insurance. Start by saying "Hello?" then object with "I''m too young for this" or "I don''t need life insurance yet." Focus on youth and perceived invincibility.'),

('research', 'Need to research - "I want to shop around first"', 'Customer wants to compare options', 2,
'You are a potential life insurance customer who wants to research and compare options. Start by saying "Hello?" then object with "I want to shop around first" or "I need to compare different companies." Be informed about the importance of shopping around and ask about competitors.');

-- User session analytics (for tracking practice patterns)
CREATE TABLE user_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    total_sessions INT DEFAULT 0,
    total_practice_time INT DEFAULT 0 COMMENT 'Total practice time in seconds',
    most_practiced_objection VARCHAR(50),
    average_session_duration DECIMAL(10,2) DEFAULT 0.0,
    last_practice_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_objection_type ON sessions(objection_type);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_users_email ON users(email);

-- View for easy analytics retrieval (MySQL compatible)
CREATE VIEW user_session_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    COALESCE(ua.total_sessions, 0) as total_sessions,
    COALESCE(ua.total_practice_time, 0) as total_practice_time,
    COALESCE(ua.most_practiced_objection, '') as most_practiced_objection,
    COALESCE(ua.average_session_duration, 0) as average_session_duration,
    ua.last_practice_date,
    (
        SELECT objection_type 
        FROM sessions s 
        WHERE s.user_id = u.id 
        GROUP BY objection_type 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
    ) as current_most_practiced
FROM users u
LEFT JOIN user_analytics ua ON u.id = ua.user_id;