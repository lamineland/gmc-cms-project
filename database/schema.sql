-- =====================================================
-- EDUCMS DATABASE SCHEMA
-- =====================================================
-- Drop existing tables if they exist (for fresh start)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
   user_id SERIAL PRIMARY KEY,
   username VARCHAR(50) UNIQUE NOT NULL,
   email VARCHAR(100) UNIQUE NOT NULL,
   password_hash VARCHAR(255) NOT NULL,
   first_name VARCHAR(50),
   last_name VARCHAR(50),
   role VARCHAR(20) DEFAULT 'subscriber' CHECK (role IN ('admin', 'editor', 'author', 'subscriber')),
   bio TEXT,
   avatar VARCHAR(255),
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   last_login TIMESTAMP,
   is_active BOOLEAN DEFAULT true,
   email_verified BOOLEAN DEFAULT false,
   verification_token VARCHAR(255)
);
-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE categories (
   category_id SERIAL PRIMARY KEY,
   name VARCHAR(100) NOT NULL,
   slug VARCHAR(100) UNIQUE NOT NULL,
   description TEXT,
   parent_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
   display_order INTEGER DEFAULT 0,
   is_active BOOLEAN DEFAULT true,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- POSTS TABLE
-- =====================================================
CREATE TABLE posts (
   post_id SERIAL PRIMARY KEY,
   title VARCHAR(255) NOT NULL,
   slug VARCHAR(255) UNIQUE NOT NULL,
   content TEXT NOT NULL,
   excerpt TEXT,
   author_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
   category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
   status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
   featured_image VARCHAR(255),
   view_count INTEGER DEFAULT 0,
   like_count INTEGER DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   published_at TIMESTAMP,
   
   -- SEO Fields
   meta_title VARCHAR(255),
   meta_description TEXT,
   meta_keywords TEXT,
   
   -- Additional Fields
   is_featured BOOLEAN DEFAULT false,
   allow_comments BOOLEAN DEFAULT true,
   reading_time INTEGER, -- in minutes
   
   CONSTRAINT valid_published_date CHECK (
       (status = 'published' AND published_at IS NOT NULL) OR 
       (status != 'published')
   )
);
-- =====================================================
-- TAGS TABLE
-- =====================================================
CREATE TABLE tags (
   tag_id SERIAL PRIMARY KEY,
   name VARCHAR(50) UNIQUE NOT NULL,
   slug VARCHAR(50) UNIQUE NOT NULL,
   description TEXT,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- POST-TAGS RELATIONSHIP (Many-to-Many)
-- =====================================================
CREATE TABLE post_tags (
   post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
   tag_id INTEGER REFERENCES tags(tag_id) ON DELETE CASCADE,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (post_id, tag_id)
);
-- =====================================================
-- COMMENTS TABLE
-- =====================================================
CREATE TABLE comments (
   comment_id SERIAL PRIMARY KEY,
   post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
   user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
   parent_id INTEGER REFERENCES comments(comment_id) ON DELETE CASCADE,
   content TEXT NOT NULL,
   status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'trash')),
   ip_address VARCHAR(45),
   user_agent TEXT,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- MEDIA TABLE
-- =====================================================
CREATE TABLE media (
   media_id SERIAL PRIMARY KEY,
   filename VARCHAR(255) NOT NULL,
   original_name VARCHAR(255) NOT NULL,
   file_path VARCHAR(500) NOT NULL,
   file_type VARCHAR(50),
   file_size INTEGER,
   mime_type VARCHAR(100),
   uploaded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
   alt_text VARCHAR(255),
   caption TEXT,
   width INTEGER,
   height INTEGER,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE activity_log (
   log_id SERIAL PRIMARY KEY,
   user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
   action VARCHAR(100) NOT NULL,
   entity_type VARCHAR(50),
   entity_id INTEGER,
   description TEXT,
   ip_address VARCHAR(45),
   user_agent TEXT,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
-- Post indexes
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published ON posts(published_at);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_featured ON posts(is_featured);
-- Category indexes
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);
-- Comment indexes
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);
-- Tag indexes
CREATE INDEX idx_tags_slug ON tags(slug);
-- Media indexes
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_file_type ON media(file_type);
-- Activity log indexes
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);
-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';
-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================
-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active, email_verified)
VALUES 
   ('admin', 'admin@educms.com', '$2a$10$hBaEuU6EELzu59XMe/.E1OXFGR2dKdX/tNGEbJILgdvszZMXI3Dim', 'Admin', 'User', 'admin', true, true),
   ('editor', 'editor@educms.com', '$2a$10$hBaEuU6EELzu59XMe/.E1OXFGR2dKdX/tNGEbJILgdvszZMXI3Dim', 'Editor', 'User', 'editor', true, true),
   ('author', 'author@educms.com', '$2a$10$hBaEuU6EELzu59XMe/.E1OXFGR2dKdX/tNGEbJILgdvszZMXI3Dim', 'Author', 'User', 'author', true, true);
