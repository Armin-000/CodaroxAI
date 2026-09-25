const DB_NAME = "codarox-ai-images-v1";
const STORE_NAME = "generated-images";
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "IndexedDB is not available."
        )
      );

      return;
    }

    const request =
      indexedDB.open(
        DB_NAME,
        DB_VERSION
      );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        db.createObjectStore(
          STORE_NAME,
          {
            keyPath: "id",
          }
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
        new Error(
          "Unable to open image database."
        )
      );
    };
  });
}

export async function putGeneratedImage(
  id,
  image
) {
  if (
    !id ||
    typeof image?.dataUrl !== "string" ||
    !image.dataUrl.startsWith("data:image/")
  ) {
    return;
  }

  const db =
    await openDatabase();

  try {
    await new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_NAME,
            "readwrite"
          );

        transaction
          .objectStore(STORE_NAME)
          .put({
            id,
            dataUrl:
              image.dataUrl,
            mimeType:
              image.mimeType ||
              "image/jpeg",
            prompt:
              image.prompt ||
              "",
            updatedAt:
              Date.now(),
          });

        transaction.oncomplete =
          () => resolve();

        transaction.onerror =
          () =>
            reject(
              transaction.error ||
              new Error(
                "Unable to store generated image."
              )
            );
      }
    );
  } finally {
    db.close();
  }
}

export async function getGeneratedImage(
  id
) {
  if (!id) {
    return null;
  }

  const db =
    await openDatabase();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction =
          db.transaction(
            STORE_NAME,
            "readonly"
          );

        const request =
          transaction
            .objectStore(
              STORE_NAME
            )
            .get(id);

        request.onsuccess =
          () =>
            resolve(
              request.result ||
              null
            );

        request.onerror =
          () =>
            reject(
              request.error ||
              new Error(
                "Unable to restore generated image."
              )
            );
      }
    );
  } finally {
    db.close();
  }
}


export async function deleteGeneratedImage(id) {
  if (!id) return;

  const db = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(
        transaction.error || new Error("Unable to delete generated image.")
      );
    });
  } finally {
    db.close();
  }
}

export async function deleteGeneratedImages(ids) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).filter(Boolean))];
  if (!uniqueIds.length) return;

  const db = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      uniqueIds.forEach((id) => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(
        transaction.error || new Error("Unable to delete generated images.")
      );
    });
  } finally {
    db.close();
  }
}
