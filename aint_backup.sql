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
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '625cfe24-f02c-11f0-b71d-9efe1fa1cb17:1-239';

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
-- Dumping data for table `Admin`
--

LOCK TABLES `Admin` WRITE;
/*!40000 ALTER TABLE `Admin` DISABLE KEYS */;
INSERT INTO `Admin` VALUES (4,'amandaericson1243@gmail.com','0ef4a2b19de950638d1f66f4f9a98a3e26e2e0b10f8cd6598e80a8d7326ba20e','68264797f1bc10e22d043f5888574931',0,0,'2026-10-06 17:57:19'),(5,'eri24017@byui.edu','1876435025d6a66b959b3bd446972c96ab583d9d815243ab3e061947d95332d6','83fac49b5cdf917e290e93d4cdbc5329',0,0,'2026-10-22 04:07:31');
/*!40000 ALTER TABLE `Admin` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `Answer_Images`
--

LOCK TABLES `Answer_Images` WRITE;
/*!40000 ALTER TABLE `Answer_Images` DISABLE KEYS */;
/*!40000 ALTER TABLE `Answer_Images` ENABLE KEYS */;
UNLOCK TABLES;

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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Proctoring_Events`
--

LOCK TABLES `Proctoring_Events` WRITE;
/*!40000 ALTER TABLE `Proctoring_Events` DISABLE KEYS */;
INSERT INTO `Proctoring_Events` VALUES (1,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-10-30 15:11:40.032'),(2,'EPA3','TAB_VISIBLE','Student returned to the exam tab.','2026-10-30 15:28:54.500'),(3,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-10-30 15:29:34.975'),(4,'EPA3','TAB_VISIBLE','Student returned to the exam tab.','2026-10-30 15:29:40.175'),(5,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-10-30 15:30:49.541'),(6,'EPA3','TAB_VISIBLE','Student returned to the exam tab.','2026-10-30 15:31:26.124'),(7,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-10-30 15:31:27.995'),(8,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-10-31 23:31:23.449'),(9,'EPA3','TAB_VISIBLE','Student returned to the exam tab.','2026-11-02 00:41:24.843'),(10,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-11-02 00:41:33.602'),(11,'EPA3','TAB_VISIBLE','Student returned to the exam tab.','2026-11-02 01:26:44.080'),(12,'EPA3','TAB_HIDDEN','Student left or hid the exam tab.','2026-11-02 01:26:48.024'),(13,'EPA3','TAB_VISIBLE','Student returned to the exam tab.','2026-11-02 02:20:11.287');
/*!40000 ALTER TABLE `Proctoring_Events` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `Question_Attachments`
--

LOCK TABLES `Question_Attachments` WRITE;
/*!40000 ALTER TABLE `Question_Attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `Question_Attachments` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
INSERT INTO `questions` VALUES (1,1,'objective','3 + 4 = ?',10,0,NULL),(2,1,'semi','how to make a peanut butter and jelly sandwich?',10,0,NULL),(3,1,'qualitative','who is the best?',10,0,NULL),(4,2,'objective','What is the capital city of England?',10,0,NULL),(5,2,'objective','Which currency is used in England?',10,0,NULL),(6,2,'objective','Which famous prehistoric monument is located in Wiltshire, England?',10,0,NULL),(7,2,'objective','True or False: England is one of the four constituent countries of the United Kingdom.',10,0,NULL),(8,2,'semi','Name two famous landmarks in London and explain what each is known for.',10,0,NULL),(9,2,'semi','Why is the River Thames important to London?',10,0,NULL),(10,2,'semi','True or False: The University of Oxford is located in Scotland.',10,0,NULL),(11,2,'qualitative','How has England\'s history influenced its architecture and culture today?',10,0,NULL),(12,2,'qualitative','Imagine you are planning a three-day trip to England for someone interested in history. What places would you recommend, and why?',10,0,NULL),(13,2,'qualitative','In your opinion, what is England\'s most significant contribution to the world? Defend your answer with examples.',10,0,NULL),(14,3,'objective','What is the capital of New York?',10,0,NULL),(15,4,'objective','what is the year?',10,0,NULL),(16,4,'semi','Describe the relationship between Johnny and Ponyboy',10,0,NULL);
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `Sessions`
--

