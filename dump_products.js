const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const Product = require('./src/models/Product');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        const products = await Product.find({});
        let log = '--- ALL PRODUCTS ---\n';
        products.forEach(p => {
            log += `ID: ${p._id} | Name: ${p.name} | Status: ${p.status}\n`;
        });
        fs.writeFileSync('product_dump.txt', log);
        process.exit();
    } catch (error) {
        fs.writeFileSync('product_dump.txt', `Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();
