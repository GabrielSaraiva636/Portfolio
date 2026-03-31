from typing import Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field
import pandas as pd


class Entry(BaseModel):
    category: str = Field(min_length=2)
    value: float = Field(gt=0)
    kind: Literal["income", "expense"]


app = FastAPI(title="FinOps API", version="1.0.0")


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/summary")
def summary(entries: list[Entry]) -> dict[str, float]:
    frame = pd.DataFrame([e.model_dump() for e in entries])
    if frame.empty:
        return {"income": 0.0, "expense": 0.0, "balance": 0.0}

    income = frame.loc[frame["kind"] == "income", "value"].sum()
    expense = frame.loc[frame["kind"] == "expense", "value"].sum()
    return {
        "income": float(income),
        "expense": float(expense),
        "balance": float(income - expense),
    }
