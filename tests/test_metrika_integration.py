"""Static integration checks for the dedicated elschool.tech Metrika counter."""

from __future__ import annotations

import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LEGACY_COUNTER = "80492089"
NEW_COUNTER = "111777976"
PAGES = (
    ROOT / "index.html",
    ROOT / "0-klass" / "index.html",
    ROOT / "1-klass" / "index.html",
    ROOT / "3-klass" / "index.html",
    ROOT / "4-klass" / "index.html",
    ROOT / "skolko-stoit-god" / "index.html",
    ROOT / "perevod-v-druguyu-shkolu" / "index.html",
    ROOT / "politika-personalnyh-dannyh" / "index.html",
)


class MetrikaIntegrationTests(unittest.TestCase):
    def test_every_landing_initializes_one_new_counter(self) -> None:
        counter_ids = set()

        for page in PAGES:
            source = page.read_text(encoding="utf-8")
            self.assertFalse(
                LEGACY_COUNTER in source,
                f"legacy counter remains in {page}",
            )
            matches = re.findall(r'ym\((\d+),"init",', source)
            self.assertEqual([NEW_COUNTER], matches, page)
            counter_ids.update(matches)

        self.assertEqual({NEW_COUNTER}, counter_ids)

    def test_shared_script_tracks_form_and_phone_click_events(self) -> None:
        source = (ROOT / "assets" / "landing.js").read_text(encoding="utf-8")

        self.assertFalse(
            LEGACY_COUNTER in source,
            "legacy counter remains in the shared landing script",
        )
        self.assertIn("var COUNTER = 111777976;", source)
        self.assertIn("var FORM_GOAL = 'elschool_tech_form_submit';", source)
        self.assertIn("var PHONE_GOAL = 'elschool_tech_phone_click';", source)
        self.assertIn("reachGoal(FORM_GOAL", source)
        self.assertIn('a[href^="tel:"]', source)
        self.assertIn("reachGoal(PHONE_GOAL", source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
