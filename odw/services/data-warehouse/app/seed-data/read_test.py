import boto3
from botocore.client import Config
import fnmatch
import io

# MinIO connection configuration
MINIO_ENDPOINT = "http://localhost:9500"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin"
BUCKET_NAME = "unstructured-data"
PATTERN = "memo_*.txt"

# Create S3 client
s3 = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1"
)

def list_matching_objects(bucket, pattern):
    paginator = s3.get_paginator("list_objects_v2")
    page_iterator = paginator.paginate(Bucket=bucket)

    for page in page_iterator:
        for obj in page.get("Contents", []):
            if fnmatch.fnmatch(obj["Key"], pattern):
                yield obj["Key"]

def read_file(bucket, key):
    response = s3.get_object(Bucket=bucket, Key=key)
    content = response["Body"].read().decode("utf-8")
    return content

def main():
    print(f"Reading files from bucket: {BUCKET_NAME} with pattern: {PATTERN}\n")
    for key in list_matching_objects(BUCKET_NAME, PATTERN):
        print(f"--- {key} ---")
        content = read_file(BUCKET_NAME, key)
        print(content)
        print()

if __name__ == "__main__":
    main()