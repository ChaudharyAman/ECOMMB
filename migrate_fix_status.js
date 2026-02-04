const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/Product');

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        // Find products without status or with invalid status
        const products = await Product.find({ 
            $or: [
                { status: { $exists: false } },
                { status: null }
            ]
        });

        console.log(`Found ${products.length} products to migrate.`);

        for (const p of products) {
            p.status = 'approved'; // Defaulting legacy products to approved
            if (!p.history) p.history = [];
            p.history.push({
                action: 'migration',
                note: 'Auto-migrated legacy product to approved status',
                timestamp: new Date()
            });
            await p.save();
            console.log(`Migrated Product: ${p.name} (${p._id})`);
        }

        console.log('Migration Complete.');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

migrate();
