USE sqlCDC;
GO

-- Create foo table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'foo')
BEGIN
    CREATE TABLE foo (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(1000),
        status NVARCHAR(20) CHECK (status IN ('active', 'inactive', 'pending', 'archived')),
        priority INT CHECK (priority BETWEEN 1 AND 10),
        is_active BIT DEFAULT 1,
        metadata NVARCHAR(MAX),
        tags NVARCHAR(MAX),
        score INT,
        large_text NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Create bar table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bar')
BEGIN
    CREATE TABLE bar (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        foo_id UNIQUEIDENTIFIER,
        value INT,
        label NVARCHAR(255),
        notes NVARCHAR(1000),
        is_enabled BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (foo_id) REFERENCES foo(id)
    );
END
GO

-- Enable CDC on foo table
IF NOT EXISTS (SELECT * FROM cdc.change_tables WHERE source_object_id = OBJECT_ID('dbo.foo'))
BEGIN
    EXEC sys.sp_cdc_enable_table 
        @source_schema = 'dbo', 
        @source_name = 'foo', 
        @role_name = NULL, 
        @supports_net_changes = 0;
END

-- Enable CDC on bar table  
IF NOT EXISTS (SELECT * FROM cdc.change_tables WHERE source_object_id = OBJECT_ID('dbo.bar'))
BEGIN
    EXEC sys.sp_cdc_enable_table 
        @source_schema = 'dbo', 
        @source_name = 'bar', 
        @role_name = NULL, 
        @supports_net_changes = 0;
END
GO