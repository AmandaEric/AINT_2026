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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Allowed_Tabs`
--

DROP TABLE IF EXISTS `Allowed_Tabs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Allowed_Tabs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_id` int NOT NULL,
  `allowed_url` varchar(500) NOT NULL,
  `match_type` enum('EXACT','DOMAIN') NOT NULL DEFAULT 'DOMAIN',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_allowed_tab` (`test_id`,`allowed_url`),
  KEY `idx_allowed_tabs_test` (`test_id`),
  CONSTRAINT `fk_allowed_tabs_test` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Answer_Images`
--

DROP TABLE IF EXISTS `Answer_Images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Answer_Images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Test_id` int NOT NULL,
  `Question_id` int NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `data` mediumblob NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `Test_id` (`Test_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Exam_Attempts`
--

DROP TABLE IF EXISTS `Exam_Attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Exam_Attempts` (
  `attempt_id` bigint NOT NULL AUTO_INCREMENT,
  `test_code` varchar(10) NOT NULL,
  `student_name` varchar(255) NOT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `status` enum('IN_PROGRESS','SUBMITTED','ABANDONED') DEFAULT 'IN_PROGRESS',
  PRIMARY KEY (`attempt_id`),
  KEY `idx_attempt_test` (`test_code`),
  KEY `idx_attempt_student` (`student_name`),
  KEY `idx_attempts_lookup` (`test_code`,`student_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Proctoring_Events`
--

DROP TABLE IF EXISTS `Proctoring_Events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Proctoring_Events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_code` varchar(32) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `details` text,
  `event_timestamp` varchar(40) DEFAULT NULL,
  `attempt_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Question_Attachments`
--

DROP TABLE IF EXISTS `Question_Attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Question_Attachments` (
  `Question_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `data` mediumblob NOT NULL,
  PRIMARY KEY (`Question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `Question_id` int NOT NULL AUTO_INCREMENT,
  `Test_id` int NOT NULL,
  `category` enum('objective','semi','qualitative') NOT NULL,
  `question_text` varchar(1000) NOT NULL,
  `points` int NOT NULL DEFAULT '10',
  `allow_image_upload` tinyint(1) NOT NULL DEFAULT '0',
  `image` mediumtext,
  PRIMARY KEY (`Question_id`),
  KEY `fk_questions_test` (`Test_id`),
  CONSTRAINT `fk_questions_test` FOREIGN KEY (`Test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Test_Reading_Materials`
--

DROP TABLE IF EXISTS `Test_Reading_Materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Test_Reading_Materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_code` varchar(4) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL DEFAULT 'application/pdf',
  `file_data` mediumblob NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_test_material` (`test_code`),
  CONSTRAINT `fk_reading_material_test` FOREIGN KEY (`test_code`) REFERENCES `Tests` (`test_code`) ON DELETE CASCADE
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
  `max_attempts` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `test_code` (`test_code`),
  KEY `fk_tests_admin` (`admin_id`),
  CONSTRAINT `fk_tests_admin` FOREIGN KEY (`admin_id`) REFERENCES `Admin` (`Admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-04 16:05:30
