import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
import { removeRemoteImagesFromCatalog } from "../dist-electron/remote-reference-removal.js";

const require = createRequire(import.meta.url);
const sqlJsDirectory = path.dirname(require.resolve("sql.js/dist/sql-wasm.js"));
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const SQL = await initSqlJs({ locateFile: (fileName) => path.join(sqlJsDirectory, fileName) });

function createDatabase() {
  const database = new SQL.Database();
  database.exec(schema);
  return database;
}

function seedRemote(database, imageId, provider = "generic_url") {
  database.run("INSERT INTO images (id, source_kind) VALUES (?, 'remote')", [imageId]);
  database.run(
    "INSERT INTO remote_images (image_id, remote_url, provider, source_status) VALUES (?, ?, ?, 'remote')",
    [imageId, `https://example.test/${imageId}.png`, provider]
  );
}

function count(database, tableName, imageId) {
  const columnName = tableName === "images" ? "id" : "image_id";
  return database.exec(`SELECT COUNT(*) AS count FROM ${tableName} WHERE ${columnName} = ?`, [imageId])[0].values[0][0];
}

test("retire une référence Web et ses liens tout en conservant tags et terms globaux", () => {
  const database = createDatabase();
  seedRemote(database, 1);
  database.run("INSERT INTO tags (id, name) VALUES (1, 'tag global')");
  database.run("INSERT INTO terms (id, kind, label, normalized_label) VALUES (1, 'tag', 'terme global', 'terme global')");
  database.run("INSERT INTO image_tags (image_id, tag_id) VALUES (1, 1)");
  database.run("INSERT INTO image_terms (image_id, term_id) VALUES (1, 1)");
  database.run("INSERT INTO image_user_meta (image_id, is_favorite) VALUES (1, 1)");
  database.run("INSERT INTO collections (id, name) VALUES (1, 'Collection')");
  database.run("INSERT INTO collection_images (collection_id, image_id) VALUES (1, 1)");

  const result = removeRemoteImagesFromCatalog(database, [1]);

  assert.deepEqual(result, { ok: true, removedImageIds: [1], removedCount: 1 });
  assert.equal(count(database, "images", 1), 0);
  assert.equal(count(database, "remote_images", 1), 0);
  assert.equal(count(database, "image_tags", 1), 0);
  assert.equal(count(database, "image_terms", 1), 0);
  assert.equal(count(database, "image_user_meta", 1), 0);
  assert.equal(database.exec("SELECT COUNT(*) FROM collection_images")[0].values[0][0], 0);
  assert.equal(database.exec("SELECT COUNT(*) FROM tags")[0].values[0][0], 1);
  assert.equal(database.exec("SELECT COUNT(*) FROM terms")[0].values[0][0], 1);
});

test("retire un lot Midjourney dédupliqué", () => {
  const database = createDatabase();
  seedRemote(database, 2, "midjourney");
  seedRemote(database, 3, "midjourney");

  const result = removeRemoteImagesFromCatalog(database, [2, 2, 3]);

  assert.deepEqual(result, { ok: true, removedImageIds: [2, 3], removedCount: 2 });
  assert.equal(count(database, "images", 2), 0);
  assert.equal(count(database, "images", 3), 0);
});

test("refuse une image locale et conserve intégralement le lot", () => {
  const database = createDatabase();
  seedRemote(database, 4);
  database.run("INSERT INTO images (id, source_kind) VALUES (5, 'local')");
  database.run("INSERT INTO roots (id, path, name) VALUES (1, 'C:/test', 'test')");
  database.run("INSERT INTO local_images (image_id, root_id, path, folder_path, file_name) VALUES (5, 1, 'C:/test/local.png', 'C:/test', 'local.png')");

  const result = removeRemoteImagesFromCatalog(database, [4, 5]);

  assert.deepEqual(result, { ok: false, error: "Une image locale ne peut pas etre retiree du catalogue." });
  assert.equal(count(database, "images", 4), 1);
  assert.equal(count(database, "remote_images", 4), 1);
  assert.equal(count(database, "images", 5), 1);
});

test("refuse les identifiants absents ou incohérents sans retirer les références valides", () => {
  const database = createDatabase();
  seedRemote(database, 6);
  database.run("INSERT INTO images (id, source_kind) VALUES (7, 'remote')");

  assert.deepEqual(removeRemoteImagesFromCatalog(database, [6, 999]), {
    ok: false,
    error: "Reference distante introuvable."
  });
  assert.equal(count(database, "images", 6), 1);

  assert.deepEqual(removeRemoteImagesFromCatalog(database, [6, 7]), {
    ok: false,
    error: "Reference distante incoherente."
  });
  assert.equal(count(database, "images", 6), 1);
  assert.equal(count(database, "images", 7), 1);
});
