-- MySQL dump 10.13  Distrib 9.7.1, for Win64 (x86_64)
--
-- Host: localhost    Database: fixmycampus
-- ------------------------------------------------------
-- Server version	9.7.1

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
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Electrical','Electrical equipment, lights, fans and power-related problems','active','2026-08-29 08:18:28'),(2,'Plumbing','Water pipes, leakage, drainage and plumbing problems','active','2026-08-29 08:18:28'),(3,'Furniture','Desks, chairs, tables and other furniture problems','active','2026-08-29 08:18:28'),(4,'Cleanliness','Cleaning, waste disposal and hygiene-related problems','active','2026-08-29 08:18:28'),(5,'Internet / Network','Wi-Fi, network and connectivity problems','active','2026-08-29 08:18:28'),(6,'Classroom Equipment','Projectors, boards and other classroom equipment','active','2026-08-29 08:18:28'),(7,'Washroom','Washroom-specific infrastructure and maintenance problems','active','2026-08-29 08:18:28'),(8,'Other','Problems that do not belong to the listed categories','active','2026-08-29 08:18:28');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complaint_updates`
--

DROP TABLE IF EXISTS `complaint_updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complaint_updates` (
  `update_id` int unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` int unsigned NOT NULL,
  `updated_by` int unsigned NOT NULL,
  `old_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`update_id`),
  KEY `fk_updates_complaint` (`complaint_id`),
  KEY `fk_updates_user` (`updated_by`),
  CONSTRAINT `fk_updates_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_updates_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complaint_updates`
--

