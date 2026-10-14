import unittest
from src import webhook


class WebhookTests(unittest.TestCase):
    def setUp(self):
        webhook.reset()

    def test_duplicate_event_types_share_one_purchase(self):
        for event_type in ("purchase.completed", "purchase.paid"):
            webhook.handle_event({"type": event_type, "customer": "alice", "purchase_id": "p1"})
        self.assertEqual(webhook.emails_sent(), ["alice"])

    def test_unrelated_events_do_not_send(self):
        webhook.handle_event({"type": "subscription.updated", "customer": "alice", "purchase_id": "p1"})
        self.assertEqual(webhook.emails_sent(), [])