LOCK TABLES `Sessions` WRITE;
/*!40000 ALTER TABLE `Sessions` DISABLE KEYS */;
INSERT INTO `Sessions` VALUES ('14a19090463dcb1e9e94b420b7ca6a9348a37a399ecabe152a33bfcee29b01b0',4,1794094251951),('19bb8486327c7681252545741bc51e0645982ba0dd4eeeea7e08570d78ba0f79',4,1792462558782),('1a40d644ab7e43befc60e381aa5f5e44d75010294ff803076c7691113d9911d1',4,1792104335408),('1a6df3cc5228c1cc0a5e3c2a4a65e1430225425389ad1715e3253d2ab2cab40f',4,1792767237211),('2112b809b6e5291136d0d064ebb16255ce6b27dc631460c5d2c2b84aa0e6768e',4,1792464090666),('29a12edadb1fd1351af98e4730e007b676c6b7550355ec5c0a7681a7921f12c3',4,1792457526788),('2b3f8e61b61e3c43150cb62e9c77374f10d4644a90b4a8fb978a57e88756a101',4,1792456064069),('3441df4b371c84698cd68d3c7734c6ae5ce48cf68affc35f3428ffd270da2806',4,1794239139316),('36ff5cbf4365ab72067a7001d816940677521f3f3434578680c7a9a983e41795',5,1793284269834),('48d036342fda818c7fdc24d563b83d4714aa7a6751090d3642cbf68abdee1b8f',4,1791989538719),('4f5a005ade01f1a48dda80db5ffed978f506b9a0fa6b07ccf16a6c6704770e55',4,1792508106286),('55593ad3955c8b43e18d682f6ac0638a408e3dec76510a6ad9f39816b2b21191',4,1792193478905),('57a3bee831b8d5bc828aaddfdb26e47e689eaa1a87e3e9bfdc8615898598e137',4,1792197163606),('6a1f5ca76711aff8a7f34640dfccaca2def839c5281767bf26d3bd9a66cd2fd4',4,1791914250435),('7900cbd2385920f0ceda6da2adb19ab42bb04806dcf0f24249fbdd0a48081729',4,1792262487394),('7e3699b7b2ac0fad994f7e50e8f91974906658d0554e6c00885d33881891d2ba',4,1792419402989),('80b41734ccc257ca31c4600aa343034df52245d8afcf3e5c3463a0d0e44645af',4,1792162506268),('8c0c8c648fe139e0a43fea966e3dcd6cd184dd0f4b5432970e6e75eba5997a9b',4,1792024575324),('91350fadb47582b2ca2ce8425da9bfe9edcb530717838242d01bb83f1f5d7e09',4,1792457788682),('94a29f0e03f4c6886ee5bfc0ef4a5f0fb952747789366f753fc150d418a0153d',4,1792803780605),('9744eb9ab872117ce44be4490b2dd2e38acc86ab2fcff300d4f747d8330146da',4,1791993467941),('9dee3957282cb4dee7ef76515170d17b956d194001c77508bfb9781728fa6f78',5,1793296619175),('aa45c1390e85f23c5ac4134d636dc6e49425237c473d35c042abdff2d60bb76a',4,1791915768276),('b933bee17afec63fed4812cff0a4c8d1890f2c022517180fe4b834abf4b5ac50',4,1792803565544),('bcee844d638dd9b5b23dee33a8ed13e7a71658e2c5fff91c1731a5b85bde7f6d',4,1792195740081),('c5059216bbb1ec3266feedd60bcc0cc9cd194ac991d30d4784d063c84d5b192d',4,1793974475957),('d0988b3836ac0d5066586dc2b9d3544548a4e852a54504dbdef7e297dbb28d1f',4,1794238275532),('e6ce318aa8327efa9228ba6dac4e2ec24bf5d456727ae0b132c2a2c9e349f420',4,1792195135727),('ef3339fb32824eb1fff5988404de8e04e59aebaeceaa4744a10d6c365ae66477',5,1793288093236);
/*!40000 ALTER TABLE `Sessions` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `Students`
--

LOCK TABLES `Students` WRITE;
/*!40000 ALTER TABLE `Students` DISABLE KEYS */;
INSERT INTO `Students` VALUES (1,'amanda'),(2,'Dan');
/*!40000 ALTER TABLE `Students` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `Test_Scores`
--

LOCK TABLES `Test_Scores` WRITE;
/*!40000 ALTER TABLE `Test_Scores` DISABLE KEYS */;
INSERT INTO `Test_Scores` VALUES (1,1,1,NULL,1,NULL,206,'2026-10-07 21:12:06','[{\"category\":\"objective\",\"question\":\"3 + 4 = ?\",\"exchanges\":[{\"question\":\"3 + 4 = ?\",\"answer\":\"7\"}]},{\"category\":\"objective\",\"question\":\"3 + 4 = ?\",\"exchanges\":[]},{\"category\":\"semi\",\"question\":\"how to make a peanut butter and jelly sandwich?\",\"exchanges\":[{\"question\":\"how to make a peanut butter and jelly sandwich?\",\"answer\":\"you take  the  bread  and put peanut butter on one side spread evenly and on the other piece of bread spread the chili  evenly  and put the two pieces spread side together.\"}]},{\"category\":\"qualitative\",\"question\":\"who is the best?\",\"exchanges\":[]}]',1),(2,3,2,NULL,1,NULL,124,'2026-10-22 08:35:24','[{\"category\":\"objective\",\"question\":\"What is the capital of New York?\",\"exchanges\":[]}]',1);
/*!40000 ALTER TABLE `Test_Scores` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tests`
--

LOCK TABLES `tests` WRITE;
/*!40000 ALTER TABLE `tests` DISABLE KEYS */;
INSERT INTO `tests` VALUES (1,4,'5WGZ',NULL,'2026-10-06 17:57:35',NULL,0,NULL),(2,4,'AF35','England','2026-10-12 14:27:33',NULL,0,NULL),(3,5,'QX9W','Test the voice','2026-10-22 14:32:01',NULL,0,NULL),(4,4,'EPA3','Testing Test','2026-10-30 14:16:16',NULL,0,NULL);
/*!40000 ALTER TABLE `tests` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-02  9:12:10
