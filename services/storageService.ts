
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const storageService = {
    async uploadSchemaImage(file: File): Promise<string> {
        try {
            // Create a unique filename
            const filename = `schema_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `schemas/${filename}`);

            // Upload the file
            const snapshot = await uploadBytes(storageRef, file);
            console.log('Uploaded a blob or file!', snapshot);

            // Get the download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading file:", error);
            throw error;
        }
    }
};
