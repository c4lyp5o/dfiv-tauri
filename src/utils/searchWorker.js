self.onmessage = (e) => {
	console.log("received message in worker");
	const { query, files } = e.data;

	if (!query) {
		console.log("no query, returning all files");
		self.postMessage(files);
		return;
	}

	console.log("query is", query);
	const lowerQuery = query.toLowerCase();
	const filtered = files.filter((f) =>
		f.name.toLowerCase().includes(lowerQuery),
	);

	self.postMessage(filtered);
};
