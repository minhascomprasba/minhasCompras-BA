import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from src.phase1 import auth_flow
from src.phase1.auth_flow import format_access_key, start_auth_session, submit_captcha_attempt
from src.phase1.sefaz_client import SefazPage, SefazSession, _collect_form_fields, _postback_trigger

BASE = "https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/"
CONSULTA_URL = BASE + "NFCEC_consulta_chave_acesso.aspx"

CONSULTA_HTML = """
<form method="post" action="NFCEC_consulta_chave_acesso.aspx" id="frm">
  <input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="" />
  <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="VS1" />
  <input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="EV1" />
  <input name="txt_chave_acesso" type="text" id="txt_chave_acesso" />
  <input name="txt_cod_antirobo" type="text" id="txt_cod_antirobo" />
  <img id="img_captcha" src="../AntiRobo/NFCEC_anti_robo.aspx" />
  <input type="submit" name="btn_consulta_completa" value="Consultar" id="btn_consulta_completa" />
</form>
"""

ABAS_HTML = """
<form method="post" action="./NFCEC_consulta_abas.aspx">
  <input type="hidden" name="__VIEWSTATE" value="VS2" />
  <input type="checkbox" name="marcado" value="1" checked />
  <input type="checkbox" name="desmarcado" value="1" />
  <select name="sel"><option value="a">A</option><option value="b" selected>B</option></select>
  <input type="image" name="btn_aba_produtos" id="btn_aba_produtos" src="aba_off.gif" />
  <a id="btn_aba_emitente" href="javascript:__doPostBack('btn_aba_emitente','')">Emitente</a>
  <img id="btn_aba_nota" src="aba_on.gif" onclick="mostrarAba('nota')" />
</form>
"""


def _jpeg_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (10, 5), "white").save(buffer, format="JPEG")
    return buffer.getvalue()


class FakeResponse:
    def __init__(self, url, body: bytes, content_type="text/html; charset=utf-8"):
        self.url = url
        self.content = body
        self.headers = {"Content-Type": content_type}
        self.encoding = "utf-8"

    @property
    def text(self):
        return self.content.decode(self.encoding)

    def raise_for_status(self):
        pass


class FakeHttp:
    """Responde por (metodo, url) e registra o que foi enviado."""

    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        route = self.routes[(method, url)]
        return route(kwargs) if callable(route) else route


class PostbackTests(unittest.TestCase):
    def setUp(self):
        self.page = SefazPage(BASE + "NFCEC_consulta_abas.aspx", ABAS_HTML)

    def test_image_input_posts_coordinates(self):
        self.assertEqual({"btn_aba_produtos.x": "1", "btn_aba_produtos.y": "1"},
                         _postback_trigger(self.page.find_by_id("btn_aba_produtos")))

    def test_do_postback_link_sets_event_target(self):
        self.assertEqual({"__EVENTTARGET": "btn_aba_emitente", "__EVENTARGUMENT": ""},
                         _postback_trigger(self.page.find_by_id("btn_aba_emitente")))

    def test_client_side_tab_needs_no_request(self):
        self.assertIsNone(_postback_trigger(self.page.find_by_id("btn_aba_nota")))

    def test_form_fields_follow_browser_rules(self):
        data = _collect_form_fields(self.page.soup.find("form"))
        self.assertEqual("VS2", data["__VIEWSTATE"])
        self.assertEqual("1", data["marcado"])
        self.assertNotIn("desmarcado", data)
        self.assertEqual("b", data["sel"])
        self.assertNotIn("btn_aba_produtos", data)

    def test_click_on_client_side_tab_keeps_page(self):
        session = SefazSession(5)
        session.page = self.page
        session.http = FakeHttp({})
        self.assertTrue(session.click("btn_aba_nota"))
        self.assertIs(self.page, session.page)
        self.assertFalse(session.click("nao_existe"))


class AuthFlowTests(unittest.TestCase):
    key = "29241112345678000190650010000123451123456789"

    def test_access_key_mask_matches_portal_js(self):
        self.assertEqual("29-2411-12.345.678/0001-90-65-001-000.012.345-112.345.678-9",
                         format_access_key(self.key))

    def _run_flow(self, result_url, result_html):
        http = FakeHttp({
            ("GET", CONSULTA_URL): FakeResponse(CONSULTA_URL, CONSULTA_HTML.encode()),
            ("GET", "https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/AntiRobo/NFCEC_anti_robo.aspx"):
                FakeResponse("captcha", _jpeg_bytes(), "image/jpeg"),
            ("POST", CONSULTA_URL): FakeResponse(result_url, result_html.encode()),
        })
        with tempfile.TemporaryDirectory() as tmp, patch.object(auth_flow, "SefazSession") as factory:
            real = SefazSession(5)
            real.http = http
            factory.return_value = real
            captcha = Path(tmp) / "c.png"
            session = start_auth_session(self.key, 5, captcha)
            self.assertEqual(b"\x89PNG", captcha.read_bytes()[:4])
            ok = submit_captcha_attempt(session, " ab1c2 ", 5)
        return ok, http

    def test_successful_captcha_posts_form_and_follows_redirect(self):
        ok, http = self._run_flow(BASE + "NFCEC_consulta_danfe.aspx", "<html>nota</html>")
        self.assertTrue(ok)
        method, url, kwargs = http.calls[-1]
        self.assertEqual(("POST", CONSULTA_URL), (method, url))
        self.assertEqual({
            "__EVENTTARGET": "", "__EVENTARGUMENT": "", "__VIEWSTATE": "VS1", "__EVENTVALIDATION": "EV1",
            "txt_chave_acesso": format_access_key(self.key), "txt_cod_antirobo": "ab1c2",
            "btn_consulta_completa": "Consultar",
        }, kwargs["data"])

    def test_refused_captcha_returns_to_same_page(self):
        ok, _ = self._run_flow(CONSULTA_URL, CONSULTA_HTML)
        self.assertFalse(ok)


if __name__ == "__main__":
    unittest.main()
