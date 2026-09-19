import * as MediaLibrary from "expo-media-library/legacy";

/* ============================================================
   TYPES
   ============================================================ */

export type DashcamGalleryResult = {
  assetId: string;
  uri: string;
};

/* ============================================================
   PERMISSION
   ============================================================ */

export async function requestDashcamGalleryPermission(): Promise<boolean> {
  const permission =
    await MediaLibrary.requestPermissionsAsync();

  return permission.granted;
}

/* ============================================================
   EXPORT
   ============================================================ */

export async function exportDashcamClipToGallery(
  fileUri: string
): Promise<DashcamGalleryResult> {
  const permission =
    await MediaLibrary.getPermissionsAsync();

  if (!permission.granted) {
    const requested =
      await MediaLibrary.requestPermissionsAsync();

    if (!requested.granted) {
      throw new Error(
        "Gallery permission was not granted."
      );
    }
  }

  const asset =
    await MediaLibrary.createAssetAsync(
      fileUri
    );

  let album =
    await MediaLibrary.getAlbumAsync(
      "MotoPilot"
    );

  if (!album) {
    await MediaLibrary.createAlbumAsync(
      "MotoPilot",
      asset,
      false
    );
  } else {
    await MediaLibrary.addAssetsToAlbumAsync(
      [asset],
      album,
      false
    );
  }

  return {
    assetId: asset.id,
    uri: asset.uri,
  };
}