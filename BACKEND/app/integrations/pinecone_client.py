"""Thin Documents API adapter; never sends client-generated vectors."""
import asyncio
from app.core.config import get_settings

class PineconeDocuments:
    def __init__(self): self.index=None
    def connect(self):
        s=get_settings()
        if not s.pinecone_api_key: return
        from pinecone import Pinecone
        pc=Pinecone(api_key=s.pinecone_api_key)
        self.index=pc.Index(host=s.pinecone_index_host) if s.pinecone_index_host else pc.Index(s.pinecone_index_name)
    async def upsert(self, namespace, records):
        if not self.index: return
        for i in range(0,len(records),96):
            # Documents API accepts records whose chunk_text drives integrated embedding.
            await asyncio.to_thread(self.index.documents.upsert,namespace=namespace,documents=records[i:i+96])
    async def search(self, namespace, query, knowledge_type):
        if not self.index: return []
        from pinecone import EmbedQuery
        s=get_settings()
        q=EmbedQuery(field=s.pinecone_embedding_field, query=query)
        filt={"knowledge_type":{"$eq":knowledge_type}} if knowledge_type else None
        result=await asyncio.to_thread(
            self.index.documents.search,
            namespace=namespace,
            top_k=s.rag_top_k,
            score_by=[q],
            filter=filt,
            include_fields=["*"]
        )
        matches=getattr(result,"matches",[])
        return [m.to_dict() if hasattr(m,"to_dict") else m for m in matches]
pinecone=PineconeDocuments()
