from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.database.mongodb import database
from app.integrations.pinecone_client import pinecone
from app.api import r
@asynccontextmanager
async def lifespan(app:FastAPI):
    await database.connect()
    try: pinecone.connect()
    except Exception: pass
    yield
    await database.close()
s=get_settings(); app=FastAPI(title=s.app_name,version='1.0.0',lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=s.cors_list,allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
app.include_router(r,prefix=s.api_v1_prefix)
@app.get('/health')
async def health(): return {'status':'ok'}
@app.get('/ready')
async def ready(): return {'status':'ready' if database.db is not None else 'degraded','database':database.db is not None,'pinecone':pinecone.index is not None}
