

1. Run `docker compose up -d`
2. Register your DB connector with Debezium Connect: 

```
 curl -i -X POST -H "Accept:application/json" -H "Content-Type:application/json" http://localhost:8083/connectors/ -d @register-sqlserver.json
```

3. Run `cat sql-generator.sql | docker exec -i transactional-sqlserver-sqlserver-1 bash -c '/opt/mssql-tools18/bin/sqlcmd -U sa -P Password! -N -C'` to seed your database

4. Validate that the data is written to the Redpanda Topic

```
docker exec analytical-base-redpanda-1 rpk topic consume SqlServer
```

5. Check table SqlServer in `analytical-base` to verify that the data is written to a table