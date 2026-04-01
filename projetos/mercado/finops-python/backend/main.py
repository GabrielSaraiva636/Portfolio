from typing import Literal
from fastapi import FastAPI
from fastapi.responses import Response
from pydantic import BaseModel, Field
import pandas as pd


class Entry(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    category: str = Field(min_length=2)
    amount: float = Field(gt=0)
    kind: Literal["income", "expense"]


class CompareRequest(BaseModel):
    entries: list[Entry]
    current_month: str = Field(pattern=r"^\d{4}-\d{2}$")
    compare_month: str = Field(pattern=r"^\d{4}-\d{2}$")


class AlertRequest(BaseModel):
    entries: list[Entry]
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    budgets: dict[str, float]


app = FastAPI(title="FinOps API", version="2.0.0")


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"ok": True, "service": "finops-api"}


@app.post("/api/summary")
def summary(entries: list[Entry]) -> dict[str, float]:
    frame = to_frame(entries)
    if frame.empty:
        return {"income": 0.0, "expense": 0.0, "balance": 0.0}

    income = frame.loc[frame["kind"] == "income", "amount"].sum()
    expense = frame.loc[frame["kind"] == "expense", "amount"].sum()
    return {
        "income": float(income),
        "expense": float(expense),
        "balance": float(income - expense),
    }


@app.post("/api/compare")
def compare(payload: CompareRequest) -> dict[str, dict[str, float]]:
    frame = to_frame(payload.entries)
    current = summarize_month(frame, payload.current_month)
    previous = summarize_month(frame, payload.compare_month)
    return {"current": current, "compare": previous}


@app.post("/api/alerts")
def alerts(payload: AlertRequest) -> dict[str, list[dict[str, float | str]]]:
    frame = to_frame(payload.entries)
    month_frame = frame.loc[frame["month"] == payload.month]
    expense_frame = month_frame.loc[month_frame["kind"] == "expense"]

    spent_by_category = expense_frame.groupby("category")["amount"].sum().to_dict()
    alert_items: list[dict[str, float | str]] = []

    for category, spent in spent_by_category.items():
        budget = float(payload.budgets.get(category, 0.0))
        if budget <= 0 or spent <= budget:
            continue
        alert_items.append(
            {
                "category": str(category),
                "spent": float(spent),
                "budget": budget,
                "overflow": float(spent - budget),
                "rate": float((spent / budget) * 100),
            }
        )

    return {"alerts": alert_items}


@app.post("/api/export/csv")
def export_csv(entries: list[Entry]) -> Response:
    frame = to_frame(entries)
    ordered = frame[["date", "category", "kind", "amount"]]
    csv_payload = ordered.to_csv(index=False)
    headers = {
        "Content-Disposition": 'attachment; filename="finops-export.csv"',
    }
    return Response(content=csv_payload, media_type="text/csv; charset=utf-8", headers=headers)


@app.post("/api/export/xlsx")
def export_xlsx(entries: list[Entry]) -> Response:
    frame = to_frame(entries)
    rows = []
    for row in frame[["date", "category", "kind", "amount"]].itertuples(index=False):
        rows.append(
            f"<Row><Cell><Data ss:Type=\"String\">{row.date}</Data></Cell>"
            f"<Cell><Data ss:Type=\"String\">{row.category}</Data></Cell>"
            f"<Cell><Data ss:Type=\"String\">{row.kind}</Data></Cell>"
            f"<Cell><Data ss:Type=\"Number\">{row.amount}</Data></Cell></Row>"
        )

    workbook_xml = f"""<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="FinOps">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Data</Data></Cell>
        <Cell><Data ss:Type="String">Categoria</Data></Cell>
        <Cell><Data ss:Type="String">Tipo</Data></Cell>
        <Cell><Data ss:Type="String">Valor</Data></Cell>
      </Row>
      {"".join(rows)}
    </Table>
  </Worksheet>
</Workbook>"""

    headers = {
        "Content-Disposition": 'attachment; filename="finops-export.xlsx"',
    }
    return Response(
        content=workbook_xml,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


def to_frame(entries: list[Entry]) -> pd.DataFrame:
    frame = pd.DataFrame([e.model_dump() for e in entries])
    if frame.empty:
        frame = pd.DataFrame(columns=["date", "category", "kind", "amount"])
    frame["month"] = frame["date"].astype(str).str.slice(0, 7)
    return frame


def summarize_month(frame: pd.DataFrame, month: str) -> dict[str, float]:
    month_frame = frame.loc[frame["month"] == month]
    if month_frame.empty:
        return {"income": 0.0, "expense": 0.0, "balance": 0.0, "margin": 0.0}

    income = month_frame.loc[month_frame["kind"] == "income", "amount"].sum()
    expense = month_frame.loc[month_frame["kind"] == "expense", "amount"].sum()
    balance = income - expense
    margin = float((balance / income) * 100) if income > 0 else 0.0
    return {
        "income": float(income),
        "expense": float(expense),
        "balance": float(balance),
        "margin": margin,
    }
