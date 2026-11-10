from pydantic import BaseModel, Field, EmailStr
from typing import Literal, Any

Role = Literal["platform_admin","company_admin","manager","employee","support_agent"]
class RegisterCompany(BaseModel):
    company_name: str=Field(min_length=2,max_length=120); company_slug: str=Field(pattern=r"^[a-z0-9-]{2,64}$")
    admin_name: str=Field(min_length=2,max_length=120); admin_email: EmailStr; password: str=Field(min_length=8,max_length=128)
    industry: str|None=None
class Login(BaseModel): email: EmailStr; password: str
class EmployeeCreate(BaseModel): name:str; email:EmailStr; password:str=Field(min_length=8); role:Role="employee"; department:str|None=None
class ChatRequest(BaseModel): message:str=Field(min_length=1,max_length=6000); conversation_id:str|None=None; customer_name:str|None=None; customer_email:EmailStr|None=None
class TicketCreate(BaseModel): customer_name:str; customer_email:EmailStr; subject:str; description:str; category:str="general"; conversation_id:str|None=None
class StatusChange(BaseModel): status:str; resolution_notes:str|None=None
class Assignment(BaseModel): user_id:str|None=None; department:str|None=None
class CopilotInput(BaseModel): request_text:str=Field(min_length=3,max_length=6000); conversation_id:str|None=None; ticket_id:str|None=None
class ConfirmWorkflow(BaseModel): request_id:str
class ActivityCreate(BaseModel): title:str; description:str=""; assigned_to:str|None=None; assigned_department:str|None=None; priority:str="medium"; deadline:str|None=None; request_id:str|None=None
class ApprovalDecision(BaseModel): remarks:str|None=None
