const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/Product');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const checkProducts = async () => {
    await connectDB();
    const products = await Product.find({});
    console.log('--- ALL PRODUCTS ---');
    products.forEach(p => {
        console.log(`ID: ${p._id} | Name: ${p.name} | Status: ${p.status} | Vendor: ${p.vendor}`);
    });
    console.log('--------------------');
    process.exit();
};

checkProducts();
