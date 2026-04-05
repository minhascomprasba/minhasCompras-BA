# minhasCompras-BA

Projeto de automacao assistida para consulta de NFC-e no portal da SEFAZ Bahia, com pipeline em fases:

1. Autenticacao assistida com captcha manual
2. Navegacao para aba Produtos / Servicos
3. Extracao estruturada de produtos para CSV
4. Persistencia em SQLite com SQLAlchemy 2.0

## Estado Atual do Projeto

Fluxo ponta a ponta implementado:

1. Abre a consulta da SEFAZ BA
2. Preenche chave de acesso automaticamente
3. Captura captcha para digitacao manual
4. Submete consulta e navega para aba Produtos / Servicos
5. Aguarda renderizacao dos produtos no DOM
6. Extrai campos dos itens da nota
7. Salva CSV em data/output/nota_fiscal.csv
8. Persiste em banco SQLite em data/output/banco_nfce.db

## Requisitos

- Python 3.12+
- Google Chrome instalado

## Dependencias

Principais bibliotecas:

- selenium
- python-dotenv
- webdriver-manager
- Pillow
- beautifulsoup4
- pandas
- sqlalchemy

Instalacao:

```bash
pip install -r requirements.txt
```

## Configuracao

Crie o arquivo .env a partir de .env.example.

Variaveis utilizadas:

- SEFAZ_URL
- NFE_ACCESS_KEY
- PAGE_TIMEOUT_SECONDS
- MAX_CAPTCHA_ATTEMPTS
- HEADLESS

Observacao importante:

- NFE_ACCESS_KEY deve conter exatamente 44 digitos numericos.

## Execucao

Execute em modo modulo:

```bash
python -m src.main
```

## Estrutura de Pastas

```text
src/
  main.py
  database/
    connection.py
    models.py
  phase1/
    auth_flow.py
    selectors.py
  phase2/
    navigation.py
    selectors.py
  phase3/
    parser.py
  phase4/
    db_loader.py
utils/
  browser.py
  logger.py
data/
  captchas/
  output/
    nota_fiscal.csv
    banco_nfce.db
logs/
  phase1.log
  phase2.log
  phase3.log
  phase4.log
```

## Detalhamento por Fase

### Fase 1 - Autenticacao Assistida

- Valida chave de acesso
- Preenche chave automaticamente
- Captura imagem do captcha em data/captchas/current_captcha.png
- Solicita captcha manual no terminal
- Mantem navegador aberto apos sucesso

### Fase 2 - Navegacao de Abas

- Clica em btn_visualizar_abas
- Aguarda carregamento da pagina de abas
- Clica em btn_aba_produtos
- Aguarda conteudo de produtos ficar disponivel no DOM

### Fase 3 - Extracao e Estruturacao

- Captura HTML da pagina
- Faz parsing com BeautifulSoup
- Extrai por produto:
  - descricao
  - quantidade
  - valor_total
  - unidade_comercial
  - codigo_ean_comercial
- Converte campos numericos para float
- Salva CSV em data/output/nota_fiscal.csv

### Fase 4 - Persistencia em Banco

- Cria tabelas automaticamente via Base.metadata.create_all
- Usa SQLAlchemy 2.0 com tipagem forte
- Salva nota fiscal e produtos relacionados
- Isola dados por nota para evitar mistura entre execucoes

## Modelo de Dados Atual

Tabela notas_fiscais:

- id (PK)
- codigo_acesso (unico)
- created_at

Tabela produtos_extraidos:

- id (PK)
- id_nota_fiscal (FK para notas_fiscais.id)
- descricao
- quantidade
- valor_total
- unidade_comercial
- codigo_ean_comercial

## Regra de Reprocessamento

Quando executar novamente com a mesma chave de acesso:

- a nota fiscal e localizada pelo codigo_acesso
- os produtos antigos daquela nota sao removidos
- os novos produtos sao inseridos novamente

Resultado:

- sem duplicidade para a mesma nota
- notas diferentes ficam separadas por id_nota_fiscal

## Logs

Cada fase grava log dedicado em logs:

- phase1.log
- phase2.log
- phase3.log
- phase4.log

## Observacoes

- Nao ha OCR nesta versao; captcha permanece manual.
- O navegador utiliza detach=True e permanece aberto apos a execucao.
