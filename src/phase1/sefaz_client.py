"""Cliente HTTP para o portal NFC-e da SEFAZ BA (ASP.NET WebForms).

Substitui o Chrome/Selenium: o portal so usa formularios com postback, entao
basta manter os cookies da sessao ASP.NET e reenviar os campos do formulario
(__VIEWSTATE, __EVENTVALIDATION etc.) junto com o botao "clicado".
"""

from __future__ import annotations

import re
import ssl
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

import certifi
import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter

# O certificado da SEFAZ BA encadeia ate a raiz ICP-Brasil v10, que nao esta no
# bundle da Mozilla (certifi). Somamos so essa raiz, mantendo a verificacao TLS.
ICP_BRASIL_ROOT = Path(__file__).with_name("certs") / "icp_brasil_v10.pem"


def _build_ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context(cafile=certifi.where())
    context.load_verify_locations(cafile=str(ICP_BRASIL_ROOT))
    return context


_SSL_CONTEXT = _build_ssl_context()


class _IcpBrasilAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        kwargs["ssl_context"] = _SSL_CONTEXT
        return super().init_poolmanager(*args, **kwargs)


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
)

_DO_POSTBACK_RE = re.compile(r"__doPostBack\(\s*['\"]([^'\"]*)['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)")
_NON_VALUE_INPUT_TYPES = {"submit", "image", "button", "reset", "file"}


class SefazError(RuntimeError):
    """Falha de comunicacao ou resposta inesperada do portal."""


@dataclass
class SefazPage:
    url: str
    html: str

    def __post_init__(self) -> None:
        self.soup = BeautifulSoup(self.html, "lxml")

    def find_by_id(self, element_id: str) -> Tag | None:
        return self.soup.find(id=element_id)

    def has_element(self, element_id: str) -> bool:
        return self.find_by_id(element_id) is not None


class SefazSession:
    """Sessao HTTP com o portal; guarda a pagina atual como um navegador faria."""

    def __init__(self, timeout_seconds: int) -> None:
        self.timeout_seconds = timeout_seconds
        self.http = requests.Session()
        self.http.mount("https://", _IcpBrasilAdapter())
        self.http.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept-Language": "pt-BR,pt;q=0.9",
            }
        )
        self.page: SefazPage | None = None
        self.access_key: str | None = None

    # Compatibilidade com o vocabulario antigo (driver.page_source/current_url).
    @property
    def page_source(self) -> str:
        return self.current_page.html

    @property
    def current_url(self) -> str:
        return self.current_page.url

    @property
    def current_page(self) -> SefazPage:
        if self.page is None:
            raise SefazError("Nenhuma pagina carregada na sessao.")
        return self.page

    def close(self) -> None:
        self.http.close()
        self.page = None

    def get(self, url: str) -> SefazPage:
        response = self._request("GET", url)
        self.page = SefazPage(url=response.url, html=_decode(response))
        return self.page

    def get_bytes(self, url: str) -> bytes:
        return self._request("GET", self._absolute(url)).content

    def resolve(self, url: str) -> str:
        return self._absolute(url)

    def click(self, element_id: str, fields: dict[str, str] | None = None) -> bool:
        """Simula o clique em um controle da pagina atual.

        Retorna False se o controle nao existe. Controles que so mexem no DOM
        (abas client-side) nao geram requisicao: o conteudo ja esta no HTML.
        """
        page = self.current_page
        element = page.find_by_id(element_id)
        if element is None:
            return False

        trigger = _postback_trigger(element)
        if trigger is None:
            return True

        form = element.find_parent("form") or page.soup.find("form", method=re.compile("post", re.I))
        if form is None:
            raise SefazError(f"Formulario nao encontrado para o controle '{element_id}'.")

        data = _collect_form_fields(form)
        data.update(fields or {})
        data.update(trigger)

        action = urljoin(page.url, form.get("action") or page.url)
        response = self._request("POST", action, data=data, headers={"Referer": page.url})
        self.page = SefazPage(url=response.url, html=_decode(response))
        return True

    def _absolute(self, url: str) -> str:
        base = self.page.url if self.page is not None else ""
        return urljoin(base, url)

    def _request(self, method: str, url: str, **kwargs) -> requests.Response:
        try:
            response = self.http.request(method, url, timeout=self.timeout_seconds, **kwargs)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise SefazError(f"Falha de comunicacao com a SEFAZ ({method} {url}).") from exc
        return response


def _decode(response: requests.Response) -> str:
    content_type = response.headers.get("Content-Type", "")
    if "charset" not in content_type.lower():
        response.encoding = response.apparent_encoding or "utf-8"
    return response.text


def _postback_trigger(element: Tag) -> dict[str, str] | None:
    """Campos que o navegador enviaria ao clicar no elemento (None = so client-side)."""
    name = element.get("name")
    input_type = (element.get("type") or "").lower()

    for attr in ("onclick", "href"):
        match = _DO_POSTBACK_RE.search(element.get(attr) or "")
        if match:
            return {"__EVENTTARGET": match.group(1), "__EVENTARGUMENT": match.group(2)}

    if element.name == "input" and name:
        if input_type == "image":
            return {f"{name}.x": "1", f"{name}.y": "1"}
        if input_type == "submit":
            return {name: element.get("value", "")}
    if element.name == "button" and name and input_type in {"", "submit"}:
        return {name: element.get("value", "")}

    return None


def _collect_form_fields(form: Tag) -> dict[str, str]:
    data: dict[str, str] = {}
    for field in form.find_all(["input", "select", "textarea"]):
        name = field.get("name")
        if not name or field.has_attr("disabled"):
            continue

        if field.name == "input":
            input_type = (field.get("type") or "text").lower()
            if input_type in _NON_VALUE_INPUT_TYPES:
                continue
            if input_type in {"checkbox", "radio"}:
                if field.has_attr("checked"):
                    data[name] = field.get("value", "on")
                continue
            data[name] = field.get("value", "")
        elif field.name == "select":
            selected = field.find("option", selected=True) or field.find("option")
            if selected is not None:
                data[name] = selected.get("value", selected.get_text(strip=True))
        else:
            data[name] = field.get_text()

    # Postback por botao nao usa o alvo de evento.
    data["__EVENTTARGET"] = data.get("__EVENTTARGET", "")
    data["__EVENTARGUMENT"] = data.get("__EVENTARGUMENT", "")
    return data
