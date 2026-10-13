"""App wiring: routers under /api plus the error handlers that keep every failure
as a readable {"detail": "..."} for the frontend to show."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .routers import auth, budgets, purchase_orders, vouchers
from .services import DomainError

app = FastAPI(title="Budget → PO → Voucher Tracker")

for router in (auth.router, budgets.router, purchase_orders.router, vouchers.router):
    app.include_router(router, prefix="/api")


@app.exception_handler(DomainError)
def domain_error(_: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(RequestValidationError)
def validation_error(_: Request, exc: RequestValidationError):
    #pydantic's default is a nested list, flatten to "field: problem" so the form can print it
    problems = [f"{'.'.join(str(p) for p in e['loc'][1:])}: {e['msg']}" for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "; ".join(problems)})


@app.get("/api/health")
def health():
    return {"ok": True}
