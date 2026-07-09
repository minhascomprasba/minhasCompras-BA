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
            product = {
                "descricao": descricao,
                "quantidade": cls._to_float(quantidade_raw),
                "valor_total": cls._to_float(valor_total_raw),
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

            return {
                "produtos": cls._parse_products(soup, logger),
                "data_compra": data_compra,
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