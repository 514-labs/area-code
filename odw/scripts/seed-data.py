#!/usr/bin/env python3
"""
Complete seed data pipeline for memo generation, image conversion, and S3 upload.

This script combines three operations:
1. Generate 1000 professional, varied memo text files
2. Convert memo text files to JPEG images  
3. Upload both text and image files to S3
4. Clean up local files after successful upload

Usage:
    python seed-data.py
"""

import os
import glob
import random
import logging
import toml
import boto3
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont
import textwrap
from botocore.exceptions import ClientError, NoCredentialsError

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================================
# MEMO GENERATION CONSTANTS AND FUNCTIONS
# ============================================================================

DOCTOR_NAMES = [
    "Dr. Anderson", "Dr. Brown", "Dr. Carter", "Dr. Davis", "Dr. Evans",
    "Dr. Foster", "Dr. Garcia", "Dr. Harris", "Dr. Johnson", "Dr. Kelly",
    "Dr. Lewis", "Dr. Martinez", "Dr. Nelson", "Dr. Parker", "Dr. Roberts",
    "Dr. Smith", "Dr. Taylor", "Dr. Warren", "Dr. Wilson", "Dr. Young",
    "Dr. Allen", "Dr. Baker", "Dr. Clark", "Dr. Cooper", "Dr. Edwards",
    "Dr. Fisher", "Dr. Green", "Dr. Hall", "Dr. Jackson", "Dr. King"
]

FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Helen", "Mark", "Sandra", "Donald", "Donna",
    "Steven", "Carol", "Paul", "Ruth", "Andrew", "Sharon", "Joshua", "Michelle",
    "Kenneth", "Laura", "Kevin", "Sarah", "Brian", "Kimberly", "George", "Deborah",
    "Timothy", "Dorothy", "Ronald", "Lisa", "Jason", "Nancy", "Edward", "Karen",
    "Jeffrey", "Betty", "Ryan", "Helen", "Jacob", "Sandra", "Gary", "Donna"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas",
    "Taylor", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris",
    "Sanchez", "Clark", "Lewis", "Robinson", "Walker", "Young", "Allen", "King"
]

PROCEDURES = [
    "dental surgery", "wisdom tooth extraction", "root canal procedure", 
    "crown placement", "tooth implant surgery", "gum surgery", "oral biopsy",
    "orthodontic consultation", "teeth cleaning and filling", "bridge installation",
    "impacted molar extraction", "cavity filling procedure", "periodontal treatment",
    "emergency dental repair", "cosmetic dental work", "jaw surgery consultation",
    "oral examination", "tooth extraction", "dental implant consultation",
    "endodontic treatment", "oral surgery procedure", "dental restoration work"
]

RECEPTIONIST_NAMES = [
    "Sarah", "Lisa", "Maria", "Jennifer", "Rebecca", "Amy", "Michelle", 
    "Rachel", "Amanda", "Jessica", "Lauren", "Nicole", "Stephanie",
    "Reception", "Front Desk", "Administrative Assistant"
]

def random_phone():
    """Generate professional phone number formats."""
    formats = [
        f"(555) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
        f"555-{random.randint(200, 999)}-{random.randint(1000, 9999)}",
        f"555.{random.randint(200, 999)}.{random.randint(1000, 9999)}",
        f"(555) {random.randint(200, 999)}-{random.randint(1000, 9999)} ext. {random.randint(10, 99)}",
    ]
    return random.choice(formats)

def random_date():
    """Generate professional date formats."""
    base_date = datetime.now()
    future_date = base_date + timedelta(days=random.randint(1, 60))
    
    formats = [
        future_date.strftime("%A, %B %d, %Y"),
        future_date.strftime("%B %d, %Y"),
        future_date.strftime("%m/%d/%Y"),
        future_date.strftime("%A, %B %d"),
        future_date.strftime("%B %d"),
        f"next {future_date.strftime('%A')}, {future_date.strftime('%B %d')}",
        future_date.strftime("%A the %d of %B"),
    ]
    return random.choice(formats)

def random_time():
    """Generate professional time formats."""
    hours = list(range(8, 17))
    minutes = [0, 15, 30, 45]
    hour = random.choice(hours)
    minute = random.choice(minutes)
    
    if hour < 12:
        formats = [
            f"{hour}:{minute:02d} AM",
            f"{hour}:{minute:02d} in the morning",
            f"{hour}:{minute:02d}AM",
        ]
    elif hour == 12:
        formats = [
            f"12:{minute:02d} PM",
            f"12:{minute:02d} noon" if minute == 0 else f"12:{minute:02d} PM",
        ]
    else:
        pm_hour = hour - 12
        formats = [
            f"{pm_hour}:{minute:02d} PM",
            f"{pm_hour}:{minute:02d} in the afternoon",
            f"{pm_hour}:{minute:02d}PM",
        ]
    
    return random.choice(formats)

