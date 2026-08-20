"""Regression contract for the real-photography redesign of conversion landings."""

from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "0-klass": "0-klass/index.html",
    "1-klass": "1-klass/index.html",
    "3-klass": "3-klass/index.html",
    "4-klass": "4-klass/index.html",
    "perevod-v-druguyu-shkolu": "perevod-v-druguyu-shkolu/index.html",
    "skolko-stoit-god": "skolko-stoit-god/index.html",
}


class RealPhotoLandingTests(unittest.TestCase):
    def test_every_conversion_landing_has_a_documentary_photo_hero(self) -> None:
        for slug, relative_path in PAGES.items():
            source = (ROOT / relative_path).read_text(encoding="utf-8")
            self.assertIn('class="hero hero--documentary"', source, slug)
            self.assertIn('class="hero-media"', source, slug)
            self.assertIn('class="photo-gallery"', source, slug)
            self.assertIn('../assets/photos/', source, slug)
            self.assertNotIn('../gen/var-', source, slug)
            self.assertGreaterEqual(source.count("<img "), 4, slug)

    def test_documentary_hero_assets_are_present(self) -> None:
        photos = ROOT / "assets" / "photos"
        self.assertTrue(photos.is_dir(), "assets/photos must exist")
        self.assertGreaterEqual(len(list(photos.glob("*.jpg"))), 6)

    def test_homepage_uses_documentary_images_instead_of_generated_backgrounds(self) -> None:
        source = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("assets/photos/", source)
        self.assertNotIn("gen/var-", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
