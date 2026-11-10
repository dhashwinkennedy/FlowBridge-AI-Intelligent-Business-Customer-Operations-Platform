import httpx
from app.core.config import get_settings

async def chat(messages:list[dict], temperature:float=.2) -> str:
    s=get_settings()
    if not s.openrouter_api_key: return "I could not consult the AI service right now. Please contact support for further help."
    headers={"Authorization":f"Bearer {s.openrouter_api_key}","Content-Type":"application/json"}
    async with httpx.AsyncClient(timeout=s.openrouter_timeout) as client:
        for attempt in range(2):
            try:
                r=await client.post(f"{s.openrouter_base_url.rstrip('/')}/chat/completions",headers=headers,json={"model":s.openrouter_model,"messages":messages,"temperature":temperature})
                r.raise_for_status(); return r.json()["choices"][0]["message"]["content"]
            except (httpx.HTTPError,KeyError):
                if attempt: raise
    return "Unable to generate a response."
