-- MySQL dump 10.13  Distrib 9.5.0, for macos15 (arm64)
--
-- Host: localhost    Database: aint_db
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Admin`
--

DROP TABLE IF EXISTS `Admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Admin` (
  `Admin_id` int NOT NULL AUTO_INCREMENT,
  `admin_email` varchar(255) NOT NULL,
  `code_hash` varchar(64) DEFAULT NULL,
  `code_salt` varchar(32) DEFAULT NULL,
  `failed_attempts` int NOT NULL DEFAULT '0',
  `locked_until` bigint NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Admin_id`),
  UNIQUE KEY `admin_email` (`admin_email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Questions`
--

DROP TABLE IF EXISTS `Questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Questions` (
  `Question_id` int NOT NULL AUTO_INCREMENT,
  `Test_id` int NOT NULL,
  `category` enum('objective','semi','qualitative') NOT NULL,
  `question_text` varchar(1000) NOT NULL,
  PRIMARY KEY (`Question_id`),
  KEY `fk_questions_test` (`Test_id`),
  CONSTRAINT `fk_questions_test` FOREIGN KEY (`Test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Sessions`
--

DROP TABLE IF EXISTS `Sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Sessions` (
  `token_hash` char(64) NOT NULL,
  `Admin_id` int NOT NULL,
  `expires_at` bigint NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `fk_sessions_admin` (`Admin_id`),
  CONSTRAINT `fk_sessions_admin` FOREIGN KEY (`Admin_id`) REFERENCES `Admin` (`Admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Students`
--

DROP TABLE IF EXISTS `Students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Students` (
  `Students_id` int NOT NULL AUTO_INCREMENT,
  `student_name` varchar(100) NOT NULL,
  PRIMARY KEY (`Students_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Test_Scores`
--

DROP TABLE IF EXISTS `Test_Scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Test_Scores` (
  `Test_Scores_id` int NOT NULL AUTO_INCREMENT,
  `Test_id` int NOT NULL,
  `Students_id` int NOT NULL,
  `score_percent` int DEFAULT NULL,
  `grading_failed` tinyint(1) NOT NULL DEFAULT '0',
  `summary` text,
  `duration_seconds` int DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `details_json` longtext,
  `email_sent` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`Test_Scores_id`),
  KEY `fk_test_scores_test` (`Test_id`),
  KEY `fk_test_scores_student` (`Students_id`),
  CONSTRAINT `fk_test_scores_student` FOREIGN KEY (`Students_id`) REFERENCES `Students` (`Students_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_test_scores_test` FOREIGN KEY (`Test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tests`
--

DROP TABLE IF EXISTS `tests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `test_code` varchar(4) NOT NULL,
  `test_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `grading_guidelines` text,
  `timer_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `time_limit_minutes` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `test_code` (`test_code`),
  KEY `fk_tests_admin` (`admin_id`),
  CONSTRAINT `fk_tests_admin` FOREIGN KEY (`admin_id`) REFERENCES `Admin` (`Admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-19 23:07:16

-- ==========================================
-- PROCTORING EVENTS
-- Stores exam monitoring events for AINT
-- ==========================================

CREATE TABLE IF NOT EXISTS Proctoring_Events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    exam_code VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    details TEXT,
    event_timestamp DATETIME(3) NOT NULL,
    received_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),

    INDEX idx_exam_code (exam_code),
    INDEX idx_event_timestamp (event_timestamp)
);

