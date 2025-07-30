#!/usr/bin/env python3
"""
Convert memo text files to JPEG images.
This script reads all .txt files in the current directory and converts them to JPEG images
with the same filename but .jpg extension.
"""

import os
import glob
from PIL import Image, ImageDraw, ImageFont
import textwrap

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
    # Get all .txt files in the current directory
    txt_files = glob.glob("memo_*.txt")
    
    if not txt_files:
        print("No memo_*.txt files found in the current directory.")
        return
    
    print(f"Found {len(txt_files)} memo files to convert.")
    
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
            
            print(f"✓ Converted {txt_file} -> {output_filename}")
            converted_count += 1
            
        except Exception as e:
            print(f"✗ Error converting {txt_file}: {str(e)}")
            error_count += 1
    
    print(f"\nConversion complete!")
    print(f"Successfully converted: {converted_count} files")
    if error_count > 0:
        print(f"Errors: {error_count} files")

if __name__ == "__main__":
    print("Memo to JPEG Image Converter")
    print("=" * 40)
    convert_memos_to_images() 