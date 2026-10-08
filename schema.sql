-- ==========================================================
-- AINT Database
-- ==========================================================

CREATE DATABASE IF NOT EXISTS aint_db;

USE aint_db;

-- ==========================================================
-- 1. ADMIN
-- Names match server.js: Admin, Admin_id, admin_email.
-- The permanent login code is stored as a salted hash
-- (never the plain code). The two lockout columns slow down guessing.
-- ==========================================================

CREATE TABLE IF NOT EXISTS Admin (
    Admin_id        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_email     VARCHAR(255) NOT NULL UNIQUE,
    code_hash       VARCHAR(64)  NULL,
    code_salt       VARCHAR(32)  NULL,
    failed_attempts INT          NOT NULL DEFAULT 0,
    locked_until    BIGINT       NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================================
-- 2. TESTS
-- Each test belongs to an Admin/Teacher.
-- ==========================================================

CREATE TABLE IF NOT EXISTS tests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    test_code VARCHAR(4) NOT NULL UNIQUE,
    test_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tests_admin
        FOREIGN KEY (admin_id)
        REFERENCES Admin (Admin_id)
        ON DELETE CASCADE
);


-- ==========================================================
-- 3. STUDENTS
-- ==========================================================

CREATE TABLE IF NOT EXISTS Students (
    Students_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL
);


-- ==========================================================
-- 4. TEST SCORES
-- ==========================================================

CREATE TABLE IF NOT EXISTS Test_Scores (
    Test_Scores_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    Test_id INT NOT NULL,
    Students_id INT NOT NULL,

    score_percent INT NULL,
    grading_failed TINYINT(1) NOT NULL DEFAULT 0,
    summary TEXT NULL,
    duration_seconds INT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details_json LONGTEXT NULL,
    email_sent TINYINT(1) NOT NULL DEFAULT 0,

    CONSTRAINT fk_test_scores_test
        FOREIGN KEY (Test_id)
        REFERENCES tests (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_test_scores_student
        FOREIGN KEY (Students_id)
        REFERENCES Students (Students_id)
        ON DELETE CASCADE
);


-- ==========================================================
-- 5. QUESTIONS
-- Each question belongs to a test.
-- ==========================================================

CREATE TABLE IF NOT EXISTS Questions (
    Question_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

    Test_id INT NOT NULL,

    category ENUM(
        'objective',
        'semi',
        'qualitative'
    ) NOT NULL,

    question_text VARCHAR(1000) NOT NULL,

    CONSTRAINT fk_questions_test
        FOREIGN KEY (Test_id)
        REFERENCES tests (id)
        ON DELETE CASCADE
);


-- ==========================================================
-- 6. SESSIONS
-- Keeps track of logged-in admins.
-- (The old Login_Codes table is gone: the code now lives on Admin.)
-- ==========================================================

CREATE TABLE IF NOT EXISTS Sessions (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,

    Admin_id INT NOT NULL,

    expires_at BIGINT NOT NULL,

    CONSTRAINT fk_sessions_admin
        FOREIGN KEY (Admin_id)
        REFERENCES Admin (Admin_id)
        ON DELETE CASCADE
);


-- ==========================================================
-- ALREADY CREATED THE TABLES WITH THE OLD SCRIPT?
-- "CREATE TABLE IF NOT EXISTS" won't change a table that already
-- exists, so either drop the database and re-run this whole file:
--
--     DROP DATABASE aint_db;
--
-- (only if it holds nothing you need), or fix the tables in place:
--
--     DROP TABLE IF EXISTS Login_Codes;
--     ALTER TABLE Admin
--       ADD COLUMN code_hash       VARCHAR(64) NULL,
--       ADD COLUMN code_salt       VARCHAR(32) NULL,
--       ADD COLUMN failed_attempts INT    NOT NULL DEFAULT 0,
--       ADD COLUMN locked_until    BIGINT NOT NULL DEFAULT 0;
-- ==========================================================