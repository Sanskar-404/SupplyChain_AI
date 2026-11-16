import argparse,os,joblib,pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report,confusion_matrix
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
F=['temperature_c','humidity_pct','co2_ppm','days_in_storage','transport_hours']
p=argparse.ArgumentParser();p.add_argument('csv_path');p.add_argument('--target',default='spoiled');p.add_argument('--output',default='artifacts/spoilage_rf.joblib');a=p.parse_args()
df=pd.read_csv(a.csv_path); missing=[c for c in F+[a.target] if c not in df]
if missing: raise SystemExit(f'Missing columns: {missing}')
df=df[F+[a.target]].dropna();X,y=df[F],df[a.target].astype(int)
if set(y.unique())-{0,1}: raise SystemExit('Target must be binary 0/1')
xt,xv,yt,yv=train_test_split(X,y,test_size=.2,random_state=42,stratify=y)
m=make_pipeline(SimpleImputer(),RandomForestClassifier(n_estimators=250,random_state=42,class_weight='balanced')).fit(xt,yt)
print(classification_report(yv,m.predict(xv)));print(confusion_matrix(yv,m.predict(xv)));os.makedirs(os.path.dirname(a.output) or '.',exist_ok=True);joblib.dump({'model':m,'features':F,'target':a.target},a.output);print('Saved',a.output)
