# Convert the full 200 occupations CSV to JSON format for dynamic loading
import pandas as pd
import json

# Load the full dataset
df = pd.read_csv('occupations_asri.csv')

# Rename ASRI to WARI for consistency
df = df.rename(columns={'ASRI': 'WARI'})

# Create the JSON data structure
occupations_data = []

for _, row in df.iterrows():
    # Determine risk level based on WARI score
    wari = row['WARI']
    if wari < 35:
        risk_level = "Very Low"
    elif wari < 45:
        risk_level = "Low"
    elif wari < 60:
        risk_level = "Medium"
    elif wari < 70:
        risk_level = "High"
    else:
        risk_level = "Very High"
    
    occupation = {
        "job": row['Job'],
        "sector": row['Sector'],
        "wari": round(wari, 1),
        "alpha": round(row['Alpha'], 3),
        "decline_2030": round(row['Demand_Decline_2030'], 1),
        "decline_2040": round(row['Demand_Decline_2040'], 1),
        "risk_level": risk_level,
        "notes": row['Notes']
    }
    occupations_data.append(occupation)

# Save as JSON file
with open('occupations_data.json', 'w') as f:
    json.dump(occupations_data, f, indent=2)

print(f"✅ Converted {len(occupations_data)} occupations to JSON")
print(f"📊 WARI Range: {df['WARI'].min():.1f} - {df['WARI'].max():.1f}")
print(f"🏢 Sectors: {df['Sector'].nunique()} sectors covered")
print("\nFirst 3 occupations preview:")
for i in range(3):
    occ = occupations_data[i]
    print(f"- {occ['job']} ({occ['sector']}): WARI {occ['wari']}, Risk {occ['risk_level']}")