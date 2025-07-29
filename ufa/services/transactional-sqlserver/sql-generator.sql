-- Create the sqlCDC database for demonstrating capturing data changes
CREATE DATABASE sqlCDC;
GO
USE sqlCDC;
EXEC sys.sp_cdc_enable_db;

-- Create and populate rooms
CREATE TABLE rooms (
  id INTEGER IDENTITY(101,1) NOT NULL PRIMARY KEY,
  hotel_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(512),
  total_rooms INTEGER,
  used_rooms INTEGER,
  left_rooms INTEGER
);
-- Enable CDC for the rooms table
EXEC sys.sp_cdc_enable_table @source_schema = 'dbo', @source_name = 'rooms', @role_name = NULL, @supports_net_changes = 0;
GO