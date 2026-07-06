from __future__ import annotations

import os

# from dotenv import load_dotenv
import uvicorn


def main() -> None:
    # Carrega variáveis de ambiente ANTES de qualquer import de módulos da app
    # load_dotenv()
    
    port = int(os.getenv("PORT", "10000"))
    uvicorn.run("src.api.app:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
