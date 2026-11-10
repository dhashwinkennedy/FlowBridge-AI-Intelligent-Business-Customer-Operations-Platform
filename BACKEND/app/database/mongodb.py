from pymongo import AsyncMongoClient, ASCENDING
from app.core.config import get_settings

class Database:
    client=None; db=None
    async def connect(self):
        s=get_settings()
        if not s.mongodb_uri: return
        self.client=AsyncMongoClient(s.mongodb_uri,serverSelectionTimeoutMS=5000); self.db=self.client[s.mongodb_database]
        try:
            await self.db.command("ping")
            await self.indexes()
        except Exception:
            await self.client.close(); self.client=None; self.db=None
    async def close(self):
        if self.client: await self.client.close()
    async def indexes(self):
        for c, fields, unique in [("companies",[("company_id",ASCENDING)],True),("companies",[("company_slug",ASCENDING)],True),("users",[("email",ASCENDING),("company_id",ASCENDING)],True),("documents",[("document_id",ASCENDING)],True)]:
            await self.db[c].create_index(fields,unique=unique)
        for c in ["users","documents","conversations","support_tickets","workflow_requests","activities","approvals","notifications"]: await self.db[c].create_index([("company_id",ASCENDING)])
database=Database()
