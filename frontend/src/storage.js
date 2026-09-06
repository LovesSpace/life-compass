import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "./firebase";

/*
 * Images go straight from the browser to Firebase Storage, under a path
 * scoped to the signed-in user. Only the resulting URL is sent to our API,
 * so photo bytes never pass through Cloud Run.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 6;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
}

export function checkImage(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "That file type isn't supported. Use JPG, PNG, WebP or GIF.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is larger than 5 MB. Pick a smaller image.`;
  }

  return null;
}

export async function uploadJournalImage(file) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You need to be signed in to add a photo.");
  }

  const problem = checkImage(file);

  if (problem) {
    throw new Error(problem);
  }

  const path = `users/${user.uid}/journal/${Date.now()}-${safeName(file.name)}`;
  const fileRef = ref(storage, path);

  try {
    await uploadBytes(fileRef, file, { contentType: file.type });

    return {
      url: await getDownloadURL(fileRef),
      path,
      name: file.name,
    };
  } catch (error) {
    // The two failures worth naming, because both are setup rather than bugs.
    if (error.code === "storage/unauthorized") {
      throw new Error(
        "Storage rejected the upload. Check that Storage rules allow this user."
      );
    }

    if (error.code === "storage/unknown" || error.code === "storage/retry-limit-exceeded") {
      throw new Error(
        "Couldn't reach Storage. Make sure Firebase Storage is enabled for this project."
      );
    }

    throw new Error(error.message || "Couldn't upload that image.");
  }
}