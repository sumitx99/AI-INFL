import pandas as pd
from pathlib import Path

log_file = Path(__file__).resolve().parent.parent / "data" / "logs.csv"
output_file = Path(__file__).resolve().parent.parent / "data" / "pivot_summary.csv"
keyword = "inventory"

df = pd.read_csv(log_file, parse_dates=['timestamp'])
df['contains_keyword'] = df['response'].str.contains(keyword, case=False, na=False)
df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
total_hours = (df['timestamp'].max() - df['timestamp'].min()).total_seconds() / 3600

pivot = df.groupby('prompt').agg(
    executions=('prompt', 'count'),
    keyword_hits=('contains_keyword', 'sum'),
)
pivot['hit_ratio'] = pivot['keyword_hits'] / pivot['executions']
pivot['total_runtime_hours'] = total_hours

pivot.to_csv(output_file)
print(f"✅ Pivot saved to {output_file}")
