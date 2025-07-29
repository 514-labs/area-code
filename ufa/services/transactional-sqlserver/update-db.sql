USE sqlCDC;
GO
UPDATE rooms set used_rooms=2, left_rooms=4 where id=101;
GO