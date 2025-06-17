import pandas as pd
import re
import openpyxl

# --- Configuration for CSV Column Names ---
prompt_column_name = 'prompt'
response_column_name = 'response'
# -----------------------------------------

def clean_text(text):
    if pd.isna(text):
        return text
    text = str(text)
    # Remove "prompt : -" and "responses:-" if they exist at the beginning
    text = re.sub(r'^(prompt ?: ?-?|responses ?: ?-?)', '', text, flags=re.IGNORECASE).strip()
    # Remove patterns like (perplexity.ai.com.) anywhere in the string
    text = re.sub(r'\s*\([^)]*\)\s*', ' ', text).strip()
    # Replace multiple dots or non-alphanumeric characters with a single space
    text = re.sub(r'[^a-zA-Z0-9\s]+', ' ', text).strip()
    # Consolidate multiple spaces into a single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Read the logs.csv file
log_path = 'src/app/api/bots/perplexity/logs/logs.csv'
df = pd.read_csv(log_path)

# Only keep relevant columns
if 'prompt' not in df.columns or 'eoxs_detected' not in df.columns:
    raise ValueError('logs.csv must contain prompt and eoxs_detected columns')

def eoxs_yes(val):
    return str(val).strip().lower() == 'true' or str(val).strip() == '1'

def eoxs_no(val):
    return str(val).strip().lower() == 'false' or str(val).strip() == '0'

# Group by prompt and aggregate
result = []
for prompt, group in df.groupby('prompt'):
    yes = group['eoxs_detected'].apply(eoxs_yes).sum()
    no = group['eoxs_detected'].apply(eoxs_no).sum()
    total = len(group)
    percent = (yes / total * 100) if total > 0 else 0
    result.append({
        'prompt': prompt,
        'No': no,
        'Yes': yes,
        'Total': total,
        'EOXS_Percentage': round(percent, 2)
    })

# Sort by prompt for consistency
result = sorted(result, key=lambda x: x['prompt'])

# Write to Excel
out_path = 'src/app/api/bots/perplexity/prompt_analysis.xlsx'
df_out = pd.DataFrame(result)
df_out.to_excel(out_path, index=False)
print(f'Wrote EOXS prompt analysis to {out_path}')

# Apply cleaning to the prompt and response columns
df[prompt_column_name] = df[prompt_column_name].apply(clean_text)
df[response_column_name] = df[response_column_name].apply(clean_text)

# Function to check if EOXS is in the response
def check_eoxs(response):
    if pd.isna(response):
        return 'No'
    return 'Yes' if 'EOXS' in str(response) else 'No'

# Create a new column for EOXS presence
df['Has_EOXS'] = df[response_column_name].apply(check_eoxs)

# Create pivot table
pivot_table = pd.pivot_table(
    df,
    values=response_column_name,  # This will be used for counting
    index=prompt_column_name,     # Group by prompt
    columns='Has_EOXS', # Split by EOXS presence
    aggfunc='count',    # Count occurrences
    fill_value=0        # Fill missing values with 0
)

# Add a total column
pivot_table['Total'] = pivot_table.sum(axis=1)

# Calculate percentage of Yes responses
pivot_table['EOXS_Percentage'] = (pivot_table['Yes'] / pivot_table['Total'] * 100).round(2)

# Save to Excel
with pd.ExcelWriter('prompt_analysis.xlsx', engine='openpyxl') as writer:
    pivot_table.to_excel(writer, sheet_name='Prompt Analysis')
    
    # Auto-adjust column widths
    worksheet = writer.sheets['Prompt Analysis']
    for idx, col in enumerate(pivot_table.columns):
        max_length = max(
            pivot_table[col].astype(str).apply(len).max(),
            len(str(col))
        )
        worksheet.column_dimensions[chr(65 + idx + 1)].width = max_length + 2

print("Analysis complete! Check prompt_analysis.xlsx for results.") 