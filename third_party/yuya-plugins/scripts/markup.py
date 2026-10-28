"""Read attributes off real elements, so comments and <script>/<style> text never count."""

from __future__ import annotations

from html.parser import HTMLParser


class _Attrs(HTMLParser):
    def __init__(self, names: tuple[str, ...]):
        super().__init__(convert_charrefs=True)
        self.found: dict[str, list[str]] = {n: [] for n in names}

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k in self.found and v is not None:
                self.found[k].append(v)

    handle_startendtag = handle_starttag


def attr_values(markup: str, *names: str) -> dict[str, list[str]]:
    """Every value of each named attribute, in document order."""
    p = _Attrs(names)
    p.feed(markup)
    p.close()
    return p.found
