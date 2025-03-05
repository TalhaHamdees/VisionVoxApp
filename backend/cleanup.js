const { MongoClient } = require('mongodb');
require('dotenv').config();

async function cleanupInvalidUsers() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('visionvox2');
    const usersCollection = db.collection('users');
    
    // Find users with invalid email format
    const invalidEmailRegex = /^[^\s@]+@[^\s@]+$/;
    const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    
    const invalidUsers = await usersCollection.find({
      email: { 
        $regex: invalidEmailRegex,
        $not: { $regex: validEmailRegex }
      }
    }).toArray();
    
    console.log(`Found ${invalidUsers.length} users with invalid email format:`);
    invalidUsers.forEach(user => {
      console.log(`- ${user.email} (${user._id})`);
    });
    
    if (invalidUsers.length > 0) {
      // Delete users with invalid email format
      const result = await usersCollection.deleteMany({
        email: { 
          $regex: invalidEmailRegex,
          $not: { $regex: validEmailRegex }
        }
      });
      
      console.log(`Deleted ${result.deletedCount} users with invalid email format`);
    }
    
    // Specifically delete the user with email "umer@gmai"
    const specificResult = await usersCollection.deleteOne({ email: 'umer@gmai' });
    
    if (specificResult.deletedCount > 0) {
      console.log('Successfully deleted user with email "umer@gmai"');
    } else {
      console.log('User with email "umer@gmai" not found or already deleted');
    }
    
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup function
cleanupInvalidUsers().catch(console.error); 