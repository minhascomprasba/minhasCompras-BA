from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database.connection import SessionLocal
from src.database.models import Usuario
from src.api.schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from src.api.errors import ValidationError, ApiError
from src.api.security import get_password_hash, verify_password, create_access_token, get_current_user_id

auth_router = APIRouter(prefix="/auth", tags=["auth"])
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def _validate_password_rules(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValidationError(
            "INVALID_PASSWORD",
            "A senha deve ter no minimo 8 caracteres.",
            {"field": "password", "rule": "min_length", "min_length": PASSWORD_MIN_LENGTH},
        )
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValidationError(
            "INVALID_PASSWORD",
            "A senha deve ter no maximo 128 caracteres.",
            {"field": "password", "rule": "max_length", "max_length": PASSWORD_MAX_LENGTH},
        )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@auth_router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    _validate_password_rules(payload.password)
    
    existing_user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing_user:
        raise ApiError("EMAIL_IN_USE", "Este e-mail já está em uso.", status_code=400)
    
    try:
        hashed = get_password_hash(payload.password)
    except ValueError as exc:
        raise ValidationError(
            "INVALID_PASSWORD",
            "Nao foi possivel processar a senha informada.",
            {"field": "password", "reason": "hash_error"},
        ) from exc
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
    _validate_password_rules(payload.password)

    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not user:
        raise ApiError("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", status_code=401)

    try:
        is_valid_password = verify_password(payload.password, user.password_hash)
    except ValueError as exc:
        raise ValidationError(
            "INVALID_PASSWORD",
            "Nao foi possivel validar a senha informada.",
            {"field": "password", "reason": "verify_error"},
        ) from exc

    if not is_valid_password:
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
