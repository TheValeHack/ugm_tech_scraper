CREATE DATABASE IF NOT EXISTS `ugm_tech_scraper`; 
USE `ugm_tech_scraper`;

CREATE TABLE IF NOT EXISTS `dosen_dtedi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `foto` varchar(255),
  `nama` varchar(255) NOT NULL,
  `nip` VARCHAR(100),
  `nika` VARCHAR(100),
  `bidang_keahlian` VARCHAR(1000),
  `email` varchar(255),
  `social` VARCHAR(1000),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

CREATE TABLE IF NOT EXISTS `dosen_dteti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `foto` varchar(255),
  `nama` varchar(255) NOT NULL,
  `jabatan` varchar(255),
  `bidang_keahlian` VARCHAR(1000),
  `social` VARCHAR(1000),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

CREATE TABLE IF NOT EXISTS `dosen_dike` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) NOT NULL,
  `jabatan` VARCHAR(1000),
  `bidang_keahlian` VARCHAR(1000),
  `social` VARCHAR(1000),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

CREATE TABLE IF NOT EXISTS `matkul_dtedi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kode` varchar(255),
  `nama` varchar(255) NOT NULL,
  `sks` VARCHAR(100),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

CREATE TABLE IF NOT EXISTS `matkul_dteti` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kode` varchar(255),
  `nama` varchar(255) NOT NULL,
  `detail` VARCHAR(1000),
  `sks` VARCHAR(100),
  `kriteria` VARCHAR(1000),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

CREATE TABLE IF NOT EXISTS `matkul_dike` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `kode` varchar(255),
  `nama` varchar(255) NOT NULL,
  `courses` VARCHAR(500),
  `sks` VARCHAR(100),
  `prasyarat` VARCHAR(500),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

CREATE TABLE IF NOT EXISTS `last_scraped` (
  `dosen_dtedi` DATETIME,
  `dosen_dteti` DATETIME,
  `dosen_dike` DATETIME,
  `matkul_dtedi` DATETIME,
  `matkul_dteti` DATETIME,
  `matkul_dike` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=LATIN1_SWEDISH_CI;

INSERT INTO `last_scraped` (`dosen_dtedi`, `dosen_dteti`, `dosen_dike`, `matkul_dtedi`, `matkul_dteti`, `matkul_dike`) VALUES
('2023-11-07 12:00:00',
'2023-11-07 12:00:00',
'2023-11-07 12:00:00',
'2023-11-07 12:00:00',
'2023-11-07 12:00:00',
'2023-11-07 12:00:00');
