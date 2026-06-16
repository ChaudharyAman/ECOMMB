const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Programmatically drop the obsolete unique index ipAddress_1 if it exists in the database
    try {
      await mongoose.connection.db.collection('visitors').dropIndex('ipAddress_1');
      console.log('Obsolete unique visitor ipAddress_1 index dropped successfully.');
    } catch (indexError) {
      // The index may not exist, which is expected on new or clean databases
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
