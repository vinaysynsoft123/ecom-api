const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDB() {
    console.log("Connecting to DB...");
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        });
        console.log("Connected successfully!");
        const [rows] = await db.query("SELECT * FROM categories LIMIT 1");
        console.log("Query result (categories):", rows);
        await db.end();
    } catch (err) {
        console.error("DB Error:", err);
    }
}

testDB();
