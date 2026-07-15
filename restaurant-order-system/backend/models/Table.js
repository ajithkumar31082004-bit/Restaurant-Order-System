const pool = require('../config/database');

const fallbackTables = [
  { id: 1, table_number: 'T01', floor: 'ground', table_type: 'indoor', capacity: 2, status: 'available', branch_id: 1, position_x: 1, position_y: 1, branch_name: 'Main Branch' },
  { id: 2, table_number: 'T02', floor: 'ground', table_type: 'indoor', capacity: 4, status: 'occupied', branch_id: 1, position_x: 2, position_y: 1, branch_name: 'Main Branch' },
  { id: 3, table_number: 'T03', floor: 'ground', table_type: 'vip', capacity: 6, status: 'reserved', branch_id: 1, position_x: 3, position_y: 1, branch_name: 'Main Branch' },
  { id: 4, table_number: 'T04', floor: 'ground', table_type: 'indoor', capacity: 4, status: 'available', branch_id: 1, position_x: 4, position_y: 1, branch_name: 'Main Branch' },
  { id: 5, table_number: 'T05', floor: 'first', table_type: 'outdoor', capacity: 2, status: 'available', branch_id: 1, position_x: 1, position_y: 2, branch_name: 'Main Branch' },
  { id: 6, table_number: 'T06', floor: 'first', table_type: 'indoor', capacity: 8, status: 'cleaning', branch_id: 1, position_x: 2, position_y: 2, branch_name: 'Main Branch' },
  { id: 7, table_number: 'T07', floor: 'rooftop', table_type: 'vip', capacity: 10, status: 'available', branch_id: 1, position_x: 1, position_y: 3, branch_name: 'Main Branch' },
  { id: 8, table_number: 'T08', floor: 'rooftop', table_type: 'outdoor', capacity: 4, status: 'reserved', branch_id: 1, position_x: 2, position_y: 3, branch_name: 'Main Branch' }
];

let fallbackTableId = fallbackTables.length + 1;

function cloneTables() {
  return fallbackTables.map((table) => ({ ...table }));
}

function filterTables(tables, filters = {}) {
  const filtered = tables.filter((table) => {
    if (filters.floor && table.floor !== filters.floor) return false;
    if (filters.status && table.status !== filters.status) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    if (a.floor !== b.floor) return a.floor.localeCompare(b.floor);
    if (a.position_y !== b.position_y) return a.position_y - b.position_y;
    return a.position_x - b.position_x;
  });
}

