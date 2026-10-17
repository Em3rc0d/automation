#!/usr/bin/env python3
"""Local, working AV Perú sample business system (Python stdlib + SQLite).

An executable demo, NOT a certified customer connector or live production system.
Inventory and orders are persisted in local SQLite transactions. Alerts, tickets
and notifications are traceable local records; no outbound communication.
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

MENU = (
    ("CHAUFA", "Arroz chaufa de pollo", 1800, 12, 4),
    ("TALLARIN", "Tallarín saltado", 2200, 8, 3),
    ("WANTAN", "Wantán frito (6 und.)", 1200, 5, 2),
    ("GASEOSA", "Gaseosa personal", 500, 9, 3),
    ("AEROPUERTO", "Aeropuerto especial", 2400, 6, 2),
)
DDL = """
CREATE TABLE IF NOT EXISTS demo_menu (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK(price_cents > 0),
  stock INTEGER NOT NULL CHECK(stock >= 0),
  low_at INTEGER NOT NULL CHECK(low_at >= 0)
);
CREATE TABLE IF NOT EXISTS demo_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_alias TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'CONFIRMED')),
  total_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
CREATE TABLE IF NOT EXISTS demo_order_lines (
  order_id INTEGER NOT NULL REFERENCES demo_orders(id),
  sku TEXT NOT NULL REFERENCES demo_menu(sku),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 50),
  unit_price_cents INTEGER NOT NULL,
  PRIMARY KEY(order_id, sku)
);
CREATE TABLE IF NOT EXISTS demo_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  order_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(sku, order_id)
);
CREATE TABLE IF NOT EXISTS demo_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES demo_orders(id),
  subject TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS demo_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  destination TEXT NOT NULL,
  message TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state='SIMULATED'),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS demo_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  reference_id INTEGER
);
"""


class DemoError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def required_text(value: object, name: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise DemoError(f"{name}: debe contener entre 1 y {limit} caracteres.")
    return value.strip()


def proper_int(value: object, name: str, maximum: int) -> int:
    if type(value) is not int or not 1 <= value <= maximum:
        raise DemoError(f"{name}: debe ser un entero entre 1 y {maximum}.")
    return value


class RestaurantDemo:
    def __init__(self, db_path: Path):
        self.db_path = Path(db_path)
        if self.db_path.is_symlink():
            raise DemoError("La base demo no puede ser un enlace simbólico.")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.executescript(DDL)
            db.executemany("""
                INSERT OR IGNORE INTO demo_menu(sku,name,price_cents,stock,low_at)
                VALUES (?,?,?,?,?)
            """, MENU)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.db_path, timeout=10)
        try:
            db.row_factory = sqlite3.Row
            db.execute("PRAGMA foreign_keys=ON")
            db.execute("PRAGMA busy_timeout=10000")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def event(db: sqlite3.Connection, kind: str, message: str,
              ref_id: int | None = None) -> None:
        db.execute("""
            INSERT INTO demo_events(kind,message,created_at,reference_id)
            VALUES (?,?,?,?)
        """, (kind, message, now(), ref_id))

    @staticmethod
    def outbox(db: sqlite3.Connection, kind: str, destination: str,
               message: str) -> None:
        db.execute("""
            INSERT INTO demo_outbox(event_type,destination,message,state,created_at)
            VALUES (?,?,?,'SIMULATED',?)
        """, (kind, destination, message, now()))

    def create_order(self, alias: object, sku: object, quantity: object) -> dict:
        alias = required_text(alias, "Nombre de prueba", 64)
        sku = required_text(sku, "Producto", 32)
        quantity = proper_int(quantity, "Cantidad", 50)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            product = db.execute(
                "SELECT sku, name, price_cents FROM demo_menu WHERE sku=?", (sku,)
            ).fetchone()
            if product is None:
                raise DemoError("Producto no disponible en el menú.", 404)
            total = product["price_cents"] * quantity
            cur = db.execute("""
                INSERT INTO demo_orders(customer_alias,status,total_cents,created_at)
                VALUES (?,'PENDING',?,?)
            """, (alias, total, now()))
            order_id = cur.lastrowid
            db.execute("""
                INSERT INTO demo_order_lines(order_id,sku,quantity,unit_price_cents)
                VALUES (?,?,?,?)
            """, (order_id, sku, quantity, product["price_cents"]))
            self.event(db, "ORDER_RECEIVED",
                       f"Pedido #{order_id} recibido: {quantity} × {product['name']}.", order_id)
        return {"orderId": order_id, "status": "PENDING",
                "totalCents": total, "productionClaim": False}

    def confirm_order(self, order_id: object) -> dict:
        order_id = proper_int(order_id, "Identificador de pedido", 2_000_000_000)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            order = db.execute(
                "SELECT * FROM demo_orders WHERE id=?", (order_id,)
            ).fetchone()
            if order is None:
                raise DemoError("Pedido no encontrado.", 404)
            if order["status"] != "PENDING":
                raise DemoError("Pedido ya confirmado: el stock no se descontará de nuevo.", 409)
            lines = db.execute(
                "SELECT * FROM demo_order_lines WHERE order_id=?", (order_id,)
            ).fetchall()
            if not lines:
                raise DemoError("El pedido no contiene productos.", 409)
            # First validate ALL lines; never partially reserve stock.
            products = {}
            for line in lines:
                product = db.execute(
                    "SELECT * FROM demo_menu WHERE sku=?", (line["sku"],)
                ).fetchone()
                if not product or product["stock"] < line["quantity"]:
                    raise DemoError(
                        f"Stock insuficiente para {line['sku']}. Pedido pendiente; sin descuentos.", 409
                    )
                products[line["sku"]] = product
            low_stock = []
            for line in lines:
                product = products[line["sku"]]
                before, after = product["stock"], product["stock"] - line["quantity"]
                db.execute("UPDATE demo_menu SET stock=? WHERE sku=?",
                           (after, line["sku"]))
                self.event(db, "INVENTORY_RESERVED",
                           f"{product['name']}: {before} → {after} unidades.", order_id)
                # An alert only when the threshold is crossed, not on every sale.
                if before > product["low_at"] >= after:
                    message = (f"Stock bajo: {product['name']}, quedan {after}. "
                               f"Umbral: {product['low_at']}.")
                    db.execute("""
                        INSERT INTO demo_alerts(sku,order_id,message,created_at)
                        VALUES (?,?,?,?)
                    """, (product["sku"], order_id, message, now()))
                    self.outbox(db, "LOW_STOCK", "Almacén (simulado)", message)
                    self.event(db, "LOW_STOCK_ALERT", message, order_id)
                    low_stock.append(product["sku"])
            db.execute("""
                UPDATE demo_orders SET status='CONFIRMED', confirmed_at=?
                WHERE id=?
            """, (now(), order_id))
            self.outbox(db, "ORDER_CONFIRMED", "Cliente ficticio",
                        f"Pedido #{order_id} confirmado. Total S/ {order['total_cents']/100:.2f}.")
            self.event(db, "ORDER_CONFIRMED", f"Pedido #{order_id} confirmado.", order_id)
        return {
            "orderId": order_id, "status": "CONFIRMED", "lowStockSkus": low_stock,
            "notification": "SIMULATED", "productionClaim": False,
        }

    def create_ticket(self, subject: object, detail: object,
                      order_id: object = None) -> dict:
        subject = required_text(subject, "Asunto", 100)
        detail = required_text(detail, "Descripción", 1200)
        if order_id is not None:
            order_id = proper_int(order_id, "ID de pedido", 2_000_000_000)
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if order_id is not None and db.execute(
                "SELECT 1 FROM demo_orders WHERE id=?", (order_id,)
            ).fetchone() is None:
                raise DemoError("No existe el pedido que deseas asociar.", 404)
            cur = db.execute("""
                INSERT INTO demo_tickets(order_id,subject,detail,created_at)
                VALUES (?,?,?,?)
            """, (order_id, subject, detail, now()))
            self.event(db, "SUPPORT_TICKET_CREATED",
                       f"Ticket #{cur.lastrowid} registrado: {subject}.", cur.lastrowid)
            self.outbox(db, "TICKET_CREATED", "Soporte (simulado)",
                        f"Nuevo ticket #{cur.lastrowid}: {subject}.")
        return {"ticketId": cur.lastrowid, "status": "OPEN",
                "notification": "SIMULATED", "productionClaim": False}

    def state(self) -> dict:
        with self.connect() as db:
            menu = [dict(x) for x in db.execute(
                "SELECT sku,name,price_cents,stock,low_at FROM demo_menu ORDER BY name"
            )]
            orders = [dict(x) for x in db.execute("""
                SELECT o.id,o.customer_alias,o.status,o.total_cents,o.created_at,
                       l.sku,l.quantity,m.name AS product_name
                FROM demo_orders o
                JOIN demo_order_lines l ON l.order_id=o.id
                JOIN demo_menu m ON m.sku=l.sku
                ORDER BY o.id DESC LIMIT 40
            """)]
            alerts = [dict(x) for x in db.execute(
                "SELECT id,sku,order_id,message,created_at FROM demo_alerts ORDER BY id DESC LIMIT 30"
            )]
            tickets = [dict(x) for x in db.execute(
                "SELECT id,order_id,subject,detail,status,created_at FROM demo_tickets ORDER BY id DESC LIMIT 30"
            )]
            outbox = [dict(x) for x in db.execute(
                "SELECT id,event_type,destination,message,state,created_at FROM demo_outbox ORDER BY id DESC LIMIT 40"
            )]
            events = [dict(x) for x in db.execute(
                "SELECT id,kind,message,created_at,reference_id FROM demo_events ORDER BY id DESC LIMIT 60"
            )]
            stats = db.execute("""
                SELECT COUNT(*) AS total, COALESCE(SUM(status='CONFIRMED'),0) AS confirmed,
                       COALESCE(SUM(CASE WHEN status='CONFIRMED' THEN total_cents ELSE 0 END),0) AS total_cents
                FROM demo_orders
            """).fetchone()
        return {
            "schemaVersion": 1, "tenantId": "chifaavperu",
            "demo": True, "productionClaim": False,
            "source": "LOCAL_SQLITE_DEMO_ENGINE",
            "menu": menu, "orders": orders, "alerts": alerts, "tickets": tickets,
            "outbox": outbox, "events": events,
            "metrics": {
                "orders": stats["total"], "confirmed": stats["confirmed"],
                "simulatedRevenueCents": stats["total_cents"],
                "lowStockProducts": sum(x["stock"] <= x["low_at"] for x in menu),
                "alerts": len(alerts), "openTickets": sum(x["status"] == "OPEN" for x in tickets)
            },
        }
