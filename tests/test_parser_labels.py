import unicodedata
import unittest

from bs4 import BeautifulSoup

from src.phase3.parser import EmpresaParser, ProductParser, _normalize_label_key


# Implementacao anterior (varredura completa a cada busca), usada como referencia:
# a versao indexada precisa devolver exatamente o mesmo resultado.
def _old_key(value):
    text = " ".join(value.split()).strip().rstrip(":")
    text = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in text if not unicodedata.combining(ch)).casefold()


def _old_text(tag):
    return " ".join(tag.get_text(" ", strip=True).split()).strip()


def old_value_by_label(container, label_text):
    target = _old_key(label_text)
    for label in container.find_all("label"):
        if _old_key(label.get_text(" ", strip=True)) != target:
            continue
        candidate = label.find_next("span")
        if candidate:
            return _old_text(candidate)
    return ""


def old_value_by_label_from_rows(container, label_text):
    target = _old_key(label_text)
    for row in container.find_all("tr"):
        cells = row.find_all(["td", "th", "label"])
        for index, cell in enumerate(cells):
            if _old_key(cell.get_text(" ", strip=True)) != target:
                continue
            for candidate in cells[index + 1 :]:
                value = _old_text(candidate)
                if value:
                    return value
            next_span = cell.find_next("span")
            if next_span:
                return _old_text(next_span)
    return ""


def old_empresa_value(container, labels):
    targets = [_old_key(label) for label in labels]
    for label in container.find_all("label"):
        if _old_key(label.get_text(" ", strip=True)) not in targets:
            continue
        candidate = label.find_next("span")
        if candidate:
            return _old_text(candidate)
        fallback = label.parent.get_text(" ", strip=True).replace(label.get_text(" ", strip=True), "").strip()
        if fallback:
            return " ".join(fallback.split())
    return ""


SAMPLES = [
    # Tabela aninhada: celulas internas aparecem tambem na linha externa.
    """<table><tr><td><table>
         <tr><td><label>Valor a Pagar R$</label></td><td></td></tr>
         <tr><td><label>Descontos R$</label></td><td> 3,50 </td></tr>
       </table></td></tr>
       <tr><th>Valor a Pagar R$</th><td>10,00</td></tr></table>""",
    # Rotulo sem valor na linha: cai no proximo <span> do documento.
    """<table><tr><td>Data de Emissão:</td><td> </td></tr></table><span>01/02/2026 10:00</span>""",
    # Variacoes de acento/caixa/dois-pontos e repeticoes em ordem.
    """<div><label>Data de Emissão:</label><span>01/02/2026</span>
       <label>DATA DE EMISSAO</label><span>09/09/2026</span>
       <table><tr><td>Hora de Emissão</td><td>18:43:06</td></tr></table></div>""",
    # Emitente: variacoes de rotulo em ordem diferente das passadas na busca.
    """<div><label>Razao Social</label><span>Aparece Primeiro</span>
       <label>Nome / Razão Social</label><span>Aparece Depois</span>
       <div><label>CNPJ</label> 00.000.000/0001-00</div>
       <label>CEP</label><span>44085-610</span></div>""",
]

LABELS = [
    "Valor a Pagar R$", "Descontos R$", "Data de Emissao", "Data de Emissão", "Hora de Emissao",
    "Razao Social", "Nome / Razao Social", "CNPJ", "CEP", "Inexistente",
]

EMPRESA_LABELS = [["Nome / Razao Social", "Razao Social"], ["CNPJ"], ["CEP"], ["Bairro / Distrito", "Bairro"]]


class LabelIndexTests(unittest.TestCase):
    def test_normalized_key_matches_previous_rules(self):
        for value in ("  Data de  EMISSÃO: ", "Valor a Pagar R$", "Município", "CNPJ:"):
            self.assertEqual(_old_key(value), _normalize_label_key(value))

    def test_indexed_lookups_match_previous_full_scan(self):
        for html in SAMPLES:
            for label in LABELS:
                with self.subTest(html=html[:40], label=label):
                    old_soup = BeautifulSoup(html, "lxml")
                    new_soup = BeautifulSoup(html, "lxml")
                    self.assertEqual(old_value_by_label(old_soup, label),
                                     ProductParser._extract_value_by_label(new_soup, label))
                    self.assertEqual(old_value_by_label_from_rows(old_soup, label),
                                     ProductParser._extract_value_by_label_from_rows(new_soup, label))

    def test_empresa_lookup_matches_previous_full_scan(self):
        for html in SAMPLES:
            for labels in EMPRESA_LABELS:
                with self.subTest(html=html[:40], labels=labels):
                    self.assertEqual(old_empresa_value(BeautifulSoup(html, "lxml"), labels),
                                     EmpresaParser._extract_value_by_label(BeautifulSoup(html, "lxml"), labels))

    def test_index_is_rebuilt_per_soup(self):
        first = BeautifulSoup("<label>CNPJ</label><span>1</span>", "lxml")
        second = BeautifulSoup("<label>CNPJ</label><span>2</span>", "lxml")
        self.assertEqual("1", ProductParser._extract_value_by_label(first, "CNPJ"))
        self.assertEqual("2", ProductParser._extract_value_by_label(second, "CNPJ"))


if __name__ == "__main__":
    unittest.main()
