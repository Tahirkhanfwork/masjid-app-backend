const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Masjid = require('../models/masjid.model');
const sendMail = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET;

exports.registerMasjid = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { masjid_name, address, pincode, imam_name, email, password, status } = req.body;

    const existingMasjid = await Masjid.findByName(masjid_name);
    if (existingMasjid)
      return res
        .status(409)
        .json({ success: false, message: 'Masjid with that name already exists' });

    const existingEmail = await Masjid.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { id } = await Masjid.createMasjid({
      masjid_name,
      address,
      pincode,
      imam_name,
      email,
      password: hashedPassword,
      qr_file_url: null,
      status,
      masjid_certificate: null,
      aadhar_card: null,
      electricity_bill: null
    });

    const docsDir = path.join(__dirname, `../../public/uploads/documents/${id}`);
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    let attachments = [];
    let masjidCertificatePath = null;
    let aadharCardPath = null;
    let electricityBillPath = null;

    if (req.files?.masjid_certificate) {
      const file = req.files.masjid_certificate[0];
      const dest = path.join(docsDir, 'masjid_certificate' + path.extname(file.originalname));
      fs.renameSync(file.path, dest);
      masjidCertificatePath = `/public/uploads/documents/${id}/masjid_certificate${path.extname(file.originalname)}`;
      attachments.push({
        filename: 'masjid_certificate' + path.extname(file.originalname),
        path: dest
      });
    }

    if (req.files?.aadhar_card) {
      const file = req.files.aadhar_card[0];
      const dest = path.join(docsDir, 'aadhar_card' + path.extname(file.originalname));
      fs.renameSync(file.path, dest);
      aadharCardPath = `/public/uploads/documents/${id}/aadhar_card${path.extname(file.originalname)}`;
      attachments.push({ filename: 'aadhar_card' + path.extname(file.originalname), path: dest });
    }

    if (req.files?.electricity_bill) {
      const file = req.files.electricity_bill[0];
      const dest = path.join(docsDir, 'electricity_bill' + path.extname(file.originalname));
      fs.renameSync(file.path, dest);
      electricityBillPath = `/public/uploads/documents/${id}/electricity_bill${path.extname(file.originalname)}`;
      attachments.push({
        filename: 'electricity_bill' + path.extname(file.originalname),
        path: dest
      });
    }

    await Masjid.updateMasjid(id, {
      masjid_certificate: masjidCertificatePath,
      aadhar_card: aadharCardPath,
      electricity_bill: electricityBillPath
    });

    const qrData = JSON.stringify({ id, masjid_name });
    const qrDir = path.join(__dirname, '../../public/qr');
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFileName = `masjid_${id}.png`;
    const qrFilePath = path.join(qrDir, qrFileName);
    await QRCode.toFile(qrFilePath, qrData, { color: { dark: '#000', light: '#fff' }, width: 300 });

    const qrRelativePath = `/public/qr/${qrFileName}`;
    await Masjid.updateQrFileUrl(id, qrRelativePath);

    const created = await Masjid.findById(id);

    const emailBody = `
      Dear ${masjid_name},

      New masjid registration received. Here are the details:

      Masjid Name: ${masjid_name}
      Address: ${address}
      Pincode: ${pincode}
      Imam Name: ${imam_name}
      Status: ${status}

      QR Code: ${process.env.API_BASE_URL}${qrRelativePath}

      Regards,
      Fudugo Solutions Pvt Ltd
    `;

    if (attachments.length > 0) {
      await sendMail(
        'tahirkhanfwork@gmail.com',
        'Masjid Registration Details',
        emailBody,
        attachments
      );
    } else {
      await sendMail('tahirkhanfwork@gmail.com', 'Masjid Registration Details', emailBody);
    }

    const token = jwt.sign({ id: created.id, email: created.email }, JWT_SECRET);

    return res.status(201).json({ success: true, data: created, token });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.updateMasjid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { masjid_name, address, pincode, imam_name, status, email, password } = req.body;

    const existing = await Masjid.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Masjid not found' });
    }

    let hashedPassword = existing.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await Masjid.updateMasjid(id, {
      masjid_name,
      address,
      pincode,
      imam_name,
      email,
      password: hashedPassword,
      status
    });

    const updated = await Masjid.findById(id);

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

exports.getMasjidById = async (req, res, next) => {
  try {
    const masjid = await Masjid.findById(req.params.id);
    if (!masjid) {
      return res.status(404).json({ success: false, message: 'Masjid not found' });
    }
    return res.json({ success: true, data: masjid });
  } catch (err) {
    next(err);
  }
};
