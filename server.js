import express from "express";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const productsPath = path.join("./products.json");
const ordersPath = path.join("./orders.json");

// Load JSON safely
function loadJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (e) {
        console.error(`Error reading ${file}:`, e);
        return null;
    }
}

// Save JSON safely
function saveJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error writing ${file}:`, e);
        return false;
    }
}

// API: Get stock & create order
app.post("/api/get_stock", (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    if (!user_id || !product_id || !quantity)
        return res.status(400).json({ error: "Missing parameters" });

    const products = loadJSON(productsPath);
    if (!products) return res.status(500).json({ error: "Cannot load products" });

    const product = products[product_id];
    if (!product) return res.status(404).json({ error: "Product not found" });

    if (product.stock < quantity) return res.json({ status: "OUT_OF_STOCK", product });

    // Decrement stock
    product.stock -= quantity;
    if (!saveJSON(productsPath, products))
        return res.status(500).json({ error: "Cannot update products" });

    // Create order
    const orders = loadJSON(ordersPath);
    if (!orders) return res.status(500).json({ error: "Cannot load orders" });

    const order = {
        order_id: Date.now(),
        user_id,
        product_id,
        quantity,
        status: "pending",
        created_at: new Date()
    };
    orders.push(order);
    if (!saveJSON(ordersPath, orders))
        return res.status(500).json({ error: "Cannot save order" });

    res.json({ status: "OK", server_id: product.server_id, product, order_id: order.order_id });
});

// Health check
app.get("/", (req, res) => res.send("✅ Diamond Top-up API running"));

// Start server
app.listen(3000, () => console.log("✅ Server running on port 3000"));