def random_memo_date():
    """Generate memo date."""
    base_date = datetime.now()
    memo_date = base_date + timedelta(days=random.randint(-3, 3))
    return memo_date.strftime("%B %d, %Y")

def generate_professional_memo():
    """Generate a professional memo with varied information ordering."""
    
    # Essential information that must be included
    data = {
        'doctor': random.choice(DOCTOR_NAMES),
        'patient_name': f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
        'age': random.randint(18, 80),
        'phone': random_phone(),
        'date': random_date(),
        'time': random_time(),
        'procedure': random.choice(PROCEDURES),
        'receptionist': random.choice(RECEPTIONIST_NAMES),
        'memo_date': random_memo_date()
    }
    
    # Different professional styles with varied information ordering
    memo_templates = [
        
        # Phone number first, then procedure details
        lambda d: f"""Hi {d['doctor']},

I wanted to reach out about an upcoming appointment. The patient's contact number is {d['phone']} in case you need to reach them directly. 

{d['patient_name']}, who is {d['age']} years old, is scheduled for {d['procedure']} on {d['date']} at {d['time']}.

Please let me know if you need any additional information or if there are any changes to the schedule.

Best regards,
{d['receptionist']}
{d['memo_date']}""",

        # Age and procedure focus first
        lambda d: f"""Dear {d['doctor']},

We have a {d['age']}-year-old patient, {d['patient_name']}, coming in for {d['procedure']}. The appointment is scheduled for {d['date']} at {d['time']}.

If you need to contact the patient for any reason, they can be reached at {d['phone']}.

Thank you,
{d['receptionist']}
{d['memo_date']}""",

        # Date and time prominent
        lambda d: f"""Hello {d['doctor']},

Just confirming an appointment for {d['date']} at {d['time']}. The patient is {d['patient_name']}, age {d['age']}, and they're scheduled for {d['procedure']}.

Their contact information is {d['phone']} should you need to reach them.

Hope this helps with your planning!
{d['receptionist']}
{d['memo_date']}""",

        # Patient name leads
        lambda d: f"""{d['doctor']},

{d['patient_name']} will be coming in on {d['date']} at {d['time']}. This is a {d['age']}-year-old patient scheduled for {d['procedure']}.

Contact number: {d['phone']}

Let me know if you have any questions.

{d['receptionist']}
{d['memo_date']}""",

        # Procedure-focused opening
        lambda d: f"""Hi {d['doctor']},

We have a {d['procedure']} scheduled for {d['date']} at {d['time']}. The patient is {d['patient_name']}, {d['age']} years old.

You can reach them at {d['phone']} if needed.

Thanks!
{d['receptionist']}
{d['memo_date']}""",

        # Contact information embedded mid-message
        lambda d: f"""Dear {d['doctor']},

I hope you're doing well. {d['patient_name']} is scheduled for an appointment on {d['date']} at {d['time']}. The patient is {d['age']} years old and you can contact them at {d['phone']} if anything comes up. 

The procedure scheduled is {d['procedure']}.

Best,
{d['receptionist']}
{d['memo_date']}""",

        # Time-sensitive tone
        lambda d: f"""{d['doctor']},

Quick update on tomorrow's schedule - we have {d['patient_name']} coming in for {d['procedure']} at {d['time']} on {d['date']}. Patient is {d['age']} years old.

Phone number on file: {d['phone']}

Just wanted to give you a heads up!
{d['receptionist']}
{d['memo_date']}""",

        # Conversational style
        lambda d: f"""Hey {d['doctor']},

Hope your day is going well! I wanted to let you know about {d['patient_name']} who's coming in for {d['procedure']}. They're {d['age']} and the appointment is set for {d['date']} at {d['time']}.

If you need to reach them, their number is {d['phone']}.

Let me know if you need anything else!
{d['receptionist']}
{d['memo_date']}""",

        # Structured but informal
        lambda d: f"""Hi {d['doctor']},

Patient: {d['patient_name']} (age {d['age']})
Date: {d['date']}
Time: {d['time']}
Procedure: {d['procedure']}
Contact: {d['phone']}

Just wanted to make sure this was on your radar. Let me know if you have any questions!

{d['receptionist']}
{d['memo_date']}""",

        # Appointment confirmation style
        lambda d: f"""Dear {d['doctor']},

This is to confirm the appointment for {d['patient_name']} on {d['date']}. The patient, who is {d['age']} years old, will be arriving at {d['time']} for {d['procedure']}.

Their contact number is {d['phone']} for your reference.

Please confirm receipt of this information.

Sincerely,
{d['receptionist']}
{d['memo_date']}""",

        # Patient details first
        lambda d: f"""{d['doctor']},

{d['patient_name']}, a {d['age']}-year-old patient, has an upcoming appointment. They can be reached at {d['phone']} if you need to contact them.

The appointment is for {d['procedure']} and is scheduled for {d['date']} at {d['time']}.

Thank you,
{d['receptionist']}
{d['memo_date']}""",

        # Scheduling focus
        lambda d: f"""Hello {d['doctor']},

I'm writing to inform you about a scheduling update. On {d['date']}, we have {d['patient_name']} coming in at {d['time']}. 

This {d['age']}-year-old patient is scheduled for {d['procedure']} and can be contacted at {d['phone']}.

Best regards,
{d['receptionist']}
{d['memo_date']}""",

        # Brief professional
        lambda d: f"""{d['doctor']},

{d['patient_name']} ({d['age']}) - {d['procedure']}
{d['date']} at {d['time']}
Contact: {d['phone']}

Please let me know if you need any additional information.

{d['receptionist']}
{d['memo_date']}""",

        # Warm, helpful tone
        lambda d: f"""Hi {d['doctor']},

I wanted to reach out about an appointment coming up. {d['patient_name']} will be joining us on {d['date']} at {d['time']} for {d['procedure']}. 

The patient is {d['age']} years old, and their phone number is {d['phone']} in case you need to reach out.

Hope this information is helpful for your preparation!

Warm regards,
{d['receptionist']}
{d['memo_date']}""",

        # Contact-first approach
        lambda d: f"""Dear {d['doctor']},

Patient contact: {d['phone']}

{d['patient_name']} is scheduled for {d['date']} at {d['time']}. This is for {d['procedure']}, and the patient is {d['age']} years old.

Feel free to reach out if you have any questions.

{d['receptionist']}
{d['memo_date']}""",

    ]
    
    # Choose random template and apply to data
    template = random.choice(memo_templates)
    return template(data)

