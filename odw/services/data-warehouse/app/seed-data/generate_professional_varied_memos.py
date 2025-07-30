#!/usr/bin/env python3
"""
Generate 1000 professional, conversational memo files where receptionists communicate
essential information to doctors in varied orders and styles, but maintaining
professional quality throughout.
"""

import random
import os
from datetime import datetime, timedelta

# Base data
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

def main():
    """Generate 1000 professional varied memo files."""
    
    # Remove old files
    import glob
    old_files = glob.glob("./memo_*.txt")
    for file in old_files:
        os.remove(file)
    
    output_dir = "."
    
    print(f"Generating 1000 PROFESSIONAL, VARIED memo files in {output_dir}/...")
    print("Features: Professional tone, conversational style, varied information ordering")
    
    for i in range(1, 1001):
        memo_content = generate_professional_memo()
        filename = f"memo_{i:04d}.txt"
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(memo_content)
        
        if i % 200 == 0:
            print(f"Generated {i} professional files...")
    
    print(f"✅ Successfully generated 1000 PROFESSIONAL memo files in {output_dir}/")
    print(f"📁 Files: memo_0001.txt to memo_1000.txt")
    print("📝 Each memo contains all essential information in varied order with professional tone!")

if __name__ == "__main__":
    main() 