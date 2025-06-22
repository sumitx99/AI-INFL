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
BOT_DIR = os.path.dirname(__file__)
log_path = os.path.join(BOT_DIR, 'logs', 'logs.csv')
out_path = os.path.join(BOT_DIR, 'prompt_analysis.xlsx')

def clean_text(text):
    """Clean text by removing prefixes and special characters."""
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

def check_eoxs(response):
    """Check if response contains EOXS."""
    if pd.isna(response):
        return 'No'
    return 'Yes' if 'EOXS' in str(response).upper() else 'No'

# ——— Try to read logs, but handle missing/empty files gracefully ———
try:
    df = pd.read_csv(log_path)
except (FileNotFoundError, pd.errors.EmptyDataError):
    cwd = os.getcwd()
    print(f"[WARNING] Log file not found or empty: {log_path} (Current working directory: {cwd}). Continuing without analysis.")
    df = pd.DataFrame(columns=[prompt_column_name, response_column_name])

# If there's truly nothing to analyze, bail out non-fatally
if df.empty:
    print("[INFO] No log entries to analyze; skipping pivot and Excel export.")
    # Optionally write an empty sheet if needed
    # with pd.ExcelWriter(out_path, engine='openpyxl') as writer:
    #     pd.DataFrame().to_excel(writer, sheet_name='Prompt Analysis')
    print("[INFO] Continuing without generating excel sheet.")
    # sys.exit(0)

# Only keep relevant columns
if prompt_column_name not in df.columns:
    raise ValueError(f"'{prompt_column_name}' column not found in logs.csv")
if 'eoxs_detected' not in df.columns:
    print("[INFO] 'eoxs_detected' column not found. Will detect EOXS manually.")

# Clean the prompt & response columns
df[prompt_column_name] = df[prompt_column_name].apply(clean_text)
df[response_column_name] = df[response_column_name].apply(clean_text)

# Create a new column for EOXS presence
df['Has_EOXS'] = df[response_column_name].apply(check_eoxs)

# Build the pivot table
pivot_table = pd.pivot_table(
    df,
    values=response_column_name,
    index=prompt_column_name,
    columns='Has_EOXS',
    aggfunc='count',
    fill_value=0
)

# Add totals and percentage
# Check if 'Yes' or 'No' columns exist before proceeding with analysis
if 'Yes' in pivot_table.columns or 'No' in pivot_table.columns:
    pivot_table['Total'] = pivot_table.sum(axis=1)
    
    # Safely get the 'Yes' count, defaulting to 0 if the column doesn't exist
    yes_count = pivot_table['Yes'] if 'Yes' in pivot_table.columns else 0

    # Calculate percentage only if Total is not zero
    if pivot_table['Total'].sum() > 0:
         # Calculate percentage using the safe yes_count
        pivot_table['EOXS_Percentage'] = (
            (yes_count / pivot_table['Total']) * 100
        ).round(2)
    else:
        pivot_table['EOXS_Percentage'] = 0.0

    # Write out a single Excel file next to this script
    with pd.ExcelWriter(out_path, engine='openpyxl') as writer:
        pivot_table.to_excel(writer, sheet_name='Prompt Analysis')
        worksheet = writer.sheets['Prompt Analysis']
        
        # Auto-adjust column widths
        for idx, col in enumerate(pivot_table.columns, start=1):
            max_length = max(
                pivot_table[col].astype(str).map(len).max(),
                len(str(col))
            )
            worksheet.column_dimensions[openpyxl.utils.get_column_letter(idx + 1)].width = max_length + 2

    print(f"Wrote EOXS prompt analysis to {out_path}")
else:
    print("[INFO] No 'Yes' or 'No' responses found in logs sufficient for analysis. Skipping Excel analysis.")