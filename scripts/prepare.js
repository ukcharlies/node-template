const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const executable = process.platform === 'win32' ? 'husky.cmd' : 'husky';
const huskyPath = path.join(__dirname, '..', 'node_modules', '.bin', executable);

if (fs.existsSync(huskyPath)) {
  execFileSync(huskyPath, { stdio: 'inherit' });
}
