import os, uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from app.core.security import create_token, verify_password, hash_password, decode_token
from app.database.mongodb import database
from app.dependencies.authentication import current_user, roles
from app.schemas.common import *
from app.services.documents import save_and_extract, chunks
from app.integrations.pinecone_client import pinecone
from app.integrations.openrouter import chat
from pymongo import ReturnDocument

r=APIRouter(); now=lambda:datetime.now(timezone.utc)
def ident(prefix): return f"{prefix}_{uuid.uuid4().hex}"
def clean(d): d.pop("_id",None); return d
def tenant(user): return {"company_id":user["company_id"]}
def namespace(company_id):
    from app.core.config import get_settings
    return f"{get_settings().pinecone_namespace_prefix}{company_id}"

@r.post('/auth/register-company',status_code=201)
async def register(body:RegisterCompany):
    if database.db is None: raise HTTPException(503,"Database unavailable")
    if await database.db.companies.find_one({"$or":[{"company_slug":body.company_slug},{"email":str(body.admin_email)}]}): raise HTTPException(409,"Company slug or administrator email already exists")
    cid,uid=ident('cmp'),ident('usr'); t=now()
    await database.db.companies.insert_one({"company_id":cid,"company_name":body.company_name,"company_slug":body.company_slug,"industry":body.industry,"configured_departments":[],"approval_rules":[],"created_at":t,"updated_at":t})
    user={"user_id":uid,"company_id":cid,"name":body.admin_name,"email":str(body.admin_email).lower(),"password_hash":hash_password(body.password),"role":"company_admin","department":None,"is_active":True,"created_at":t,"updated_at":t}
    await database.db.users.insert_one(user)
    return {"access_token":create_token(user),"refresh_token":create_token(user,True),"token_type":"bearer","company_id":cid}
@r.post('/auth/login')
async def login(body:Login):
    user=await database.db.users.find_one({"email":str(body.email).lower(),"is_active":True},{"_id":0})
    if not user or not verify_password(body.password,user['password_hash']): raise HTTPException(401,"Invalid email or password")
    return {"access_token":create_token(user),"refresh_token":create_token(user,True),"token_type":"bearer"}
@r.post('/auth/refresh')
async def refresh(token:str):
    p=decode_token(token,True); user=await database.db.users.find_one({"user_id":p['sub'],"company_id":p['company_id']},{"_id":0})
    if not user: raise HTTPException(401,"User no longer active")
    return {"access_token":create_token(user),"token_type":"bearer"}
@r.get('/auth/me')
async def me(user=Depends(current_user)): return clean(user)
@r.post('/auth/invite-employee',status_code=201)
async def invite(body:EmployeeCreate,user=Depends(roles('company_admin','platform_admin'))):
    if await database.db.users.find_one({"company_id":user['company_id'],"email":str(body.email).lower()}): raise HTTPException(409,"Email already exists")
    doc={"user_id":ident('usr'),"company_id":user['company_id'],"name":body.name,"email":str(body.email).lower(),"password_hash":hash_password(body.password),"role":body.role,"department":body.department,"is_active":True,"created_at":now(),"updated_at":now()}; await database.db.users.insert_one(doc); return clean(doc)
@r.get('/auth/users')
async def users(user=Depends(roles('company_admin','manager'))): return [clean(x) async for x in database.db.users.find(tenant(user),{'_id':0,'password_hash':0})]
@r.get('/companies/me')
async def company(user=Depends(current_user)): return clean(await database.db.companies.find_one(tenant(user),{'_id':0}))

