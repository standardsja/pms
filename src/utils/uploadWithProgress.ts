/**
 * uploadWithProgress - Upload file with progress tracking
 * 
 * Features:
 * - Real-time upload progress (0-100%)
 * - Abort support
 * - Error handling
 * - Works with FormData
 * 
 * @param url - Upload endpoint URL
 * @param formData - FormData containing files and data
 * @param token - Authorization token
 * @param onProgress - Progress callback (0-100)
 * @returns Promise with response data
 */
export const uploadWithProgress = <T = any>(
    url: string,
    formData: FormData,
    token: string,
    onProgress?: (progress: number) => void
): Promise<T> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && onProgress) {
                const progress = Math.round((e.loaded / e.total) * 100);
                onProgress(progress);
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.message || `Upload failed: ${xhr.status}`));
                } catch {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
        });

        // Setup and send request
        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
    });
};

/**
 * Create FormData from JSON object and files
 */
export const createFormData = (data: Record<string, any>, files?: File[]): FormData => {
    const formData = new FormData();
    
    // Append JSON data
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else if (Array.isArray(value)) {
                formData.append(key, JSON.stringify(value));
            } else {
                formData.append(key, String(value));
            }
        }
    });

    // Append files
    if (files && files.length > 0) {
        files.forEach((file, index) => {
            formData.append(`file_${index}`, file);
        });
    }

    return formData;
};
