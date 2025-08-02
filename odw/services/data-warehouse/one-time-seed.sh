brew install minio/stable/mc
mc alias set localminio http://localhost:9500 minioadmin minioadmin
mc mb localminio/unstructured-data
mc anonymous set public localminio/unstructured-data
mc anonymous set download localminio/unstructured-data
cd app/unstructured_data
./seed-data.py
cd ../..
echo "Seed data pipeline completed"