@r.post('/knowledge/documents/upload',status_code=201)
async def upload(knowledge_type:str, file:UploadFile=File(...), user=Depends(roles('company_admin','manager'))):
    if knowledge_type not in ('customer','internal'): raise HTTPException(422,"knowledge_type must be customer or internal")
    did=ident('doc'); doc={"document_id":did,"company_id":user['company_id'],"filename":file.filename,"file_type":os.path.splitext(file.filename or '')[1].lower(),"knowledge_type":knowledge_type,"pinecone_namespace":namespace(user['company_id']),"total_chunks":0,"indexing_status":"processing","uploaded_by":user['user_id'],"uploaded_at":now(),"updated_at":now()}; await database.db.documents.insert_one(doc)
    try:
        path,pages=await save_and_extract(file,did); cs=chunks(pages); records=[]
        for i,(page,text) in enumerate(cs): records.append({"id":f"{did}:{i}","chunk_text":text,"title":file.filename,"company_id":user['company_id'],"knowledge_type":knowledge_type,"document_id":did,"source_filename":file.filename,"page_number":page,"chunk_index":i,"uploaded_at":now().isoformat()})
        await pinecone.upsert(doc['pinecone_namespace'],records)
        await database.db.documents.update_one({"document_id":did,**tenant(user)},{"$set":{"storage_path":str(path),"total_chunks":len(cs),"indexing_status":"completed","updated_at":now()}})
    except HTTPException: await database.db.documents.update_one({"document_id":did},{"$set":{"indexing_status":"failed"}}); raise
    except Exception as e: await database.db.documents.update_one({"document_id":did},{"$set":{"indexing_status":"failed","indexing_error":str(e)[:300]}}); raise HTTPException(502,"Document indexing failed")
    return clean(await database.db.documents.find_one({"document_id":did},{"_id":0}))
@r.get('/knowledge/documents')
async def list_docs(user=Depends(current_user)): return [clean(x) async for x in database.db.documents.find(tenant(user),{'_id':0})]
@r.get('/knowledge/documents/{document_id}')
async def get_doc(document_id:str,user=Depends(current_user)):
    d=await database.db.documents.find_one({"document_id":document_id,**tenant(user)},{"_id":0});
    if not d: raise HTTPException(404,"Document not found")
    d.pop('storage_path',None); return d
@r.get('/knowledge/documents/{document_id}/status')
async def doc_status(document_id:str,user=Depends(current_user)): return await get_doc(document_id,user)
@r.delete('/knowledge/documents/{document_id}',status_code=204)
async def delete_doc(document_id:str,user=Depends(roles('company_admin','manager'))):
    d=await database.db.documents.find_one({'document_id':document_id,**tenant(user)})
    if not d: raise HTTPException(404,'Document not found')
    # Pinecone deletion is intentionally scoped to the document metadata filter.
    if pinecone.index:
        try: await __import__('asyncio').to_thread(pinecone.index.documents.delete,namespace=d['pinecone_namespace'],filter={'document_id':{'$eq':document_id}})
        except Exception: raise HTTPException(502,'Unable to remove indexed chunks; document retained')
    if d.get('storage_path'): __import__('pathlib').Path(d['storage_path']).unlink(missing_ok=True)
    await database.db.documents.delete_one({'document_id':document_id,**tenant(user)})
@r.post('/knowledge/documents/{document_id}/reindex')
async def reindex_document(document_id:str,user=Depends(roles('company_admin','manager'))):
    # Re-indexing must re-upload source bytes through the upload endpoint to avoid stale versions.
    d=await database.db.documents.find_one({'document_id':document_id,**tenant(user)},{'_id':0})
    if not d: raise HTTPException(404,'Document not found')
    return {'document_id':document_id,'status':d['indexing_status'],'message':'Upload a replacement document to create a new indexed version.'}
@r.get('/public/companies/{company_slug}/conversations/{conversation_id}')
async def public_conversation(company_slug:str,conversation_id:str,customer_email:str):
    c=await database.db.companies.find_one({'company_slug':company_slug},{'_id':0})
    d=await database.db.conversations.find_one({'company_id':c['company_id'] if c else None,'conversation_id':conversation_id,'customer_email':customer_email},{'_id':0})
    if not d: raise HTTPException(404,'Conversation not found')
    return d
@r.get('/public/companies/{company_slug}/tickets/{ticket_id}')
async def public_ticket_status(company_slug:str,ticket_id:str,customer_email:str):
    c=await database.db.companies.find_one({'company_slug':company_slug},{'_id':0})
    d=await database.db.support_tickets.find_one({'company_id':c['company_id'] if c else None,'ticket_id':ticket_id,'customer_email':customer_email},{'_id':0,'description':0})
    if not d: raise HTTPException(404,'Ticket not found')
    return d

@r.get('/public/companies/{company_slug}')
async def public_company(company_slug:str):
    c=await database.db.companies.find_one({"company_slug":company_slug},{"_id":0,'company_name':1,'company_slug':1,'industry':1});
    if not c: raise HTTPException(404,"Company not found")
    return c
