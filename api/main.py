from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3003",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/square")
def square(n: str = Query(...)):
    try:
        num = float(n)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Missing or invalid query parameter: n",
        )
    if num == int(num):
        num = int(num)
    return {"number": num, "square": num * num}
