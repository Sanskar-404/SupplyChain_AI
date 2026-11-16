import os
from dotenv import load_dotenv
load_dotenv(); _client=None; _collection=None; _memory=[]
def save_record(record):
    global _client,_collection
    try:
        from pymongo import MongoClient
        uri=os.getenv('MONGODB_URI','')
        if uri:
            if _client is None:
                _client=MongoClient(uri,serverSelectionTimeoutMS=700); _collection=_client[os.getenv('MONGODB_DATABASE','supplychain_ai')]['predictions']
            _collection.insert_one(record.copy()); return 'mongodb'
    except Exception: pass
    _memory.insert(0,record); del _memory[100:]; return 'memory'
def get_history(limit=20):
    try:
        if _collection is not None: return list(_collection.find({}, {'_id':0}).sort('created_at',-1).limit(limit))
    except Exception: pass
    return _memory[:limit]
