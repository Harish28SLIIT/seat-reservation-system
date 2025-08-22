-- Updated Database Schema for Seat Reservation System
-- Drop and recreate the database
DROP DATABASE IF EXISTS seat_reservation_db;
CREATE DATABASE seat_reservation_db;
USE seat_reservation_db;

-- USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- Increased size for hashed passwords
    role ENUM('admin', 'intern') NOT NULL,
    phone VARCHAR(15) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEATS TABLE
CREATE TABLE seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_number VARCHAR(10) NOT NULL UNIQUE,  -- Added UNIQUE constraint
    location VARCHAR(50) NOT NULL,            -- Increased size
    status ENUM('available', 'maintenance', 'blocked') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RESERVATIONS TABLE
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    intern_id INT NOT NULL,
    seat_id INT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intern_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
    -- Add indexes for better performance
    INDEX idx_date_time (date, start_time, end_time),
    INDEX idx_user_date (intern_id, date),
    INDEX idx_seat_date (seat_id, date)
);

-- WEBAUTHN CREDENTIALS TABLE
CREATE TABLE webauthn_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  credential_id VARBINARY(255) NOT NULL,
  public_key TEXT NOT NULL,
  counter INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert sample admin user (password will be hashed in application)
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Intern User', 'intern@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'intern');

-- SEATS: A1-A15 on Floors 1 to 5 (FIXED - consistent floor naming)
INSERT INTO seats (seat_number, location) VALUES
-- Floor 1
('A1', '1st floor'), ('A2', '1st floor'), ('A3', '1st floor'), ('A4', '1st floor'), ('A5', '1st floor'),
('A6', '1st floor'), ('A7', '1st floor'), ('A8', '1st floor'), ('A9', '1st floor'), ('A10', '1st floor'),
('A11', '1st floor'), ('A12', '1st floor'), ('A13', '1st floor'), ('A14', '1st floor'), ('A15', '1st floor'),

-- Floor 2
('B1', '2nd floor'), ('B2', '2nd floor'), ('B3', '2nd floor'), ('B4', '2nd floor'), ('B5', '2nd floor'),
('B6', '2nd floor'), ('B7', '2nd floor'), ('B8', '2nd floor'), ('B9', '2nd floor'), ('B10', '2nd floor'),
('B11', '2nd floor'), ('B12', '2nd floor'), ('B13', '2nd floor'), ('B14', '2nd floor'), ('B15', '2nd floor'),

-- Floor 3
('C1', '3rd floor'), ('C2', '3rd floor'), ('C3', '3rd floor'), ('C4', '3rd floor'), ('C5', '3rd floor'),
('C6', '3rd floor'), ('C7', '3rd floor'), ('C8', '3rd floor'), ('C9', '3rd floor'), ('C10', '3rd floor'),
('C11', '3rd floor'), ('C12', '3rd floor'), ('C13', '3rd floor'), ('C14', '3rd floor'), ('C15', '3rd floor'),

-- Floor 4
('D1', '4th floor'), ('D2', '4th floor'), ('D3', '4th floor'), ('D4', '4th floor'), ('D5', '4th floor'),
('D6', '4th floor'), ('D7', '4th floor'), ('D8', '4th floor'), ('D9', '4th floor'), ('D10', '4th floor'),
('D11', '4th floor'), ('D12', '4th floor'), ('D13', '4th floor'), ('D14', '4th floor'), ('D15', '4th floor'),

-- Floor 5
('E1', '5th floor'), ('E2', '5th floor'), ('E3', '5th floor'), ('E4', '5th floor'), ('E5', '5th floor'),
('E6', '5th floor'), ('E7', '5th floor'), ('E8', '5th floor'), ('E9', '5th floor'), ('E10', '5th floor'),
('E11', '5th floor'), ('E12', '5th floor'), ('E13', '5th floor'), ('E14', '5th floor'), ('E15', '5th floor');

-- Show sample data
SELECT 'Users created:' as Info;
SELECT id, name, email, role FROM users;

SELECT 'Seats created:' as Info;
SELECT COUNT(*) as total_seats, location FROM seats GROUP BY location;

SELECT 'Database setup complete!' as Status;
