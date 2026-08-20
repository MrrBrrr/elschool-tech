"""Pre-deploy contract checks for public ElSchool landing pages."""

from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "/": ("index.html", "glavnaya"),
    "/0-klass/": ("0-klass/index.html", "0-klass"),
    "/1-klass/": ("1-klass/index.html", "1-klass"),
    "/3-klass/": ("3-klass/index.html", "3-klass"),
    "/4-klass/": ("4-klass/index.html", "4-klass"),
    "/perevod-v-druguyu-shkolu/": (
        "perevod-v-druguyu-shkolu/index.html",
        "perevod-v-druguyu-shkolu",
    ),
    "/skolko-stoit-god/": ("skolko-stoit-god/index.html", "skolko-stoit-god"),
}


class LandingContractTests(unittest.TestCase):
    def test_homepage_keeps_approved_animated_brand_story_and_privacy_consent(self) -> None:
        source = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="walkVid"', source)
        self.assertIn('id="duoVid"', source)
        self.assertIn('id="leadConsent"', source)
        self.assertIn('/politika-personalnyh-dannyh/', source)

    def test_documentary_hero_has_no_outer_side_gutters(self) -> None:
        source = (ROOT / "assets" / "landing.css").read_text(encoding="utf-8")
        self.assertNotIn('width:min(1240px,100% - 40px)', source)

    def test_page_identity_tracking_and_forms_are_preserved(self) -> None:
        for route, (relative_path, slug) in PAGES.items():
            source = (ROOT / relative_path).read_text(encoding="utf-8")
            self.assertEqual(1, len(re.findall(r"<h1[ >]", source)), route)
            self.assertIn(f'<body data-landing="{slug}">', source, route)
            self.assertIn('rel="canonical"', source, route)
            self.assertIn('ym(111777976,"init",', source, route)
            self.assertIn('})(window,document,"ct","4oggmizy")', source, route)
            self.assertIn('id="leadForm"', source, route)
            self.assertIn('id="leadConsent"', source, route)
            if route != "/":
                tel_hrefs = re.findall(r'href="(tel:[^"]+)"', source)
                self.assertTrue(tel_hrefs, route)
                self.assertTrue(all("*" not in href for href in tel_hrefs), route)

    def test_every_local_image_reference_resolves(self) -> None:
        for route, (relative_path, _) in PAGES.items():
            page = ROOT / relative_path
            source = page.read_text(encoding="utf-8")
            sources = re.findall(r'<img[^>]+src="([^"]+)', source)
            self.assertGreaterEqual(len(sources), 3 if route == "/" else 4, route)
            missing = [src for src in sources if not (page.parent / src).resolve().is_file()]
            self.assertEqual([], missing, f"{route}: {missing}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
