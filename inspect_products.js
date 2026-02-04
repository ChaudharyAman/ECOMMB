const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/Product');

dotenv.config();

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        const products = await Product.find({});
        console.log(`Found ${products.length} products.`);
        
        products.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.name}, Status: '${p.status}', IsActive: ${p.isActive}`);
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspect();
