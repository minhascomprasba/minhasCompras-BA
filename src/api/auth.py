import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database.connection import SessionLocal
from src.database.models import Usuario
from src.api.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from src.api.errors import ValidationError, ApiError
from src.api.security import get_password_hash, verify_password, create_access_token, get_current_user_id

auth_router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@auth_router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    # Validate password rules: 8 chars, 1 num, 1 symbol
    if len(payload.password) < 8:
        raise ValidationError("INVALID_PASSWORD", "A senha deve ter no mínimo 8 caracteres.", {"field": "password"})
    if not re.search(r"\d", payload.password):
        raise ValidationError("INVALID_PASSWORD", "A senha deve ter no mínimo 1 número.", {"field": "password"})
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", payload.password):
        raise ValidationError("INVALID_PASSWORD", "A senha deve ter no mínimo 1 símbolo especial.", {"field": "password"})
    
    existing_user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing_user:
        raise ApiError("EMAIL_IN_USE", "Este e-mail já está em uso.", status_code=400)
    
    hashed = get_password_hash(payload.password)
    new_user = Usuario(email=payload.email, password_hash=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=new_user.id, email=new_user.email)
    )

@auth_router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise ApiError("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", status_code=401)
    
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email)
    )

@auth_router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise ApiError("USER_NOT_FOUND", "Usuário não encontrado.", status_code=404)
    return UserResponse(id=user.id, email=user.email)
