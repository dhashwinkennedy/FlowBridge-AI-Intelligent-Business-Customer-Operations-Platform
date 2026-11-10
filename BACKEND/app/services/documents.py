import re, uuid
from pathlib import Path
import fitz
from docx import Document as Docx
from fastapi import HTTPException, UploadFile
from app.core.config import get_settings

async def save_and_extract(upload: UploadFile, document_id: str) -> tuple[Path,list[tuple[int,str]]]:
    s=get_settings(); suffix=Path(upload.filename or "").suffix.lower()
    if suffix not in {".pdf",".docx",".txt"}: raise HTTPException(415,"Only PDF, DOCX, and TXT files are supported")
    data=await upload.read()
    if len(data)>s.max_upload_size_mb*1024*1024: raise HTTPException(413,"File exceeds upload limit")
    safe=re.sub(r"[^A-Za-z0-9._-]","_",Path(upload.filename or "document").name)
    s.upload_path.mkdir(parents=True,exist_ok=True); path=s.upload_path/f"{document_id}_{safe}"; path.write_bytes(data)
    try:
        if suffix==".pdf": pages=[(i+1,p.get_text("text").strip()) for i,p in enumerate(fitz.open(stream=data,filetype="pdf"))]
        elif suffix==".docx": pages=[(1,"\n".join(p.text for p in Docx(path).paragraphs))]
        else: pages=[(1,data.decode("utf-8",errors="replace"))]
    except Exception as e: path.unlink(missing_ok=True); raise HTTPException(422,"Could not extract document text") from e
    pages=[x for x in pages if x[1].strip()]
    if not pages: path.unlink(missing_ok=True); raise HTTPException(422,"No usable text found; scanned PDFs require OCR")
    return path,pages
def chunks(pages:list[tuple[int,str]]):
    s=get_settings(); out=[]
    for page,text in pages:
        start=0
        while start<len(text):
            end=min(len(text),start+s.chunk_size_chars)
            if end<len(text):
                cut=max(text.rfind(". ",start,end),text.rfind("\n",start,end)); end=cut+1 if cut>start+s.chunk_size_chars//2 else end
            part=text[start:end].strip()
            if part: out.append((page,part))
            if end>=len(text): break
            start=max(end-s.chunk_overlap_chars,start+1)
    return out