-- Insert default categories
INSERT INTO categories (name, slug, description, display_order)
VALUES 
   ('Computer Science', 'computer-science', 'Articles about computer science topics', 1),
   ('Programming', 'programming', 'Programming tutorials and guides', 2),
   ('Web Development', 'web-development', 'Web development resources', 3),
   ('Data Science', 'data-science', 'Data science and analytics', 4),
   ('Artificial Intelligence', 'artificial-intelligence', 'AI and machine learning topics', 5);
-- Insert sample tags
INSERT INTO tags (name, slug)
VALUES 
   ('JavaScript', 'javascript'),
   ('Python', 'python'),
   ('React', 'react'),
   ('Node.js', 'nodejs'),
   ('Machine Learning', 'machine-learning'),
   ('Tutorial', 'tutorial'),
   ('Beginner', 'beginner'),
   ('Advanced', 'advanced');
-- Insert sample posts
INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, published_at, is_featured, reading_time)
VALUES 
   (
       'Getting Started with React.js',
       'getting-started-with-react',
       '<h2>Introduction to React</h2><p>React is a popular JavaScript library for building user interfaces...</p>',
       'Learn the basics of React.js and start building modern web applications',
       1,
       3,
       'published',
       CURRENT_TIMESTAMP,
       true,
       10
   ),
   (
       'Python for Data Science',
       'python-for-data-science',
       '<h2>Why Python?</h2><p>Python has become the go-to language for data science...</p>',
       'Discover why Python is essential for data science work',
       1,
       4,
       'published',
       CURRENT_TIMESTAMP,
       false,
       15
   );
-- Link posts with tags
INSERT INTO post_tags (post_id, tag_id)
VALUES 
   (1, 1), -- React post -> JavaScript
   (1, 3), -- React post -> React
   (1, 6), -- React post -> Tutorial
   (2, 2), -- Python post -> Python
   (2, 5), -- Python post -> Machine Learning
   (2, 6); -- Python post -> Tutorial
-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================
-- View for post statistics
CREATE OR REPLACE VIEW post_statistics AS
SELECT 
   p.post_id,
   p.title,
   p.status,
   p.view_count,
   p.like_count,
   COUNT(DISTINCT c.comment_id) as comment_count,
   COUNT(DISTINCT pt.tag_id) as tag_count,
   u.username as author
FROM posts p
LEFT JOIN comments c ON p.post_id = c.post_id AND c.status = 'approved'
LEFT JOIN post_tags pt ON p.post_id = pt.post_id
LEFT JOIN users u ON p.author_id = u.user_id
GROUP BY p.post_id, u.username;
-- View for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
   u.user_id,
   u.username,
   u.role,
   COUNT(DISTINCT p.post_id) as total_posts,
   COUNT(DISTINCT CASE WHEN p.status = 'published' THEN p.post_id END) as published_posts,
   COUNT(DISTINCT c.comment_id) as total_comments,
   SUM(p.view_count) as total_views
FROM users u
LEFT JOIN posts p ON u.user_id = p.author_id
LEFT JOIN comments c ON u.user_id = c.user_id
GROUP BY u.user_id, u.username, u.role;
-- =====================================================
-- USEFUL FUNCTIONS
-- =====================================================
-- Function to get post count by category
CREATE OR REPLACE FUNCTION get_category_post_count(cat_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
   post_count INTEGER;
BEGIN
   SELECT COUNT(*) INTO post_count
   FROM posts
   WHERE category_id = cat_id AND status = 'published';
   RETURN post_count;
END;
$$ LANGUAGE plpgsql;
-- Function to calculate reading time based on content
CREATE OR REPLACE FUNCTION calculate_reading_time(content TEXT)
RETURNS INTEGER AS $$
DECLARE
   word_count INTEGER;
   reading_time INTEGER;
BEGIN
   -- Average reading speed: 200 words per minute
   word_count := array_length(regexp_split_to_array(content, '\s+'), 1);
   reading_time := CEIL(word_count::NUMERIC / 200);
   RETURN GREATEST(reading_time, 1); -- Minimum 1 minute
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- COMPLETED DATABASE SCHEMA

-- =====================================================
-- ADDITIONS BEYOND THE ORIGINAL SPEC
-- =====================================================
-- Content versioning: snapshot of a post every time it is edited
CREATE TABLE post_versions (
    version_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    status VARCHAR(20),
    edited_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    change_note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (post_id, version_number)
);
CREATE INDEX idx_post_versions_post ON post_versions(post_id);

-- Full-text search on posts
CREATE INDEX idx_posts_fts ON posts
    USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(content,'')));

-- Sequences were advanced past the seeded ids by inserting without explicit ids; nothing else to do.
