-- Create the sqlCDC database for demonstrating capturing data changes
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'sqlCDC')
BEGIN
    CREATE DATABASE sqlCDC;
END
GO

USE sqlCDC;
GO

-- Enable CDC on database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'sqlCDC' AND is_cdc_enabled = 1)
BEGIN
    EXEC sys.sp_cdc_enable_db;
END
GO

-- Create CDC jobs
IF NOT EXISTS (SELECT * FROM msdb.dbo.sysjobs WHERE name = 'cdc.sqlCDC_capture')
BEGIN
    EXEC sys.sp_cdc_add_job @job_type = N'capture';
END

IF NOT EXISTS (SELECT * FROM msdb.dbo.sysjobs WHERE name = 'cdc.sqlCDC_cleanup')
BEGIN
    EXEC sys.sp_cdc_add_job @job_type = N'cleanup';
END

-- sa user already has sysadmin privileges, no additional grants needed
GO