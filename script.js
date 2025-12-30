const logEl = document.getElementById("log");

function log(msg) {
  logEl.textContent += msg + "\n";
}

async function encrypt() {
  const algo = document.getElementById("algo").value;
  const password = document.getElementById("password").value;
  const files = document.getElementById("fileInput").files;

  if (!files.length) {
    alert("Pilih file / folder!");
    return;
  }

  if (algo === "AES" && !password) {
    alert("Password wajib untuk AES!");
    return;
  }

  const zip = new JSZip();

  for (const file of files) {
    const data = await file.arrayBuffer();
    let output;

    if (algo === "AES") {
      output = CryptoJS.AES.encrypt(
        CryptoJS.lib.WordArray.create(data),
        password
      ).toString();
    } 
    else if (algo === "Base64") {
      output = btoa(
        String.fromCharCode(...new Uint8Array(data))
      );
    }

    zip.file(file.name + "." + algo.toLowerCase(), output);
    log("Encrypted: " + file.name);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, "encrypted_files.zip");
  log("✅ Selesai enkripsi");
}

async function decrypt() {
  alert("Dekripsi ZIP → ekstrak manual (demo sederhana)");
}

async function hashFile() {
  const files = document.getElementById("fileInput").files;

  for (const file of files) {
    const data = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(data);
    const hash = CryptoJS.MD5(wordArray).toString();
    log(`[MD5] ${file.name} → ${hash}`);
  }
}
