import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const BUSINESS = {
  name: "Life Well",
  tagline: "Purified Drinking Water",
  type: "Water Refilling Station",
  location: "Barangay Alangan, Sibalom, Antique",
  contact: "09087831307",
  email: "Arjohnleesandoy@gmail.com",
  social: "Life Well Purified Drinking Water",
  hours: "Monday - Sunday, 7:00 AM - 4:30 PM",
  gcash: "09930914199 - Arjohn Lee",
};

const PRODUCTS = [
  {
    id: "water-container",
    name: "Water Container",
    category: "Service",
    image: "/product-container.png",
    description: "Clean and safe purified drinking water for daily household use.",
    priceBase: 25,
    variants: ["1"],
    stock: "Available Everyday",
  },
  {
    id: "water-bottle",
    name: "Water Bottle",
    category: "Product",
    image: "/product-bottle.png",
    description: "Sealed purified drinking water bottle for personal and travel use.",
    priceBase: 15,
    variants: ["1"],
    stock: "Available Everyday",
  },
  {
    id: "gallon-jar",
    name: "Gallon Jar",
    category: "Product",
    image: "/product-gallon.png",
    description: "Large gallon jar refill for families and small businesses.",
    priceBase: 25,
    variants: ["1"],
    stock: "Available Everyday",
  },
];

const ADMIN_PASSWORD = "ArjohnloveAbby";
const ORDER_STORAGE_KEY = "lifewell_orders_v1";

