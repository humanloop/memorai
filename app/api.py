""" Our api for exposing our models"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse
import uvicorn
from models.question_gen import QuestionGenerator


# api setup
class RequestData(BaseModel):
    text_data: List[str]

app = FastAPI(title="Memorai APP",
              description="AI memory assistant",
              version="0.0.1")

app.add_middleware(CORSMiddleware,
                   allow_origins=["*"],
                   allow_credentials=True,
                   allow_methods=["*"],
                   allow_headers=["*"])

# app endpoints
@app.get("/")
def root():
    return HTMLResponse("""
    <h1>Memorai API</h1>
    <p>See <a href='/docs'>docs</a></p>""")


@app.post('question/')
def gen_question(text:RequestData):
    return 0
