-- DUMMY DATA FOR E-COMMERCE API

-- 1. Insert Categories
INSERT INTO categories (name, description, status, images, created_at, updated_at) VALUES 
('Electronics', 'Latest gadgets, phones, and laptops', 'active', 'uploads/categories/electronics.jpg', NOW(), NOW()),
('Fashion', 'Clothing, shoes, and accessories', 'active', 'uploads/categories/fashion.jpg', NOW(), NOW()),
('Home & Kitchen', 'Furniture and kitchen appliances', 'active', 'uploads/categories/home.jpg', NOW(), NOW());

-- 2. Insert Users (Password is 'password123' hashed with bcrypt)
-- Admin User
INSERT INTO users (name, email, password, role, status, created_at, updated_at) VALUES 
('Admin User', 'admin@example.com', '$2a$10$vI8tmZH.D7.p2y6iP.BwGu.d.B.B.B.B.B.B.B.B.B.B.B.B.B.B', 'admin', 1, NOW(), NOW());

-- Regular User
INSERT INTO users (name, email, password, role, status, created_at, updated_at) VALUES 
('John Doe', 'john@example.com', '$2a$10$vI8tmZH.D7.p2y6iP.BwGu.d.B.B.B.B.B.B.B.B.B.B.B.B.B.B', 'user', 1, NOW(), NOW());

-- 3. Insert Products
-- Electronics (Assuming ID 1)
INSERT INTO products (name, category_id, details, price, images, status, created_at, updated_at) VALUES 
('iPhone 15 Pro', 1, 'Brand new Apple iPhone 15 Pro with Titanium body', 999.99, 'uploads/products/iphone15.jpg', 'active', NOW(), NOW()),
('Sony WH-1000XM5', 1, 'Industry leading noise canceling headphones', 349.99, 'uploads/products/sony_headphones.jpg', 'active', NOW(), NOW());

-- Fashion (Assuming ID 2)
INSERT INTO products (name, category_id, details, price, images, status, created_at, updated_at) VALUES 
('Nike Air Max 270', 2, 'Sporty and comfortable running shoes', 150.00, 'uploads/products/nike_air.jpg', 'active', NOW(), NOW()),
('Levi 501 Original Jeans', 2, 'Classic straight fit denim jeans', 69.50, 'uploads/products/levi_jeans.jpg', 'active', NOW(), NOW());

-- Home & Kitchen (Assuming ID 3)
INSERT INTO products (name, category_id, details, price, images, status, created_at, updated_at) VALUES 
('Nespresso Coffee Maker', 3, 'Make barista quality coffee at home', 199.00, 'uploads/products/nespresso.jpg', 'active', NOW(), NOW());
