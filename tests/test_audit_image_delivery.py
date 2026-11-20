import unittest
from pathlib import Path

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


    def test_globe_portrait_selection_is_not_artificially_limited_to_old_counts(self):
        source = (Path(__file__).resolve().parents[1] / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertIn("visiblePhotoLimit=isLowEndDevice?48:(isMobileDevice?76:120)", source)
        self.assertIn("portraitNodeLimit=isLowEndDevice?72:(isMobileDevice?112:168)", source)

    def test_globe_portraits_prioritize_current_view_and_exclude_far_hemisphere(self):
        source = (Path(__file__).resolve().parents[1] / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertIn("if(v.dot(camera.position)<=0)continue;", source)
        self.assertIn("candidates.sort((a,b)=>a.centerDistance-b.centerDistance||b.depth-a.depth)", source)
        self.assertIn("Math.min(16,Math.max(8,Math.ceil(visiblePhotoLimit*.2)))", source)


    def test_portrait_requests_survive_temporary_rotation_hiding(self):
        source = (Path(__file__).resolve().parents[1] / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertNotIn("cancelPortraitLoad(node.querySelector('img'))", source)
        self.assertIn("if(!job.img.isConnected){", source)
        self.assertNotIn("job.node&&job.node.style.visibility==='hidden'", source)

    def test_clicking_a_portrait_opens_existing_person_detail_card(self):
        source = (Path(__file__).resolve().parents[1] / "assets" / "site.js").read_text(encoding="utf-8")
        self.assertIn("node.addEventListener('click',e=>{e.stopPropagation();showName(item.i,true)})", source)
        self.assertIn("personName.textContent=person.full_name", source)
        self.assertIn("personPlace.textContent=person.place||'محل ثبت نشده'", source)
        self.assertIn("loadPhotoWithoutFlash(personImage,nameCard,getPersonImage(person,'medium')", source)
        self.assertNotIn("photo-caption", source)

if __name__ == "__main__":
    unittest.main()
