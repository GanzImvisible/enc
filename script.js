// DOM Elements
const fileInput = document.getElementById('fileInput');
const algoSelect = document.getElementById('algoSelect');
const passwordInput = document.getElementById('password');
const passwordGroup = document.getElementById('passwordGroup');
const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const hashBtn = document.getElementById('hashBtn');
const clearLogBtn = document.getElementById('clearLog');
const logDiv = document.getElementById('log');
const downloadsDiv = document.getElementById('downloads');

// Show/hide password field
algoSelect.addEventListener('change', () => {
  passwordGroup.style.display = algoSelect.value === 'aes' ? 'block' : 'none';
});

// Log function
function log(msg) {
  logDiv.textContent += `\n> ${msg}`;
  logDiv.scrollTop = logDiv.scrollHeight;
}

function clearLog() {
  logDiv.textContent = '';
}

// Trigger download
function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// MD5 (using CryptoJS)
function md5File(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
      const hash = CryptoJS.MD5(wordArray).toString();
      resolve(hash);
    };
    reader.readAsArrayBuffer(file);
  });
}

// AES encrypt (client-side)
async function encryptAES(file, password) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result;
      const encrypted = CryptoJS.AES.encrypt(data, password);
      const blob = new Blob([encrypted.toString()], { type: 'text/plain' });
      resolve(blob);
    };
    reader.readAsText(file);
  });
}

// AES decrypt
async function decryptAES(file, password) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ciphertext = e.target.result;
        const decrypted = CryptoJS.AES.decrypt(ciphertext, password);
        const plain = decrypted.toString(CryptoJS.enc.Utf8);
        if (!plain) throw new Error('Password salah atau file rusak');
        const blob = new Blob([plain], { type: 'application/octet-stream' });
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// Base64 encode/decode
function base64Encode(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = btoa(e.target.result);
      const blob = new Blob([b64], { type: 'text/plain' });
      resolve(blob);
    };
    reader.readAsBinaryString(file);
  });
}

function base64Decode(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bin = atob(e.target.result.trim());
        const blob = new Blob([bin], { type: 'application/octet-stream' });
        resolve(blob);
      } catch (e) {
        alert('Bukan file Base64 yang valid!');
      }
    };
    reader.readAsText(file);
  });
}

// Handle ZIP (folder)
async function processZip(file, action, password = '') {
  const zip = new JSZip();
  const arrayBuffer = await file.arrayBuffer();
  const loadedZip = await zip.loadAsync(arrayBuffer);

  const newZip = new JSZip();
  let count = 0;

  for (let filename in loadedZip.files) {
    if (!loadedZip.files[filename].dir) {
      const content = await loadedZip.files[filename].async('blob');
      let newContent;

      if (action === 'encrypt') {
        if (algoSelect.value === 'aes') {
          const text = await content.text();
          const encrypted = CryptoJS.AES.encrypt(text, password).toString();
          newContent = new Blob([encrypted], { type: 'text/plain' });
          filename += '.aes';
        } else if (algoSelect.value === 'base64') {
          const b64 = btoa(await content.text());
          newContent = new Blob([b64], { type: 'text/plain' });
          filename += '.b64';
        }
      } else if (action === 'decrypt') {
        const text = await content.text();
        if (filename.endsWith('.aes')) {
          const decrypted = CryptoJS.AES.decrypt(text, password).toString(CryptoJS.enc.Utf8);
          newContent = new Blob([decrypted], { type: 'application/octet-stream' });
          filename = filename.replace(/\.aes$/, '');
        } else if (filename.endsWith('.b64')) {
          const bin = atob(text);
          newContent = new Blob([bin], { type: 'application/octet-stream' });
          filename = filename.replace(/\.b64$/, '');
        }
      }
      newZip.file(filename, newContent);
      count++;
    }
  }

  const zipBlob = await newZip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, count };
}

// Main handlers
encryptBtn.onclick = async () => {
  const files = fileInput.files;
  if (files.length === 0) return alert('Pilih file dulu!');
  
  const algo = algoSelect.value;
  const password = passwordInput.value;

  if (algo === 'aes' && password.length < 8) {
    return alert('Password minimal 8 karakter!');
  }

  log(`Memulai enkripsi ${files.length} file...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      let blob, filename;
      
      // Jika upload ZIP → proses sebagai folder
      if (file.name.endsWith('.zip')) {
        const { blob: zipBlob, count } = await processZip(file, 'encrypt', password);
        blob = zipBlob;
        filename = file.name.replace(/\.zip$/, '_encrypted.zip');
        log(`✅ Folder (${count} file) terenkripsi → ${filename}`);
      } else {
        // File biasa
        if (algo === 'aes') {
          blob = await encryptAES(file, password);
          filename = file.name + '.aes';
        } else if (algo === 'base64') {
          blob = await base64Encode(file);
          filename = file.name + '.b64';
        }
        log(`✅ ${file.name} → ${filename}`);
      }

      // Tampilkan tombol download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.textContent = `⬇️ Download ${filename}`;
      link.className = 'download-link';
      downloadsDiv.appendChild(link);
      downloadsDiv.appendChild(document.createElement('br'));

    } catch (e) {
      log(`❌ Gagal enkripsi ${file.name}: ${e.message}`);
    }
  }
};

decryptBtn.onclick = async () => {
  const files = fileInput.files;
  if (files.length === 0) return alert('Pilih file terenkripsi dulu!');
  
  const algo = algoSelect.value;
  const password = passwordInput.value;

  if (algo === 'aes' && !password) {
    return alert('Masukkan password untuk dekripsi AES!');
  }

  log(`Memulai dekripsi ${files.length} file...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      let blob, filename;

      if (file.name.endsWith('.zip')) {
        const { blob: zipBlob, count } = await processZip(file, 'decrypt', password);
        blob = zipBlob;
        filename = file.name.replace(/_encrypted\.zip$/, '_decrypted.zip');
        log(`✅ Folder (${count} file) didekripsi → ${filename}`);
      } else if (file.name.endsWith('.aes')) {
        blob = await decryptAES(file, password);
        filename = file.name.replace(/\.aes$/, '');
      } else if (file.name.endsWith('.b64')) {
        blob = await base64Decode(file);
        filename = file.name.replace(/\.b64$/, '');
      } else {
        return alert('File tidak dikenali untuk dekripsi. Harus .aes atau .b64');
      }

      log(`✅ ${file.name} → ${filename}`);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.textContent = `⬇️ Download ${filename}`;
      link.className = 'download-link';
      downloadsDiv.appendChild(link);
      downloadsDiv.appendChild(document.createElement('br'));

    } catch (e) {
      log(`❌ Gagal dekripsi ${file.name}: ${e.message}`);
    }
  }
};

hashBtn.onclick = async () => {
  const files = fileInput.files;
  if (files.length === 0) return alert('Pilih file dulu!');
  log(`Menghitung MD5 untuk ${files.length} file...`);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const hash = await md5File(file);
    log(`[MD5] ${file.name} → ${hash}`);
  }
};

clearLogBtn.onclick = clearLog;

// Init
passwordGroup.style.display = 'block';
log('Siap digunakan. Upload file/folder (ZIP), lalu pilih aksi.');
