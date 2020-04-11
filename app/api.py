""" Our api for exposing our models"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse
import uvicorn
from models.question_gen import QuestionGenerator


# api setup
class RequestData(BaseModel):
    text_data: str


app = FastAPI(title="Memorai APP",
              description="AI memory assistant",
              version="0.0.1")

app.add_middleware(CORSMiddleware,
                   allow_origins=["*"],
                   allow_credentials=True,
                   allow_methods=["*"],
                   allow_headers=["*"])


q_gen = QuestionGenerator()


# app endpoints
@app.get("/")
def root():
    return HTMLResponse("""
    <h1>Memorai API</h1>
    <p>See <a href='/docs'>docs</a></p>""")


@app.post('question/')
def gen_question(text: RequestData):
    try:
        return q_gen.gen_question(text.dict()['text_data'])
    except Exception:
        return HTTPException(500, {'debug_info': 'series type not supported'})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)