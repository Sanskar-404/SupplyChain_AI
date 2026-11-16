import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, RandomForestRegressor, IsolationForest
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
FEATURES=["temperature_c","humidity_pct","co2_ppm","days_in_storage","transport_hours"]
def build_models():
    # Synthetic data is used only to make the starter run immediately.
    rng=np.random.default_rng(42); n=1800
    X=np.column_stack([rng.uniform(0,25,n),rng.uniform(45,100,n),rng.uniform(350,1800,n),rng.uniform(0,20,n),rng.uniform(0,36,n)])
    score=(X[:,0]>8)*.9+(X[:,1]>88)*.5+(X[:,2]>1100)*.4+(X[:,3]>8)*.7+(X[:,4]>18)*.3
    y=(score+rng.normal(0,.25,n)>1.25).astype(int)
    models={"Random Forest":RandomForestClassifier(n_estimators=140,random_state=42,class_weight="balanced"),"SVM":make_pipeline(StandardScaler(),SVC(probability=True,random_state=42)),"Gradient Boosting":GradientBoostingClassifier(random_state=42)}
    for m in models.values(): m.fit(X,y)
    remaining=np.maximum(.5,14-X[:,3]-np.maximum(0,X[:,0]-4)*.28-np.maximum(0,X[:,1]-75)*.045-X[:,4]*.06+rng.normal(0,.7,n))
    reg=RandomForestRegressor(n_estimators=120,random_state=42).fit(X,remaining)
    anomaly=IsolationForest(contamination=.06,random_state=42).fit(X)
    return models,reg,anomaly
MODELS,REGRESSOR,ANOMALY=build_models()
def infer(p):
    x=np.array([[p[k] for k in FEATURES]],dtype=float); probs={n:float(m.predict_proba(x)[0][1]) for n,m in MODELS.items()}; risk=float(np.mean(list(probs.values())))
    return {"risk_score":round(risk*100,1),"risk_level":"High" if risk>=.65 else ("Medium" if risk>=.35 else "Low"),"model_probabilities":{k:round(v*100,1) for k,v in probs.items()},"estimated_remaining_shelf_life_days":round(float(max(0,REGRESSOR.predict(x)[0])),1),"cold_chain_anomaly":bool(ANOMALY.predict(x)[0]==-1),"explanation":["Higher temperature and longer storage can increase deterioration risk.","Humidity and CO₂ are contextual indicators; thresholds vary by commodity.","Demo screening only; not a food-safety determination."]}
