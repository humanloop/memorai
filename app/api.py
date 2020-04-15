""" Our api for exposing our models"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import HTMLResponse
import uvicorn
from models.question_gen import QuestionGenerator


# api setup
class RequestData(BaseModel):
    text_data: str


app = FastAPI(title="Memorai APP",
              description="AI memory assistant",
              version="0.0.1")

origins = [
    "http://localhost",
    "http://3.22.209.159",
    "http://questions.humanloop.ml",
    "https://questions.humanloop.ml"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

q_gen = QuestionGenerator()

# app endpoints
@app.get("/")
def root():
    return HTMLResponse("""
    <h1>Memorai API</h1>
    <p>See <a href='/docs'>docs</a></p>""")


@app.post('/question/')
def gen_question(text: RequestData, q_type: str = 'cloze'):
    try:
        return q_gen.gen_question(q_type, text.dict()['text_data'])
    except Exception:
        return HTTPException(500, {'debug_info': 'series type not supported'})


@app.options('/question/')
def gen_question():
    return {}


if __name__ == "__main__":
    uvicorn.run('api:app', host="0.0.0.0", port=80, reload=True)