def generate_memos():
    """Generate 1000 professional varied memo files."""
    logger.info("Step 1: Generating professional varied memo files...")
    
    # Remove old files
    old_files = glob.glob("./memo_*.txt")
    for file in old_files:
        os.remove(file)
        
    old_images = glob.glob("./memo_*.jpg")
    for file in old_images:
        os.remove(file)
    
    output_dir = "."
    
    logger.info(f"Generating 1000 professional, varied memo files in {output_dir}/...")
    
    for i in range(1, 1001):
        memo_content = generate_professional_memo()
        filename = f"memo_{i:04d}.txt"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(memo_content)
        
        if i % 200 == 0:
            logger.info(f"Generated {i} professional files...")
    
    logger.info(f"✅ Successfully generated 1000 professional memo files")

# ============================================================================
# IMAGE CONVERSION FUNCTIONS
# ============================================================================

def create_memo_image(text_content, filename):
    """
    Convert text content to a JPEG image with professional formatting.
    
    Args:
        text_content (str): The text content to convert
        filename (str): The base filename (without extension)
    
    Returns:
        PIL.Image: The generated image
    """
    # Image dimensions and settings
    width = 800
    height = 600
    background_color = (255, 255, 255)  # White background
    text_color = (0, 0, 0)  # Black text
    margin = 50
    
    # Create image with white background
    image = Image.new('RGB', (width, height), background_color)
    draw = ImageDraw.Draw(image)
    
    # Try to use a system font, fallback to default if not available
    try:
        # Try to use a professional font
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
    
    # Calculate text area
    text_area_width = width - (2 * margin)
    text_area_height = height - (2 * margin)
    
    # Wrap text to fit within the image
    lines = textwrap.wrap(text_content, width=60)  # Wrap at 60 characters
    
    # Calculate total text height with increased line spacing
    bbox = font.getbbox("A")
    line_height = bbox[3] - bbox[1] + 12  # Increased line spacing (was +4)
    total_text_height = len(lines) * line_height
    
    # Start position (center vertically if text is shorter than image)
    y_start = margin + (text_area_height - total_text_height) // 2
    y_start = max(margin, y_start)  # Ensure we don't start above margin
    
    # Draw each line of text (left-justified)
    y_position = y_start
    for line in lines:
        # Left-justify the text (start at margin)
        x_position = margin
        
        # Draw the text
        draw.text((x_position, y_position), line, fill=text_color, font=font)
        y_position += line_height
        
        # If we're running out of space, stop
        if y_position > height - margin:
            break
    
    return image

