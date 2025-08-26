// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const LINKS_FILE = path.join(__dirname, 'links.json');

// Init links file if missing
if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, '{}');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve one embedded HTML file
app.get('/', (req, res) => {
  const code = Object.keys(req.query)[0]; // e.g. /?abc12
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>One-Time Link Tool</title>
</head>
<body>
<h1>One-Time Link Tool</h1>

<div id="output"></div>

<form id="addForm">
  <label>Destination URL: <input type="url" name="url" required></label>
  <button type="submit">Add Link</button>
</form>

<script>
const code = '${code || ''}';
if (code) {
  fetch('/lookup/' + code)
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        document.getElementById('output').innerHTML =
          '<p>Link found: <a href="' + data.url + '" target="_blank">' + data.url + '</a></p>';
      } else {
        document.getElementById('output').textContent = 'Error: This code links to nothing.';
      }
    });
}

document.getElementById('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const url = e.target.url.value;
  fetch('/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('output').innerHTML =
      '<p>New code: <a href="/?' + data.code + '">/?' + data.code + '</a></p>';
    e.target.reset();
  });
});
</script>

</body>
</html>
  `;
  res.send(html);
});

// API: lookup code and delete if found
app.get('/lookup/:code', (req, res) => {
  const links = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
  if (links[req.params.code]) {
    const url = links[req.params.code];
    delete links[req.params.code];
    fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
    return res.json({ url });
  }
  res.json({ url: null });
});

// API: add new link
app.post('/add', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  const code = crypto.randomBytes(3).toString('base64url'); // ~5 char code
  const links = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
  links[code] = url;
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
  res.json({ code });
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
