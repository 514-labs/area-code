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
INSERT INTO rooms(hotel_id,name,description,total_rooms,used_rooms,left_rooms)
  VALUES ('hiltonhn','king-size','A room of king size',20,5,15);
INSERT INTO rooms(hotel_id,name,description,total_rooms,used_rooms,left_rooms)
  VALUES ('hiltonhn','queen-size','A room of queen size',40,10,30);
INSERT INTO rooms(hotel_id,name,description,total_rooms,used_rooms,left_rooms)
  VALUES ('pullmanhn','queen-size','A room of queen size',10,2,8);
INSERT INTO rooms(hotel_id,name,description,total_rooms,used_rooms,left_rooms)
  VALUES ('pullmanhn','single room','A room for single',6,1,5);
EXEC sys.sp_cdc_enable_table @source_schema = 'dbo', @source_name = 'rooms', @role_name = NULL, @supports_net_changes = 0;
GO