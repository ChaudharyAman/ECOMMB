const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const Product = require('./src/models/Product');

dotenv.config();
connectDB();

const checkProducts = async () => {
  try {
    const products = await Product.find({});
    console.log('--- PRODUCTS DATA ---');
    products.forEach(p => {
        console.log(`ID: ${p._id}`);
        console.log(`Name: ${p.name}`);
        console.log(`Image (Raw):`, p.image);
        console.log(`Image Type:`, typeof p.image);
        console.log('-------------------');
    });
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkProducts();
