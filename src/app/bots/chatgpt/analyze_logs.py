import pandas as pd
import openpyxl
import os

# Read the logs.csv file
log_path = os.path.join(os.path.dirname(__file__), 'logs', 'logs.csv')
df = pd.read_csv(log_path)

# Only keep relevant columns
if 'prompt' not in df.columns or 'eoxs_count' not in df.columns:
    raise ValueError('logs.csv must contain prompt and eoxs_count columns')

def eoxs_yes(val):
    try:
        return int(val) > 0
    except:
        return False

def eoxs_no(val):
    try:
        return int(val) == 0
    except:
        return False

# Group by prompt and aggregate
result = []
for prompt, group in df.groupby('prompt'):
    yes = group['eoxs_count'].apply(eoxs_yes).sum()
    no = group['eoxs_count'].apply(eoxs_no).sum()
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
out_path = os.path.join(os.path.dirname(__file__), 'prompt_analysis.xlsx')
df_out = pd.DataFrame(result)
df_out.to_excel(out_path, index=False)
print(f'Wrote EOXS prompt analysis to {out_path}') 