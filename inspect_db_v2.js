const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema);

const checkProducts = async () => {
  await connectDB();
  try {
    const products = await Product.find({});
    console.log('--- PRODUCTS DATA START ---');
    if (products.length === 0) {
        console.log('No products found.');
    }
    products.forEach(p => {
        console.log(`Product: ${p.short_name || p.name}`); // Handle relaxed schema
        console.log(`ID: ${p._id}`);
        console.log(`Image content: '${p.image}'`);
        console.log('-------------------');
    });
    console.log('--- PRODUCTS DATA END ---');
  } catch (error) {
    console.error('Error fetching products:', error);
  } finally {
      await mongoose.connection.close();
      process.exit();
  }
};

checkProducts();
