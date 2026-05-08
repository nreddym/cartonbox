from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.auth_controller import router as auth_router
from controllers.user_controller import router as user_router
from controllers.material_controller import router as material_router
from controllers.inventory_inward_controller import router as inventory_inward_router
from controllers.job_card_controller import router as job_card_router
from controllers.material_issue_controller import router as material_issue_router
from controllers.production_controller import router as production_router
from controllers.finished_goods_outward_controller import router as fg_outward_router
from controllers.inventory_adjustment_controller import router as inventory_adjustment_router
from controllers.audit_log_controller import router as audit_log_router
from controllers.reporting_controller import router as reporting_router

app = FastAPI(title="Carton Box Manufacturing System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(material_router)
app.include_router(inventory_inward_router)
app.include_router(job_card_router)
app.include_router(material_issue_router)
app.include_router(production_router)
app.include_router(fg_outward_router)
app.include_router(inventory_adjustment_router)
app.include_router(audit_log_router)
app.include_router(reporting_router)

@app.get("/")
def read_root():
    return {"message": "Carton Box Manufacturing System API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
