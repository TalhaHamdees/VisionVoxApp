/**
 * Utility functions for storing and retrieving audio files using IndexedDB
 */

// Database configuration
const DB_NAME = 'visionvox_db';
const DB_VERSION = 2;
const AUDIO_STORE_NAME = 'audio_files';
const MEDIA_STORE_NAME = 'media_files';

/**
 * Opens the IndexedDB database connection
 * @returns Promise with the database connection
 */
const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject('Error opening IndexedDB');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create audio store if it doesn't exist
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        const audioStore = db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
        audioStore.createIndex('id', 'id', { unique: true });
      }

      // Create media store if it doesn't exist
      if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
        const mediaStore = db.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'id' });
        mediaStore.createIndex('id', 'id', { unique: true });
        mediaStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

/**
 * Stores an audio file in IndexedDB
 * @param audioFile The audio file to store
 * @returns Promise with the id of the stored file
 */
export const storeAudioFile = async (audioFile: { 
  id: string, 
  blob: Blob, 
  name: string, 
  type: string,
  duration?: number
}): Promise<string> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      
      const request = store.put(audioFile);
      
      request.onsuccess = () => {
        resolve(audioFile.id);
      };
      
      request.onerror = (event) => {
        console.error('Error storing audio file:', event);
        reject('Error storing audio file');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to store audio file:', error);
    throw error;
  }
};

/**
 * Stores a media file (image or video) in IndexedDB
 * @param mediaFile The media file to store
 * @returns Promise with the id of the stored file
 */
export const storeMediaFile = async (mediaFile: {
  id: string,
  blob: Blob,
  name: string,
  type: string,
  url?: string,
  dataUrl?: string,
  thumbnail?: string,
  duration?: number,
  width?: number,
  height?: number
}): Promise<string> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE_NAME);
      
      const request = store.put(mediaFile);
      
      request.onsuccess = () => {
        resolve(mediaFile.id);
      };
      
      request.onerror = (event) => {
        console.error('Error storing media file:', event);
        reject('Error storing media file');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to store media file:', error);
    throw error;
  }
};

/**
 * Converts a base64 string to a Blob object
 * @param base64Data - Base64 data string
 * @param contentType - MIME type of the data
 * @returns Blob object
 */
const base64ToBlob = (base64Data: string, contentType: string = ''): Blob => {
  // If there's a data URL prefix, remove it
  const base64ContentArray = base64Data.includes('base64,') 
    ? base64Data.split(',') 
    : [contentType, base64Data];
  
  // Get the data part (without metadata)
  const base64Content = base64ContentArray.length > 1 
    ? base64ContentArray[1] 
    : base64ContentArray[0];
  
  // Convert to binary
  const byteCharacters = atob(base64Content);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: contentType });
};

/**
 * Process media file from IndexedDB to ensure blob is correctly handled
 * @param file - Media file record from IndexedDB
 * @returns Processed media file
 */
const processMediaFile = (file: any): any => {
  if (!file) return file;
  
  // Ensure blob is properly handled
  if (file.blob) {
    // If blob is stored as a string (base64), convert it back to Blob
    if (typeof file.blob === 'string' && file.blob.startsWith('data:')) {
      file.blob = base64ToBlob(file.blob, file.type);
    }
    // If blob doesn't have a type property but we know the type, set it
    else if (file.blob instanceof Blob && !file.blob.type && file.type) {
      file.blob = new Blob([file.blob], { type: file.type });
    }
  }
  
  return file;
};

/**
 * Gets a media file from IndexedDB by id
 * @param id The id of the media file to retrieve
 * @returns Promise with the media file
 */
export const getMediaFileById = async (id: string): Promise<any> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE_NAME], 'readonly');
      const store = transaction.objectStore(MEDIA_STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        // Process the file to ensure blob is correct
        const file = processMediaFile(request.result);
        resolve(file);
      };
      
      request.onerror = (event) => {
        console.error('Error getting media file:', event);
        reject('Error getting media file');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get media file:', error);
    throw error;
  }
};

/**
 * Gets all media files from IndexedDB
 * @param mediaType Optional filter for media type (e.g., 'image', 'video')
 * @returns Promise with all media files matching the type filter
 */
export const getAllMediaFiles = async (mediaType?: string): Promise<any[]> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE_NAME], 'readonly');
      const store = transaction.objectStore(MEDIA_STORE_NAME);
      
      // If media type is specified, use an index to filter
      let request;
      if (mediaType) {
        const typeIndex = store.index('type');
        request = typeIndex.getAll(IDBKeyRange.bound(
          mediaType, 
          mediaType + '\uffff', // This trick gets all keys starting with mediaType
          false, 
          false
        ));
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        // Process each file to ensure blobs are correct
        const files = request.result.map(processMediaFile);
        resolve(files);
      };
      
      request.onerror = (event) => {
        console.error('Error getting media files:', event);
        reject('Error getting media files');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get media files:', error);
    throw error;
  }
};

/**
 * Gets an audio file from IndexedDB by id
 * @param id The id of the audio file to retrieve
 * @returns Promise with the audio file
 */
export const getAudioFileById = async (id: string): Promise<any> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting audio file:', event);
        reject('Error getting audio file');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get audio file:', error);
    throw error;
  }
};

/**
 * Gets all audio files from IndexedDB
 * @returns Promise with all audio files
 */
export const getAllAudioFiles = async (): Promise<any[]> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting all audio files:', event);
        reject('Error getting all audio files');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to get all audio files:', error);
    throw error;
  }
};

/**
 * Deletes an audio file from IndexedDB
 * @param id The id of the audio file to delete
 * @returns Promise indicating success
 */
export const deleteAudioFile = async (id: string): Promise<void> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting audio file:', event);
        reject('Error deleting audio file');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to delete audio file:', error);
    throw error;
  }
};

/**
 * Deletes a media file from IndexedDB
 * @param id The id of the media file to delete
 * @returns Promise indicating success
 */
export const deleteMediaFile = async (id: string): Promise<void> => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([MEDIA_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(MEDIA_STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error deleting media file:', event);
        reject('Error deleting media file');
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to delete media file:', error);
    throw error;
  }
}; 