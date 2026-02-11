const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

// @desc    Approve a vendor
// @route   PUT /api/admin/vendors/:id/approve
// @access  Private/Admin
const approveVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);

  if (vendor) {
    vendor.isApproved = true;
    vendor.kycStatus = 'approved'; // Assuming auto-approve KYC or separate step
    await vendor.save();
    
    // Optionally update User role?
    // const user = await User.findById(vendor.user);
    // if (user) { user.role = 'vendor'; await user.save(); }

    res.json({ message: 'Vendor approved', vendor });
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

// @desc    Update vendor details
// @route   PUT /api/admin/vendors/:id
// @access  Private/Admin
const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);

  if (vendor) {
    // 1. Update Vendor Fields
    vendor.storeName = req.body.storeName || vendor.storeName;
    vendor.commissionRate = req.body.commissionRate !== undefined ? req.body.commissionRate : vendor.commissionRate;
    vendor.address = req.body.address || vendor.address;
    vendor.bankDetails = req.body.bankDetails || vendor.bankDetails;

    await vendor.save();

    // 2. Update Linked User Fields
    if (vendor.user) {
        const user = await User.findById(vendor.user);
        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            await user.save();
        }
    }

    // Refetch to populate user data for the response
    const updatedVendor = await Vendor.findById(req.params.id).populate('user', 'name email phone');
    res.json(updatedVendor);
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

// @desc    Reject a vendor
// @route   PUT /api/admin/vendors/:id/reject
// @access  Private/Admin
const rejectVendor = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const vendor = await Vendor.findById(req.params.id);

  if (vendor) {
    vendor.isApproved = false;
    vendor.kycStatus = 'rejected';
    // Logic to send email with reason
    await vendor.save();
    res.json({ message: 'Vendor rejected', reason });
  } else {
    res.status(404);
    throw new Error('Vendor not found');
  }
});

// @desc    Get products waiting for approval
// @route   GET /api/admin/products/pending
// @access  Private/Admin
const getModerationQueue = asyncHandler(async (req, res) => {
  const { category, vendor } = req.query;
  
  let query = { status: 'pending' };
  
  if (category) {
      query.category = category;
  }
  
  if (vendor) {
      query.vendor = vendor;
  }

  const products = await Product.find(query)
    .populate('vendor', 'storeName')
    .populate('category', 'name');
  console.log(`[DEBUG] Found ${products.length} pending products with filters:`, query);
  res.json(products);
});

// @desc    Approve a product
// @route   PUT /api/admin/products/:id/approve
// @access  Private/Admin
const approveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    product.status = 'approved';
    product.isActive = true;
    product.history.push({
      action: 'approved',
      changedBy: req.user._id,
      note: 'Admin approval'
    });
    await product.save();
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Reject a product
// @route   PUT /api/admin/products/:id/reject
// @access  Private/Admin
const rejectProduct = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const product = await Product.findById(req.params.id);

  if (product) {
    product.status = 'rejected';
    product.rejectionReason = reason;
    product.isActive = false;
    product.history.push({
      action: 'rejected',
      changedBy: req.user._id,
      note: reason
    });
    await product.save();
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private/Admin
const getVendors = asyncHandler(async (req, res) => {
    const vendors = await Vendor.find({})
        .populate('user', 'name email')
        .sort({ kycStatus: 1, createdAt: -1 }); // Pending first
    res.json(vendors);
});

// @desc    Create a new vendor (Admin)
// @route   POST /api/admin/vendors
// @access  Private/Admin
const createVendor = asyncHandler(async (req, res) => {
    const { 
        name, email, password, phone, // User details
        storeName, address, bankDetails, commissionRate // Vendor details
    } = req.body;

    console.log('[CREATE VENDOR] Request received:', { email, storeName });

    // 1. Check if user with this email already exists
    let user = await User.findOne({ email });
    
    if (user) {
        console.log('[CREATE VENDOR] User exists:', user._id);
        // Check if user is already a vendor
        const existingVendor = await Vendor.findOne({ user: user._id });
        if (existingVendor) {
            console.log('[CREATE VENDOR] Vendor already exists for this user');
            res.status(400);
            throw new Error('A vendor account already exists for this email');
        }
        // Update role if not already
        if (user.role !== 'vendor' && user.role !== 'admin') {
            user.role = 'vendor';
            await user.save();
            console.log('[CREATE VENDOR] Updated user role to vendor');
        }
    } else {
        console.log('[CREATE VENDOR] Creating new user');
        user = await User.create({
            name,
            email,
            phone,
            password,
            role: 'vendor'
        });
        console.log('[CREATE VENDOR] User created:', user._id);
    }

    // 2. Create Vendor (store name can be duplicate)
    console.log('[CREATE VENDOR] Creating vendor profile');
    const vendor = await Vendor.create({
        user: user._id,
        storeName,
        address,
        bankDetails,
        commissionRate: commissionRate || 0,
        isApproved: true, // Admin created vendors are auto-approved
        kycStatus: 'approved' 
    });

    console.log('[CREATE VENDOR] Vendor created successfully:', vendor._id);

    // Populate user data before sending response
    const populatedVendor = await Vendor.findById(vendor._id).populate('user', 'name email phone');
    
    res.status(201).json(populatedVendor);
});

// @desc    Get all approved products (Admin View - includes inactive)
// @route   GET /api/admin/products/approved
// @access  Private/Admin
const getApprovedProducts = asyncHandler(async (req, res) => {
    const { category, vendor, keyword } = req.query;
    
    // Base query: approved products
    // Note: We intentionally do NOT filter by isActive: true to show disabled products
    let query = { status: 'approved' };
    
    if (category) {
        query.category = category;
    }
    
    if (vendor) {
        query.vendor = vendor;
    }

    if (keyword) {
        query.name = { $regex: keyword, $options: 'i' };
    }
  
    // Fetch all for now (infinite scroll/large list)
    // In future: Implement proper pagination
    const products = await Product.find(query)
      .populate('vendor', 'storeName')
      .populate('category', 'name')
      .sort({ updatedAt: -1 })
      .limit(1000); // High limit to see "all" products
      
    console.log(`[DEBUG] Found ${products.length} approved products (Admin View)`);
    res.json(products);
});

module.exports = {
  getVendors,
  createVendor,
  updateVendor,
  approveVendor,
  rejectVendor,
  getModerationQueue,
  approveProduct,
  rejectProduct,
  getApprovedProducts,
};
