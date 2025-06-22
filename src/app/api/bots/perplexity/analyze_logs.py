import os
import re
import sys
import pandas as pd
import openpyxl

# --- Configuration for CSV Column Names ---
prompt_column_name = 'prompt'
response_column_name = 'response'
# -----------------------------------------

# Build paths relative to this file
BOT_DIR  = os.path.dirname(__file__)
log_path = os.path.join(BOT_DIR, 'logs', 'logs.csv')
out_path = os.path.join(BOT_DIR, 'prompt_analysis.xlsx')

# ——— ensure logs.csv exists and isn’t empty ———
if not os.path.exists(log_path):
    print(f"[ERROR] No log file found at {log_path}. Skipping analysis.")
    sys.exit(1)
if os.stat(log_path).st_size == 0:
    print(f"[ERROR] Log file at {log_path} is empty. Skipping analysis.")
    sys.exit(1)

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
df = pd.read_csv(log_path)

# Only keep relevant columns
if 'prompt' not in df.columns or 'eoxs_detected' not in df.columns:
    raise ValueError('logs.csv must contain prompt and eoxs_detected columns')

def eoxs_yes(val):
    return str(val).strip().lower() in ('true', '1')

def eoxs_no(val):
    return str(val).strip().lower() in ('false', '0')

def check_eoxs(response):
    if pd.isna(response):
        return 'No'
    return 'Yes' if 'EOXS' in str(response).upper() else 'No'

# Clean the prompt & response columns
df[prompt_column_name]  = df[prompt_column_name].apply(clean_text)
df[response_column_name] = df[response_column_name].apply(clean_text)

# Create a new column for EOXS presence
df['Has_EOXS'] = df[response_column_name].apply(check_eoxs)

# Build the pivot table
pivot_table = pd.pivot_table(
    df,
    values=response_column_name,   # just uses the column for counting
    index=prompt_column_name,      # group by prompt
    columns='Has_EOXS',            # split by Yes/No
    aggfunc='count',               # count occurrences
    fill_value=0
)

# Add totals and percentage
pivot_table['Total'] = pivot_table.sum(axis=1)
pivot_table['EOXS_Percentage'] = (
    pivot_table['Yes'] / pivot_table['Total'] * 100
).round(2)

# Write out a single Excel file next to this script
with pd.ExcelWriter(out_path, engine='openpyxl') as writer:
    pivot_table.to_excel(writer, sheet_name='Prompt Analysis')
    worksheet = writer.sheets['Prompt Analysis']
    # Auto-adjust widths
    for idx, col in enumerate(pivot_table.columns, start=1):
        max_length = max(
            pivot_table[col].astype(str).map(len).max(),
            len(str(col))
        )
        worksheet.column_dimensions[openpyxl.utils.get_column_letter(idx+1)].width = max_length + 2

print(f"Wrote EOXS prompt analysis to {out_path}")
