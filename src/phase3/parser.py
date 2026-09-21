from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
from bs4 import BeautifulSoup, Tag

from utils.logger import setup_logger


class ProductParser:
    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.split()).strip()

    @classmethod
    def _normalize_label_key(cls, value: str) -> str:
        text = cls._normalize_text(value)
        text = text.rstrip(":")
        text = unicodedata.normalize("NFKD", text)
        text = "".join(ch for ch in text if not unicodedata.combining(ch))
        return text.casefold()

    @classmethod
    def _to_float(cls, value: str) -> float | None:
        normalized = cls._normalize_text(value)
        if not normalized:
            return None

        match = re.search(r"-?\d[\d\.,]*", normalized)
        if not match:
            return None

        number_text = match.group(0)

        if "," in number_text:
            number_text = number_text.replace(".", "")
            number_text = number_text.replace(",", ".")
        else:
            number_text = number_text.replace(",", "")

        try:
            return float(number_text)
        except ValueError:
            return None

    @classmethod
    def _extract_span_text_by_class(cls, container: Tag, class_name: str) -> str:
        section = container.find(class_=class_name)
        if not section:
            return ""

        span = section.find("span")
        if not span:
            return ""

        return cls._normalize_text(span.get_text(" ", strip=True))

    @classmethod
    def _extract_value_by_label(cls, container: Tag, label_text: str) -> str:
        target_label_key = cls._normalize_label_key(label_text)

        for label in container.find_all("label"):
            current_label = cls._normalize_label_key(label.get_text(" ", strip=True))
            if current_label != target_label_key:
                continue

            candidate = label.find_next("span")
            if candidate:
                return cls._normalize_text(candidate.get_text(" ", strip=True))

        return ""

    @classmethod
    def _extract_value_by_labels(cls, container: Tag, label_texts: list[str]) -> str:
        for label_text in label_texts:
            value = cls._extract_value_by_label(container, label_text)
            if value:
                return value
        return ""

    @classmethod
    def _extract_span_text_by_class_from_root(cls, root: Tag, class_name: str) -> str:
        section = root.find(class_=class_name)
        if not section:
            return ""

        span = section.find("span")
        if span:
            return cls._normalize_text(span.get_text(" ", strip=True))

        return cls._normalize_text(section.get_text(" ", strip=True))

    @classmethod
    def _parse_datetime_br(cls, value: str, time_value: str = "") -> datetime | None:
        date_text = cls._normalize_text(value)
        time_text = cls._normalize_text(time_value)

        if not date_text:
            return None

        combined = cls._normalize_text(f"{date_text} {time_text}".strip())
        combined = combined.replace("às", " ")

        patterns = [
            (r"(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?", lambda m: datetime(
                int(m.group(1)), int(m.group(2)), int(m.group(3)),
                int(m.group(4)), int(m.group(5)), int(m.group(6) or 0),
            )),
            (r"(\d{2})/(\d{2})/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?", lambda m: datetime(
                int(m.group(3)), int(m.group(2)), int(m.group(1)),
                int(m.group(4)), int(m.group(5)), int(m.group(6) or 0),
            )),
            (r"(\d{2})/(\d{2})/(\d{4})", lambda m: datetime(
                int(m.group(3)), int(m.group(2)), int(m.group(1)),
            )),
        ]

        for pattern, builder in patterns:
            match = re.search(pattern, combined)
            if match:
                try:
                    return builder(match)
                except ValueError:
                    continue

        return None

    @classmethod
    def _extract_value_by_label_from_rows(cls, container: Tag, label_text: str) -> str:
        target_label_key = cls._normalize_label_key(label_text)

        for row in container.find_all("tr"):
            cells = row.find_all(["td", "th", "label"])
            for index, cell in enumerate(cells):
                current_label = cls._normalize_label_key(cell.get_text(" ", strip=True))
                if current_label != target_label_key:
                    continue

                for candidate in cells[index + 1 :]:
                    value = cls._normalize_text(candidate.get_text(" ", strip=True))
                    if value:
                        return value

                next_span = cell.find_next("span")
                if next_span:
                    return cls._normalize_text(next_span.get_text(" ", strip=True))

        return ""

    @classmethod
    def _extract_value_by_labels_from_rows(cls, container: Tag, label_texts: list[str]) -> str:
        for label_text in label_texts:
            value = cls._extract_value_by_label_from_rows(container, label_text)
            if value:
                return value
        return ""

    @classmethod
    def _extract_value_by_partial_class(cls, root: Tag, token: str) -> str:
        token_key = cls._normalize_label_key(token)

        for element in root.find_all(class_=True):
            classes = element.get("class", [])
            if not isinstance(classes, list):
                classes = [str(classes)]

            if not any(token_key in cls._normalize_label_key(class_name) for class_name in classes):
                continue

            span = element.find("span")
            if span:
                value = cls._normalize_text(span.get_text(" ", strip=True))
            else:
                value = cls._normalize_text(element.get_text(" ", strip=True))

            if value:
                return value

        return ""

    @classmethod
    def _extract_value_by_regex(cls, html_content: str) -> str:
        patterns = [
            r"Data\s*(?:e\s*Hora\s*)?de\s*Emiss[aã]o[^0-9]{0,20}(\d{2}/\d{2}/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)",
            r"Data\s*(?:e\s*Hora\s*)?de\s*Emiss[aã]o[^0-9]{0,20}(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?)",
        ]

        for pattern in patterns:
            match = re.search(pattern, html_content, flags=re.IGNORECASE)
            if match:
                return cls._normalize_text(match.group(1))

        return ""

    @classmethod
    def _log_data_compra_diagnostics(cls, soup: Tag, logger: Any) -> None:
        classes: set[str] = set()
        for element in soup.find_all(class_=True):
            element_classes = element.get("class", [])
            if not isinstance(element_classes, list):
                element_classes = [str(element_classes)]
            for class_name in element_classes:
                normalized = cls._normalize_label_key(class_name)
                if "fixo" in normalized or "emiss" in normalized or "dhemi" in normalized:
                    classes.add(class_name)

        if classes:
            logger.warning(
                "Fase 3: classes relacionadas a emissao encontradas no HTML: %s",
                ", ".join(sorted(classes)[:20]),
            )

    @classmethod
    def _parse_data_compra(cls, soup: Tag, html_content: str = "", logger: Any | None = None) -> datetime | None:
        emission_class_names = [
            "fixo-nfe-dhemi",
            "fixo-ide-dhemi",
            "fixo-nfe-dtemi",
            "fixo-ide-dtemi",
            "fixo-ide-demi",
            "fixo-nfe-demi",
            "fixo-ide-hemi",
            "fixo-nfe-hemi",
        ]
        for class_name in emission_class_names:
            raw_value = cls._extract_span_text_by_class_from_root(soup, class_name)
            parsed = cls._parse_datetime_br(raw_value)
            if parsed is not None:
                return parsed

        for token in ("dhemi", "dtemi", "demi"):
            raw_value = cls._extract_value_by_partial_class(soup, token)
            parsed = cls._parse_datetime_br(raw_value)
            if parsed is not None:
                return parsed

        combined_labels = [
            "Data e Hora de Emissao",
            "Data/Hora de Emissao",
            "Data de Emissao",
            "Data da Emissao",
        ]
        for label in combined_labels:
            for extractor in (cls._extract_value_by_label, cls._extract_value_by_label_from_rows):
                raw_value = extractor(soup, label)
                parsed = cls._parse_datetime_br(raw_value)
                if parsed is not None:
                    return parsed

        date_raw = cls._extract_value_by_labels_from_rows(
            soup,
            ["Data de Emissao", "Data da Emissao"],
        ) or cls._extract_value_by_labels(
            soup,
            ["Data de Emissao", "Data da Emissao"],
        )
        time_raw = cls._extract_value_by_labels_from_rows(
            soup,
            ["Hora de Emissao", "Hora da Emissao"],
        ) or cls._extract_value_by_labels(
            soup,
            ["Hora de Emissao", "Hora da Emissao"],
        )
        parsed = cls._parse_datetime_br(date_raw, time_raw)
        if parsed is not None:
            return parsed

        regex_value = cls._extract_value_by_regex(html_content)
        parsed = cls._parse_datetime_br(regex_value)
        if parsed is not None and logger is not None:
            logger.info("Fase 3: data/hora da compra extraida via regex.")

        if parsed is None and logger is not None:
            cls._log_data_compra_diagnostics(soup, logger)

        return parsed

    _PAYMENT_CODE_RE = re.compile(r"^\d{1,2}\s*-\s*.+")
    _PAYMENT_NAME_RE = re.compile(
        r"dinheiro|cheque|cartao|credito loja|vale |pix|pagamento instantaneo|"
        r"boleto|deposito|transferencia|fidelidade|cashback|sem pagamento|outros"
    )
    _PAYMENT_SKIP_LABEL_KEYS = {
        "qtd. total de itens",
        "valor total r$",
        "descontos r$",
        "valor a pagar r$",
        "forma de pagamento",
        "valor pago r$",
        "valor pago",
    }
    # Codigos do campo tPag (grupo YA da NFe/NFCe).
    _TPAG_LABELS = {
        "01": "Dinheiro",
        "02": "Cheque",
        "03": "Cartão de Crédito",
        "04": "Cartão de Débito",
        "05": "Crédito em Loja",
        "10": "Vale Alimentação",
        "11": "Vale Refeição",
        "12": "Vale Presente",
        "13": "Vale Combustível",
        "15": "Boleto Bancário",
        "16": "Depósito Bancário",
        "17": "PIX Dinâmico",
        "18": "Transferência Bancária / Carteira Digital",
        "19": "Cashback / Crédito de Fidelidade",
        "20": "PIX Estático",
        "21": "Crédito em Loja",
        "22": "Pagamento Eletrônico não Informado",
        "90": "Sem Pagamento",
        "99": "Outros",
    }
    # Valores que existem na nota mas nao dizem como o cliente pagou.
    _GENERIC_PAYMENT_KEYS = {
        "outros",
        "diversos",
        "pagamento diversos",
        "pagamentos diversos",
        "pagamento eletronico nao informado",
        "nao informado",
    }
    _MEIO_LABEL_KEYS = ("meio de pagamento", "forma de pagamento", "tipo de pagamento")
    _DESCRICAO_LABEL_KEYS = ("descricao do meio de pagamento", "descricao do pagamento")
    _BANDEIRA_LABEL_KEYS = (
        "bandeira da operadora de cartao de credito e/ou debito",
        "bandeira da operadora",
        "bandeira",
    )

    @classmethod
    def _split_payment_code(cls, value: str) -> tuple[str | None, str]:
        text = cls._normalize_text(value)
        match = re.match(r"^(\d{1,2})\s*-\s*(.*)$", text)
        if match:
            return match.group(1).zfill(2), cls._normalize_text(match.group(2))
        if re.fullmatch(r"\d{1,2}", text):
            return text.zfill(2), ""
        return None, text

    @classmethod
    def _format_meio(cls, value: str) -> str:
        """Preserva o texto como a nota apresenta ("99 - Outros"), completando
        apenas quando a pagina traz o codigo tPag sem descricao."""
        text = cls._normalize_text(value)
        code, description = cls._split_payment_code(text)
        if code is not None and not description and code in cls._TPAG_LABELS:
            return f"{code} - {cls._TPAG_LABELS[code]}"
        return text

    @classmethod
    def is_generic_meio_pagamento(cls, value: str | None) -> bool:
        if not value:
            return True

        code, description = cls._split_payment_code(value)
        if code == "99":
            return True

        key = cls._normalize_label_key(description or value)
        key = re.sub(r"\s*\(.*\)\s*$", "", key).strip()
        return key in cls._GENERIC_PAYMENT_KEYS

    @classmethod
    def prefer_meio_pagamento(cls, *candidates: str | None) -> str | None:
        specific = [item for item in candidates if item and not cls.is_generic_meio_pagamento(item)]
        if specific:
            return specific[0]
        generic = [item for item in candidates if item]
        return generic[0] if generic else None

    @classmethod
    def _is_payment_label(cls, value: str) -> bool:
        text = cls._normalize_text(value)
        if not text:
            return False

        key = cls._normalize_label_key(text)
        if key in cls._PAYMENT_SKIP_LABEL_KEYS or "tributo" in key:
            return False

        if not cls._PAYMENT_CODE_RE.match(text):
            return False

        return bool(cls._PAYMENT_NAME_RE.search(key))

    @classmethod
    def _collect_label_value_pairs(cls, root: Tag) -> dict[str, list[str]]:
        """Na aba de cobranca os rotulos ficam em uma linha e os valores na
        seguinte, alinhados por coluna. Ler por posicao evita confundir
        'Ind. Forma de Pagamento' com 'Meio de Pagamento'."""
        pairs: dict[str, list[str]] = {}
        pending_labels: list[str] | None = None

        for row in root.find_all("tr"):
            if row.find("table") is not None:
                continue

            cells = row.find_all(["td", "th"])
            if not cells:
                continue

            texts = [cls._normalize_text(cell.get_text(" ", strip=True)) for cell in cells]
            if any(cell.find("label") for cell in cells):
                pending_labels = [cls._normalize_label_key(text) for text in texts]
                continue

            if pending_labels is None:
                continue

            for label_key, value in zip(pending_labels, texts):
                if label_key and value:
                    pairs.setdefault(label_key, []).append(value)
            pending_labels = None

        return pairs

    @classmethod
    def _collect_meios_from_linha_forma(cls, soup: Tag) -> list[str]:
        linha_forma = soup.find(id="linhaForma")
        if not isinstance(linha_forma, Tag):
            return []

        meios: list[str] = []
        for sibling in linha_forma.find_next_siblings("div"):
            if not isinstance(sibling, Tag):
                continue
            if sibling.get("id") != "linhaTotal":
                break

            classes = sibling.get("class") or []
            if not isinstance(classes, list):
                classes = [str(classes)]
            if "spcTop" in classes:
                break

            label = sibling.find("label", class_="tx") or sibling.find("label")
            if not isinstance(label, Tag):
                break

            text = cls._normalize_text(label.get_text(" ", strip=True))
            if not text or "tributo" in cls._normalize_label_key(text):
                break

            has_tx_class = isinstance(sibling.find("label", class_="tx"), Tag)
            if has_tx_class or cls._is_payment_label(text):
                meios.append(text)
                continue
            break

        return list(dict.fromkeys(meios))

    @classmethod
    def _parse_meio_pagamento(cls, soup: Tag, html_content: str = "", logger: Any | None = None) -> str | None:
        scope = soup.find(id="Cobranca")
        pairs = cls._collect_label_value_pairs(scope if isinstance(scope, Tag) else soup)

        def values_for(label_keys: tuple[str, ...]) -> list[str]:
            found: list[str] = []
            for label_key in label_keys:
                found.extend(pairs.get(label_key, []))
            return list(dict.fromkeys(found))

        meios = values_for(cls._MEIO_LABEL_KEYS) or cls._collect_meios_from_linha_forma(soup)
        descricoes = values_for(cls._DESCRICAO_LABEL_KEYS)
        bandeiras = values_for(cls._BANDEIRA_LABEL_KEYS)

        if not meios and html_content:
            forma_match = re.search(r"Forma de pagamento", html_content, flags=re.IGNORECASE)
            if forma_match:
                region = html_content[forma_match.start() : forma_match.start() + 800]
                meios = [
                    match
                    for match in re.findall(r"\d{1,2}\s*-\s*[A-Za-zÀ-ÿ][^\n<]+", region)
                    if cls._is_payment_label(match)
                ]
                if meios and logger is not None:
                    logger.info("Fase 3: meio de pagamento extraido via regex.")

        resolved = cls.prefer_meio_pagamento(*(cls._format_meio(value) for value in meios))
        if not cls.is_generic_meio_pagamento(resolved):
            return resolved

        # tPag generico ("99 - Outros"): a descricao ou o grupo de cartao ainda
        # podem dizer como o cliente pagou.
        descricao_especifica = next(
            (
                cls._format_meio(descricao)
                for descricao in descricoes
                if not cls.is_generic_meio_pagamento(descricao)
            ),
            None,
        )
        if descricao_especifica:
            return descricao_especifica

        if bandeiras:
            return f"Cartão ({bandeiras[0]})"

        return resolved

    @classmethod
    def extract_data_compra(cls, html_content: str) -> datetime | None:
        logger = setup_logger(log_file="logs/phase3.log", logger_name="phase3")
        soup = BeautifulSoup(html_content, "lxml")
        try:
            return cls._parse_data_compra(soup, html_content=html_content, logger=logger)
        finally:
            soup.decompose()
            del soup

    @classmethod
    def extract_meio_pagamento(cls, html_content: str) -> str | None:
        logger = setup_logger(log_file="logs/phase3.log", logger_name="phase3")
        soup = BeautifulSoup(html_content, "lxml")
        try:
            return cls._parse_meio_pagamento(soup, html_content=html_content, logger=logger)
        finally:
            soup.decompose()
            del soup

    @classmethod
    def _extract_unit(cls, product_table: Tag, toggable_table: Tag | None) -> str:
        unit_visible = cls._extract_span_text_by_class(product_table, "fixo-prod-serv-und")
        if unit_visible:
            return unit_visible

        if toggable_table is None:
            return ""

        return cls._extract_value_by_label(toggable_table, "Unidade Comercial")

    @classmethod
    def _parse_products(cls, soup: Tag, logger: Any) -> list[dict[str, Any]]:
        products: list[dict[str, Any]] = []
        product_tables = soup.select(".table_produtos")
        logger.info("Fase 3: %s blocos de produtos encontrados.", len(product_tables))

        for index, product_table in enumerate(product_tables, start=1):
            if not isinstance(product_table, Tag):
                continue

            toggable_table = product_table.find("table", class_="toggable")

            descricao = cls._extract_span_text_by_class(product_table, "fixo-prod-serv-descricao")
            quantidade_raw = cls._extract_span_text_by_class(product_table, "fixo-prod-serv-qtd")
            valor_total_raw = cls._extract_span_text_by_class(product_table, "fixo-prod-serv-vb")
            unidade_comercial = cls._extract_unit(product_table, toggable_table if isinstance(toggable_table, Tag) else None)

            codigo_ean_comercial = ""
            if isinstance(toggable_table, Tag):
                codigo_ean_comercial = cls._extract_value_by_labels(
                    toggable_table,
                    ["Codigo EAN Comercial", "Codigo EAN", "EAN Comercial"],
                )
                
            codigo_ncm = ""

            if isinstance(toggable_table, Tag):
                codigo_ncm = cls._extract_value_by_labels(
                    toggable_table,
                    ["Codigo NCM", "Codigo ncm", "Código NCM", "Código ncm"],
                )

            valor_desconto_raw = cls._extract_span_text_by_class(product_table, "fixo-prod-serv-vdesc")
            if not valor_desconto_raw and isinstance(toggable_table, Tag):
                valor_desconto_raw = cls._extract_value_by_labels(
                    toggable_table,
                    ["Valor do Desconto", "Valor Desconto", "Vl. Desconto", "Desconto"],
                )
            valor_desconto = cls._to_float(valor_desconto_raw) or 0.0

            valor_total = cls._to_float(valor_total_raw)
            valor_pago = (
                round(max(valor_total - valor_desconto, 0.0), 2)
                if valor_total is not None
                else None
            )

            product = {
                "descricao": descricao,
                "quantidade": cls._to_float(quantidade_raw),
                "valor_total": valor_total,
                "valor_desconto": valor_desconto,
                "valor_pago": valor_pago,
                "unidade_comercial": cls._normalize_text(unidade_comercial),
                "codigo_ean_comercial": cls._normalize_text(codigo_ean_comercial),
                "codigo_ncm_comercial": cls._normalize_text(codigo_ncm),
            }
            products.append(product)
            logger.info("Fase 3: produto %s extraido com sucesso.", index)

        if not products:
            logger.warning(
                "Fase 3: nenhum produto extraido. Verifique sincronizacao da aba de produtos e seletores atuais."
            )

        logger.info("Fase 3: extracao concluida com %s produtos.", len(products))
        return products

    _DESCONTO_NOTA_LABELS = [
        "Valor Desconto R$",
        "Valor do Desconto",
        "Descontos R$",
        "Desconto R$",
        "Descontos",
        "Valor Desconto",
    ]
    _VALOR_A_PAGAR_LABELS = [
        "Valor a Pagar R$",
        "Valor a pagar R$",
        "Valor a Pagar",
    ]

    @classmethod
    def _parse_totais_nota(cls, soup: Tag) -> tuple[float | None, float | None]:
        """Le o bloco de totais da nota (Valor Desconto R$ / Valor a Pagar R$).
        Muitas notas so informam o desconto aqui, sem detalhar por item."""
        desconto_raw = cls._extract_value_by_labels(
            soup, cls._DESCONTO_NOTA_LABELS
        ) or cls._extract_value_by_labels_from_rows(soup, cls._DESCONTO_NOTA_LABELS)

        a_pagar_raw = cls._extract_value_by_labels(
            soup, cls._VALOR_A_PAGAR_LABELS
        ) or cls._extract_value_by_labels_from_rows(soup, cls._VALOR_A_PAGAR_LABELS)

        return cls._to_float(desconto_raw), cls._to_float(a_pagar_raw)

    @classmethod
    def _reconciliar_descontos(
        cls,
        produtos: list[dict[str, Any]],
        valor_desconto_nota: float | None,
        valor_pago_nota: float | None,
        logger: Any,
    ) -> tuple[float | None, float | None]:
        """Concilia o desconto global da nota com os descontos ja atribuidos a
        cada item. Quando a nota informa mais desconto do que o total ja
        detalhado por item, o restante e rateado proporcionalmente entre os
        itens sem desconto proprio (caso mais comum: desconto so no total)."""
        if not produtos:
            return valor_desconto_nota, valor_pago_nota

        soma_desconto_itens = sum(produto.get("valor_desconto") or 0.0 for produto in produtos)

        if valor_desconto_nota is not None and valor_desconto_nota > soma_desconto_itens + 0.01:
            desconto_restante = round(valor_desconto_nota - soma_desconto_itens, 2)
            candidatos = [
                produto
                for produto in produtos
                if not produto.get("valor_desconto") and produto.get("valor_total")
            ]
            peso_total = sum(produto["valor_total"] for produto in candidatos)

            if candidatos and peso_total > 0:
                logger.info(
                    "Fase 3: desconto de R$ %.2f nao detalhado por item; rateado entre %s item(ns).",
                    desconto_restante,
                    len(candidatos),
                )
                for produto in candidatos:
                    alocado = round(desconto_restante * (produto["valor_total"] / peso_total), 2)
                    produto["valor_desconto"] = round((produto.get("valor_desconto") or 0.0) + alocado, 2)
                    produto["valor_pago"] = round(max(produto["valor_total"] - produto["valor_desconto"], 0.0), 2)

        if valor_desconto_nota is None:
            valor_desconto_nota = round(sum(produto.get("valor_desconto") or 0.0 for produto in produtos), 2)

        if valor_pago_nota is None:
            valor_pago_nota = round(
                sum(
                    produto["valor_pago"] if produto.get("valor_pago") is not None else (produto.get("valor_total") or 0.0)
                    for produto in produtos
                ),
                2,
            )

        return valor_desconto_nota, valor_pago_nota

    @classmethod
    def parse_page(cls, html_content: str) -> dict[str, Any]:
        logger = setup_logger(log_file="logs/phase3.log", logger_name="phase3")
        soup = BeautifulSoup(html_content, "lxml")

        try:
            data_compra = cls._parse_data_compra(soup, html_content=html_content, logger=logger)
            if data_compra is not None:
                logger.info("Fase 3: data/hora da compra extraida: %s.", data_compra.isoformat(sep=" "))
            else:
                logger.warning("Fase 3: data/hora da compra nao encontrada no HTML.")

            meio_pagamento = cls._parse_meio_pagamento(soup, html_content=html_content, logger=logger)
            if meio_pagamento:
                logger.info("Fase 3: meio de pagamento extraido: %s.", meio_pagamento)
            else:
                logger.warning("Fase 3: meio de pagamento nao encontrado no HTML.")

            produtos = cls._parse_products(soup, logger)
            valor_desconto_nota, valor_pago_nota = cls._parse_totais_nota(soup)
            valor_desconto_nota, valor_pago_nota = cls._reconciliar_descontos(
                produtos, valor_desconto_nota, valor_pago_nota, logger
            )

            return {
                "produtos": produtos,
                "data_compra": data_compra,
                "meio_pagamento": meio_pagamento,
                "valor_desconto_nota": valor_desconto_nota,
                "valor_pago_nota": valor_pago_nota,
            }
        finally:
            soup.decompose()
            del soup

    @classmethod
    def parse(cls, html_content: str) -> list[dict[str, Any]]:
        return cls.parse_page(html_content)["produtos"]

    @classmethod
    def to_dataframe_and_save(
        cls,
        products: list[dict[str, Any]],
        output_csv_path: str = "data/output/nota_fiscal.csv",
    ) -> pd.DataFrame:
        logger = setup_logger(log_file="logs/phase3.log", logger_name="phase3")

        columns = [
            "descricao",
            "quantidade",
            "valor_total",
            "valor_desconto",
            "valor_pago",
            "unidade_comercial",
            "codigo_ean_comercial",
        ]
        data_frame = pd.DataFrame(products, columns=columns)

        output_path = Path(output_csv_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data_frame.to_csv(output_path, index=False, encoding="utf-8-sig")

        logger.info("Fase 3: CSV salvo em %s com %s linhas.", output_path.as_posix(), len(data_frame))
        return data_frame


class EmpresaParser:
    @staticmethod
    def _normalize_text(value: str) -> str:
        return " ".join(value.split()).strip()

    @classmethod
    def _normalize_label_key(cls, value: str) -> str:
        text = cls._normalize_text(value)
        text = text.rstrip(":")
        text = unicodedata.normalize("NFKD", text)
        text = "".join(ch for ch in text if not unicodedata.combining(ch))
        return text.casefold()

    @classmethod
    def _extract_value_by_label(cls, container: Tag, label_text: list[str] | str) -> str:
        """
        Busca o valor associado a uma label. Aceita uma string única ou uma lista 
        de strings para tratar variações do portal da Sefaz.
        """
        labels_to_check = [label_text] if isinstance(label_text, str) else label_text
        target_keys = [cls._normalize_label_key(lbl) for lbl in labels_to_check]

        for label in container.find_all("label"):
            current_label = cls._normalize_label_key(label.get_text(" ", strip=True))
            if current_label not in target_keys:
                continue

            # Tenta pegar o span irmão ou próximo elemento com o dado
            candidate = label.find_next("span")
            if candidate:
                return cls._normalize_text(candidate.get_text(" ", strip=True))
            
            # Fallback caso o texto esteja diretamente dentro do elemento pai da label
            parent_text = label.parent.get_text(" ", strip=True)
            label_text_raw = label.get_text(" ", strip=True)
            fallback_text = parent_text.replace(label_text_raw, "").strip()
            if fallback_text:
                return cls._normalize_text(fallback_text)

        return ""

    @classmethod
    def _extract_by_class_patterns(cls, soup: Tag, class_names: list[str]) -> str:
        """
        Busca o dado com base em classes CSS conhecidas de portais NFC-e/NF-e
        """
        for class_name in class_names:
            element = soup.find(class_=class_name)
            if element:
                return cls._normalize_text(element.get_text(" ", strip=True))
        return ""

    @classmethod
    def _parse_endereco_completo(cls, endereco_cru: str) -> dict[str, str]:
        
        result = {"logradouro": "", "cidade": "", "estado": ""}
        if not endereco_cru:
            return result

        result["logradouro"] = endereco_cru

        match_uf = re.search(r",?\s*([^,/\-]+)\s*[\-/]\s*([A-Z]{2})\s*$", endereco_cru)
        if match_uf:
            result["cidade"] = cls._normalize_text(match_uf.group(1))
            result["estado"] = match_uf.group(2).upper()
            result["logradouro"] = cls._normalize_text(endereco_cru[:match_uf.start()])

        return result

    @classmethod
    def parse_page(cls, html_content: str) -> dict[str, Any]:
        logger = setup_logger(log_file="logs/phase3.log", logger_name="phase3")
        soup = BeautifulSoup(html_content, "lxml")

        try:
            razao_social = cls._extract_value_by_label(soup, ["Nome / Razao Social", "Razao Social"])
            nome_fantasia = cls._extract_value_by_label(soup, ["Nome Fantasia"])
            cnpj = cls._extract_value_by_label(soup, ["CNPJ"])
            logradouro = cls._extract_value_by_label(soup, ["Endereco", "Logradouro"])
            bairro = cls._extract_value_by_label(soup, ["Bairro / Distrito", "Bairro"])
            cep = cls._extract_value_by_label(soup, ["CEP"])

            # Município vem como "2927408 - Salvador", extrai só o nome
            municipio_raw = cls._extract_value_by_label(soup, ["Municipio", "Município"])
            cidade = re.sub(r"^\d+\s*-\s*", "", municipio_raw).strip()

            uf = cls._extract_value_by_label(soup, ["UF"])

            estabelecimento_data = {
                "razao_social": razao_social or "Nao Identificado",
                "nome_fantasia": nome_fantasia or razao_social or "Nao Identificado",
                "cnpj": cnpj,
                "logradouro": logradouro,
                "bairro": bairro,
                "cidade": cidade,
                "estado": uf,
                "cep": cep,
            }

            if razao_social:
                logger.info("Fase 3: Estabelecimento '%s' extraido com sucesso.", razao_social)
            else:
                logger.warning("Fase 3: Nao foi possivel identificar a razao social no HTML.")

            return estabelecimento_data

        except Exception as exc:
            logger.exception("Fase 3: Erro critico ao processar dados do estabelecimento.")
            raise exc
        finally:
            soup.decompose()
            del soup