LOCK TABLES `complaint_updates` WRITE;
/*!40000 ALTER TABLE `complaint_updates` DISABLE KEYS */;
INSERT INTO `complaint_updates` VALUES (1,1,1,NULL,'Submitted','Complaint submitted by student.','2026-08-29 09:51:01'),(2,2,1,NULL,'Submitted','Complaint submitted by student.','2026-08-29 10:03:40'),(3,3,1,NULL,'Submitted','Complaint submitted by student.','2026-08-29 10:05:20'),(4,4,1,NULL,'Submitted','Complaint submitted by student.','2026-08-29 10:08:26'),(5,5,2,NULL,'Submitted','Complaint submitted by student.','2026-08-29 10:22:56'),(6,3,3,'Submitted','Assigned','Complaint assigned to Maintenance Staff.','2026-09-04 11:42:23'),(7,3,4,'Assigned','In Progress','No pipes available, will fix it when the stock is available.','2026-09-05 17:39:50'),(8,3,4,'In Progress','Resolved','Pipe leakage repaired successfully after receiving the required materials.','2026-09-05 17:42:05'),(9,3,1,'Resolved','Closed','Complaint closed by the student after confirming resolution.','2026-09-05 19:07:58'),(10,4,3,'Submitted','Assigned','Complaint assigned to Maintenance Staff.','2026-09-05 19:32:54'),(11,4,4,'Assigned','In Progress','Checking the network connection and router configuration.','2026-09-05 19:34:50'),(12,4,4,'In Progress','Resolved','WiFi connection issue has been resolved successfully.','2026-09-05 19:35:08'),(13,4,1,'Resolved','Closed','Complaint closed by the student after confirming resolution.','2026-09-05 19:53:56'),(14,2,3,'Submitted','Assigned','Complaint assigned to Maintenance Staff.','2026-09-06 05:32:57'),(15,2,4,'Assigned','In Progress','Cleaning work has been started.','2026-09-06 05:35:56'),(16,2,4,'In Progress','Resolved','Cleaning work has been completed successfully.','2026-09-06 05:37:02'),(17,2,1,'Resolved','Closed','Complaint closed by the student after confirming resolution.','2026-09-06 05:40:35'),(18,5,3,'Submitted','Assigned','Complaint assigned to Maintenance Staff.','2026-09-06 09:58:55'),(19,5,4,'Assigned','In Progress','your complaint has been in progress','2026-09-06 10:01:19'),(20,5,4,'In Progress','Resolved','your complaint has been resolved','2026-09-06 10:02:01'),(21,6,2,NULL,'Submitted','Complaint submitted by student.','2026-09-06 11:39:45'),(22,7,2,NULL,'Submitted','Complaint submitted by student.','2026-09-06 11:42:07'),(23,8,2,NULL,'Submitted','Complaint submitted by student.','2026-09-06 11:47:24'),(24,8,3,'Submitted','Assigned','Complaint assigned to Maintenance Staff.','2026-09-06 11:51:17'),(25,8,4,'Assigned','In Progress','your complaint is in progress','2026-09-06 11:53:25'),(26,8,4,'In Progress','Resolved','resolved complaint','2026-09-06 11:53:36'),(27,8,2,'Resolved','Closed','Complaint closed by the student after confirming resolution.','2026-09-06 12:24:44');
/*!40000 ALTER TABLE `complaint_updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `complaints`
--

DROP TABLE IF EXISTS `complaints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `complaints` (
  `complaint_id` int unsigned NOT NULL AUTO_INCREMENT,
  `complaint_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` int unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
  `location_id` int unsigned NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('Low','Medium','High') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Medium',
  `status` enum('Submitted','Under Review','Assigned','In Progress','Resolved','Closed','Rejected','Duplicate') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Submitted',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`complaint_id`),
  UNIQUE KEY `complaint_code` (`complaint_code`),
  KEY `fk_complaints_student` (`student_id`),
  KEY `fk_complaints_category` (`category_id`),
  KEY `fk_complaints_location` (`location_id`),
  CONSTRAINT `fk_complaints_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_complaints_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `complaints`
--

LOCK TABLES `complaints` WRITE;
/*!40000 ALTER TABLE `complaints` DISABLE KEYS */;
INSERT INTO `complaints` VALUES (1,'FMC-20260829115101-906',1,2,2,'Water pipe leakage','There is continuous water leakage from the pipe near the classroom entrance. The floor becomes wet and may become unsafe for students.','High','Submitted','2026-08-29 09:51:01','2026-08-29 09:51:01',NULL,NULL),(2,'FMC-20260829120340-152',1,4,2,'cleaning the floor','haven\'t cleaned the floor properly since 2 days','High','Closed','2026-08-29 10:03:40','2026-09-06 05:40:35','2026-09-06 11:07:02','2026-09-06 11:10:35'),(3,'FMC-000003',1,2,2,'Test complaint 2','This is a test description for the newly updated code logic.','Low','Closed','2026-08-29 10:05:20','2026-09-05 19:07:58','2026-09-05 23:12:05','2026-09-06 00:37:58'),(4,'FMC-000004',1,5,7,'wifi issue','wifi not working','High','Closed','2026-08-29 10:08:26','2026-09-05 19:53:56','2026-09-06 01:05:08','2026-09-06 01:23:56'),(5,'FMC-000005',2,3,7,'broken classroom fan','broken fan in classroom since 2 days','High','Resolved','2026-08-29 10:22:56','2026-09-06 10:02:01','2026-09-06 15:32:01',NULL),(6,'FMC-000006',2,7,8,'cleaning of washrooms','the washrooms are not cleaned properly','High','Submitted','2026-09-06 11:39:45','2026-09-06 11:39:45',NULL,NULL),(7,'FMC-000007',2,1,3,'electrical problem','switch board is not working','Medium','Submitted','2026-09-06 11:42:07','2026-09-06 11:42:07',NULL,NULL),(8,'FMC-000008',2,5,1,'internet problem','wifi is not working','Medium','Closed','2026-09-06 11:47:24','2026-09-06 12:24:44','2026-09-06 17:23:36','2026-09-06 17:54:44');
/*!40000 ALTER TABLE `complaints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `feedback_id` int unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` int unsigned NOT NULL,
  `student_id` int unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  UNIQUE KEY `complaint_id` (`complaint_id`),
  KEY `fk_feedback_student` (`student_id`),
  CONSTRAINT `fk_feedback_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_feedback_rating` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
INSERT INTO `feedback` VALUES (1,3,1,5,'The complaint was resolved successfully.','2026-09-05 19:23:29'),(2,4,1,5,'The WiFi issue was resolved quickly.','2026-09-05 19:54:19'),(3,2,1,4,NULL,'2026-09-06 05:40:42'),(4,8,2,4,NULL,'2026-09-06 12:24:50');
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `location_id` int unsigned NOT NULL AUTO_INCREMENT,
  `building` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `floor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` VALUES (1,'Main Block','Ground Floor','Room 101','First year classroom area','active'),(2,'Main Block','First Floor','Room 201','Classroom area','active'),(3,'Main Block','First Floor','Room 202','Classroom area','active'),(4,'Science Block','Ground Floor','Lab 101','Science laboratory','active'),(5,'Library','Ground Floor','Reading Hall','Main reading area','active'),(6,'Administrative Block','Ground Floor','Office Area','Administrative offices','active'),(7,'Hostel Block A','Ground Floor','Common Area','Student common area','active'),(8,'Hostel Block A','Ground Floor','Washroom','Hostel washroom','active');
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `message_id` int unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` int unsigned NOT NULL,
  `sender_id` int unsigned NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`message_id`),
  KEY `fk_messages_complaint` (`complaint_id`),
  KEY `fk_messages_sender` (`sender_id`),
  CONSTRAINT `fk_messages_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,3,4,'hi','2026-09-05 18:40:10',0),(2,3,4,'hello','2026-09-05 18:45:39',0),(3,5,4,'hello may i know the details about you complaint','2026-09-06 10:01:53',0),(4,5,2,'yes','2026-09-06 10:10:53',0),(5,5,2,'Hello, I wanted to provide some more details about the complaint.','2026-09-06 10:52:00',0),(6,8,4,'hello','2026-09-06 11:53:46',0),(7,8,4,'your complaint is been resolved.','2026-09-06 11:54:30',0),(8,8,2,'thank you','2026-09-06 12:24:26',0);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `complaint_id` int unsigned DEFAULT NULL,
  `message` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `fk_notifications_user` (`user_id`),
  KEY `fk_notifications_complaint` (`complaint_id`),
  CONSTRAINT `fk_notifications_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,4,3,'A complaint has been assigned to you.',1,'2026-09-04 11:42:23'),(2,1,3,'Your complaint FMC-000003 is now In Progress.',1,'2026-09-05 17:39:50'),(3,1,3,'Your complaint FMC-000003 is now Resolved.',1,'2026-09-05 17:42:05'),(4,1,3,'New chat message for complaint FMC-000003.',1,'2026-09-05 18:40:10'),(5,1,3,'New chat message for complaint FMC-000003.',1,'2026-09-05 18:45:39'),(6,4,3,'Complaint FMC-000003 has been closed by the student.',1,'2026-09-05 19:07:58'),(7,4,4,'A complaint has been assigned to you.',1,'2026-09-05 19:32:54'),(8,1,4,'Your complaint FMC-000004 is now In Progress.',1,'2026-09-05 19:34:50'),(9,1,4,'Your complaint FMC-000004 is now Resolved.',1,'2026-09-05 19:35:08'),(10,4,4,'Complaint FMC-000004 has been closed by the student.',1,'2026-09-05 19:53:56'),(11,4,2,'A complaint has been assigned to you.',1,'2026-09-06 05:32:57'),(12,1,2,'Your complaint FMC-20260829120340-152 is now In Progress.',1,'2026-09-06 05:35:56'),(13,1,2,'Your complaint FMC-20260829120340-152 is now Resolved.',1,'2026-09-06 05:37:02'),(14,4,2,'Complaint FMC-20260829120340-152 has been closed by the student.',1,'2026-09-06 05:40:35'),(15,4,5,'A complaint has been assigned to you.',1,'2026-09-06 09:58:55'),(16,2,5,'Your complaint FMC-000005 is now In Progress.',1,'2026-09-06 10:01:19'),(17,2,5,'New chat message for complaint FMC-000005.',1,'2026-09-06 10:01:53'),(18,2,5,'Your complaint FMC-000005 is now Resolved.',1,'2026-09-06 10:02:01'),(19,4,5,'New chat message for complaint FMC-000005.',1,'2026-09-06 10:10:53'),(20,4,5,'New chat message for complaint FMC-000005.',1,'2026-09-06 10:52:00'),(21,4,8,'A complaint has been assigned to you.',1,'2026-09-06 11:51:17'),(22,2,8,'Your complaint FMC-000008 is now In Progress.',1,'2026-09-06 11:53:25'),(23,2,8,'Your complaint FMC-000008 is now Resolved.',1,'2026-09-06 11:53:36'),(24,2,8,'New chat message for complaint FMC-000008.',1,'2026-09-06 11:53:46'),(25,2,8,'New chat message for complaint FMC-000008.',1,'2026-09-06 11:54:30'),(26,4,8,'New chat message for complaint FMC-000008.',0,'2026-09-06 12:24:26'),(27,4,8,'Complaint FMC-000008 has been closed by the student.',0,'2026-09-06 12:24:44');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_assignments`
--

DROP TABLE IF EXISTS `staff_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staff_assignments` (
  `assignment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` int unsigned NOT NULL,
  `staff_id` int unsigned NOT NULL,
  `assigned_by` int unsigned NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`assignment_id`),
  KEY `fk_assignments_complaint` (`complaint_id`),
  KEY `fk_assignments_staff` (`staff_id`),
  KEY `fk_assignments_admin` (`assigned_by`),
  CONSTRAINT `fk_assignments_admin` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_assignments_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_assignments_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_assignments`
--

LOCK TABLES `staff_assignments` WRITE;
/*!40000 ALTER TABLE `staff_assignments` DISABLE KEYS */;
INSERT INTO `staff_assignments` VALUES (1,3,4,3,'2026-09-04 11:42:23',NULL),(2,4,4,3,'2026-09-05 19:32:54',NULL),(3,2,4,3,'2026-09-06 05:32:57',NULL),(4,5,4,3,'2026-09-06 09:58:55',NULL),(5,8,4,3,'2026-09-06 11:51:17',NULL);
/*!40000 ALTER TABLE `staff_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('student','staff','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Test Student','student@test.com','9876543210','$2y$10$I8A6.aPCpTGIp4/vE4iyce1Df3cVXLBYpeUZDjVd6rp1X2u6xhU2a','student','active','2026-08-29 09:36:26'),(2,'Student Two','student2@test.com','9876543210','$2y$10$1PWvzdfDzuYCybnsvEiJbe/ugMiAGHRbBfAiCGK5cK0D8.BSMhHJa','student','active','2026-08-29 10:16:15'),(3,'System Administrator','admin@fixmycampus.local','9000000000','$2y$10$vKE7S0wnjeIHYrHKTFg31uwg0cnZrEp.NAy2jl8D4u374I.DhmK1i','admin','active','2026-09-04 11:32:15'),(4,'Maintenance Staff','staff@fixmycampus.local','9000000001','$2y$10$CsZojWJ7V67MmMYrrBQIAuBmfWBj17/uF2132s0XBe2P8PFEJB.NO','staff','active','2026-09-04 11:40:50');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'fixmycampus'
--

--
-- Dumping routines for database 'fixmycampus'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-06 18:12:24