function toPhp(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function createOrder(form) {
  const now = new Date();
  const quantity = Number(form.quantity) || 1;
  const selectedProduct = PRODUCTS.find((product) => product.name === form.product);
  const unitPrice = selectedProduct?.priceBase ?? 25;
  const total = unitPrice * quantity;

  return {
    id: `LW-${now.getTime()}`,
    createdAt: now.toISOString(),
    customerName: form.customerName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    product: form.product,
    quantity,
    note: form.note.trim(),
    paymentMethod: form.paymentMethod,
    deliveryType: "Pickup",
    unitPrice,
    total,
    status: "Pending",
  };
}

function App() {
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [latestOrder, setLatestOrder] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    product: "Water Container",
    quantity: 1,
    note: "Fragile",
    paymentMethod: "Cash on Delivery",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setOrders(parsed);
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );
  const totalGallons = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.quantity || 0), 0),
    [orders]
  );
  const deliveredCount = useMemo(
    () => orders.filter((order) => order.status === "Delivered").length,
    [orders]
  );
  const dailyOrders = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const day = new Date(order.createdAt).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      });
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map, ([date, count]) => ({ date, count }));
  }, [orders]);
  const statusBreakdown = useMemo(() => {
    const counts = { Pending: 0, Confirmed: 0, Delivered: 0, Cancelled: 0 };
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  function goTo(nextPage) {
    setPage(nextPage);
    setMenuOpen(false);
  }

  function submitOrder(event) {
    event.preventDefault();
    const newOrder = createOrder(form);
    setOrders((prev) => [newOrder, ...prev]);
    setLatestOrder(newOrder);
    setForm({
      customerName: "",
      phone: "",
      address: "",
      product: "Water Container",
      quantity: 1,
      note: "Fragile",
      paymentMethod: "Cash on Delivery",
    });
  }

  function updateOrderStatus(id, status) {
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status } : order))
    );
  }

  function removeOrder(id) {
    setOrders((prev) => prev.filter((order) => order.id !== id));
  }

  function exportOrdersCsv() {
    if (!orders.length) return;
    const header = [
      "Order ID",
      "Date",
      "Customer",
      "Phone",
      "Address",
      "Product",
      "Qty",
      "Unit Price",
      "Total",
      "Payment",
      "Order Type",
      "Status",
      "Note",
    ];
    const rows = orders.map((order) => [
      order.id,
      new Date(order.createdAt).toLocaleString(),
      order.customerName,
      order.phone,
      order.address,
      order.product,
      order.quantity,
      order.unitPrice,
      order.total,
      order.paymentMethod,
      "Pickup",
      order.status,
      order.note,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifewell-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function checkAdminPassword() {
    setPasswordError("");
    if (passwordInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setPage("admin");
      setPasswordInput("");
      return;
    }
    setPasswordError("Incorrect password.");
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand" onClick={() => goTo("home")}>
          <img
            src="/lifewell-logo.jpg"
            alt="Life Well water station logo"
            className="brand-logo"
          />
          <div>
            <h1>{BUSINESS.name}</h1>
            <p>{BUSINESS.tagline}</p>
            <img
              src="/tagline-photo.png"
              alt="Life Well tagline sign"
              className="tagline-photo"
            />
          </div>
        </div>

        <button
          type="button"
          className="menu-btn"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          Menu
        </button>

        <nav className={`nav ${menuOpen ? "open" : ""}`}>
          <button type="button" onClick={() => goTo("home")}>
            Home
          </button>
          <button type="button" onClick={() => goTo("products")}>
            Products
          </button>
          <button type="button" onClick={() => goTo("order")}>
            Order
          </button>
          <button type="button" onClick={() => goTo("admin-access")}>
            Admin
          </button>
        </nav>
      </header>

      <main>
        {page === "home" && (
          <section className="page">
            <div className="card hero">
              <h2>Stay hydrated, stay healthy</h2>
              <p>Providing high quality refill water with care.</p>
              <div className="hero-actions">
                <button type="button" onClick={() => goTo("order")}>
                  Refill Now
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => goTo("products")}
                >
                  Stay Refresh
                </button>
              </div>
            </div>

            <div className="grid two-col">
              <article className="card">
                <h3>About {BUSINESS.name}</h3>
                <p>
                  Life Well Refilling Station was established to address limited
                  access to clean and affordable drinking water in Barangay
                  Alangan, Sibalom, Antique.
                </p>
                <p>
                  It is built to serve local households with trusted quality,
                  friendly service, and dependable daily operations.
                </p>
              </article>

              <article className="card">
                <h3>Why Choose Us</h3>
                <ul>
                  <li>Clean and Safe</li>
                  <li>Affordable prices</li>
                  <li>Friendly and trusted service</li>
                  <li>Reliable refill service</li>
                </ul>
              </article>
            </div>

            <article className="card">
              <h3>Business Details</h3>
              <p>
                <strong>Type:</strong> {BUSINESS.type}
              </p>
              <p>
                <strong>Area Served:</strong> {BUSINESS.location}
              </p>
              <p>
                <strong>Hours:</strong> {BUSINESS.hours}
              </p>
              <p>
                <strong>Contact:</strong> {BUSINESS.contact}
              </p>
              <p>
                <strong>Email:</strong> {BUSINESS.email}
              </p>
              <p>
                <strong>Facebook:</strong> {BUSINESS.social}
              </p>
              <p>
                <strong>GCash:</strong> {BUSINESS.gcash}
              </p>
            </article>
          </section>
        )}

        {page === "products" && (
          <section className="page">
            <h2 className="page-title">Products and Services</h2>
            <div className="grid products-grid">
              {PRODUCTS.map((product) => (
                <article key={product.id} className="card product-card">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="product-photo"
                  />
                  <p className="chip">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <p>
                    <strong>Pickup:</strong> {toPhp(product.priceBase)} per piece
                  </p>
                  <p>
                    <strong>Variants:</strong> {product.variants.join(", ")}
                  </p>
                  <p>
                    <strong>Stock:</strong> {product.stock}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {page === "order" && (
          <section className="page">
            <h2 className="page-title">Ordering / Checkout</h2>
            <form className="card order-form" onSubmit={submitOrder}>
              <div className="grid form-grid">
                <label>
                  Name
                  <input
                    required
                    value={form.customerName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        customerName: event.target.value,
                      }))
                    }
                    placeholder="e.g. Arjohn"
                  />
                </label>

                <label>
                  Phone
                  <input
                    required
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="e.g. 09667348747"
                  />
                </label>

                <label>
                  Address
                  <input
                    required
                    value={form.address}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        address: event.target.value,
                      }))
                    }
                    placeholder="e.g. Barangay Alangan, Sibalom, Antique"
                  />
                </label>

                <label>
                  Product
                  <select
                    value={form.product}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, product: event.target.value }))
                    }
                  >
                    <option>Water Container</option>
                    <option>Water Bottle</option>
                    <option>Gallon Jar</option>
                  </select>
                </label>

                <label>
                  Quantity
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, quantity: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Payment Method
                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        paymentMethod: event.target.value,
                      }))
                    }
                  >
                    <option>Cash on Delivery</option>
                    <option>GCash</option>
                  </select>
                </label>

                <label>
                  Note
                  <input
                    value={form.note}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, note: event.target.value }))
                    }
                    placeholder="e.g. Fragile"
                  />
                </label>
              </div>

              <button type="submit">Submit Order</button>
            </form>

            {latestOrder && (
              <article className="card success">
                <h3>Order Received</h3>
                <p>
                  Thank you, {latestOrder.customerName}. Your order has been
                  received. We will contact you within 24 hours to confirm.
                </p>
                <p>
                  For urgent orders, message us on Facebook or call{" "}
                  {BUSINESS.contact}.
                </p>
                <p>
                  <strong>Summary:</strong> {latestOrder.quantity} x{" "}
                  {latestOrder.product} (Pickup) ={" "}
                  {toPhp(latestOrder.total)}
                </p>
              </article>
            )}
          </section>
        )}

        {page === "admin-access" && (
          <section className="page">
            <h2 className="page-title">Admin Access</h2>
            <div className="card admin-lock">
              <label>
                Admin Password
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="Enter password"
                />
              </label>
              <button type="button" onClick={checkAdminPassword}>
                Unlock Admin
              </button>
              {passwordError && <p className="error">{passwordError}</p>}
            </div>
          </section>
        )}

        {page === "admin" && adminUnlocked && (
          <section className="page">
            <h2 className="page-title">Life Well Admin Dashboard</h2>

            <div className="grid stats-grid">
              <article className="card stat">
                <p>Total Revenue</p>
                <h3>{toPhp(totalRevenue)}</h3>
              </article>
              <article className="card stat">
                <p>Total Gallons Ordered</p>
                <h3>{totalGallons}</h3>
              </article>
              <article className="card stat">
                <p>Delivered Orders</p>
                <h3>{deliveredCount}</h3>
              </article>
              <article className="card stat">
                <p>Total Orders</p>
                <h3>{orders.length}</h3>
              </article>
            </div>

            <div className="grid two-col">
              <article className="card chart-card">
                <h3>Daily Order Volume</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyOrders}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#0077c8" />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className="card chart-card">
                <h3>Order Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={statusBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00a7e8" />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </div>

            <article className="card table-card">
              <div className="table-head">
                <h3>Orders</h3>
                <button type="button" onClick={exportOrdersCsv}>
                  Export CSV
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Time</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.customerName}</td>
                        <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                        <td>{order.quantity}</td>
                        <td>{toPhp(order.total)}</td>
                        <td>{order.paymentMethod}</td>
                        <td>{order.address}</td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(event) =>
                              updateOrderStatus(order.id, event.target.value)
                            }
                          >
                            <option>Pending</option>
                            <option>Confirmed</option>
                            <option>Delivered</option>
                            <option>Cancelled</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => removeOrder(order.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
