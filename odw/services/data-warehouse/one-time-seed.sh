brew install minio/stable/mc
mc alias set localminio http://localhost:9500 minioadmin minioadmin
mc anonymous set public localminio/unstructured-data
mc anonymous set download localminio/unstructured-data
