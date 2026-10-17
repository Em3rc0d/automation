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

    def test_reset_only_demo_and_restore_stock(self):
        order = self.engine.create_order("mesa 2", "WANTAN", 4)
        self.engine.confirm_order(order["orderId"])
        self.engine.create_ticket("Prueba", "No es un cliente real")
        before = self.engine.state()
        self.assertEqual(before["metrics"]["alerts"], 1)
        reset = self.engine.reset()
        self.assertTrue(reset["onlyDemoData"])
        after = self.engine.state()
        self.assertEqual(after["metrics"]["orders"], 0)
        self.assertEqual(after["metrics"]["alerts"], 0)
        self.assertEqual(after["metrics"]["openTickets"], 0)
        self.assertEqual(next(p["stock"] for p in after["menu"] if p["sku"]=="WANTAN"), 5)

    def test_multiple_products_one_order_total_lines_stock_and_alerts(self):
        order = self.engine.create_order("Mesa 8", [
            {"sku": "WANTAN", "quantity": 4},
            {"sku": "AEROPUERTO", "quantity": 4},
            {"sku": "GASEOSA", "quantity": 2}
        ])
        self.assertEqual(order["itemCount"], 3)
        self.assertEqual(order["totalCents"], 4800 + 9600 + 1000)
        before = self.engine.state()
        self.assertEqual(before["metrics"]["orders"], 1)
        self.assertEqual(before["orders"][0]["itemCount"], 3)
        self.assertEqual(len(before["orders"]), 1)
        self.assertEqual(sum(x["lineTotalCents"] for x in before["orders"][0]["items"]),
                         before["orders"][0]["total_cents"])
        outcome = self.engine.confirm_order(order["orderId"])
        self.assertCountEqual(outcome["lowStockSkus"], ["WANTAN", "AEROPUERTO"])
        after = self.engine.state()
        self.assertEqual(after["metrics"]["confirmed"], 1)
        self.assertEqual(after["metrics"]["alerts"], 2)
        self.assertEqual(after["metrics"]["orders"], 1)
        self.assertEqual(after["metrics"]["simulatedRevenueCents"], 15400)
        stock = {x["sku"]: x["stock"] for x in after["menu"]}
        self.assertEqual(stock["WANTAN"], 1)
        self.assertEqual(stock["AEROPUERTO"], 2)
        self.assertEqual(stock["GASEOSA"], 7)
        self.assertEqual(len(after["outbox"]), 3)  # 2 alerts + 1 order notice
        self.assertEqual(len([x for x in after["events"]
                              if x["kind"] == "INVENTORY_RESERVED"]), 3)
        self.assertEqual(len([x for x in after["events"]
                              if x["kind"] == "ORDER_CONFIRMED"]), 1)
        with self.assertRaises(demo.DemoError) as err:
            self.engine.confirm_order(order["orderId"])
        self.assertEqual(err.exception.status, 409)
        self.assertEqual(self.engine.state()["metrics"], after["metrics"])

    def test_any_insufficient_line_rolls_back_entire_order(self):
        order = self.engine.create_order("Mostrador", [
            {"sku": "CHAUFA", "quantity": 2},
            {"sku": "WANTAN", "quantity": 6}
        ])
        with self.assertRaisesRegex(demo.DemoError, "Stock insuficiente"):
            self.engine.confirm_order(order["orderId"])
        state = self.engine.state()
        self.assertEqual(len(state["orders"]), 1)
        self.assertEqual(state["orders"][0]["status"], "PENDING")
        self.assertEqual(state["orders"][0]["itemCount"], 2)
        self.assertEqual(state["metrics"]["confirmed"], 0)
        self.assertEqual(state["metrics"]["alerts"], 0)
        self.assertEqual(len(state["outbox"]), 0)
        self.assertFalse(any(x["kind"] == "INVENTORY_RESERVED" for x in state["events"]))
        stock = {x["sku"]: x["stock"] for x in state["menu"]}
        self.assertEqual(stock["CHAUFA"], 12)
        self.assertEqual(stock["WANTAN"], 5)

    def test_duplicate_sku_merged_and_price_snapshot(self):
        order = self.engine.create_order("Mesa 4", [
            {"sku": "GASEOSA", "quantity": 2},
            {"sku": "GASEOSA", "quantity": 3},
            {"sku": "CHAUFA", "quantity": 1}
        ])
        self.assertEqual(order["itemCount"], 2)
        self.assertEqual(order["totalCents"], 2_500 + 1_800)
        state = self.engine.state()
        self.assertEqual(state["orders"][0]["itemCount"], 2)
        self.assertEqual(state["orders"][0]["unitCount"], 6)
        self.assertEqual({x["sku"]: x["quantity"] for x in state["orders"][0]["items"]},
                         {"GASEOSA": 5, "CHAUFA": 1})
        restarted = demo.RestaurantDemo(self.db_file)
        self.assertEqual(restarted.state()["orders"][0]["total_cents"], 4_300)

    def test_rejects_empty_cart_invalid_lines_and_price_tampering(self):
        invalid = (
            [], "WANTAN", {}, None, [None],
            [{"sku": "WANTAN", "quantity": 0}],
            [{"sku": "WANTAN", "quantity": True}],
            [{"sku": "WANTAN", "quantity": "4"}],
            [{"sku": "WANTAN", "quantity": 1, "unitPriceCents": 0}],
            [{"sku": "WANTAN", "quantity": 30},
             {"sku": "WANTAN", "quantity": 30}],
            [{"sku": "WANTAN"}]
        )
        for lines in invalid:
            with self.subTest(lines=lines):
                with self.assertRaises(demo.DemoError):
                    self.engine.create_order("Mesa 5", lines)
        self.assertEqual(self.engine.state()["metrics"]["orders"], 0)

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
