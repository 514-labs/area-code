

1. Run docker compose up -d 
2. Run `cat sql-generator.sql | docker exec -i transactional-sqlserver-sqlserver-1 bash -c '/opt/mssql-tools18/bin/sqlcmd -U sa -P Password! -N -C'` to seed your database