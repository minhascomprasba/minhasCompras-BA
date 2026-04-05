from __future__ import annotations

import re
import unicodedata
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
    def _extract_unit(cls, product_table: Tag, toggable_table: Tag | None) -> str:
        unit_visible = cls._extract_span_text_by_class(product_table, "fixo-prod-serv-und")
        if unit_visible:
            return unit_visible

        if toggable_table is None:
            return ""

        return cls._extract_value_by_label(toggable_table, "Unidade Comercial")

    @classmethod
    def parse(cls, html_content: str) -> list[dict[str, Any]]:
        logger = setup_logger(log_file="logs/phase3.log", logger_name="phase3")
        soup = BeautifulSoup(html_content, "html.parser")
        products: list[dict[str, Any]] = []

        try:
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

                product = {
                    "descricao": descricao,
                    "quantidade": cls._to_float(quantidade_raw),
                    "valor_total": cls._to_float(valor_total_raw),
                    "unidade_comercial": cls._normalize_text(unidade_comercial),
                    "codigo_ean_comercial": cls._normalize_text(codigo_ean_comercial),
                }
                products.append(product)
                logger.info("Fase 3: produto %s extraido com sucesso.", index)

            if not products:
                logger.warning(
                    "Fase 3: nenhum produto extraido. Verifique sincronizacao da aba de produtos e seletores atuais."
                )

            logger.info("Fase 3: extracao concluida com %s produtos.", len(products))
            return products
        finally:
            soup.decompose()
            del soup

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
            "unidade_comercial",
            "codigo_ean_comercial",
        ]
        data_frame = pd.DataFrame(products, columns=columns)

        output_path = Path(output_csv_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data_frame.to_csv(output_path, index=False, encoding="utf-8-sig")

        logger.info("Fase 3: CSV salvo em %s com %s linhas.", output_path.as_posix(), len(data_frame))
        return data_frame