def convert_memos_to_images():
    """
    Convert all memo text files in the current directory to JPEG images.
    """
    logger.info("Step 2: Converting memo text files to images...")
    
    # Get all .txt files in the current directory
    txt_files = glob.glob("memo_*.txt")
    
    if not txt_files:
        logger.warning("No memo_*.txt files found in the current directory.")
        return False
    
    logger.info(f"Found {len(txt_files)} memo files to convert.")
    
    converted_count = 0
    error_count = 0
    
    for txt_file in sorted(txt_files):
        try:
            # Read the text content
            with open(txt_file, 'r', encoding='utf-8') as f:
                text_content = f.read().strip()
            
            # Generate the output filename
            base_name = os.path.splitext(txt_file)[0]
            output_filename = f"{base_name}.jpg"
            
            # Create the image
            image = create_memo_image(text_content, base_name)
            
            # Save the image
            image.save(output_filename, 'JPEG', quality=95)
            
            converted_count += 1
            
        except Exception as e:
            logger.error(f"Error converting {txt_file}: {str(e)}")
            error_count += 1
    
    logger.info(f"✅ Successfully converted {converted_count} files to images")
    if error_count > 0:
        logger.warning(f"Errors converting {error_count} files")
    
    return error_count == 0

# ============================================================================
# S3 UPLOAD FUNCTIONS
# ============================================================================

def load_moose_config(config_path="../services/data-warehouse/moose.config.toml"):
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
        
        return True
        
    except ClientError as e:
        logger.error(f"Error uploading {file_path}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error uploading {file_path}: {e}")
        return False

def upload_memo_files():
    """
    Upload all memo files (text and images) to S3.
    
    Returns:
        list: List of successfully uploaded files
    """
    logger.info("Step 3: Uploading memo files to S3...")
    
    # Load S3 configuration
    s3_config = load_moose_config()
    if not s3_config:
        logger.error("Failed to load S3 configuration")
        return []
    
    # Create S3 client
    s3_client = create_s3_client(s3_config)
    if not s3_client:
        logger.error("Failed to create S3 client")
        return []
    
    bucket_name = s3_config.get('bucket_name', 'unstructured-data')
    
    # Get all memo files (both .txt and .jpg)
    memo_files = []
    memo_files.extend(glob.glob("memo_*.txt"))
    memo_files.extend(glob.glob("memo_*.jpg"))
    
    if not memo_files:
        logger.warning("No memo files found in current directory")
        return []
    
    logger.info(f"Found {len(memo_files)} memo files to upload")
    
    # Upload files
    successful_uploads = []
    failed_uploads = 0
    
    for file_path in sorted(memo_files):
        # Create S3 key (path in bucket)
        filename = os.path.basename(file_path)
        s3_key = filename
        
        # Upload file
        if upload_file_to_s3(s3_client, bucket_name, file_path, s3_key):
            successful_uploads.append(file_path)
        else:
            failed_uploads += 1
    
    # Summary
    logger.info(f"✅ Successfully uploaded {len(successful_uploads)} files to S3")
    if failed_uploads > 0:
        logger.warning(f"Failed uploads: {failed_uploads} files")
    
    return successful_uploads

# ============================================================================
# CLEANUP FUNCTIONS
# ============================================================================

def cleanup_local_files(uploaded_files):
    """
    Delete local files that were successfully uploaded to S3.
    
    Args:
        uploaded_files (list): List of file paths that were successfully uploaded
    """
    logger.info("Step 4: Cleaning up local files...")
    
    deleted_count = 0
    error_count = 0
    
    for file_path in uploaded_files:
        try:
            os.remove(file_path)
            deleted_count += 1
        except Exception as e:
            logger.error(f"Error deleting {file_path}: {e}")
            error_count += 1
    
    logger.info(f"✅ Deleted {deleted_count} local files")
    if error_count > 0:
        logger.warning(f"Failed to delete {error_count} files")

# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    """
    Main function to run the complete seed data pipeline.
    """
    logger.info("Seed Data Pipeline")
    logger.info("=" * 50)
    logger.info("This will:")
    logger.info("1. Generate 1000 professional varied memo text files")
    logger.info("2. Convert memo text files to JPEG images")
    logger.info("3. Upload both text and image files to S3")
    logger.info("4. Clean up local files after successful upload")
    logger.info("=" * 50)
    
    try:
        # Step 1: Generate memo files
        generate_memos()
        
        # Step 2: Convert memos to images
        if not convert_memos_to_images():
            logger.error("Image conversion failed. Stopping pipeline.")
            return
        
        # Step 3: Upload files to S3
        uploaded_files = upload_memo_files()
        if not uploaded_files:
            logger.error("S3 upload failed. Stopping pipeline.")
            return
        
        # Step 4: Clean up local files
        cleanup_local_files(uploaded_files)
        
        logger.info("🎉 Seed data pipeline completed successfully!")
        logger.info(f"📊 Generated, converted, and uploaded {len(uploaded_files)} files")
        
    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user")
    except Exception as e:
        logger.error(f"Pipeline failed with error: {e}")

if __name__ == "__main__":
    main()