# minhasCompras-BA

Base do projeto para consulta assistida de NFC-e no portal da SEFAZ Bahia.

## Fase 1 (autenticacao assistida)

Esta fase prepara o ambiente para:

- validar chave de acesso (44 digitos);
- preencher a chave automaticamente no portal;
- capturar apenas a imagem do captcha;
- abrir captcha localmente para digitacao manual no terminal;
- reenviar captcha com tentativas controladas e logs.

## Requisitos

- Python 3.12+
- Google Chrome instalado

## Instalacao

1. Crie e ative um ambiente virtual.
2. Instale as dependencias:

```bash
pip install -r requirements.txt
```

3. Copie `.env.example` para `.env` e ajuste os valores.

## Execucao

Execute pelo modo modulo para garantir imports corretos:

```bash
python -m src.main
```

## Estrutura principal

```text
src/
  main.py
  phase1/
    auth_flow.py
    selectors.py
utils/
  browser.py
  logger.py
data/
  captchas/
logs/
```

## Observacoes

- Nesta fase nao ha OCR.
- O captcha e manual por input do terminal.
- A imagem atual fica em `data/captchas/current_captcha.png`.
