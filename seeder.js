const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Order = require('./src/models/Order');
const OTP = require('./src/models/OTP');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    // Clear existing data
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await Vendor.deleteMany();
    await User.deleteMany();
    await OTP.deleteMany(); // Clear OTPs too

    console.log('Data destroyed...');

    // Create Users
    const createdUsers = await User.insertMany([
      {
        name: 'Admin User',
        phone: '9999999999',
        email: 'admin@example.com',
        role: 'admin',
      },
      {
        name: 'Vendor User',
        phone: '8888888888',
        email: 'vendor@example.com',
        role: 'vendor',
      },
      {
        name: 'Customer User',
        phone: '7777777777',
        email: 'user@example.com',
        role: 'user',
      },
    ]);

    const adminUser = createdUsers[0];
    const vendorUser = createdUsers[1];

    console.log('Users created...');

    // Create Vendor Profile
    await Vendor.create({
      user: vendorUser._id,
      storeName: 'Top Tech Store',
      storeDescription: 'Your one stop shop for electronics',
      address: {
        street: 'Tech Park',
        city: 'Cyber City',
        state: 'DL',
        zip: '110001',
      },
      isApproved: true,
    });

    console.log('Vendor profile created...');

    // Create Categories
    await Category.insertMany([
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Fashion', slug: 'fashion' },
      { name: 'Home & Living', slug: 'home-living' },
    ]);

    console.log('Categories created...');

    console.log('Data Imported Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
