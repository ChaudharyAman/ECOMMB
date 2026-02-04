const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Hardcoded URI for reliable local check
    const conn = await mongoose.connect('mongodb://localhost:27017/ecomm_mvp');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Define minimal schema
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    
    const products = await Product.find({});
    console.log(`Found ${products.length} products`);
    
    products.forEach(p => {
        console.log(`Name: ${p.name}`);
        console.log(`Image: ${p.image} (Type: ${typeof p.image})`);
        console.log('---');
    });
    
    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

connectDB();
