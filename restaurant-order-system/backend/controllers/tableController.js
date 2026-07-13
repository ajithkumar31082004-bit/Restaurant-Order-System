const Table = require('../models/Table');
const QRCode = require('qrcode');
const config = require('../config/config');

const tableController = {

  // GET /api/tables
  async getAll(req, res, next) {
    try {
      const filters = {};
      if (req.query.floor)  filters.floor  = req.query.floor;
      if (req.query.status) filters.status = req.query.status;
      const tables = await Table.getAll(filters);
      res.json({ success: true, count: tables.length, data: tables });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tables/floor-map
  async getFloorMap(req, res, next) {
    try {
      const floorMap = await Table.getFloorMap();
      const stats    = await Table.getStats();
      res.json({ success: true, data: { floors: floorMap, stats } });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tables/stats
  async getStats(req, res, next) {
    try {
      const stats = await Table.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tables/:id
  async getById(req, res, next) {
    try {
      const table = await Table.findById(req.params.id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      res.json({ success: true, data: table });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/tables/:id/qr
  async getQRCode(req, res, next) {
    try {
      const table = await Table.findById(req.params.id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

      const frontendUrl = config.frontendUrl || 'http://localhost:5000';
      const tableUrl = `${frontendUrl}/pages/table-order.html?table=${table.table_number}`;

      const qrDataUrl = await QRCode.toDataURL(tableUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a2e', light: '#ffffff' }
      });

      // Save QR URL to DB
      await Table.update(table.id, { qr_code_url: tableUrl });

      res.json({
        success: true,
        data: {
          table_number: table.table_number,
          qr_data_url: qrDataUrl,
          scan_url: tableUrl
        }
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tables
  async create(req, res, next) {
    try {
      const table = await Table.create(req.body);
      res.status(201).json({ success: true, message: 'Table created', data: table });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/tables/:id
  async update(req, res, next) {
    try {
      const table = await Table.update(req.params.id, req.body);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      res.json({ success: true, message: 'Table updated', data: table });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/tables/:id/status
  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const valid = ['available','occupied','reserved','cleaning','inactive'];
      if (!valid.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      const table = await Table.updateStatus(req.params.id, status);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      res.json({ success: true, message: 'Table status updated', data: table });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/tables/:id/transfer
  async transfer(req, res, next) {
    try {
      const { to_table_id } = req.body;
      if (!to_table_id) {
        return res.status(400).json({ success: false, message: 'to_table_id is required' });
      }
      await Table.transferOrder(req.params.id, to_table_id);
      res.json({ success: true, message: 'Table transfer successful' });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/tables/:id
  async remove(req, res, next) {
    try {
      const deleted = await Table.delete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Table not found' });
      res.json({ success: true, message: 'Table deleted' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = tableController;
