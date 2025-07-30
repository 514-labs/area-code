#!/usr/bin/env python3
"""
Upload memo files (text and images) to S3 bucket.
This script reads S3 configuration from moose.config.toml and uploads
all memo files to the specified S3 bucket.
"""

import os
import glob
import boto3
import toml
from botocore.exceptions import ClientError, NoCredentialsError
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_moose_config(config_path="../../moose.config.toml"):
    """
    Load S3 configuration from moose.config.toml file.
    
    Args:
        config_path (str): Path to the moose.config.toml file
        
    Returns:
        dict: S3 configuration dictionary
    """
    try:
        with open(config_path, 'r') as f:
            config = toml.load(f)
        
        s3_config = config.get('s3_config', {})
        return s3_config
    except FileNotFoundError:
        logger.error(f"Config file not found: {config_path}")
        return None
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        return None

def create_s3_client(s3_config):
    """
    Create S3 client using configuration from moose.config.toml.
    
    Args:
        s3_config (dict): S3 configuration dictionary
        
    Returns:
        boto3.client: S3 client
    """
    try:
        # Create S3 client with configuration
        s3_client = boto3.client(
            's3',
            endpoint_url=s3_config.get('endpoint_url'),
            aws_access_key_id=s3_config.get('access_key_id'),
            aws_secret_access_key=s3_config.get('secret_access_key'),
            region_name=s3_config.get('region_name'),
            config=boto3.session.Config(signature_version=s3_config.get('signature_version', 's3v4'))
        )
        
        # Test the connection
        s3_client.list_buckets()
        logger.info("Successfully connected to S3")
        return s3_client
        
    except NoCredentialsError:
        logger.error("AWS credentials not found")
        return None
    except ClientError as e:
        logger.error(f"Error connecting to S3: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error creating S3 client: {e}")
        return None

def upload_file_to_s3(s3_client, bucket_name, file_path, s3_key):
    """
    Upload a single file to S3.
    
    Args:
        s3_client: boto3 S3 client
        bucket_name (str): S3 bucket name
        file_path (str): Local file path
        s3_key (str): S3 object key
        
    Returns:
        bool: True if upload successful, False otherwise
    """
    try:
        # Determine content type based on file extension
        content_type = 'text/plain'
        if file_path.endswith('.jpg') or file_path.endswith('.jpeg'):
            content_type = 'image/jpeg'
        elif file_path.endswith('.png'):
            content_type = 'image/png'
        elif file_path.endswith('.gif'):
            content_type = 'image/gif'
        
        # Upload file
        s3_client.upload_file(
            file_path,
            bucket_name,
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
        
        logger.info(f"✓ Uploaded {file_path} -> s3://{bucket_name}/{s3_key}")
        return True
        
    except ClientError as e:
        logger.error(f"✗ Error uploading {file_path}: {e}")
        return False
    except Exception as e:
        logger.error(f"✗ Unexpected error uploading {file_path}: {e}")
        return False

def upload_memo_files():
    """
    Upload all memo files (text and images) to S3.
    """
    # Load S3 configuration
    s3_config = load_moose_config()
    if not s3_config:
        logger.error("Failed to load S3 configuration")
        return
    
    # Create S3 client
    s3_client = create_s3_client(s3_config)
    if not s3_client:
        logger.error("Failed to create S3 client")
        return
    
    bucket_name = s3_config.get('bucket_name', 'unstructured-data')
    
    # Get all memo files (both .txt and .jpg)
    memo_files = []
    memo_files.extend(glob.glob("memo_*.txt"))
    memo_files.extend(glob.glob("memo_*.jpg"))
    
    if not memo_files:
        logger.warning("No memo files found in current directory")
        return
    
    logger.info(f"Found {len(memo_files)} memo files to upload")
    
    # Upload files
    successful_uploads = 0
    failed_uploads = 0
    
    for file_path in sorted(memo_files):
        # Create S3 key (path in bucket)
        filename = os.path.basename(file_path)
        s3_key = filename
        
        # Upload file
        if upload_file_to_s3(s3_client, bucket_name, file_path, s3_key):
            successful_uploads += 1
        else:
            failed_uploads += 1
    
    # Summary
    logger.info(f"\nUpload Summary:")
    logger.info(f"Successfully uploaded: {successful_uploads} files")
    if failed_uploads > 0:
        logger.info(f"Failed uploads: {failed_uploads} files")
    
    # List uploaded files
    try:
        logger.info(f"\nListing files in s3://{bucket_name}/")
        response = s3_client.list_objects_v2(
            Bucket=bucket_name,
            MaxKeys=50  # Limit to first 50 files for display
        )
        
        if 'Contents' in response:
            for obj in response['Contents']:
                logger.info(f"  {obj['Key']} ({obj['Size']} bytes)")
        else:
            logger.info("  No files found in bucket")
            
    except Exception as e:
        logger.error(f"Error listing bucket contents: {e}")

def main():
    """
    Main function to upload memo files to S3.
    """
    logger.info("Memo Files S3 Uploader")
    logger.info("=" * 40)
    
    # Check if we're in the right directory
    if not os.path.exists("memo_0001.txt"):
        logger.warning("No memo files found in current directory")
        logger.info("Make sure you're running this script from the directory containing memo files")
        return
    
    upload_memo_files()

if __name__ == "__main__":
    main() 