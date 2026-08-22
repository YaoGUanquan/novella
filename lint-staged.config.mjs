function chunked(command, files, size = 25) {
  const chunks = [];
  for (let i = 0; i < files.length; i += size) {
    const slice = files.slice(i, i + size).map((file) => JSON.stringify(file));
    chunks.push(`${command} ${slice.join(' ')}`);
  }
  return chunks;
}

export default {
  '*.{ts,tsx}': (files) => [...chunked('eslint --fix', files), ...chunked('prettier --write', files)],
  '*.{json,md,css}': (files) => chunked('prettier --write', files),
};
