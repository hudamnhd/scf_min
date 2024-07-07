// pages/api/upload.js
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), '/public/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const form = new IncomingForm({
  uploadDir,
  keepExtensions: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  multiples: true,
  filename: (name, ext, part) => {
    return Date.now().toString() + '_' + part.originalFilename;
  },
});

export default async function handler(req, res) {

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const fileUrls = Object.values(files).flat().map(file => {
      const filePath = path.join('/uploads', path.basename(file.filepath));
      return filePath;
    });

    res.status(200).json({ urls: fileUrls });
  });
}
