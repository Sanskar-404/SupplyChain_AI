import pandas as pd
import os

# Read original dataset
df = pd.read_csv("Reviews.csv")

print("Original dataset loaded!")
print("Total records:", len(df))
print("Available columns:", list(df.columns))

# Select 10,000 random records
sample = df.sample(
    n=min(10000, len(df)),
    random_state=42
)

# Save sample
sample.to_csv("Reviews_Sample.csv", index=False)

print("\nSample created successfully!")
print("Total sample records:", len(sample))
print("Saved at:", os.path.abspath("Reviews_Sample.csv"))