@r.post('/public/companies/{company_slug}/chat')
async def public_chat(company_slug:str,body:ChatRequest):
    c=await database.db.companies.find_one({"company_slug":company_slug},{"_id":0});
    if not c: raise HTTPException(404,"Company not found")
    hits=await pinecone.search(namespace(c['company_id']),body.message,'customer'); context='\n\n'.join(str(h) for h in hits)[:12000]
    answer=await chat([{"role":"system","content":"Answer only from supplied company context. If absent, say you do not know and offer human support.\n"+context},{"role":"user","content":body.message}])
    conv=body.conversation_id or ident('conv'); await database.db.conversations.update_one({"conversation_id":conv,"company_id":c['company_id']},{"$setOnInsert":{"conversation_id":conv,"company_id":c['company_id'],"customer_email":str(body.customer_email) if body.customer_email else None,"created_at":now()},"$push":{"messages":{"$each":[{"role":"customer","content":body.message,"at":now()},{"role":"assistant","content":answer,"at":now()}]}},"$set":{"updated_at":now(),"conversation_status":"open"}},upsert=True)
    return {"conversation_id":conv,"answer":answer,"sources":hits}
@r.post('/public/companies/{company_slug}/tickets',status_code=201)
async def public_ticket(company_slug:str,body:TicketCreate):
    c=await database.db.companies.find_one({"company_slug":company_slug},{"_id":0});
    if not c: raise HTTPException(404,"Company not found")
    d={"ticket_id":ident('tkt'),"company_id":c['company_id'],**body.model_dump(),"priority":"medium","status":"open","created_at":now(),"updated_at":now()}; await database.db.support_tickets.insert_one(d); return clean(d)
@r.get('/tickets')
async def tickets(user=Depends(current_user)): return [clean(x) async for x in database.db.support_tickets.find(tenant(user),{'_id':0})]
@r.get('/tickets/{ticket_id}')
async def ticket(ticket_id:str,user=Depends(current_user)):
    d=await database.db.support_tickets.find_one({"ticket_id":ticket_id,**tenant(user)},{"_id":0});
    if not d: raise HTTPException(404,"Ticket not found")
    return d
@r.patch('/tickets/{ticket_id}/status')
async def ticket_status(ticket_id:str,body:StatusChange,user=Depends(roles('support_agent','manager','company_admin'))):
    if body.status not in {'open','assigned','in_progress','waiting_for_customer','resolved','closed'}: raise HTTPException(422,"Invalid ticket status")
    res=await database.db.support_tickets.update_one({"ticket_id":ticket_id,**tenant(user)},{"$set":{"status":body.status,"resolution_notes":body.resolution_notes,"updated_at":now()}})
    if not res.matched_count: raise HTTPException(404,"Ticket not found")
    return await ticket(ticket_id,user)

@r.post('/copilot/understand-request')
async def understand(body:CopilotInput,user=Depends(current_user)):
    text=body.request_text.lower(); missing=[]
    if len(text)<25: missing.append('Please provide more detail about the requested action, purpose, and deadline.')
    category=next((x for x in ['purchase_request','equipment_request','maintenance_request','access_request','expense_request'] if x.split('_')[0] in text),'general_business_request')
    return {'category':category,'priority':'high' if any(x in text for x in ['urgent','immediately']) else 'medium','missing_information':missing}
@r.post('/copilot/generate-workflow',status_code=201)
async def workflow(body:CopilotInput,user=Depends(current_user)):
    summary=await understand(body,user)
    if summary['missing_information']: return {'status':'clarification_required',**summary}
    rid=ident('req'); approval=summary['category'] in {'purchase_request','expense_request','access_request'}
    doc={'request_id':rid,'company_id':user['company_id'],'created_by':user['user_id'],'request_text':body.request_text,'request_category':summary['category'],'extracted_information':summary,'priority':summary['priority'],'status':'awaiting_review','generated_workflow':{'steps':['Manager review','Create assigned activity','Complete and notify requester']},'requires_approval':approval,'related_ticket_id':body.ticket_id,'created_at':now(),'updated_at':now()}; await database.db.workflow_requests.insert_one(doc); return clean(doc)
