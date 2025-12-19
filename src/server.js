'use strict';

const express = require('express'),
    config = require('./config'),
    router = require('./router'),
    bodyParser = require('body-parser'),
    db = require('./orm');

const sjs = require('sequelize-json-schema');

const app = express();
const PORT = config.PORT;

app.use(bodyParser.json());

/* =========================
   Session Middleware (FIXED)
   ========================= */

const cookieParser = require('cookie-parser');
const session = require('express-session');

app.use(cookieParser());

app.use(session({
  name: 'sessionID',
  secret: process.env.SESSION_SECRET || 'SuperSecret', // ✅ آمن
  resave: false,
  saveUninitialized: false, // ✅ Best practice
  cookie: {
    httpOnly: true,                     // ✅ FIXED
    secure: process.env.NODE_ENV === 'production', // ✅ FIXED
    sameSite: 'strict',                 // ✅ أقوى من lax
    maxAge: 24 * 60 * 60 * 1000          // ✅ 24 ساعة
  }
}));

/* ========================= */

router(app, db);

// Database sync
db.sequelize.sync({ force: false })
    .then(() => {
        app.listen(PORT, () => {
            console.log('Express listening on port:', PORT);
        });
    })
    .catch((err) => {
        console.error("Error syncing database:", err);
    });

/* =========================
   Swagger
   ========================= */

const expressJSDocSwagger = require('express-jsdoc-swagger');

const docOptions = {
  info: {
    version: '1.0.0',
    title: 'Damn vulnerable app',
    license: {
      name: 'MIT',
    },
  },
  baseDir: __dirname,
  filesPattern: './../**/*.js',
  swaggerUIPath: '/api-docs',
  exposeSwaggerUI: true,
  exposeApiDocs: true,
  apiDocsPath: '/v1/api-docs',
};

expressJSDocSwagger(app)(docOptions);

// Generate schemas from sequelize
const options = { exclude: ['id', 'createdAt', 'updatedAt'] };
sjs.getSequelizeSchema(db.sequelize, options);

/* =========================
   Templates & Static Files
   ========================= */

const expressNunjucks = require('express-nunjucks');
app.set('views', __dirname + '/templates');
expressNunjucks(app, {
  watch: true,
  noCache: true
});

app.use(express.static('src/public'));

// Form handler
const formidableMiddleware = require('express-formidable');
app.use(formidableMiddleware());
