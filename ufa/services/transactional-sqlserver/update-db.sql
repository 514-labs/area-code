USE sqlCDC;
GO
UPDATE rooms set used_rooms=10, left_rooms=10 where id=101;
GO