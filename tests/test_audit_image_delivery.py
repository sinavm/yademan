import unittest

from scripts.audit_image_delivery import audit, normalize_name, valid_archive_path


class ImageDeliveryAuditTests(unittest.TestCase):
    def test_normalizes_persian_variants(self):
        self.assertEqual(normalize_name("علي كاظمي"), normalize_name("علی کاظمی"))

    def test_archive_path_validation(self):
        self.assertTrue(valid_archive_path("images/ab/portrait.webp"))
        self.assertFalse(valid_archive_path("images/../private.jpg"))
        self.assertFalse(valid_archive_path("https://example.com/photo.jpg"))

    def test_uses_source_url_to_disambiguate_duplicate_names(self):
        records = [
            {"name": "نام تکراری", "image": "https://a.example/p.jpg"},
            {"name": "نام تکراری", "image": "https://b.example/p.jpg"},
        ]
        manifest = [
            {"n": "نام تکراری", "p": "images/a.webp", "u": "https://a.example/p.jpg"},
            {"n": "نام تکراری", "p": "images/b.webp", "u": "https://b.example/p.jpg"},
        ]
        result = audit(records, manifest)
        self.assertEqual(result["matched_records"], 2)
        self.assertEqual(result["archived_records"], 2)
        self.assertEqual(result["unmatched_records"], 0)

    def test_reports_variant_coverage_without_claiming_rights(self):
        records = [{"name": "نام", "image": "https://a.example/p.jpg"}]
        manifest = [{
            "n": "نام", "p": "images/p.webp", "t": "images/thumb/p.webp",
            "d": "images/detail/p.webp", "u": "https://a.example/p.jpg",
        }]
        result = audit(records, manifest)
        self.assertEqual(result["thumbnail_variant_records"], 1)
        self.assertEqual(result["detail_variant_records"], 1)
        self.assertTrue(result["rights_status"].startswith("NOT_ASSESSED"))

    def test_counts_shared_flag_placeholder_separately(self):
        result = audit(
            [{"name": "نام", "image": "https://a.example/p.jpg"}],
            [{"n": "نام", "p": "images/6a/7cb40da7f_flag.png", "u": "https://a.example/p.jpg"}],
        )
        self.assertEqual(result["shared_flag_manifest_rows"], 1)


if __name__ == "__main__":
    unittest.main()
