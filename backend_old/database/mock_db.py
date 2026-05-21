import random

# Mock Databases

areas = ["Malir", "Landhi", "Saddar", "DHA", "Gulshan", "Clifton", "Lyari", "Korangi", "Nazimabad", "Orangi"]
specialties = ["Cardiologist", "Pediatrician", "General Physician", "Neurologist", "Orthopedic", "Dermatologist", "Psychiatrist"]
qualifications = ["MBBS", "FCPS", "MD", "FRCS"]
doctor_first_names = ["Ahmed", "Sana", "Ali", "Fatima", "Hassan", "Ayesha", "Usman", "Zainab", "Omar", "Khadija"]
doctor_last_names = ["Khan", "Ali", "Syed", "Ahmed", "Hussain", "Raza", "Malik", "Shah", "Iqbal"]

doctors = []
for i in range(1, 36):
    doctors.append({
        "id": f"D{i}",
        "name": f"Dr. {random.choice(doctor_first_names)} {random.choice(doctor_last_names)}",
        "specialty": random.choice(specialties),
        "location": random.choice(areas),
        "experience_years": random.randint(2, 30),
        "hospital": f"{random.choice(areas)} General Hospital",
        "age": random.randint(30, 65),
        "qualifications": random.choice(qualifications),
        "booked_slots": ["10:00 AM", "11:00 AM"] if random.choice([True, False]) else ["09:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"],
        "available_slots": ["02:00 PM", "04:00 PM"] if random.choice([True, False]) else [],
        "phone": f"+923{random.randint(10, 49)}{random.randint(1000000, 9999999)}"
    })

ambulances = []
for i in range(1, 16):
    ambulances.append({
        "id": f"A{i}",
        "location": random.choice(areas),
        "phone": f"+923{random.randint(10, 49)}{random.randint(1000000, 9999999)}",
        "available": random.choice([True, False, True]) # Biased towards available
    })

# Inventory structured to support chemical formulation matching and regional scarcity logic
pharmacy_inventory = []
hubs = ["Neighborhood", "Central", "Cross-Regional"]
regions = ["Karachi", "Lahore", "Islamabad"]
medicines_base = [
    ("Panadol", "Paracetamol 500mg"),
    ("Zyrtec", "Cetirizine 10mg"),
    ("Jetepar Syrup", "Amino Acids + Vitamins"),
    ("Augmentin", "Amoxicillin 625mg"),
    ("Brufen", "Ibuprofen 400mg"),
    ("Arinac", "Ibuprofen + Pseudoephedrine"),
    ("Flagyl", "Metronidazole 400mg"),
    ("Ponstan", "Mefenamic Acid 250mg"),
    ("Ciproxin", "Ciprofloxacin 500mg"),
    ("Loratadine", "Loratadine 10mg")
]

for i in range(1, 251):
    med = random.choice(medicines_base)
    region = random.choice(regions)
    loc_area = random.choice(areas) if region == "Karachi" else f"{region} Central"
    
    pharmacy_inventory.append({
        "id": f"M{i}",
        "name": f"{med[0]} Variant {random.randint(1,5)}",
        "chemical_formulation": med[1],
        "region": region,
        "hub": random.choice(hubs),
        "location": f"{loc_area} Pharmacy Hub",
        "stock": random.randint(0, 100) # 0 indicates out of stock
    })
