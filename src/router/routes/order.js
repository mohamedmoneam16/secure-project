'use strict';

const fs = require('fs');
const path = require('path');

module.exports = (app, db) => {

    /**
     * GET /v1/order
     * @summary List available beers (Oversharing – intentionally vulnerable if not fixed)
     * @tags beer
     */
    app.get('/v1/order', (req, res) => {
        db.beer.findAll({
            attributes: ['id', 'name', 'price'], // 👈 قلل الداتا (Hardening)
        })
        .then(beer => res.json(beer))
        .catch(() => res.status(500).json({ error: "Internal error" }));
    });

    /**
     * GET /v1/beer-pic/
     * @summary Get a picture of a beer (Path Traversal – FIXED)
     */
    app.get('/v1/beer-pic/', (req, res) => {
        const filename = req.query.picture;

        // ✅ Allow only image files
        if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$/.test(filename)) {
            return res.status(400).json({ error: "Invalid file name" });
        }

        const uploadDir = path.join(__dirname, '../../../uploads');
        const filePath = path.join(uploadDir, filename);

        // ✅ Ensure path is inside uploads directory
        if (!filePath.startsWith(uploadDir)) {
            return res.status(400).json({ error: "Path traversal detected" });
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                return res.status(404).json({ error: "File not found" });
            }
            res.type('image/jpeg');
            res.send(data);
        });
    });

    /**
     * GET /v1/search/:filter/:query
     * @summary Search for a specific beer (SQL Injection – FIXED & BLOCKED)
     * @tags beer
     */
    app.get('/v1/search/:filter/:query', (req, res) => {

        const { filter, query } = req.params;

        // ✅ Allowlist columns
        const allowedFilters = ['id', 'name', 'price'];
        if (!allowedFilters.includes(filter)) {
            return res.status(400).json({ error: "Invalid filter" });
        }

        // ✅ Strict validation (BLOCK attack completely)
        if (filter === 'id' && !/^\d+$/.test(query)) {
            return res.status(400).json({ error: "Invalid input" });
        }

        if (filter === 'name' && !/^[a-zA-Z0-9 _-]{1,30}$/.test(query)) {
            return res.status(400).json({ error: "Invalid input" });
        }

        const sql = `SELECT * FROM beers WHERE ${filter} = ?`;

        db.sequelize.query(sql, {
            replacements: [query],
            type: db.sequelize.QueryTypes.SELECT
        })
        .then(beers => res.status(200).json(beers))
        .catch(() => res.status(500).json({ error: "Query failed" }));
    });

};
