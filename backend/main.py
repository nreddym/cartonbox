from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.auth_controller import router as auth_router
from controllers.user_controller import router as user_router
from controllers.material_controller import router as material_router

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

@app.get("/")
def read_root():
    return {"message": "Carton Box Manufacturing System API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
