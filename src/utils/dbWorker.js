self.onmessage = async (e) => {
	const { type, payload } = e.data;

	if (type === "START_IMPORT") {
		const { files } = payload;
		const BATCH_SIZE = 199;
		const total = files.length;
		let inserted = 0;

		try {
			// Begin transaction
			self.postMessage({
				type: "NEED_DB_EXECUTE",
				payload: { query: "BEGIN TRANSACTION" },
			});

			await waitForMessage("EXECUTE_DONE");

			for (let i = 0; i < total; i += BATCH_SIZE) {
				console.log(
					"Importing batch",
					i,
					"to",
					Math.min(i + BATCH_SIZE, total),
				);
				const batch = files.slice(i, i + BATCH_SIZE);
				const values = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
				const params = batch.flatMap((f) => [
					f.name,
					f.size,
					f.folder,
					f.path,
					f.file_type,
				]);

				// Ask main thread to execute this batch
				self.postMessage({
					type: "NEED_DB_EXECUTE",
					payload: {
						query: `INSERT OR IGNORE INTO media (name, size, folder, path, file_type) VALUES ${values}`,
						params,
					},
				});

				// Wait for execute to finish
				await waitForMessage("EXECUTE_DONE");

				inserted += batch.length;

				self.postMessage({
					type: "PROGRESS",
					payload: {
						inserted,
						total,
						percent: Math.round((inserted / total) * 100),
					},
				});
			}

			self.postMessage({
				type: "NEED_DB_EXECUTE",
				payload: { query: "COMMIT" },
			});

			await waitForMessage("EXECUTE_DONE");

			self.postMessage({
				type: "COMPLETE",
				payload: { inserted, total },
			});
		} catch (err) {
			self.postMessage({
				type: "NEED_DB_EXECUTE",
				payload: { query: "ROLLBACK" },
			});

			self.postMessage({
				type: "ERROR",
				payload: { error: err.message },
			});
		}
	}

	if (type === "START_REMOVE") {
		const { item, type } = payload;
		console.log(`worker: removing item ${item} of type ${type}`);

		try {
			if (type === "folder") {
				self.postMessage({
					type: "NEED_DB_EXECUTE",
					payload: {
						query: `DELETE FROM media WHERE folder = ?`,
						params: [item],
					},
				});
			} else {
				self.postMessage({
					type: "NEED_DB_EXECUTE",
					payload: {
						query: `DELETE FROM media WHERE path = ?`,
						params: [item],
					},
				});
			}
			await waitForMessage("EXECUTE_DONE");
			// self.postMessage({
			// 	type: "COMPLETE",
			// 	payload: { removeditem: item },
			// });
		} catch (err) {
			console.log("Error removing item:", err);
			// self.postMessage({
			// 	type: "ERROR",
			// 	payload: { error: err.message },
			// });
		}
	}

	if (type === "NUKE_DB") {
		self.postMessage({ type: "NEED_NUKE_DB" });
	}
};

function waitForMessage(expectedType) {
	return new Promise((resolve) => {
		function listener(event) {
			if (event.data.type === expectedType) {
				self.removeEventListener("message", listener);
				resolve(event.data.payload);
				console.log("Resolved", expectedType);
			}
		}
		self.addEventListener("message", listener);
	});
}
