const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Vendor = require('./src/models/Vendor');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('DB Connected');

        const suffix = Date.now();
        const adminEmail = `admin_${suffix}@test.com`;
        const vendorEmail = `vendor_${suffix}@test.com`;

        // 1. Create Admin
        const adminUser = await User.create({
            name: 'Admin User',
            email: adminEmail,
            password: 'password123',
            role: 'admin',
            phone: `111${suffix}`
        });
        console.log('Admin Created:', adminUser._id);

        // 2. Create Vendor User
        const vendorUser = await User.create({
            name: 'Vendor User',
            email: vendorEmail,
            password: 'password123',
            role: 'user', // Starts as user
            phone: `222${suffix}`
        });
        console.log('Vendor User Created:', vendorUser._id);

        // 3. Vendor Onboards
        // Simulating POST /api/vendors/onboard
        const vendorProfile = await Vendor.create({
            user: vendorUser._id,
            storeName: `Store ${suffix}`,
            kycStatus: 'pending',
            bankDetails: { accountNumber: '1234567890', bankName: 'Test Bank' }
        });
        console.log('Vendor Profile Created (Pending):', vendorProfile._id);

        // 4. Admin Approves Vendor
        // Simulating PUT /api/admin/vendors/:id/approve
        vendorProfile.isApproved = true;
        vendorProfile.kycStatus = 'approved';
        await vendorProfile.save();
        
        // Update user role to vendor
        vendorUser.role = 'vendor';
        await vendorUser.save();
        console.log('Vendor Approved & Role Updated');

        // 5. Create Category
        const category = await Category.create({
            name: `Cat ${suffix}`,
            slug: `cat-${suffix}`
        });

        // 6. Vendor Creates Product (Draft)
        // Simulating POST /api/products
        const product = await Product.create({
            user: vendorUser._id, // legacy field
            vendor: vendorProfile._id,
            name: `Product ${suffix}`,
            price: 100,
            description: 'Test Description',
            category: category._id,
            stock: 10,
            status: 'draft',
            slug: `prod-${suffix}`
        });
        console.log('Product Created (Draft):', product._id, product.status);

        // 7. Vendor Submits Product
        // Simulating PUT /api/products/:id/submit
        product.status = 'pending';
        product.history.push({ action: 'submitted', changedBy: vendorUser._id });
        await product.save();
        console.log('Product Submitted (Pending):', product.status);

        // 8. Admin Approves Product
        // Simulating PUT /api/admin/products/:id/approve
        product.status = 'approved';
        product.isActive = true;
        product.history.push({ action: 'approved', changedBy: adminUser._id });
        await product.save();
        console.log('Product Approved (Live):', product.status);

        // 9. Verify Public List
        const count = await Product.countDocuments({ status: 'approved', isActive: true, _id: product._id });
        console.log('Public Visibility Check:', count === 1 ? 'VISIBLE' : 'HIDDEN');

        // 10. Create an Order to verify Stats
        const Order = require('./src/models/Order');
        await Order.create({
            user: adminUser._id, // Admin buying from Vendor
            items: [{
                product: product._id,
                quantity: 2,
                price: 100, // Total 200
                vendor: vendorProfile._id
            }],
            totalPrice: 200
        });
        console.log('Order Created (Value: 200)');

        // 11. Check Vendor Stats Logic (Simulating Aggregation)
        const stats = await Order.aggregate([
            { $match: { 'items.vendor': vendorProfile._id } },
            { $unwind: '$items' },
            { $match: { 'items.vendor': vendorProfile._id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $addToSet: '$_id' },
                    totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    orderCount: { $size: '$totalOrders' },
                    totalSales: 1
                }
            }
        ]);
        console.log('Stats Check:', stats[0]); // Should be { totalSales: 200, orderCount: 1 }

        process.exit();

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