@r.post('/copilot/confirm-workflow')
async def confirm_workflow(body:ConfirmWorkflow,user=Depends(current_user)):
    q={'request_id':body.request_id,**tenant(user),'created_by':user['user_id'],'status':'awaiting_review'}; d=await database.db.workflow_requests.find_one(q,{'_id':0})
    if not d: raise HTTPException(404,'Reviewable workflow not found')
    status='pending_approval' if d['requires_approval'] else 'in_progress'; await database.db.workflow_requests.update_one(q,{'$set':{'status':status,'updated_at':now()}})
    if d['requires_approval']:
        approval={'approval_id':ident('apr'),'company_id':user['company_id'],'request_id':d['request_id'],'requested_by':user['user_id'],'approver_id':None,'approval_type':d['request_category'],'description':d['request_text'],'status':'pending','remarks':None,'created_at':now(),'updated_at':now()}; await database.db.approvals.insert_one(approval)
    return {'request_id':d['request_id'],'status':status}
@r.get('/copilot/requests')
async def requests(user=Depends(current_user)): return [clean(x) async for x in database.db.workflow_requests.find(tenant(user),{'_id':0})]
@r.get('/copilot/requests/{request_id}')
async def request(request_id:str,user=Depends(current_user)):
    d=await database.db.workflow_requests.find_one({'request_id':request_id,**tenant(user)},{'_id':0});
    if not d: raise HTTPException(404,'Request not found')
    return d
@r.post('/activities',status_code=201)
async def create_activity(body:ActivityCreate,user=Depends(roles('company_admin','manager'))):
    d={'activity_id':ident('act'),'company_id':user['company_id'],**body.model_dump(),'status':'open','created_at':now(),'updated_at':now(),'last_updated_at':now()}; await database.db.activities.insert_one(d); return clean(d)
@r.get('/activities')
async def activities(user=Depends(current_user)): return [clean(x) async for x in database.db.activities.find({'$and':[tenant(user),{'$or':[{'assigned_to':user['user_id']},{}]}]},{'_id':0})]
@r.patch('/activities/{activity_id}/status')
async def activity_status(activity_id:str,body:StatusChange,user=Depends(current_user)):
    if body.status not in {'open','in_progress','blocked','completed','cancelled'}: raise HTTPException(422,'Invalid activity status')
    q={'activity_id':activity_id,**tenant(user),'$or':[{'assigned_to':user['user_id']},{'company_id':user['company_id'],'assigned_to':None}]} if user['role']=='employee' else {'activity_id':activity_id,**tenant(user)}
    res=await database.db.activities.update_one(q,{'$set':{'status':body.status,'updated_at':now(),'last_updated_at':now()}})
    if not res.matched_count: raise HTTPException(404,'Activity not found')
    return {'status':body.status}
@r.get('/approvals')
async def approvals(user=Depends(roles('manager','company_admin'))): return [clean(x) async for x in database.db.approvals.find(tenant(user),{'_id':0})]
async def decide(approval_id,body,user,status):
    q={'approval_id':approval_id,**tenant(user),'status':'pending','requested_by':{'$ne':user['user_id']}}
    d=await database.db.approvals.find_one_and_update(q,{'$set':{'status':status,'approver_id':user['user_id'],'remarks':body.remarks,'decision_at':now(),'updated_at':now()}},return_document=ReturnDocument.AFTER)
    if not d: raise HTTPException(409,'Approval unavailable, already decided, or self-approval prohibited')
    await database.db.workflow_requests.update_one({'request_id':d['request_id'],'company_id':user['company_id']},{'$set':{'status':'approved' if status=='approved' else 'rejected','updated_at':now()}}); return clean(d)
@r.post('/approvals/{approval_id}/approve')
async def approve(approval_id:str,body:ApprovalDecision,user=Depends(roles('manager','company_admin'))): return await decide(approval_id,body,user,'approved')
@r.post('/approvals/{approval_id}/reject')
async def reject(approval_id:str,body:ApprovalDecision,user=Depends(roles('manager','company_admin'))): return await decide(approval_id,body,user,'rejected')
@r.get('/notifications')
async def notifications(user=Depends(current_user)): return [clean(x) async for x in database.db.notifications.find({'company_id':user['company_id'],'recipient_id':user['user_id']},{'_id':0})]
@r.get('/dashboard/overview')
async def overview(user=Depends(current_user)):
    return {'tickets_open':await database.db.support_tickets.count_documents({**tenant(user),'status':{'$nin':['closed','resolved']}}),'activities_open':await database.db.activities.count_documents({**tenant(user),'status':{'$nin':['completed','cancelled']}}),'approvals_pending':await database.db.approvals.count_documents({**tenant(user),'status':'pending'})}
