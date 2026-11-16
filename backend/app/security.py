from fastapi import Header, HTTPException, status
from app.config import settings

def verificar_admin(x_admin_key: str = Header(..., description="Chave de administrador")):
    if x_admin_key != settings.admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de administrador inválida."
        )
    return True