# Memo to JPEG Image Converter

This script converts memo text files to JPEG images with professional formatting.

## Features

- Converts all `memo_*.txt` files to JPEG images
- Professional formatting with centered text
- White background with black text
- Automatic text wrapping
- High-quality JPEG output (95% quality)
- Error handling and progress reporting

## Requirements

- Python 3.6+
- Pillow (PIL) library
- boto3 (for S3 uploads)
- toml (for config parsing)

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Converting Memos to Images

1. Place the script in the same directory as your memo text files
2. Run the script:
```bash
python convert_memos_to_images.py
```

The script will:
- Find all files matching the pattern `memo_*.txt`
- Convert each file to a JPEG image with the same name but `.jpg` extension
- Display progress and results

### Uploading to S3

1. Ensure you have memo files (both .txt and .jpg) in the current directory
2. Run the upload script:
```bash
python upload_to_s3.py
```

The script will:
- Read S3 configuration from `moose.config.toml`
- Upload all memo files (text and images) to `s3://unstructured-data/memos/`
- Display upload progress and results
- List uploaded files in the bucket

## Output

### Image Conversion
- Input: `memo_1000.txt`
- Output: `memo_1000.jpg`

### S3 Upload
- Local files: `memo_*.txt` and `memo_*.jpg`
- S3 destination: `s3://unstructured-data/memos/`
- Files organized in `memos/` folder within the bucket

## Image Specifications

- Dimensions: 800x600 pixels
- Background: White
- Text: Black, professional font
- Format: JPEG with 95% quality
- Text wrapping: 60 characters per line
- Margins: 50 pixels on all sides

## Example

The script will convert memo files like:
```
Dear Dr. Wilson,

This is to confirm the appointment for Timothy Rodriguez...
```

Into a professional-looking JPEG image with the same content properly formatted and centered. 