const Table = {
  async getAll(filters = {}) {
    try {
      let query = `SELECT t.*, b.name as branch_name FROM restaurant_tables t
                   LEFT JOIN branches b ON t.branch_id = b.id WHERE 1=1`;
      const params = [];
      if (filters.floor)  { query += ' AND t.floor = ?'; params.push(filters.floor); }
      if (filters.status) { query += ' AND t.status = ?'; params.push(filters.status); }
      query += ' ORDER BY t.floor ASC, t.table_number ASC';
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      return filterTables(cloneTables(), filters);
    }
  },

  async findById(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT t.*, b.name as branch_name FROM restaurant_tables t
         LEFT JOIN branches b ON t.branch_id = b.id WHERE t.id = ?`, [id]
      );
      return rows[0] || null;
    } catch (error) {
      return cloneTables().find((table) => table.id === parseInt(id, 10)) || null;
    }
  },

  async findByTableNumber(tableNumber) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM restaurant_tables WHERE table_number = ?', [tableNumber]
      );
      return rows[0] || null;
    } catch (error) {
      return cloneTables().find((table) => table.table_number === tableNumber) || null;
    }
  },

  async updateStatus(id, status) {
    try {
      await pool.execute(
        'UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, id]
      );
      return this.findById(id);
    } catch (error) {
      const table = cloneTables().find((item) => item.id === parseInt(id, 10));
      if (table) {
        table.status = status;
        return { ...table };
      }
      return null;
    }
  },

  async create(data) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO restaurant_tables
          (table_number, floor, table_type, capacity, status, branch_id, position_x, position_y)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          data.table_number, data.floor || 'ground', data.table_type || 'indoor',
          data.capacity || 4, data.status || 'available', data.branch_id || 1,
          data.position_x || 0, data.position_y || 0
        ]
      );
      return this.findById(result.insertId);
    } catch (error) {
      const created = {
        id: fallbackTableId++,
        table_number: data.table_number,
        floor: data.floor || 'ground',
        table_type: data.table_type || 'indoor',
        capacity: data.capacity || 4,
        status: data.status || 'available',
        branch_id: data.branch_id || 1,
        position_x: data.position_x || 0,
        position_y: data.position_y || 0,
        branch_name: 'Main Branch'
      };
      fallbackTables.push(created);
      return created;
    }
  },

  async update(id, data) {
    try {
      const fields = [];
      const values = [];
      const allowed = ['table_number','floor','table_type','capacity','status','qr_code_url','position_x','position_y'];
      allowed.forEach(key => {
        if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
      });
      if (!fields.length) return this.findById(id);
      values.push(id);
      await pool.execute(`UPDATE restaurant_tables SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.findById(id);
    } catch (error) {
      const table = cloneTables().find((item) => item.id === parseInt(id, 10));
      if (table) {
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) table[key] = value;
        });
        return { ...table };
      }
      return null;
    }
  },

  async delete(id) {
    try {
      const [result] = await pool.execute('DELETE FROM restaurant_tables WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      const index = fallbackTables.findIndex((table) => table.id === parseInt(id, 10));
      if (index >= 0) {
        fallbackTables.splice(index, 1);
        return true;
      }
      return false;
    }
  },

  async getFloorMap() {
    try {
      const [rows] = await pool.execute(
        `SELECT t.*, 
                o.order_id as current_order_id,
                o.order_status as current_order_status,
                r.reservation_id as upcoming_reservation_id,
                r.reservation_time as upcoming_reservation_time,
                r.guest_count as upcoming_guests
         FROM restaurant_tables t
         LEFT JOIN orders o ON o.table_id = t.id 
           AND o.order_status NOT IN ('Delivered','Cancelled')
           AND o.order_type = 'dine-in'
         LEFT JOIN table_reservations r ON r.table_id = t.id 
           AND r.reservation_date = CURDATE()
           AND r.status IN ('confirmed','pending')
         ORDER BY t.floor ASC, t.position_y ASC, t.position_x ASC`
      );

      const floorMap = {};
      rows.forEach(table => {
        if (!floorMap[table.floor]) floorMap[table.floor] = [];
        floorMap[table.floor].push(table);
      });
      return floorMap;
    } catch (error) {
      const floorMap = {};
      cloneTables().forEach((table) => {
        if (!floorMap[table.floor]) floorMap[table.floor] = [];
        floorMap[table.floor].push(table);
      });
      return floorMap;
    }
  },

  async getStats() {
    try {
      const [rows] = await pool.execute(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) as reserved,
          SUM(CASE WHEN status='cleaning' THEN 1 ELSE 0 END) as cleaning
        FROM restaurant_tables WHERE status != 'inactive'
      `);
      return rows[0];
    } catch (error) {
      const tables = cloneTables().filter((table) => table.status !== 'inactive');
      return {
        total: tables.length,
        available: tables.filter((table) => table.status === 'available').length,
        occupied: tables.filter((table) => table.status === 'occupied').length,
        reserved: tables.filter((table) => table.status === 'reserved').length,
        cleaning: tables.filter((table) => table.status === 'cleaning').length
      };
    }
  },

  async transferOrder(fromTableId, toTableId) {
    try {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          `UPDATE orders SET table_id = ?
           WHERE table_id = ? AND order_status NOT IN ('Delivered','Cancelled')`,
          [toTableId, fromTableId]
        );
        await connection.execute(
          'UPDATE waiter_requests SET table_id = ? WHERE table_id = ? AND status = "pending"',
          [toTableId, fromTableId]
        );
        await connection.execute("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [fromTableId]);
        await connection.execute("UPDATE restaurant_tables SET status = 'occupied' WHERE id = ?", [toTableId]);
        await connection.commit();
        return true;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      const fromTable = cloneTables().find((table) => table.id === parseInt(fromTableId, 10));
      const toTable = cloneTables().find((table) => table.id === parseInt(toTableId, 10));
      if (fromTable) fromTable.status = 'available';
      if (toTable) toTable.status = 'occupied';
      return true;
    }
  }
};

module.exports = Table;
