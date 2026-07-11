export type SqlValue = string | number | null | Uint8Array;

export type SqlJsQueryResult = {
  columns: string[];
  values: SqlValue[][];
};

export type SqliteDatabase = {
  run: (sql: string, params?: SqlValue[]) => void;
  exec: (sql: string, params?: SqlValue[]) => SqlJsQueryResult[];
};

export type RemoveRemoteImagesFromCatalogResult =
  | {
      ok: true;
      removedImageIds: number[];
      removedCount: number;
    }
  | {
      ok: false;
      error: string;
    };

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeImageIds(value: unknown): number[] {
  return Array.isArray(value) ? Array.from(new Set(value.filter(isPositiveInteger))) : [];
}

function getCount(database: SqliteDatabase, sql: string, params: SqlValue[]): number {
  const result = database.exec(sql, params)[0];

  if (!result || result.values.length === 0) {
    return 0;
  }

  const countIndex = result.columns.indexOf("count");
  const value = countIndex >= 0 ? result.values[0][countIndex] : 0;

  return typeof value === "number" ? value : 0;
}

export function removeRemoteImagesFromCatalog(
  database: SqliteDatabase,
  imageIdsPayload: unknown
): RemoveRemoteImagesFromCatalogResult {
  const imageIds = normalizeImageIds(imageIdsPayload);

  if (imageIds.length === 0) {
    return { ok: false, error: "Aucune reference distante selectionnee." };
  }

  for (const imageId of imageIds) {
    const result = database.exec(
      `SELECT images.source_kind, remote_images.image_id AS remote_image_id
       FROM images
       LEFT JOIN remote_images ON remote_images.image_id = images.id
       WHERE images.id = ?`,
      [imageId]
    )[0];

    if (!result || result.values.length !== 1) {
      return { ok: false, error: "Reference distante introuvable." };
    }

    const sourceKindIndex = result.columns.indexOf("source_kind");
    const remoteImageIdIndex = result.columns.indexOf("remote_image_id");
    const row = result.values[0];

    if (row[sourceKindIndex] !== "remote") {
      return { ok: false, error: "Une image locale ne peut pas etre retiree du catalogue." };
    }

    if (row[remoteImageIdIndex] !== imageId) {
      return { ok: false, error: "Reference distante incoherente." };
    }
  }

  const placeholders = imageIds.map(() => "?").join(", ");

  try {
    database.run("BEGIN TRANSACTION");
    database.run(`DELETE FROM collection_images WHERE image_id IN (${placeholders})`, imageIds);
    database.run(`DELETE FROM image_terms WHERE image_id IN (${placeholders})`, imageIds);
    database.run(`DELETE FROM image_tags WHERE image_id IN (${placeholders})`, imageIds);
    database.run(`DELETE FROM image_user_meta WHERE image_id IN (${placeholders})`, imageIds);
    database.run(`DELETE FROM remote_images WHERE image_id IN (${placeholders})`, imageIds);
    database.run(
      `DELETE FROM images WHERE id IN (${placeholders}) AND source_kind = 'remote'`,
      imageIds
    );

    if (getCount(database, `SELECT COUNT(*) AS count FROM images WHERE id IN (${placeholders})`, imageIds) !== 0) {
      throw new Error("Suppression incomplete des references distantes.");
    }

    database.run("COMMIT");

    return { ok: true, removedImageIds: imageIds, removedCount: imageIds.length };
  } catch (error) {
    try {
      database.run("ROLLBACK");
    } catch {
      // Preserve the original database error.
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossible de retirer les references distantes."
    };
  }
}
