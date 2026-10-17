"""Chifa AV Peru actual local order/inventory/support automation tests."""
import importlib.util
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("automation_chifa_demo_tests",
    ROOT / "tools/console/restaurant_demo.py")
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)


class RestaurantDemoTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.db_file = Path(self.tmp.name) / "restaurant.sqlite3"
        self.engine = demo.RestaurantDemo(self.db_file)

    def test_order_confirm_triggers_atomic_inventory_and_low_stock_alert(self):
        first = self.engine.state()
        self.assertEqual(len(first["menu"]), 5)
        self.assertEqual(first["metrics"]["orders"], 0)
        new = self.engine.create_order("Mesa 3 (demo)", "WANTAN", 4)
        self.assertEqual(new["status"], "PENDING")
        before = self.engine.state()
        self.assertEqual(next(p["stock"] for p in before["menu"] if p["sku"]=="WANTAN"), 5)
        self.assertEqual(before["metrics"]["alerts"], 0)

        result = self.engine.confirm_order(new["orderId"])
        self.assertEqual(result["status"], "CONFIRMED")
        self.assertEqual(result["lowStockSkus"], ["WANTAN"])
        self.assertEqual(result["notification"], "SIMULATED")
        after = self.engine.state()
        self.assertEqual(next(p["stock"] for p in after["menu"] if p["sku"]=="WANTAN"), 1)
        self.assertEqual(after["metrics"]["confirmed"], 1)
        self.assertEqual(after["metrics"]["alerts"], 1)
        self.assertEqual(after["metrics"]["simulatedRevenueCents"], 4800)
        self.assertEqual(len(after["outbox"]), 2)
        self.assertEqual({x["state"] for x in after["outbox"]}, {"SIMULATED"})
        self.assertIn("LOW_STOCK_ALERT", [x["kind"] for x in after["events"]])
        with self.assertRaises(demo.DemoError) as err:
            self.engine.confirm_order(new["orderId"])
        self.assertEqual(err.exception.status, 409)
        self.assertEqual(self.engine.state()["metrics"], after["metrics"])
        self.assertEqual(len(self.engine.state()["outbox"]), 2)

    def test_insufficient_stock_has_no_partial_decrements(self):
        order = self.engine.create_order("Mostrador", "GASEOSA", 20)
        with self.assertRaisesRegex(demo.DemoError, "Stock insuficiente"):
            self.engine.confirm_order(order["orderId"])
        st = self.engine.state()
        self.assertEqual(next(p["stock"] for p in st["menu"] if p["sku"]=="GASEOSA"), 9)
        self.assertEqual(st["metrics"]["confirmed"], 0)
        self.assertEqual(st["metrics"]["alerts"], 0)
        self.assertEqual(st["orders"][0]["status"], "PENDING")
        self.assertEqual(len(st["outbox"]), 0)

    def test_support_notification_and_restart_persist_data(self):
        order = self.engine.create_order("Cliente ejemplo", "CHAUFA", 1)
        ticket = self.engine.create_ticket("Cambio de pedido", "Solicita cambio",
                                           order["orderId"])
        self.assertEqual(ticket["status"], "OPEN")
        restarted = demo.RestaurantDemo(self.db_file)
        st = restarted.state()
        self.assertEqual(st["metrics"]["orders"], 1)
        self.assertEqual(st["metrics"]["openTickets"], 1)
        self.assertEqual(len(st["outbox"]), 1)
        self.assertEqual(st["tickets"][0]["order_id"], order["orderId"])
        self.assertEqual(len(st["menu"]), 5)
        with self.assertRaises(demo.DemoError):
            restarted.create_ticket("a", "b", 9999)

    def test_invalid_payloads_rejected(self):
        for qty in (True, 0, -1, 51, 1.1, "5"):
            with self.assertRaises(demo.DemoError):
                self.engine.create_order("demo", "WANTAN", qty)
        with self.assertRaises(demo.DemoError):
            self.engine.create_order("", "WANTAN", 1)
        with self.assertRaises(demo.DemoError):
            self.engine.create_order("Mesa", "BOGUS", 1)
        with self.assertRaises(demo.DemoError):
            self.engine.create_ticket("ticket", "x"*1300)

    def test_concurrent_confirmation_reserves_once(self):
        oid=self.engine.create_order("Mesa 6","CHAUFA",2)["orderId"]
        results=[]
        def confirm():
            try:
                results.append(self.engine.confirm_order(oid)["status"])
            except demo.DemoError as e:
                results.append(e.status)
        threads=[threading.Thread(target=confirm) for _ in range(2)]
        for th in threads: th.start()
        for th in threads: th.join(timeout=3)
        self.assertCountEqual(results,["CONFIRMED",409])
        st=self.engine.state()
        self.assertEqual(next(x["stock"] for x in st["menu"] if x["sku"]=="CHAUFA"),10)


if __name__ == "__main__":
    unittest.main()
