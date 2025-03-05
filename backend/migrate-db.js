const { MongoClient } = require('mongodb');
require('dotenv').config();

async function migrateDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Source and destination databases
    const sourceDb = client.db('visionvox');
    const destDb = client.db('visionvox2');
    
    // Get all collections from source database
    const collections = await sourceDb.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections to migrate`);
    
    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`Migrating collection: ${collectionName}`);
      
      // Get all documents from source collection
      const sourceCollection = sourceDb.collection(collectionName);
      const documents = await sourceCollection.find({}).toArray();
      
      console.log(`Found ${documents.length} documents in ${collectionName}`);
      
      if (documents.length > 0) {
        // Insert documents into destination collection
        const destCollection = destDb.collection(collectionName);
        
        // Drop the destination collection if it exists
        try {
          await destCollection.drop();
          console.log(`Dropped existing ${collectionName} collection in destination database`);
        } catch (err) {
          // Collection might not exist, which is fine
          console.log(`Creating new ${collectionName} collection in destination database`);
        }
        
        // Insert the documents
        const result = await destCollection.insertMany(documents);
        console.log(`Inserted ${result.insertedCount} documents into ${collectionName}`);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateDatabase().catch(console.error); 