from utils.http_headers import attachment_disposition


def test_plain_title():
    assert attachment_disposition("Rio de Lágrimas").startswith('attachment; filename="Rio de Lagrimas.txt"')
    assert "filename*=UTF-8''Rio%20de%20L%C3%A1grimas.txt" in attachment_disposition("Rio de Lágrimas")


def test_quotes_and_newlines_cannot_break_header():
    value = attachment_disposition('a"b\r\nSet-Cookie: x=1')
    assert "\r" not in value and "\n" not in value
    assert value.count('"') == 2  # só as aspas do filename=


def test_empty_title_falls_back():
    assert 'filename="cifra.txt"' in attachment_disposition("")
    assert 'filename="cifra.txt"' in attachment_disposition("日本語")
