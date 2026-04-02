import asyncio
import xml.etree.ElementTree as ET
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "orphancure")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

diseases_col = db["diseases"]
trials_col = db["trials"]
aid_col = db["aid"]

# ─── PARSE en_product4.xml — symptoms ───────────────────

def parse_symptoms(filepath):
    tree = ET.parse(filepath)
    root = tree.getroot()
    diseases = []

    for disorder in root.iter("Disorder"):
        name_el = disorder.find("Name")
        if name_el is None:
            continue
        name = name_el.text.strip()

        symptoms = []
        for sign in disorder.iter("HPODisorderAssociation"):
            hpo = sign.find(".//HPOTerm")
            if hpo is not None:
                symptoms.append(hpo.text.strip())

        orpha_el = disorder.find("OrphaCode")
        orpha_code = orpha_el.text.strip() if orpha_el is not None else ""

        if symptoms:
            diseases.append({
                "name": name,
                "orpha_code": orpha_code,
                "symptoms": symptoms,
                "source": "orphanet_product4"
            })

    return diseases

# ─── PARSE en_product1.xml — descriptions ───────────────

def parse_descriptions(filepath):
    tree = ET.parse(filepath)
    root = tree.getroot()
    descriptions = {}

    for disorder in root.iter("Disorder"):
        name_el = disorder.find("Name")
        orpha_el = disorder.find("OrphaCode")
        if name_el is None or orpha_el is None:
            continue
        name = name_el.text.strip()
        orpha_code = orpha_el.text.strip()
        descriptions[orpha_code] = {
            "name": name,
            "description": f"Rare disease: {name}"
        }

    return descriptions

# ─── PARSE en_product6.xml — genes ──────────────────────

def parse_genes(filepath):
    tree = ET.parse(filepath)
    root = tree.getroot()
    genes = {}

    for disorder in root.iter("Disorder"):
        orpha_el = disorder.find("OrphaCode")
        if orpha_el is None:
            continue
        orpha_code = orpha_el.text.strip()
        gene_list = []

        for gene in disorder.iter("Gene"):
            symbol = gene.find("Symbol")
            if symbol is not None:
                gene_list.append(symbol.text.strip())

        if gene_list:
            genes[orpha_code] = gene_list

    return genes

# ─── SEED TRIALS ────────────────────────────────────────

sample_trials = [
    {
        "trial_id": "TRIAL001",
        "title": "Wilson's Disease Copper Chelation Trial",
        "disease": "Wilson's Disease",
        "location": "AIIMS New Delhi",
        "eligibility": "Age 10-40, confirmed Wilson's Disease",
        "benefit": "Free treatment provided for 12 months",
        "contact": "aiims.trials@aiims.edu",
        "status": "active"
    },
    {
        "trial_id": "TRIAL002",
        "title": "Gaucher Disease Enzyme Replacement Study",
        "disease": "Gaucher Disease",
        "location": "Nizam's Institute Hyderabad",
        "eligibility": "Age 5-60, confirmed Gaucher Disease",
        "benefit": "Free enzyme therapy + Rs 500 per visit",
        "contact": "nizams.trials@nims.edu",
        "status": "active"
    },
    {
        "trial_id": "TRIAL003",
        "title": "Marfan Syndrome Cardiovascular Monitoring",
        "disease": "Marfan Syndrome",
        "location": "CMC Vellore",
        "eligibility": "Age 15-50, confirmed Marfan Syndrome",
        "benefit": "Free cardiac monitoring and medication",
        "contact": "cmc.trials@cmcvellore.ac.in",
        "status": "active"
    }
]

# ─── SEED AID ────────────────────────────────────────────

sample_aid = [
    {
        "aid_id": "AID001",
        "name": "PM Rare Disease Fund",
        "covers": ["Wilson's Disease", "Gaucher Disease", "Pompe Disease"],
        "max_amount": "Rs 20 lakhs",
        "eligibility": "BPL families, confirmed rare disease diagnosis",
        "contact": "pmrdf@gov.in",
        "type": "government"
    },
    {
        "aid_id": "AID002",
        "name": "APSACS Rare Disease Scheme",
        "covers": ["All rare diseases"],
        "max_amount": "Rs 5 lakhs per year",
        "eligibility": "Andhra Pradesh residents, any rare disease",
        "contact": "apsacs@ap.gov.in",
        "type": "state_government"
    },
    {
        "aid_id": "AID003",
        "name": "Shire India Patient Support",
        "covers": ["Gaucher Disease", "Fabry Disease", "Hunter Syndrome"],
        "max_amount": "Full treatment coverage",
        "eligibility": "Confirmed diagnosis, unable to afford treatment",
        "contact": "support@shire.in",
        "type": "pharma_ngo"
    },
    {
        "aid_id": "AID004",
        "name": "ORDI India Support Fund",
        "covers": ["All rare diseases"],
        "max_amount": "Rs 2 lakhs",
        "eligibility": "Any rare disease patient in India",
        "contact": "help@ordi.in",
        "type": "ngo"
    }
]

# ─── MAIN SEED FUNCTION ──────────────────────────────────

async def seed():
    print("Starting database seeding...")

    # Clear existing disease data
    await diseases_col.delete_many({})
    await trials_col.delete_many({})
    await aid_col.delete_many({})

    # Parse Orphanet files
    print("Parsing en_product4.xml (symptoms)...")
    diseases = []
    try:
        diseases = parse_symptoms("datasets/en_product4.xml")
        print(f"Found {len(diseases)} diseases with symptoms")
    except Exception as e:
        print(f"Could not parse product4: {e}")

    print("Parsing en_product1.xml (descriptions)...")
    descriptions = {}
    try:
        descriptions = parse_descriptions("datasets/en_product1.xml")
        print(f"Found {len(descriptions)} disease descriptions")
    except Exception as e:
        print(f"Could not parse product1: {e}")

    print("Parsing en_product6.xml (genes)...")
    genes = {}
    try:
        genes = parse_genes("datasets/en_product6.xml")
        print(f"Found {len(genes)} disease gene mappings")
    except Exception as e:
        print(f"Could not parse product6: {e}")

    # Merge all data
    for disease in diseases:
        code = disease.get("orpha_code", "")
        if code in descriptions:
            disease["description"] = descriptions[code].get("description", "")
        if code in genes:
            disease["genes"] = genes[code]

    # Insert diseases
    if diseases:
        await diseases_col.insert_many(diseases)
        print(f"Inserted {len(diseases)} diseases into MongoDB")
    else:
        print("No diseases to insert — check your XML file paths")

    # Insert trials
    await trials_col.insert_many(sample_trials)
    print(f"Inserted {len(sample_trials)} clinical trials")

    # Insert aid
    await aid_col.insert_many(sample_aid)
    print(f"Inserted {len(sample_aid)} financial aid options")

    # Create indexes for fast querying
    await diseases_col.create_index("name")
    await diseases_col.create_index("symptoms")
    await diseases_col.create_index("orpha_code")
    await trials_col.create_index("disease")
    await aid_col.create_index("covers")

    print("Database seeding complete!")
    print(f"Total diseases: {await diseases_col.count_documents({})}")
    print(f"Total trials: {await trials_col.count_documents({})}")
    print(f"Total aid options: {await aid_col.count_documents({})}")

if __name__ == "__main__":
    asyncio.run(seed())
