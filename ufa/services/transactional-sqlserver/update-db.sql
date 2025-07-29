USE sqlCDC;
GO

-- Test 1: INSERT (Create operation - CDC op: 'c')
INSERT INTO rooms (hotel_id, name, description, total_rooms, used_rooms, left_rooms)
VALUES ('HOTEL_001', 'Deluxe Suite 201', 'Luxury suite with ocean view', 1, 0, 1);
GO

-- Test 2: UPDATE existing room (Update operation - CDC op: 'u')
UPDATE rooms 
SET used_rooms = 10, 
    left_rooms = 10, 
    description = 'Updated: Standard room with city view'
WHERE id = 101;
GO

-- Test 3: INSERT another room to test multiple records
INSERT INTO rooms (hotel_id, name, description, total_rooms, used_rooms, left_rooms)
VALUES ('HOTEL_002', 'Standard Room 105', 'Comfortable standard room', 2, 1, 1);
GO

-- Test 4: UPDATE the newly inserted room
UPDATE rooms 
SET used_rooms = 2, 
    left_rooms = 0,
    description = 'Updated: Fully booked standard room'
WHERE name = 'Standard Room 105';
GO

-- Test 5: DELETE operation (Delete operation - CDC op: 'd')
DELETE FROM rooms WHERE name = 'Deluxe Suite 201';
GO

-- Test 6: INSERT and then immediately UPDATE to test rapid changes
INSERT INTO rooms (hotel_id, name, description, total_rooms, used_rooms, left_rooms)
VALUES ('HOTEL_003', 'Presidential Suite', 'Top-tier luxury suite', 1, 0, 1);

UPDATE rooms 
SET used_rooms = 1, 
    left_rooms = 0,
    description = 'Presidential Suite - Now occupied'
WHERE name = 'Presidential Suite';
GO

-- Test 7: Multiple operations in sequence
UPDATE rooms SET total_rooms = 25 WHERE hotel_id = 'HOTEL_002';
UPDATE rooms SET total_rooms = 30 WHERE hotel_id = 'HOTEL_002';
UPDATE rooms SET total_rooms = 35 WHERE hotel_id = 'HOTEL_002';
GO

PRINT 'CDC Pipeline Test Operations Completed';
PRINT 'Expected CDC Operations:';
PRINT '- 3 INSERTs (op: c)';
PRINT '- 6 UPDATEs (op: u)'; 
PRINT '- 1 DELETE (op: d)';
PRINT 'Total: 10 CDC events should be generated';
GO